"use client";

import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import { TextureLoader, SRGBColorSpace, Box3, Vector3, Shape, ShapeGeometry } from "three";
import type { Texture } from "three";
import { Leva } from "leva";

import { DEVICES, getDevice, type Device, type DeviceNotch } from "./devices";
import { getFinish } from "./finishes";
import { sampleAnimation, type Animation } from "./animation";
import { recolorBodyTexture } from "./bodyTexture";
import { StudioEnvironment } from "./StudioEnvironment";
import { isBlurActive, type BlurSettings } from "./blurStyles";
import type { Quat } from "./gyro/quaternion";

// Lazy so `postprocessing` only reaches the browser when a blur is switched
// on. It is by far the heaviest thing this feature can pull in.
const DepthOfFieldLayer = lazy(() => import("./DepthOfFieldLayer"));

import type React from "react";
import { MeshBasicMaterial, Quaternion } from "three";
import type { Group, Mesh, MeshStandardMaterial } from "three";

export type Phone3DRail = {
  previewSrc: string;
  previewLayout: { width: number; height: number };
  screenBounds: { leftPct: number; topPct: number; widthPct: number; heightPct: number };
  screenInset: { x: number; y: number };
};

// The phone body. Flip USE_GLB to false to fall back to the procedural
// RoundedBox, which is also what renders while this is still downloading.
//
// Shipped build is compressed from a 25.7MB source: textures resized to 512
// and re-encoded to WebP, geometry meshopt-compressed — 25.71MB → 594KB, a 94%
// cut with no change to the model itself. drei decodes meshopt by default, so
// the loader needs no configuration. To regenerate at higher texture detail:
//
//   npx @gltf-transform/cli optimize <src>.glb <out>.glb \
//     --texture-compress webp --texture-size 1024 --compress meshopt
//
// (1024 lands at ~1.4MB. Worth it only if the body reads soft at large sizes.)
const USE_GLB = true;

// Gate the Leva debug panel to development only.
const IS_DEV = process.env.NODE_ENV !== "production";

// Hide any mesh inside the GLB whose name OR material name contains one of
// these substrings — many phone models bake a placeholder screen into a mesh
// that would otherwise cover our React overlay. The Ranguel iPhone 17 Pro GLB
// uses material name "17ProMax_Screen" for the baked screen, so we match
// against material.name too (mesh names there are just "Plane.005").
// "oled" is what THIS model calls its screen material; the others are kept so
// a swapped-in model using the more common naming still gets caught. Miss the
// name and the model's baked wallpaper renders instead of the real screen.
// The screen's corner radius as a fraction of its width. iPhone glass is
// ~0.137 of the screen width; a plain rectangle reads instantly wrong because
// its square corners cross the body's rounded ones.
// Pulls the plane just inside the measured mesh. The bounds come from the
// model's own screen geometry, which sits flush with the bezel — without this
// the plane's edge and the body's edge fight for the same pixels.


// Darken these mesh/material names so the bottom-edge speaker grilles, port
// cutouts, and microphones read as deep recesses instead of pale gray dots
// under our directional lights.
const DARKEN_NAME_HINTS = [
  "speaker",
  "grille",
  "grill",
  "port",
  "lightning",
  "usb",
  "connector",
  "mic",
  "antenna",
];
const DARKEN_COLOR = "#050505";

const SCREEN_NATIVE_WIDTH = 402;
const SCREEN_NATIVE_HEIGHT = 874;

// Tunables — scene is in "world units"; viewport is ~1.1 units tall at default camera.
const PHONE_HEIGHT = 1.0;
const PHONE_DEPTH = 0.06;
const PHONE_CORNER_RADIUS = 0.055;
const PHONE_BODY_COLOR = "#1A1A1A";
const PHONE_BODY_METALNESS = 0.45;
const PHONE_BODY_ROUGHNESS = 0.55;

// Locked-in tuning for the Ranguel iPhone 17 Pro GLB.
const GLB_SCREEN_WIDTH_PCT = 0.93;
const GLB_SCREEN_HEIGHT_PCT = 0.99;
const GLB_SCREEN_OFFSET_X = 0;
const GLB_SCREEN_OFFSET_Y = 0;
const GLB_SCREEN_OFFSET_Z = 0;
const GLB_SCREEN_CENTER_Y_OFFSET = 0;

// Locked-in body material tuning. Colour, metalness and roughness now come
// from the selected finish in `finishes.ts`; what stays here is the part that
// is the same whichever colour the body is.
const BODY_EMISSIVE_COLOR = "#000000";
const BODY_EMISSIVE_INTENSITY = 1.2;
const BODY_ENV_MAP_INTENSITY = 2.1;
const BODY_OPACITY = 1;

// How much of the studio the front glass is allowed to mirror. Low: this is
// the difference between a screen that reads as glass and one that reads as a
// grey panel, and the rig is bright enough that even a little goes a long way.
const GLASS_ENV_MAP_INTENSITY = 0.32;


// Darken pass for speaker grilles, port cutouts, mics, antennas.
const DARKEN_EMISSIVE_COLOR = "#000000";
const DARKEN_EMISSIVE_INTENSITY = 0;
const DARKEN_METALNESS = 0;
const DARKEN_ROUGHNESS = 1;


/**
 * Hands the export path a way to take one frame on demand.
 *
 * Two things make this necessary. The loop is `frameloop="demand"`, so at any
 * given moment there may be no recent paint to read. And `preserveDrawingBuffer`
 * is off, so the buffer is only readable in the same tick it was drawn — which
 * is exactly what this does: render, then read, with nothing in between.
 *
 * `scale` lets export ask for a higher resolution than the editor is showing,
 * which is what replaces html-to-image's `pixelRatio`.
 */
export type StageCapture = (scale: number) => string | null;

function CaptureBridge({
  captureRef,
}: {
  captureRef?: React.MutableRefObject<StageCapture | null>;
}) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = (scale: number) => {
      const prevRatio = gl.getPixelRatio();
      try {
        gl.setPixelRatio(scale);
        gl.setSize(size.width, size.height, false);
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      } finally {
        // Restore before anything else can paint, or the editor is left
        // rendering at export resolution.
        gl.setPixelRatio(prevRatio);
        gl.setSize(size.width, size.height, false);
        gl.render(scene, camera);
      }
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, scene, camera, size, captureRef]);
  return null;
}

/**
 * Frame-by-frame access for video export.
 *
 * A still export can afford to set the resolution, render, read and restore
 * on every call. A recording cannot — that is two extra renders and a resize
 * per frame, thirty times a second. So the resolution is set once by `begin`
 * and held until `end`, and `frame` does the only two things that have to
 * happen per frame.
 *
 * `frame` hands the canvas to a callback rather than returning it, because
 * `preserveDrawingBuffer` is off: the buffer is only readable in the tick it
 * was drawn, and a callback is the shape that cannot be misused by holding
 * the reference and reading it later.
 */
export interface StageRecorder {
  begin(scale: number): { width: number; height: number };
  frame(draw: (source: HTMLCanvasElement) => void): void;
  end(): void;
}

function RecorderBridge({
  recorderRef,
}: {
  recorderRef?: React.MutableRefObject<StageRecorder | null>;
}) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    if (!recorderRef) return;
    let previousRatio: number | null = null;

    recorderRef.current = {
      begin(scale: number) {
        previousRatio = gl.getPixelRatio();
        gl.setPixelRatio(scale);
        gl.setSize(size.width, size.height, false);
        return {
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        };
      },
      frame(draw) {
        gl.render(scene, camera);
        draw(gl.domElement);
      },
      end() {
        if (previousRatio === null) return;
        gl.setPixelRatio(previousRatio);
        gl.setSize(size.width, size.height, false);
        gl.render(scene, camera);
        previousRatio = null;
      },
    };
    return () => {
      recorderRef.current = null;
    };
  }, [gl, scene, camera, size, recorderRef]);
  return null;
}

function CanvasRefBridge({
  canvasRef,
}: {
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const { gl } = useThree();
  useEffect(() => {
    if (canvasRef) canvasRef.current = gl.domElement;
    return () => {
      if (canvasRef && canvasRef.current === gl.domElement) {
        canvasRef.current = null;
      }
    };
  }, [gl, canvasRef]);
  return null;
}

/**
 * Keeps a video screen moving.
 *
 * The canvas runs `frameloop="demand"`, which is what keeps a still mockup
 * from redrawing sixty times a second at nothing — but a video screen is
 * exactly the case where the scene changes without any React state changing,
 * so nothing would ever ask for the next frame and the clip would sit on
 * whichever frame happened to be decoded first.
 *
 * Requesting the next frame from inside a frame is the same self-sustaining
 * loop the transform easing uses; it stops the moment the texture is not a
 * video, so a still screen costs nothing.
 */
function VideoFrameDriver({ texture }: { texture: Texture | null }) {
  const isVideo = Boolean((texture as { isVideoTexture?: boolean } | null)?.isVideoTexture);
  useFrame((state) => {
    if (isVideo) state.invalidate();
  });
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function PointerDragRotation({
  onRotateChange,
  onScaleChange,
}: {
  onRotateChange: (delta: { dx: number; dy: number }) => void;
  onScaleChange?: (deltaPct: number) => void;
}) {
  const { gl } = useThree();

  // Callers pass inline arrows, so these props get a new identity on every
  // render. Latching them in a ref keeps the effect below depending on `gl`
  // alone: the listeners must outlive the re-render that the very first
  // pointermove triggers, or the drag state resets and the gesture dies one
  // pixel in.
  const rotateRef = useRef(onRotateChange);
  const scaleRef = useRef(onScaleChange);
  useEffect(() => {
    rotateRef.current = onRotateChange;
    scaleRef.current = onScaleChange;
  });

  // Refs rather than closure locals for the same reason — a re-subscribe must
  // not lose an in-flight drag.
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(-1);
  const lastRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const target = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      draggingRef.current = true;
      pointerIdRef.current = e.pointerId;
      lastRef.current = { x: e.clientX, y: e.clientY };
      target.setPointerCapture(e.pointerId);
      target.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
      const dx = e.clientX - lastRef.current.x;
      const dy = e.clientY - lastRef.current.y;
      lastRef.current = { x: e.clientX, y: e.clientY };
      rotateRef.current({ dx, dy });
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return;
      draggingRef.current = false;
      pointerIdRef.current = -1;
      target.style.cursor = "grab";
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!scaleRef.current) return;
      e.preventDefault();
      // Negative deltaY = wheel up / pinch out = zoom in (increase scale).
      // Trackpad pinches dispatch wheel events with ctrlKey=true; treat both
      // the same so a single handler covers wheel and pinch.
      const step = e.ctrlKey ? -e.deltaY * 0.5 : -e.deltaY * 0.15;
      scaleRef.current(step);
    };

    target.style.cursor = "grab";
    target.style.touchAction = "none";
    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
    target.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      target.removeEventListener("pointerdown", onDown);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      target.removeEventListener("wheel", onWheel);
      target.style.cursor = "";
    };
  }, [gl]);
  return null;
}

function ProceduralPhoneBody({ width, height }: { width: number; height: number }) {
  return (
    <RoundedBox
      args={[width, height, PHONE_DEPTH]}
      radius={PHONE_CORNER_RADIUS}
      smoothness={4}
      creaseAngle={0.4}
    >
      <meshStandardMaterial
        color={PHONE_BODY_COLOR}
        metalness={PHONE_BODY_METALNESS}
        roughness={PHONE_BODY_ROUGHNESS}
      />
    </RoundedBox>
  );
}

function PhoneFrontDecal({
  src,
  width,
  height,
  z,
}: {
  src: string;
  width: number;
  height: number;
  z: number;
}) {
  const texture = useLoader(TextureLoader, src);
  texture.colorSpace = SRGBColorSpace;
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/**
 * A rounded rectangle with UVs remapped to 0..1.
 *
 * `ShapeGeometry` derives UVs from raw shape coordinates, which for a shape
 * centred on the origin runs negative — the texture would sample outside its
 * range and tile. Remapping against the shape's own extents is what makes the
 * screenshot land exactly once, filling the plane.
 */
function makeRoundedRect(width: number, height: number, radius: number) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.max(0, Math.min(radius, w, h));
  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const geometry = new ShapeGeometry(shape, 16);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + w) / width, (pos.getY(i) + h) / height);
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * The phone's screen, as geometry.
 *
 * This replaces a drei `<Html transform>` overlay. Being inside the scene is
 * what lets a post-processing pass blur it, lets `gl.domElement.toBlob()`
 * capture it, and lets the canvas stop redrawing when nothing moves — none of
 * which are possible while the screen is DOM floating in front of the canvas.
 *
 * `toneMapped={false}` because the screen is emissive UI, not a lit surface:
 * tone mapping would crush its whites toward the phone body's exposure.
 */
function ScreenPlane({
  texture,
  width,
  height,
  position,
  facing = 1,
  cornerRadiusPct,
  insetPct,
}: {
  texture: Texture | null;
  width: number;
  height: number;
  position: [number, number, number];
  /** +1 when the screen is on the +Z face, -1 when it is on -Z. */
  facing?: 1 | -1;
  cornerRadiusPct: number;
  insetPct: number;
}) {
  const geometry = useMemo(
    () =>
      makeRoundedRect(
        width * insetPct,
        height * insetPct,
        width * insetPct * cornerRadiusPct,
      ),
    [width, height, insetPct, cornerRadiusPct],
  );
  // Fit the image to THIS plane. Both halves of the sum live here and nowhere
  // else: the plane's aspect comes from the model's measured screen, and the
  // image's from the file. Fitting against the authored 402x874 instead is what
  // was cropping the right-hand edge off screenshots.
  useEffect(() => {
    if (!texture?.image) return;
    const img = texture.image as { width: number; height: number };
    if (!img.width || !img.height) return;
    const planeAspect = width / height;
    const srcAspect = img.width / img.height;
    if (Math.abs(srcAspect - planeAspect) < 0.001) {
      texture.repeat.set(1, 1);
      texture.offset.set(0, 0);
    } else if (srcAspect > planeAspect) {
      // Image is wider: keep full height, trim the sides evenly.
      const scale = planeAspect / srcAspect;
      texture.repeat.set(scale, 1);
      texture.offset.set((1 - scale) / 2, 0);
    } else {
      // Image is taller: keep full width, trim top and bottom evenly.
      const scale = srcAspect / planeAspect;
      texture.repeat.set(1, scale);
      texture.offset.set(0, (1 - scale) / 2);
    }
    texture.needsUpdate = true;
  }, [texture, width, height]);

  if (!texture) return null;
  return (
    <mesh
      position={position}
      geometry={geometry}
      // A plane's front is +Z. On a -Z screen it has to be turned around, or
      // it faces into the phone and the texture reads mirrored.
      rotation={[0, facing === -1 ? Math.PI : 0, 0]}
    >
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  );
}

/**
 * The notch, also as geometry.
 *
 * It used to be a `<div>` inside the `<Html>` overlay. Keeping it in the scene
 * rather than baking it into the screen texture means its constants stay here
 * next to the rest of the phone's proportions, and it keeps its own depth so
 * it never z-fights the screen it sits on.
 */
function NotchPlane({
  notch,
  native,
  screenWidth,
  screenHeight,
  screenCenterX,
  screenCenterY,
  z,
}: {
  notch: DeviceNotch;
  native: { width: number; height: number };
  screenWidth: number;
  screenHeight: number;
  screenCenterX: number;
  screenCenterY: number;
  z: number;
}) {
  const w = (notch.widthPx / native.width) * screenWidth * notch.scale;
  const h = (notch.heightPx / native.height) * screenHeight * notch.scale;
  const topY = screenCenterY + screenHeight / 2;
  const y =
    topY -
    ((notch.topPx + notch.offsetYPx) / native.height) * screenHeight -
    h / 2;
  const x = screenCenterX + (notch.offsetXPx / native.width) * screenWidth;
  return (
    <RoundedBox
      args={[w, h, 0.001]}
      radius={Math.min(h / 2, (notch.borderRadiusPx / native.height) * screenHeight)}
      smoothness={3}
      position={[x, y, z]}
    >
      <meshBasicMaterial color="#000000" toneMapped={false} />
    </RoundedBox>
  );
}

// Preload every registered device. The list is small and the models are all
// under 1MB compressed, so warming them up front costs less than a visible
// stall the first time someone switches device.
DEVICES.forEach((d) => useGLTF.preload(d.modelPath));

function GLBPhoneScene({
  screenTexture,
  device,
  finishId,
}: {
  screenTexture: Texture | null;
  device: Device;
  finishId?: string;
}) {
  const { color: bodyColor, metalness: bodyMetalness, roughness: bodyRoughness } =
    getFinish(finishId);
  const gltf = useGLTF(device.modelPath);
  const { scene, width, height, depth, screen, screenMaterials } = useMemo(() => {
    const cloned = gltf.scene.clone(true) as Group;
    const screenLocalBox = new Box3().makeEmpty();
    // Materials the screen texture gets bound onto, for models that carry a
    // real screen. Built per instance so two devices on screen at once do not
    // share one map.
    const screenMaterials: MeshBasicMaterial[] = [];
    // Hide any mesh that looks like a baked screen / display so our React
    // overlay isn't competing with a placeholder texture.
    cloned.traverse((child) => {
      const m = child as Mesh & {
        name?: string;
        isMesh?: boolean;
        material?: { name?: string } | Array<{ name?: string }>;
      };
      if (!m.isMesh) return;
      const names: string[] = [];
      if (typeof m.name === "string") names.push(m.name);
      const mat = m.material;
      if (mat) {
        if (Array.isArray(mat)) {
          mat.forEach((entry) => {
            if (entry && typeof entry.name === "string") names.push(entry.name);
          });
        } else if (typeof mat.name === "string") {
          names.push(mat.name);
        }
      }
      const lowerNames = names.map((n) => n.toLowerCase());

      // Preferred path: the model has its own screen material, so bind to it
      // rather than hiding geometry and rebuilding it in front.
      if (device.screenMaterial) {
        const target = device.screenMaterial.toLowerCase();
        // Exact match, not substring — this model also has "OLED off", and a
        // substring test would bind the screen to the powered-down layer too.
        if (lowerNames.includes(target)) {
          // The screen is swapped to an UNLIT material rather than having the
          // model's own physical one retuned.
          //
          // A screen is not a surface being lit, it is an image. Every knob a
          // MeshStandardMaterial offers here is one that can only take the
          // render further from the screenshot that went in — and the model
          // authors this one at roughness 0.057, a mirror, whose Fresnel
          // climbs toward full reflection off-axis and laid the whole studio
          // rig over the screen as a grey veil at any angle but head-on.
          // Zeroing `envMapIntensity` did not settle it; the shading model is
          // simply the wrong tool for a pane that emits a picture.
          //
          // MeshBasicMaterial samples the texture and stops. No lights, no
          // reflection, no Fresnel, no view dependence, and nothing to
          // calibrate: what goes in is what renders. The front glass sitting
          // over it still catches the room, so the phone does not read flat.
          const bind = (entry: unknown) => {
            const source = entry as MeshStandardMaterial | undefined;
            const basic = new MeshBasicMaterial({
              // Not tone mapped, for the same reason: ACES would roll off the
              // screenshot's highlights and desaturate it.
              toneMapped: false,
              side: source?.side,
            });
            basic.name = source?.name ?? "screen";
            screenMaterials.push(basic);
            return basic;
          };
          if (Array.isArray(m.material)) {
            m.material = m.material.map((entry) => bind(entry)) as never;
          } else {
            m.material = bind(m.material) as never;
          }
          screenLocalBox.union(new Box3().setFromObject(m));
          return;
        }
      }

      const matchHide = lowerNames.some((n) =>
        device.hideHints.some((h) => n.includes(h)),
      );
      if (matchHide) {
        // Measure it before hiding. The model's own screen mesh is the only
        // reliable statement of where the screen IS — its size, its position,
        // and crucially which way it faces. Assuming +Z put the screen and the
        // notch on the BACK of this model, because its screen faces -Z.
        screenLocalBox.union(new Box3().setFromObject(m));
        m.visible = false;
        return;
      }
      const matchDarken = lowerNames.some((n) =>
        DARKEN_NAME_HINTS.some((h) => n.includes(h)),
      );
      if (matchDarken) {
        const darkenMaterial = (mat: unknown) => {
          const candidate = mat as {
            clone?: () => unknown;
            color?: { set?: (hex: string) => void };
            metalness?: number;
            roughness?: number;
            emissive?: { set?: (hex: string) => void };
            emissiveIntensity?: number;
            map?: unknown;
          };
          if (typeof candidate.clone !== "function") return mat;
          const next = candidate.clone() as typeof candidate;
          next.color?.set?.(DARKEN_COLOR);
          if ("metalness" in next) next.metalness = DARKEN_METALNESS;
          if ("roughness" in next) next.roughness = DARKEN_ROUGHNESS;
          next.emissive?.set?.(DARKEN_EMISSIVE_COLOR);
          if ("emissiveIntensity" in next) next.emissiveIntensity = DARKEN_EMISSIVE_INTENSITY;
          // Drop the diffuse map so the texture's pale grays don't bleed
          // through the color tint.
          if ("map" in next) (next as { map?: unknown }).map = null;
          return next;
        };
        const mat = m.material as unknown;
        if (Array.isArray(mat)) {
          (m as Mesh).material = mat.map(darkenMaterial) as unknown as Mesh["material"];
        } else if (mat) {
          (m as Mesh).material = darkenMaterial(mat) as unknown as Mesh["material"];
        }
        return;
      }
      const tintMaterial = (mat: unknown) => {
        const candidate = mat as {
          clone?: () => unknown;
          color?: { set?: (hex: string) => void };
          map?: Texture | null;
          metalness?: number;
          roughness?: number;
          emissive?: { set?: (hex: string) => void };
          emissiveIntensity?: number;
          envMapIntensity?: number;
          opacity?: number;
          transparent?: boolean;
        };
        if (typeof candidate.clone !== "function") return mat;

        // Anything the model authored as blended is an overlay, not body: on
        // this iPhone it is the glass sheet sitting over the screen. Tinting
        // it body-grey and forcing `transparent = false` turned that sheet
        // opaque and buried the screen behind it — an uploaded screenshot
        // bound onto the OLED material perfectly and then rendered as a black
        // slab. So an overlay keeps its colour, its alpha and its maps.
        //
        // Its ENVIRONMENT response is ours to set, though, and it has to be:
        // at full strength the sheet mirrors the whole studio rig and the
        // screen turns into a flat milky grey at any angle off head-on. Glass
        // catches a hint of the room, not a copy of it.
        if (candidate.transparent) {
          if (typeof candidate.clone !== "function") return mat;
          const glass = candidate.clone() as typeof candidate;
          if ("envMapIntensity" in glass) {
            glass.envMapIntensity = GLASS_ENV_MAP_INTENSITY;
          }
          return glass;
        }

        const next = candidate.clone() as typeof candidate;

        // Two ways a body material carries its colour, and they need opposite
        // treatment. A plain factor is retinted by setting `color`. A base
        // colour MAP has to be rebuilt instead — multiplying it by the finish
        // would drag every texel along with the body, which is what left the
        // Apple logo brown in the grey finishes. The map already holds the
        // final colour once rebuilt, so `color` stays white.
        if (next.map && device.authoredBodyColor) {
          next.map = recolorBodyTexture(
            next.map,
            device.authoredBodyColor,
            bodyColor,
          );
          next.color?.set?.("#ffffff");
        } else {
          next.color?.set?.(bodyColor);
        }
        if ("metalness" in next) next.metalness = bodyMetalness;
        if ("roughness" in next) next.roughness = bodyRoughness;
        next.emissive?.set?.(BODY_EMISSIVE_COLOR);
        if ("emissiveIntensity" in next) next.emissiveIntensity = BODY_EMISSIVE_INTENSITY;
        if ("envMapIntensity" in next) next.envMapIntensity = BODY_ENV_MAP_INTENSITY;
        if ("opacity" in next) next.opacity = BODY_OPACITY;
        if ("transparent" in next) next.transparent = BODY_OPACITY < 1;
        return next;
      };
      const mat2 = m.material as unknown;
      if (Array.isArray(mat2)) {
        (m as Mesh).material = mat2.map(tintMaterial) as unknown as Mesh["material"];
      } else if (mat2) {
        (m as Mesh).material = tintMaterial(mat2) as unknown as Mesh["material"];
      }
    });
    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    box.getSize(size);
    const center = new Vector3();
    box.getCenter(center);
    const scaleFactor = size.y > 0 ? PHONE_HEIGHT / size.y : 1;
    cloned.scale.setScalar(scaleFactor);
    cloned.position.set(
      -center.x * scaleFactor,
      -center.y * scaleFactor,
      -center.z * scaleFactor,
    );
    // Same transform the scene gets: recentre on the body, then scale.
    let screen: {
      width: number;
      height: number;
      center: Vector3;
      facing: 1 | -1;
    } | null = null;
    if (!screenLocalBox.isEmpty()) {
      const sSize = new Vector3();
      screenLocalBox.getSize(sSize);
      const sCenter = new Vector3();
      screenLocalBox.getCenter(sCenter);
      const worldCenter = sCenter.sub(center).multiplyScalar(scaleFactor);
      screen = {
        width: sSize.x * scaleFactor,
        height: sSize.y * scaleFactor,
        center: worldCenter,
        // Which face the screen sits on, relative to the recentred body.
        facing: worldCenter.z >= 0 ? 1 : -1,
      };
    }

    return {
      scene: cloned,
      width: size.x * scaleFactor,
      height: size.y * scaleFactor,
      depth: size.z * scaleFactor,
      screen,
      screenMaterials,
    };
  }, [gltf.scene, device, bodyColor, bodyMetalness, bodyRoughness]);

  // Bind the live screen texture onto the model's own screen material.
  //
  // glTF authors UVs for flipY = false, but TextureLoader and CanvasTexture
  // both default to true — leave it and the screenshot renders upside down.
  const invalidate = useThree((state) => state.invalidate);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  useEffect(() => {
    if (!screenMaterials.length) return;
    /* eslint-disable react-hooks/immutability -- three.js state lives on the
       objects themselves: assigning a map and raising needsUpdate is the only
       way to rebind a material. Both the texture and the materials are owned
       by this component, so nothing outside it observes the mutation. */
    for (const material of screenMaterials) {
      if (screenTexture) {
        screenTexture.flipY = false;
        // The renderer's maximum, not a guessed 4. The screen is the one
        // surface guaranteed to be viewed at a slant, and anisotropy is
        // exactly the setting that decides whether a screenshot stays legible
        // there or smears into mush.
        screenTexture.anisotropy = maxAnisotropy;
        // Mirror about the centre rather than by offsetting: `center` makes
        // a negative repeat flip in place, so the UVs stay inside 0..1 and
        // the wrap mode does not have to change with it.
        screenTexture.center.set(0.5, 0.5);
        screenTexture.repeat.set(device.screenFlipX ? -1 : 1, 1);
        screenTexture.colorSpace = SRGBColorSpace;
        screenTexture.needsUpdate = true;
      }
      material.map = screenTexture;
      // No source: the screen is off. Near-black rather than pure, so the
      // glass over it still has something to sit on.
      material.color.set(screenTexture ? 0xffffff : 0x050505);
      material.needsUpdate = true;
    }
    /* eslint-enable react-hooks/immutability */
    invalidate();
  }, [screenMaterials, screenTexture, device, invalidate, maxAnisotropy]);

  // Placement comes from the model's own screen mesh where there is one, and
  // falls back to the old percentage guesses only if a model ships without a
  // recognisable screen. `facing` is what stops the screen and notch landing
  // on the back of a model whose screen faces -Z.
  const facing = screen?.facing ?? 1;
  const screenWidth = screen
    ? screen.width
    : width * GLB_SCREEN_WIDTH_PCT;
  const screenHeight = screen
    ? screen.height
    : height * GLB_SCREEN_HEIGHT_PCT;
  const screenCenterX = screen ? screen.center.x : GLB_SCREEN_OFFSET_X;
  const screenCenterY = screen
    ? screen.center.y
    : height * GLB_SCREEN_CENTER_Y_OFFSET + GLB_SCREEN_OFFSET_Y;
  // Sit just proud of the glass so it never z-fights the body.
  const frontZ = screen
    ? screen.center.z + facing * GLB_SCREEN_OFFSET_Z
    : depth / 2 + GLB_SCREEN_OFFSET_Z;

  // A bound screen needs no plane in front of it, and drawing one anyway
  // would cover the model's own rounded corners with a flat quad.
  const isBound = screenMaterials.length > 0;

  return (
    <>
      <primitive object={scene} />
      {isBound ? null : (
        <ScreenPlane
          texture={screenTexture}
          width={screenWidth}
          height={screenHeight}
          position={[screenCenterX, screenCenterY, frontZ]}
          facing={facing}
          cornerRadiusPct={device.screenCornerRadiusPct}
          insetPct={device.screenInsetPct}
        />
      )}
      {!isBound && device.notch ? (
        <NotchPlane
          notch={device.notch}
          native={device.screenNative}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          screenCenterX={screenCenterX}
          screenCenterY={screenCenterY}
          z={frontZ + facing * 0.0015}
        />
      ) : null}
    </>
  );
}

function ProceduralPhoneScene({
  rail,
  screenTexture,
  device,
}: {
  rail: Phone3DRail | undefined;
  screenTexture: Texture | null;
  device: Device;
}) {
  const aspect = rail
    ? rail.previewLayout.width / rail.previewLayout.height
    : SCREEN_NATIVE_WIDTH / SCREEN_NATIVE_HEIGHT;
  const bodyHeight = PHONE_HEIGHT;
  const bodyWidth = bodyHeight * aspect;
  const frontZ = PHONE_DEPTH / 2 + 0.001;
  const overlayZ = PHONE_DEPTH / 2 + 0.002;

  const screenWidthFrac = rail
    ? rail.screenBounds.widthPct / 100 -
      (2 * rail.screenInset.x) / rail.previewLayout.width
    : 0.92;
  const screenHeightFrac = rail
    ? rail.screenBounds.heightPct / 100 -
      (2 * rail.screenInset.y) / rail.previewLayout.height
    : 0.92;
  const screenCenterXFrac = rail
    ? rail.screenBounds.leftPct / 100 +
      rail.screenInset.x / rail.previewLayout.width +
      screenWidthFrac / 2 -
      0.5
    : 0;
  const screenCenterYFrac = rail
    ? -(
        rail.screenBounds.topPct / 100 +
        rail.screenInset.y / rail.previewLayout.height +
        screenHeightFrac / 2 -
        0.5
      )
    : 0;
  const screenWorldWidth = bodyWidth * screenWidthFrac;
  const screenCenterX = bodyWidth * screenCenterXFrac;
  const screenCenterY = bodyHeight * screenCenterYFrac;

  return (
    <>
      <ProceduralPhoneBody width={bodyWidth} height={bodyHeight} />
      {rail ? (
        <Suspense fallback={null}>
          <PhoneFrontDecal
            src={rail.previewSrc}
            width={bodyWidth}
            height={bodyHeight}
            z={frontZ}
          />
        </Suspense>
      ) : null}
      <ScreenPlane
        texture={screenTexture}
        width={screenWorldWidth}
        height={
          screenWorldWidth *
          (device.screenNative.height / device.screenNative.width)
        }
        position={[screenCenterX, screenCenterY, overlayZ]}
        cornerRadiusPct={device.screenCornerRadiusPct}
        insetPct={device.screenInsetPct}
      />
    </>
  );
}

// Critical-damped easing time constant in seconds. Applied to every transform
// (scale, position, rotation) so the entire phone motion — auto-driven step
// transitions, slider input, and cursor-drag rotation — moves through the
// same smoothing pipeline and never snaps.
const TRANSFORM_EASE_TIME = 0.18;

/** Scratch target for the live-pose slerp. Module scope so the frame loop
    does not allocate a quaternion sixty times a second. */
const LIVE_TARGET = new Quaternion();

/**
 * The GLB is authored facing away from the camera, so something has to turn it
 * around before you can see the screen. In manual mode that something is
 * `DEFAULT_EDITOR_STATE.yAxis`, which is 180 for exactly this reason.
 *
 * A live pose replaces the rotation outright rather than adding to it, so it
 * skipped that correction and the phone showed its back. Composing the facing
 * in here — local-side, so it is applied before the device orientation — puts
 * the screen front-on at rest and leaves the tilt behaviour untouched.
 */
const MODEL_FACING = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

function PhoneScene({
  rail,
  screenTexture,
  device,
  rotateX,
  rotateY,
  rotateZ,
  offsetX,
  offsetY,
  scale,
  heightPct,
  finishId,
  immediate,
  animation,
  timeRef,
  playing,
  livePose,
}: {
  rail: Phone3DRail | undefined;
  screenTexture: Texture | null;
  device: Device;
  finishId?: string;
  immediate?: boolean;
  animation?: Animation;
  timeRef?: React.MutableRefObject<number>;
  playing?: boolean;
  /**
   * A real phone's orientation, when one is paired. Sampled here in the frame
   * loop for the same reason playback is: at 30 samples a second, routing it
   * through React would re-render the whole editor instead of the scene.
   *
   * Applied to the group's quaternion rather than to its Euler angles — the
   * feed is already a quaternion, and converting to Euler to ease it would
   * reintroduce exactly the gimbal lock the quaternion exists to avoid.
   */
  livePose?: React.RefObject<Quat> | null;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  heightPct: number;
}) {
  const rad = Math.PI / 180;
  const groupRef = useRef<Group>(null);

  const targetSizeScale = (heightPct / 100) * (scale / 100);
  const targetOffsetX = (offsetX / 500) * PHONE_HEIGHT;
  const targetOffsetY = -(offsetY / 500) * PHONE_HEIGHT;
  const targetRX = rotateX * rad;
  const targetRY = rotateY * rad;
  const targetRZ = rotateZ * rad;

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.scale.setScalar(targetSizeScale);
    g.position.set(targetOffsetX, targetOffsetY, 0);
    g.rotation.set(targetRX, targetRY, targetRZ);
    // Snap to current targets on mount so the first frame doesn't pop from
    // identity to the live values. Only runs once — subsequent prop changes
    // are smoothed by the useFrame below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The canvas runs `frameloop="demand"`, so a frame only happens when
  // something asks for one. This loop therefore has to request the NEXT frame
  // for as long as it is still easing, and stop asking once it has settled —
  // that is what makes the field completely still during a hold instead of
  // redrawing 60 times a second at nothing.
  useFrame((state, dt) => {
    const g = groupRef.current;
    if (!g) return;

    // While playing, the pose is sampled HERE rather than arriving as props.
    //
    // Routing playback through React state meant a re-render of the entire
    // editor — every panel row, the whole timeline — sixty times a second,
    // and the frame budget went on reconciliation instead of rendering. The
    // animation is a function of one number, so reading that number from a
    // ref inside the frame loop keeps React out of it entirely.
    let rx = targetRX;
    let ry = targetRY;
    let rz = targetRZ;
    let ox = targetOffsetX;
    let oy = targetOffsetY;
    let sz = targetSizeScale;
    if (playing && animation && timeRef) {
      const pose = sampleAnimation(animation, timeRef.current);
      if (pose.xAxis !== undefined) rx = pose.xAxis * rad;
      if (pose.yAxis !== undefined) ry = pose.yAxis * rad;
      if (pose.zAxis !== undefined) rz = pose.zAxis * rad;
      if (pose.panX !== undefined) ox = (pose.panX * 100 / 500) * PHONE_HEIGHT;
      if (pose.panY !== undefined) oy = -(pose.panY * 100 / 500) * PHONE_HEIGHT;
      if (pose.zoom !== undefined) sz = (heightPct / 100) * pose.zoom;
      // Demand loop: ask for the next frame or playback stops after one.
      state.invalidate();
    }

    // Playback and export ask for the pose they were given, exactly. The
    // easing below is a lag filter: lovely on a slider nudge, but during an
    // animation it trails every keyframe by its time constant and quietly
    // rounds off the extremes that were keyed on purpose.
    const k = immediate ? 1 : 1 - Math.exp(-dt / TRANSFORM_EASE_TIME);
    const s = g.scale.x;
    g.scale.setScalar(s + (sz - s) * k);
    g.position.x += (ox - g.position.x) * k;
    g.position.y += (oy - g.position.y) * k;

    const live = livePose?.current;
    if (live) {
      // Same easing constant as every other transform, so the phone answers a
      // real tilt with the same weight it answers a slider.
      LIVE_TARGET.set(live.x, live.y, live.z, live.w).multiply(MODEL_FACING);
      g.quaternion.slerp(LIVE_TARGET, k);
      // A live feed never settles, so it drives the demand loop itself.
      state.invalidate();
    } else {
      g.rotation.x += (rx - g.rotation.x) * k;
      g.rotation.y += (ry - g.rotation.y) * k;
      g.rotation.z += (rz - g.rotation.z) * k;
    }

    // Settled is measured against the largest remaining delta rather than each
    // axis separately: rotation in radians and scale in units are different
    // magnitudes, and stopping on whichever finishes first leaves the others
    // frozen mid-move.
    const settled =
      !live &&
      Math.abs(sz - g.scale.x) < 1e-4 &&
      Math.abs(ox - g.position.x) < 1e-4 &&
      Math.abs(oy - g.position.y) < 1e-4 &&
      Math.abs(rx - g.rotation.x) < 1e-4 &&
      Math.abs(ry - g.rotation.y) < 1e-4 &&
      Math.abs(rz - g.rotation.z) < 1e-4;
    if (!settled) state.invalidate();
  });

  // Any target change wakes the loop back up. Without this a slider move would
  // set a new target that nothing ever renders towards.
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [
    invalidate,
    targetSizeScale,
    targetOffsetX,
    targetOffsetY,
    targetRX,
    targetRY,
    targetRZ,
  ]);

  return (
    <group ref={groupRef}>
      {USE_GLB ? (
        <Suspense
          fallback={
            <ProceduralPhoneScene
              rail={rail}
              screenTexture={screenTexture}
              device={device}
            />
          }
        >
          <GLBPhoneScene
            screenTexture={screenTexture}
            device={device}
            finishId={finishId}
          />
        </Suspense>
      ) : (
        <ProceduralPhoneScene
          rail={rail}
          screenTexture={screenTexture}
          device={device}
        />
      )}
    </group>
  );
}

export default function PhoneStage3D({
  rail,
  screenTexture,
  deviceId,
  blur,
  rotateX,
  rotateY,
  rotateZ,
  offsetX,
  offsetY,
  scale,
  heightPct,
  finishId,
  immediate,
  animation,
  timeRef,
  playing,
  livePose,
  canvasRef,
  captureRef,
  recorderRef,
  onRotateDrag,
  onScaleWheel,
}: {
  rail: Phone3DRail | undefined;
  screenTexture: Texture | null;
  /** Registry id; falls back to the first device if unrecognised. */
  deviceId?: string;
  /** Lens settings; mode "off" or zero strength renders no composer at all. */
  blur: BlurSettings;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  heightPct: number;
  /** Body finish id from `finishes.ts`; falls back to the first entry. */
  finishId?: string;
  /** Snap to the given transform instead of easing toward it. */
  immediate?: boolean;
  /** Sampled inside the frame loop while `playing`, bypassing React. */
  animation?: Animation;
  timeRef?: React.MutableRefObject<number>;
  playing?: boolean;
  /** A paired phone's live orientation. Overrides the rotation props while
      present — see the note on PhoneScene. */
  livePose?: React.RefObject<Quat> | null;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  captureRef?: React.MutableRefObject<StageCapture | null>;
  /** Frame-by-frame access, for recording video. */
  recorderRef?: React.MutableRefObject<StageRecorder | null>;
  onRotateDrag?: (delta: { dx: number; dy: number }) => void;
  /** Wheel / trackpad pinch over the canvas, in scale percentage points. */
  onScaleWheel?: (deltaPct: number) => void;
}) {
  const device = getDevice(deviceId);
  return (
    <>
      {IS_DEV ? (
        <Leva
          oneLineLabels
          hideCopyButton
          collapsed
          titleBar={{ title: "Mobile GLB", drag: true, filter: false }}
        />
      ) : null}
      <Canvas
        className="!h-full !w-full"
        camera={{ position: [0, 0, 1.8], fov: 38 }}
        // `preserveDrawingBuffer` is gone with the html-to-image export that
        // needed it: export now renders on demand and reads the buffer in the
        // same tick, so the driver is free to discard it as usual.
        gl={{
          alpha: true,
          premultipliedAlpha: false,
          // Explicit rather than relying on a default. Every silhouette in
          // this scene is a long, near-vertical, high-contrast edge — the
          // worst case for aliasing — and the phone's chamfer is a one-pixel
          // highlight that turns into a dotted line without it.
          antialias: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
        // Retina, not 1.5x. The old cap was set when the body was a smooth
        // procedural box; against a real model with a machined edge running
        // its whole length, rendering below the display's native density is
        // visible as a soft, faintly stepped outline.
        dpr={[1, 2]}
        frameloop="demand"
      >
        <CanvasRefBridge canvasRef={canvasRef} />
        <CaptureBridge captureRef={captureRef} />
        <RecorderBridge recorderRef={recorderRef} />
        <VideoFrameDriver texture={screenTexture} />
        {onRotateDrag ? (
          <PointerDragRotation
            onRotateChange={onRotateDrag}
            onScaleChange={onScaleWheel}
          />
        ) : null}
        <StudioEnvironment />
        <PhoneScene
          rail={rail}
          screenTexture={screenTexture}
          device={device}
          rotateX={rotateX}
          rotateY={rotateY}
          rotateZ={rotateZ}
          offsetX={offsetX}
          offsetY={offsetY}
          scale={scale}
          heightPct={heightPct}
          finishId={finishId}
          immediate={immediate}
          animation={animation}
          timeRef={timeRef}
          playing={playing}
          livePose={livePose}
        />
        {isBlurActive(blur) ? (
          <Suspense fallback={null}>
            <DepthOfFieldLayer blur={blur} />
          </Suspense>
        ) : null}
      </Canvas>
    </>
  );
}
