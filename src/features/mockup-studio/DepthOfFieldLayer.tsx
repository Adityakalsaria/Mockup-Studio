"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { GaussianBlurPass } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import {
  FramebufferTexture,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Texture,
} from "three";
import type { BlurMode, BlurSettings } from "./blurStyles";
import { sampleAnimation, type Animation } from "./animation";
import {
  followFade,
  followPoint,
  poseOf,
  type FocusFollow,
  type FocusPose,
} from "./mocraft/focusMath";

/**
 * The lens blur, as a SCREEN-SPACE pass over the finished frame.
 *
 * WHAT. A region of the frame stays sharp and the blur rises away from it:
 *
 *  - radial      a sharp circle around the focus point
 *  - directional sharp up to the focus point, blurring past it one way
 *  - tilt shift  a sharp band through the focus point, blurred either side
 *
 * It started as a depth-of-field pass, which blurs by distance from the
 * camera — and a phone is a flat slab at one depth, so it came out all sharp
 * or all blurred and the sliders had nothing to vary.
 *
 * HOW. The scene renders to the canvas exactly as it does with no blur, that
 * finished frame is copied into a texture, blurred twice by a separable
 * Gaussian (half and full strength), and drawn back over itself with each
 * pixel's place on sharp → half → full set by its distance to the sharp region.
 *
 * Over the finished frame, not through a post-processing composer. A composer
 * renders the scene into an offscreen buffer, and three.js only tone-maps and
 * colour-encodes on the way to the SCREEN — so the device's finish changed
 * colour the moment the blur was switched on, and a tone-mapping pass after
 * the fact could not put it back without also wrongly tone-mapping the
 * screens, which opt out. Copying the frame three already finished means a
 * pixel the blur leaves alone is the pixel the canvas drew, by construction.
 *
 * And a Gaussian rather than a gathered disc of samples: past a modest radius
 * a disc's samples spread apart and every edge came back as a stack of faint
 * copies. The Gaussians run at a height set by the strength rather than by the
 * canvas, so a blur is a share of the FRAME — the 3x export blurs the picture
 * the screen shows, not a third as much.
 */
const MODE_INDEX: Record<BlurMode, number> = {
  off: 0,
  radial: 0,
  directional: 1,
  "tilt-shift": 2,
};

/** Gaussian taps per pass. See `fitResolution` for what they reach. */
const KERNEL = 35;

/** The pass's `Resolution` and material, which the JS has and the typings leave out. */
type Sized = {
  resolution: { preferredHeight: number; width: number; height: number };
  blurMaterial: { setSize: (width: number, height: number) => void };
};
const sized = (pass: GaussianBlurPass) => pass as GaussianBlurPass & Sized;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uSharp;
  uniform sampler2D uSoft;
  uniform sampler2D uFull;
  uniform float uAspect;
  uniform vec2 uCenter;
  uniform float uMode;
  uniform float uRadius;
  uniform float uFeather;
  uniform vec2 uDir;
  uniform float uBokeh;
  uniform float uGain;
  uniform float uFade;
  varying vec2 vUv;

  float blurAmount(const in vec2 uv) {
    // Frame heights, with x stretched by the aspect so a circle is round.
    vec2 p = (uv - uCenter) * vec2(uAspect, 1.0);
    float d;
    if (uMode < 0.5) {
      d = length(p);
    } else if (uMode < 1.5) {
      d = max(0.0, dot(p, uDir));
    } else {
      d = abs(dot(p, vec2(-uDir.y, uDir.x)));
    }
    return smoothstep(uRadius, uRadius + uFeather, d);
  }

  // The canvas is transparent around the phone, and a blur averages its colour
  // with that clear black — dragging the edge dark as it fades. Dividing the
  // colour back out by the coverage undoes exactly that.
  vec4 unmix(const in vec4 c) {
    return vec4(c.a > 0.0001 ? c.rgb / c.a : vec3(0.0), c.a);
  }

  void main() {
    vec4 sharp = texture2D(uSharp, vUv);
    float amount = blurAmount(vUv) * uGain * uFade;
    if (amount <= 0.0) {
      gl_FragColor = sharp;
      return;
    }
    vec4 soft = unmix(texture2D(uSoft, vUv));
    vec4 full = unmix(texture2D(uFull, vUv));
    // Bokeh: highlights bloom rounder and brighter instead of greying out.
    if (uBokeh > 0.5) {
      float peak = max(max(full.r, full.g), full.b);
      full.rgb = min(vec3(1.0), full.rgb * (1.0 + smoothstep(0.55, 1.0, peak) * 0.35));
    }
    gl_FragColor = amount < 0.5
      ? mix(sharp, soft, amount * 2.0)
      : mix(soft, full, amount * 2.0 - 1.0);
  }
`;

/** Everything the pass owns, made once for the life of the layer. */
function createBlur() {
  const passes = [0, 1].map(
    () => new GaussianBlurPass({ kernelSize: KERNEL, iterations: 2 }),
  );
  const targets = [0, 1].map(
    () =>
      new WebGLRenderTarget(1, 1, { depthBuffer: false, type: HalfFloatType }),
  );
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uSharp: { value: null as Texture | null },
      uSoft: { value: targets[0].texture },
      uFull: { value: targets[1].texture },
      uAspect: { value: 1 },
      uCenter: { value: new Vector2(0.5, 0.5) },
      uMode: { value: 0 },
      uRadius: { value: 0.15 },
      uFeather: { value: 0.1 },
      uDir: { value: new Vector2(0, 1) },
      uBokeh: { value: 0 },
      uGain: { value: 1 },
      // The follow envelope; 1 whenever there is no composed move.
      uFade: { value: 1 },
    },
    // Replaces the canvas's pixels, alpha included: a blend would lay the
    // blur over the sharp phone it was copied from.
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  return {
    passes,
    targets,
    material,
    quad,
    scene,
    camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    frame: null as FramebufferTexture | null,
    size: new Vector2(),
    strength: 0,
    initialized: false,
  };
}

type Blur = ReturnType<typeof createBlur>;

/**
 * Strength 0..100 → the height each blur runs at.
 *
 * The pass's kernel is binomial, so its sigma is sqrt(KERNEL)/2 of ITS pixels
 * — about 3 for 35 taps, not the half-kernel it looks like — and two
 * iterations widen that by √2. A blur reads as about three sigmas across, so
 * rendering at height h blurs ~3σ/h of the frame. Full strength is ~7% of the
 * frame's height, and half strength half that. (Sized first as if the kernel
 * reached half its taps, which left Strength 100 at a third of this and read
 * as a blur that was barely on.)
 */
function fitResolution(blur: Blur) {
  const height = Math.max(1, blur.size.y);
  const reach = 3 * (Math.sqrt(KERNEL) / 2) * Math.SQRT2;
  const full = Math.max(1e-4, (blur.strength / 100) * 0.07);
  /*
   * Never above the canvas. A faint blur asks for a height of thousands of
   * pixels — past the GPU's texture limit at the bottom of the slider — and an
   * oversized target renders black. Below what the canvas's own height can
   * blur, the blend fades instead, so the slider still reaches nothing.
   */
  const cap = (h: number) => Math.max(8, Math.min(height, Math.round(h)));
  const [soft, hard] = blur.passes;
  sized(soft).resolution.preferredHeight = cap(reach / (full / 2));
  sized(hard).resolution.preferredHeight = cap(reach / full);
  blur.material.uniforms.uGain.value = Math.min(1, full / (reach / height));
  blur.passes.forEach((pass, i) => {
    const r = sized(pass).resolution;
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    blur.targets[i].setSize(w, h);
    /*
     * The kernel steps in the pixels it RENDERS at. The pass sets its texel
     * size from the canvas instead, so its reach stayed a fixed count of
     * canvas pixels whatever this height was: on screen most of the softness
     * was bilinear upscaling, and a 3x export — three times the pixels, same
     * reach — came out looking unblurred.
     */
    sized(pass).blurMaterial.setSize(w, h);
  });
}

export default function DepthOfFieldLayer({
  blur,
  follow = null,
}: {
  blur: BlurSettings;
  /**
   * A composed focus move to follow. When set, the sharp spot is placed on
   * every frame at the area the camera is on -- projected through the pose
   * being drawn -- instead of where the blur panel put it.
   */
  follow?: {
    schedule: FocusFollow;
    animation: Animation;
    timeRef: { current: number };
    base: FocusPose;
  } | null;
}) {
  const { gl, scene, camera, invalidate } = useThree();
  const state = useMemo(() => createBlur(), []);
  /**
   * Where the sharp spot is heading, and how it gets there. The panel and the
   * click-to-focus write a TARGET; the frame loop eases the shader's centre
   * toward it, so a click glides and a drag trails the pointer softly instead of
   * the blur jumping between samples of it.
   */
  const spot = useRef({
    target: new Vector2(0.5, 0.5),
    seeded: false,
    last: 0,
  });

  /* eslint-disable react-hooks/immutability -- three.js state lives on the
     objects it draws with: uniforms, render targets and the copied frame are
     set in place, in effects and the frame loop, as the stage's own are. */

  useEffect(
    () => () => {
      state.passes.forEach((p) => p.dispose());
      state.targets.forEach((t) => t.dispose());
      state.frame?.dispose();
      state.material.dispose();
      state.quad.geometry.dispose();
    },
    [state],
  );

  // The panel moves uniforms, never the shader, so a drag compiles nothing.
  useEffect(() => {
    const u = state.material.uniforms;
    // The pad measures from the top; uv from the bottom.
    spot.current.target.set(blur.focusX, 1 - blur.focusY);
    spot.current.last = performance.now();
    if (spot.current.seeded) invalidate();
    else {
      // First arrival: already there, not gliding in from the middle.
      (u.uCenter.value as Vector2).copy(spot.current.target);
      spot.current.seeded = true;
    }
    u.uMode.value = MODE_INDEX[blur.mode];
    // Focus size is the sharp region's radius (or the band's half-width) as a
    // share of half the frame; falloff is how far past it the blur takes to
    // arrive, from a near-hard edge up to most of the frame.
    u.uRadius.value = blur.focusSize * 0.5;
    u.uFeather.value = 0.02 + blur.falloff * 0.6;
    const a = (blur.angle * Math.PI) / 180;
    (u.uDir.value as Vector2).set(Math.cos(a), Math.sin(a));
    u.uBokeh.value = blur.bokeh ? 1 : 0;
    state.strength = blur.strength;
    if (state.frame) fitResolution(state);
  }, [state, blur, invalidate]);

  /*
   * Priority 1 hands this layer the frame: r3f stops drawing on its own, so
   * the draw below is the only one — which is also what the export's
   * `advance()` and the recorder step through, so both carry the blur.
   */
  useFrame(() => {
    const size = gl.getDrawingBufferSize(new Vector2());
    state.material.uniforms.uFade.value = follow
      ? followFade(follow.schedule, follow.timeRef.current)
      : 1;
    if (follow && size.y > 0) {
      const t = follow.timeRef.current;
      const pose = poseOf(follow.base, sampleAnimation(follow.animation, t));
      const spot = followPoint(follow.schedule, t, pose, size.x / size.y);
      // The pad measures from the top; uv from the bottom.
      if (spot)
        (state.material.uniforms.uCenter.value as Vector2).set(
          spot.x,
          1 - spot.y,
        );
    }
    if (!follow) {
      const now = performance.now();
      const dt = Math.min(
        0.05,
        Math.max(0.004, (now - spot.current.last) / 1000),
      );
      spot.current.last = now;
      const c = state.material.uniforms.uCenter.value as Vector2;
      const t = spot.current.target;
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      if (dx * dx + dy * dy > 1e-8) {
        // Exponential ease, ~16/s: a tenth of a second to cover most of the way.
        const k = 1 - Math.exp(-dt * 16);
        c.set(c.x + dx * k, c.y + dy * k);
        invalidate();
      } else c.copy(t);
    }
    if (!state.initialized) {
      state.passes.forEach((p) => p.initialize(gl, true, HalfFloatType));
      state.initialized = true;
    }
    if (!state.frame || !size.equals(state.size)) {
      state.size.copy(size);
      state.frame?.dispose();
      state.frame = new FramebufferTexture(size.x, size.y);
      state.frame.minFilter = LinearFilter;
      state.frame.magFilter = LinearFilter;
      state.material.uniforms.uSharp.value = state.frame;
      state.passes.forEach((p) => p.setSize(size.x, size.y));
      fitResolution(state);
    }
    state.material.uniforms.uAspect.value = size.x / Math.max(1, size.y);

    // 1. The frame, exactly as the canvas draws it without a blur.
    gl.setRenderTarget(null);
    gl.render(scene, camera);
    // 2. A copy of it, and the two blurs of the copy.
    gl.copyFramebufferToTexture(state.frame);
    const input = { texture: state.frame } as unknown as WebGLRenderTarget;
    state.passes.forEach((pass, i) => pass.render(gl, input, state.targets[i]));
    // 3. The blend, over the frame it was taken from.
    gl.setRenderTarget(null);
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.render(state.scene, state.camera);
    gl.autoClear = autoClear;
  }, 1);

  /* eslint-enable react-hooks/immutability */

  return null;
}
