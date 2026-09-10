/**
 * The fold's blur, built the way Apple's product viewer builds it.
 *
 * Every earlier attempt at this blurred the screenshot texture in place, on
 * the panel's own material, and every one of them failed -- averaging in the
 * region outside the crop, smearing along four directions, collapsing to a
 * single column. The reason was always the same: our screen texture is a
 * user's image FITTED into a panel, so its layout is a crop inside a larger
 * picture, and blurring it means reaching for pixels that are not part of the
 * screen.
 *
 * Their viewer has no such problem because it never blurs a source image. It
 * composites the screen content into an OFFSCREEN TARGET first -- a texture
 * that is the screen, edge to edge, nothing else in it -- and blurs that.
 *
 * So this does the same, in three passes:
 *
 *   A. FIT. The screenshot is drawn into a target through the very uv
 *      transform the material would have used, so the target holds exactly
 *      what the panel would have shown, at 0..1, and nothing beyond it. Mips
 *      are generated on the way out, which are now safe to read because every
 *      level averages screen content only.
 *
 *   B, C. BLUR, twice. Their `wipe-blur` pass, over that target and then over
 *      its own result: a distance from the edge that stays sharp, remapped
 *      through per-panel bounds into a blur amount, read as a mip level, and
 *      multiplied by a shade that darkens what is most blurred.
 *
 * Both of their refinements are here and both earn their place. The blur runs
 * TWICE, one pass feeding the next, which is what turns a ramp into a smooth
 * gradient. And each pass reconstructs BICUBICALLY rather than reading the mip
 * chain trilinearly -- at the levels this asks for, a mip is a few dozen
 * pixels magnified across half a panel, and trilinear magnification of that is
 * visibly blocky. An earlier version of this file called the bicubic "a
 * difference of degree" and skipped it; the rectangles it left in the blurred
 * text are what that judgement was worth.
 *
 * The panel then samples the result with an identity transform. Nothing about
 * the fit is lost -- it has already been applied, in pass A.
 *
 * The pass-A quad takes its uv straight from its own position, so uv (0,0) is
 * the target's bottom-left texel and `target(uv) === source(transform * uv)`
 * by construction. That is what keeps the picture the right way up without a
 * flip anywhere: the material sampled `source` through the transform before,
 * and samples `target` without one now, and the two are the same lookup.
 */

import {
  GLSL3,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Matrix3,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from "three";

import type { FoldScreenKind } from "./foldScreen";

/** The long side of the offscreen targets. */
const SIZE = 1024;

/** How many mip levels the blur may climb. Theirs. */
const MAX_BLUR = 8;

const QUAD_VERTEX = /* glsl */ `
  out vec2 vQuadUv;
  void main() {
    // From the position, not from the uv attribute: this is what makes uv
    // (0,0) the target's bottom-left texel, and the header explains why that
    // matters.
    vQuadUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FIT_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uSource;
  uniform mat3 uTransform;
  in vec2 vQuadUv;
  out vec4 fragColor;
  void main() {
    fragColor = texture(uSource, (uTransform * vec3(vQuadUv, 1.0)).xy);
  }
`;

/**
 * Their blur, transcribed -- including the reconstruction.
 *
 * `textureBicubic` is theirs verbatim: a Catmull-Rom-weighted four-tap read
 * that reconstructs a smooth surface from a mip level rather than magnifying
 * its texels, done at the level below and the level above and mixed. It is the
 * whole reason their blur reads as defocus at any strength while a trilinear
 * read of the same chain reads as blocks.
 */
const BLUR_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uSource;
  uniform float uAmount;
  uniform float uPosition;
  uniform vec2 uBounds;
  in vec2 vQuadUv;
  out vec4 fragColor;

  float w0(float a) { return (1.0 / 6.0) * (a * (a * (-a + 3.0) - 3.0) + 1.0); }
  float w1(float a) { return (1.0 / 6.0) * (a * a * (3.0 * a - 6.0) + 4.0); }
  float w2(float a) { return (1.0 / 6.0) * (a * (a * (-3.0 * a + 3.0) + 3.0) + 1.0); }
  float w3(float a) { return (1.0 / 6.0) * (a * a * a); }
  float g0(float a) { return w0(a) + w1(a); }
  float g1(float a) { return w2(a) + w3(a); }
  float h0(float a) { return -1.0 + w1(a) / (w0(a) + w1(a)); }
  float h1(float a) { return  1.0 + w3(a) / (w2(a) + w3(a)); }

  vec4 bicubic(sampler2D tex, vec2 uv, vec4 texelSize, float lod) {
    uv = uv * texelSize.zw + 0.5;
    vec2 iuv = floor(uv);
    vec2 fuv = fract(uv);

    float g0x = g0(fuv.x);
    float g1x = g1(fuv.x);
    float h0x = h0(fuv.x);
    float h1x = h1(fuv.x);
    float h0y = h0(fuv.y);
    float h1y = h1(fuv.y);

    vec2 p0 = (vec2(iuv.x + h0x, iuv.y + h0y) - 0.5) * texelSize.xy;
    vec2 p1 = (vec2(iuv.x + h1x, iuv.y + h0y) - 0.5) * texelSize.xy;
    vec2 p2 = (vec2(iuv.x + h0x, iuv.y + h1y) - 0.5) * texelSize.xy;
    vec2 p3 = (vec2(iuv.x + h1x, iuv.y + h1y) - 0.5) * texelSize.xy;

    return g0(fuv.y) * (g0x * textureLod(tex, p0, lod) + g1x * textureLod(tex, p1, lod))
         + g1(fuv.y) * (g0x * textureLod(tex, p2, lod) + g1x * textureLod(tex, p3, lod));
  }

  vec4 textureBicubic(sampler2D s, vec2 uv, float lod) {
    vec2 lodFloor = vec2(textureSize(s, int(lod)));
    vec2 lodCeil = vec2(textureSize(s, int(lod + 1.0)));
    vec4 lo = bicubic(s, uv, vec4(1.0 / lodFloor.x, 1.0 / lodFloor.y, lodFloor.x, lodFloor.y), floor(lod));
    vec4 hi = bicubic(s, uv, vec4(1.0 / lodCeil.x, 1.0 / lodCeil.y, lodCeil.x, lodCeil.y), ceil(lod));
    return mix(lo, hi, fract(lod));
  }

  float remapTo(float lo, float hi, float x) {
    return (x - lo) / (hi - lo);
  }

  void main() {
    float distanceToWipe = distance(vQuadUv.x, uPosition);
    float blurArea = remapTo(
      0.0,
      0.75,
      clamp(remapTo(uBounds.x, uBounds.y, distanceToWipe) * uAmount * 2.5, 0.0, 1.0)
    );
    /*
     * Darker where it is most blurred -- and NOT their vignette.
     *
     * Their shade multiplies in smoothstep(1.0, 0.9, |v - 0.5| * 2), which
     * blacks out the outer tenth of the top and bottom edges unconditionally,
     * at any fold. It belongs to their pipeline because the target it shades
     * has already had a rounded display boundary and a black surround
     * composited into it -- the vignette is darkening a frame.
     *
     * We composite no frame. The same term darkens the user's screenshot
     * instead, which reads as a black band along the top edge that never goes
     * away however far the lid is opened. Dropped rather than faded out with
     * the fold, because there is nothing here for it to be shading.
     */
    float shade = smoothstep(1.3, 0.9, blurArea);
    fragColor = textureBicubic(uSource, vQuadUv, blurArea * ${MAX_BLUR}.0) * vec4(vec3(shade), 1.0);
  }
`;

export type FoldBlur = {
  /** The texture to bind to the panel, once `render` has run. */
  readonly output: Texture;
  /**
   * Redraw both passes for a given closedness.
   *
   * Returns false when there is nothing to draw -- no source yet, or the
   * source has no decoded image. The caller leaves the panel on whatever it
   * was showing rather than binding an empty target.
   */
  render(renderer: WebGLRenderer, source: Texture | null, shut: number): boolean;
  dispose(): void;
};

/**
 * @param aspect the panel's own width/height, which the targets take. The
 * content is already fitted to it, so a target of any other shape would
 * squash what pass A drew.
 */
export function createFoldBlur(kind: FoldScreenKind, aspect: number): FoldBlur {
  const width = aspect >= 1 ? SIZE : Math.round(SIZE * aspect);
  const height = aspect >= 1 ? Math.round(SIZE / aspect) : SIZE;

  const make = (mips: boolean) => {
    const target = new WebGLRenderTarget(width, height, {
      format: RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: mips,
      minFilter: mips ? LinearMipmapLinearFilter : LinearFilter,
      magFilter: LinearFilter,
    });
    target.texture.colorSpace = SRGBColorSpace;
    return target;
  };
  /*
   * Three targets, because the blur runs twice and each pass reads a mip
   * chain: the fitted copy, the half-way result, and the output. Only the last
   * is read at a single level, so only it can go without mips.
   */
  const fitted = make(true);
  const halfway = make(true);
  const blurred = make(false);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);

  const fitMaterial = new ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: FIT_FRAGMENT,
    glslVersion: GLSL3,
    uniforms: { uSource: { value: null }, uTransform: { value: new Matrix3() } },
    depthTest: false,
    depthWrite: false,
  });
  const blurMaterial = new ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: BLUR_FRAGMENT,
    glslVersion: GLSL3,
    uniforms: {
      uSource: { value: fitted.texture },
      uAmount: { value: 0 },
      uPosition: { value: kind === "inner" ? 1 : 0 },
      // Theirs, per panel: nothing happens across the first 45% of the inner
      // display, which is what makes the effect read as a fold rather than as
      // a defocus.
      uBounds: { value: kind === "inner" ? [0.45, 1] : [0, 0.9] },
    },
    depthTest: false,
    depthWrite: false,
  });

  const quad = new Mesh(geometry, fitMaterial);
  quad.frustumCulled = false;
  scene.add(quad);

  return {
    output: blurred.texture,
    render(renderer, source, shut) {
      const image = source?.image as { width?: number } | undefined;
      if (!source || !image?.width) return false;

      /*
       * The material's own transform, not a copy of offset and repeat.
       *
       * `Texture.matrix` is what three composes from offset, repeat, rotation
       * and centre, and it is the exact matrix the panel's shader would have
       * used. Rebuilding it from two of those four is how a rotated or
       * centred crop would silently come out somewhere else.
       */
      source.updateMatrix();
      fitMaterial.uniforms.uSource.value = source;
      fitMaterial.uniforms.uTransform.value.copy(source.matrix);

      const amount =
        kind === "inner"
          ? shut
          : // The cover's peaks mid-fold and at half depth: it is the panel
            // you are turning away from as the device opens.
            Math.max(0, Math.min(1, 1 - 2 * Math.abs(shut - 0.5))) * 0.5;
      blurMaterial.uniforms.uAmount.value = amount;

      const previous = renderer.getRenderTarget();
      quad.material = fitMaterial;
      renderer.setRenderTarget(fitted);
      renderer.render(scene, camera);
      /*
       * Then the blur, twice, the second pass reading the first.
       *
       * Not an optimisation to skip: one pass gives a ramp with the widest end
       * still showing the mip it came from, and the second is what carries it
       * the rest of the way to a gradient. It is how they do it.
       */
      quad.material = blurMaterial;
      blurMaterial.uniforms.uSource.value = fitted.texture;
      renderer.setRenderTarget(halfway);
      renderer.render(scene, camera);
      blurMaterial.uniforms.uSource.value = halfway.texture;
      renderer.setRenderTarget(blurred);
      renderer.render(scene, camera);
      // Restored rather than set to null: during an export this runs inside a
      // pass that owns a target of its own.
      renderer.setRenderTarget(previous);
      return true;
    },
    dispose() {
      fitted.dispose();
      halfway.dispose();
      blurred.dispose();
      geometry.dispose();
      fitMaterial.dispose();
      blurMaterial.dispose();
    },
  };
}
