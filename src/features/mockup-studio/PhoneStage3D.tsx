"use client";

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import { Box3, CanvasTexture, ClampToEdgeWrapping, Color, RepeatWrapping, DoubleSide, ExtrudeGeometry, Group, Object3D, SRGBColorSpace, Shape, ShapeGeometry, TextureLoader, Vector3 } from "three";
import type { Texture } from "three";
import { AnimationMixer } from "three";
// Not Object3D.clone(): that copies a SkinnedMesh but leaves it pointing at
// the ORIGINAL skeleton, so posing the copy's bones moves nothing. This is
// three's own fix for exactly that, and it behaves identically on models
// with no skin, so it can be the single clone path rather than a branch.
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { DEFAULT_DEVICE_ID, getDevice, type Device, type DeviceNotch, type MaterialOverride } from "./devices";
import { DEFAULT_FINISH_ID, finishForDevice, getFinish } from "./finishes";
import { sampleAnimation, sampleTrack, type Animation } from "./animation";
import { recolorBodyTexture } from "./bodyTexture";
import { MaterialLab } from "./MaterialLab";
import { StudioEnvironment } from "./StudioEnvironment";
import { StageLoader } from "./StageLoader";
import { DEFAULT_SHADOW, type ShadowSettings } from "./shadow";
import { useShadowFilter } from "./ShadowFilter";
import { DEFAULT_LIGHTING, type LightingId } from "./lighting";
import { isBlurActive, type BlurSettings } from "./blurStyles";
import { TRANSFORM_OMEGA, springTo } from "./transformSpring";
import type { Quat } from "./gyro/quaternion";

// Lazy so `postprocessing` only reaches the browser when a blur is switched
// on. It is by far the heaviest thing this feature can pull in.
const DepthOfFieldLayer = lazy(() => import("./DepthOfFieldLayer"));

import type React from "react";
import { Mesh, MeshBasicMaterial, Quaternion } from "three";
import type { MeshStandardMaterial, PerspectiveCamera } from "three";

/**
 * Manual nudge on top of the automatic screen fit.
 *
 * The fit centre-crops the source to the phone's screen, which is right for a
 * screenshot but rarely right for a mirrored window: the mirror app's chrome
 * sits on one edge only, so a centred crop leaves the content sitting low or
 * high. These let you push it back into place.
 *
 * `scale` 1 is the fitted size; above 1 zooms in and crops more. The offsets
 * are fractions of the screen, so they mean the same thing on any device.
 */
export type ScreenFit = {
  scale: number;
  offsetX: number;
  offsetY: number;
  /**
   * True when the source is a mirror of a real device, whose capture already
   * contains the status bar and dynamic island. Drawing the model's own notch
   * on top of that gives two islands stacked on each other.
   */
  sourceHasNotch?: boolean;
};

export const DEFAULT_SCREEN_FIT: ScreenFit = { scale: 1, offsetX: 0, offsetY: 0 };

/**
 * The inner and outer radius of a ring mesh, and the centre it turns about.
 *
 * Read off the vertices rather than the bounding box, because a bounding box
 * cannot tell an annulus from a disc -- both are square and the same size, and
 * the whole point here is the hole. Radial distance from the XY centre gives
 * it directly: a ring's minimum is its hole, a disc's minimum is zero.
 *
 * XY, not XYZ: both meshes lie flat on the back of the device, so the Z spread
 * is the rim's wall and has nothing to do with how wide the lens is.
 */
function radialSpan(mesh: Mesh): { cx: number; cy: number; inner: number; outer: number } | null {
  const position = mesh.geometry?.getAttribute?.("position");
  if (!position || position.count === 0) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let inner = Infinity;
  let outer = 0;
  for (let i = 0; i < position.count; i += 1) {
    const r = Math.hypot(position.getX(i) - cx, position.getY(i) - cy);
    if (r < inner) inner = r;
    if (r > outer) outer = r;
  }
  return { cx, cy, inner, outer };
}

/**
 * Build a missing camera out of one the model already carries.
 *
 * Nothing is authored and no dimension is hard-coded: which meshes belong to
 * the source camera, how far to shrink them and where to put them are all read
 * off the two meshes named in the device.
 *
 * Done with NODE transforms, never by editing geometry. `useGLTF` caches the
 * parsed file and `cloneSkinned` copies objects while SHARING their buffers,
 * so scaling a geometry here would deform the cached model for every later
 * mount -- switching to the iPad and back would shrink the copy again each
 * time. Positions and scales live on the object and are copied, not shared.
 */
function addCameraCopies(root: Object3D, specs: NonNullable<Device["cameraCopies"]>) {
  // Copies are added as the loop runs, so a later spec would otherwise sweep
  // up an earlier spec's parts as if they were the model's own.
  const added = new Set<Object3D>();
  for (const spec of specs) {
    const rimMesh = root.getObjectByName(spec.from) as Mesh | undefined;
    const lens = root.getObjectByName(spec.onto) as Mesh | undefined;
    if (!rimMesh?.isMesh || !lens?.isMesh) continue;

    const rim = radialSpan(rimMesh);
    const target = radialSpan(lens);
    if (!rim || !target) continue;

    /*
     * Copied at full size. The disc says WHERE the second camera goes, not
     * how big it is.
     *
     * Scaling to it was tried and looks wrong: the stand-in is 4.22mm against
     * the wide camera's 5.00mm glass, so the copy came out at 0.844 and the
     * pair read as two different cameras rather than two of the same one. The
     * disc is a placeholder somebody drew, not a measurement -- and on an iPad
     * the two rear lenses are the same size. So only the centre is taken from
     * it.
     */

    /*
     * The camera is whatever lies inside its rim.
     *
     * A named list of parts would be the obvious alternative and is worse:
     * these are content-hash names from the USD, so the list would be eight
     * opaque strings that silently stop matching the next time the file is
     * converted. The circle is a property of the model, so it survives that.
     */
    const parts: Mesh[] = [];
    root.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh || mesh === lens || added.has(mesh)) return;
      const position = mesh.geometry?.getAttribute?.("position");
      if (!position) return;
      let far = 0;
      for (let i = 0; i < position.count; i += 1) {
        const r = Math.hypot(position.getX(i) - rim.cx, position.getY(i) - rim.cy);
        if (r > far) {
          far = r;
          if (far > rim.outer * 1.001) return;
        }
      }
      parts.push(mesh);
    });
    if (!parts.length) continue;

    // One offset for the whole assembly, taken from the rim's centre, so the
    // whole stack of elements travels together and stays concentric rather
    // than each part sliding toward its own middle.
    const offsetX = target.cx - rim.cx;
    const offsetY = target.cy - rim.cy;

    for (const part of parts) {
      const copy = new Mesh(part.geometry, part.material) as Mesh;
      copy.name = `${spec.onto}__${part.name}`;
      // Slid across the back of the device and nothing else. Z is untouched,
      // which lands the copy at the first camera's exact height above the bump
      // for free -- no offset to compute, and nothing to keep in step if the
      // model is ever reconverted at a different thickness.
      copy.position.set(offsetX, offsetY, 0);
      copy.castShadow = true;
      copy.receiveShadow = false;
      (part.parent ?? root).add(copy);
      added.add(copy);
    }

    // The stand-in has been replaced by the thing it stood in for. Left
    // visible it would sit a tenth of a millimetre under the copy's dark
    // glass, at all but the same radius -- close enough to shimmer along the
    // edge as the camera moves.
    lens.visible = false;
  }
}

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
/** How wide a device may be before width, not height, decides the fit. 0.8 is
    the 4:5 frame's width against its height. */
const PHONE_WIDTH_BUDGET = 0.8;
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
/**
 * How blurred that reflection is.
 *
 * Intensity alone controls how BRIGHT the studio shows up in the glass, not
 * how sharply. At the model's own roughness the emitters came back as legible
 * rectangles with hard edges -- you could read the shape of the rig off the
 * screen, which no phone photographed in a real studio does.
 *
 * Roughness is what dissolves them: three's PMREM environment is prefiltered
 * per roughness level, so raising this samples a blurrier mip and the panels
 * become a soft gradient. Kept below the point where the sheen disappears
 * altogether, because a screen with no reflection at all stops reading as
 * glass and starts reading as a hole.
 */
const GLASS_ROUGHNESS = 0.42;


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
  const { gl, size } = useThree();
  // A full loop step, not a bare draw — same reason as `RecorderBridge`: a
  // composer draws from inside `useFrame`, so `gl.render` alone would write a
  // PNG with the depth-of-field pass missing from it.
  const advance = useThree((state) => state.advance);
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = (scale: number) => {
      const prevRatio = gl.getPixelRatio();
      try {
        gl.setPixelRatio(scale);
        gl.setSize(size.width, size.height, false);
        advance(performance.now());
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      } finally {
        // Restore before anything else can paint, or the editor is left
        // rendering at export resolution.
        gl.setPixelRatio(prevRatio);
        gl.setSize(size.width, size.height, false);
        advance(performance.now());
      }
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, size, captureRef, advance]);
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
  /*
   * `advance` steps the whole frame loop; `gl.render` only draws.
   *
   * That distinction is why exported clips came out frozen. The pose is
   * applied inside `useFrame` — the phone's position, rotation and scale for
   * the playhead the exporter just set — and `gl.render(scene, camera)` does
   * not run a single `useFrame` callback. So the exporter dutifully advanced
   * time seventy-five times and drew the same untouched object every time: a
   * clip of the right length in which nothing moves.
   *
   * It costs the depth-of-field pass too, and for the same reason. A composer
   * takes over drawing by registering a high-priority `useFrame` and rendering
   * itself; skip the loop and you skip the composer, so the blur that is on
   * screen is simply absent from the file.
   */
  const advance = useThree((state) => state.advance);
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
        // One full step — subscribers, then the render (or the composer's) —
        // rather than a bare draw. See `advance` above.
        advance(performance.now());
        draw(gl.domElement);
      },
      end() {
        if (previousRatio === null) return;
        gl.setPixelRatio(previousRatio);
        gl.setSize(size.width, size.height, false);
        advance(performance.now());
        previousRatio = null;
      },
    };
    return () => {
      recorderRef.current = null;
    };
  }, [gl, scene, camera, size, recorderRef, advance]);
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
type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Wakes the demand loop when a new phone orientation arrives.
 *
 * The gyro pose is a ref, not state -- deliberately, because 30 samples a
 * second through React would re-render the whole editor 30 times a second.
 * The consequence is that nothing about a moving phone participates in the
 * render cycle at all: no prop changes, so r3f never invalidates on commit,
 * and `PhoneScene`'s wake-up effect watches only the slider targets.
 *
 * That leaves one way for the loop to be driven, and it must not be an
 * `invalidate` inside `useFrame`. A frame callback only runs when a frame is
 * already scheduled, so the moment the loop parks, the code that would restart
 * it stops running too -- the loop can never be woken by something that lives
 * inside it. That is a deadlock, and it looks exactly like the stage freezing
 * mid-tilt and never recovering.
 *
 * A plain rAF is not gated by demand rendering, so it always runs and can
 * always wake it.
 *
 * It compares against the last orientation it woke on rather than invalidating
 * every animation frame, because a phone reports continuously whether or not
 * it is moving -- a device face-up on a desk still streams samples, and waking
 * for those would be the display-rate render loop this was written to avoid,
 * reintroduced one layer up.
 */
function LivePoseWaker({ livePose }: { livePose?: React.RefObject<Quat> | null }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!livePose) return;
    let raf = 0;
    let woke: Quat | null = null;
    const tick = () => {
      const q = livePose.current;
      if (q) {
        // Same measure as the frame loop's: the dot of two unit quaternions is
        // cos(theta/2), so this is "has the phone turned enough to see".
        const dot = woke
          ? Math.abs(q.x * woke.x + q.y * woke.y + q.z * woke.z + q.w * woke.w)
          : 0;
        if (dot < LIVE_SETTLED_DOT) {
          woke = q;
          invalidate();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [livePose, invalidate]);
  return null;
}

function VideoFrameDriver({ texture }: { texture: Texture | null }) {
  const invalidate = useThree((state) => state.invalidate);
  const video = (texture as { image?: FrameCallbackVideo } | null)?.image;
  const isVideo = Boolean(
    (texture as { isVideoTexture?: boolean } | null)?.isVideoTexture && video,
  );
  // Chrome and Safari both have this; it fires once per decoded frame.
  const perFrame = typeof video?.requestVideoFrameCallback === "function";

  // Ask for a render when the video actually produces a frame, rather than at
  // display rate.
  //
  // Blindly invalidating every frame meant a 30fps capture drove 120 renders a
  // second on a 120Hz display — four GPU uploads of a full-resolution frame for
  // every one that changed. On its own that was survivable because nothing else
  // wanted the GPU; with a live pose easing at the same time it was not, and
  // the two features appeared to fight each other.
  useEffect(() => {
    if (!isVideo || !perFrame || !video) return;
    let handle = 0;
    let cancelled = false;
    const onFrame = () => {
      if (cancelled) return;
      invalidate();
      handle = video.requestVideoFrameCallback!(onFrame);
    };
    handle = video.requestVideoFrameCallback!(onFrame);
    return () => {
      cancelled = true;
      video.cancelVideoFrameCallback?.(handle);
    };
  }, [isVideo, perFrame, video, invalidate]);

  // Fallback for anything without the callback: the old behaviour.
  useFrame((state) => {
    if (isVideo && !perFrame) state.invalidate();
  });
  return null;
}

/**
 * Applies the field of view to the live camera.
 *
 * The `camera` prop on r3f's Canvas is initial state — it builds a camera from
 * it once and never looks at it again, so changing fov there does nothing
 * after mount. The camera has to be reached inside the scene and told, and
 * then told to rebuild its projection matrix, which is the step that actually
 * changes what is drawn.
 *
 * Worth knowing what this is: fov is the LENS, where zoom is the distance.
 * Widening it while pulling the phone closer keeps the phone the same size and
 * changes everything around it — which is the dolly zoom, and was impossible
 * here while the lens was a constant.
 */
function CameraFov({
  fov,
  animation,
  timeRef,
  playing,
}: {
  fov: number;
  animation?: Animation;
  timeRef?: React.RefObject<number> | React.MutableRefObject<number>;
  playing?: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  /* eslint-disable react-hooks/immutability -- three.js state lives on the
     objects themselves: setting fov and rebuilding the projection matrix is
     the only way to change a camera's lens. The camera is owned by the canvas
     this component sits in, so nothing outside observes it. */
  const apply = useCallback(
    (next: number) => {
      const perspective = camera as PerspectiveCamera;
      if (perspective.isPerspectiveCamera !== true || perspective.fov === next) {
        return false;
      }
      perspective.fov = next;
      perspective.updateProjectionMatrix();
      return true;
    },
    [camera],
  );
  /* eslint-enable react-hooks/immutability */

  const keyed = (animation?.tracks.fov?.length ?? 0) > 0;

  // The static lens. Skipped entirely while a fov track exists, because then
  // the track owns the value and this would write the ~10Hz React copy of it
  // over the top of the 60Hz one below -- visible as a lens that jitters
  // against itself.
  useEffect(() => {
    if (keyed) return;
    if (apply(fov)) invalidate();
  }, [apply, fov, invalidate, keyed]);

  /*
   * The animated lens.
   *
   * Per frame off `timeRef`, exactly as the transform is, and for the same two
   * reasons. React only hears about the playhead about ten times a second
   * during playback, so a lens driven through props steps rather than glides
   * -- and it steps most visibly in precisely the move worth having, where the
   * zoom is gliding at 60Hz in the opposite direction. The frame-exact export
   * also drives `timeRef` synchronously and never re-renders at all, so a
   * prop-driven lens would export at whatever value the last render left.
   */
  useFrame((state) => {
    if (!animation || !timeRef) return;
    const keys = animation.tracks.fov;
    if (!keys?.length) return;
    const next = sampleTrack(keys, timeRef.current, animation.easing);
    if (next === undefined) return;
    // Only a real change costs a projection-matrix rebuild; on a held segment
    // this is a comparison and nothing else.
    if (apply(next) && playing) state.invalidate();
  });

  return null;
}

/**
 * A procedural anodised grain, as a roughness map.
 *
 * The model's own roughness maps were the obvious source and did not work out:
 * they are authored around 0.17, which reads as chrome under this stage's
 * six-emitter rig rather than as brushed metal, and three multiplies them by
 * the finish's own roughness so the two fight. Generating the grain here
 * sidesteps both -- the numbers are ours, so they can simply be right.
 *
 * The texture is white with darker speckle: values run from `1 - amount` to 1,
 * so it MODULATES whatever roughness the finish asked for rather than
 * replacing it. The factor is divided by the map's mean below, which keeps the
 * average roughness exactly where the finish put it and lets the grain live as
 * variation around it. Turn the amount to zero and the render is identical to
 * having no map at all.
 *
 * Two octaves: a fine per-pixel noise for the anodising itself, and a coarser
 * one so the surface has some drift across it rather than looking like film
 * grain pinned to the camera.
 */
const GRAIN_SIZE = 512;

/*
 * The grain's settings, as constants.
 *
 * These were a Leva panel for a while so they could be dialled in live. The
 * panel is gone; the numbers it was there to find are these, and they are the
 * only thing that mattered. `GRAIN_AMOUNT` at 0 restores the render exactly as
 * it was before any of this -- the map modulates the finish's roughness rather
 * than replacing it, so zero variation is the same as no map.
 */
const GRAIN_AMOUNT = 0.35;
const GRAIN_SCALE = 5;
const GRAIN_SEED = 1;

function makeGrainTexture(amount: number, seed: number): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = GRAIN_SIZE;
  canvas.height = GRAIN_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  // A cheap deterministic PRNG, so a given seed always gives the same grain
  // and nudging the slider does not reshuffle the whole surface.
  let state = (seed * 2654435761) >>> 0;
  const rand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };

  const coarse = new Float32Array(64 * 64);
  for (let i = 0; i < coarse.length; i++) coarse[i] = rand();

  for (let y = 0; y < GRAIN_SIZE; y++) {
    for (let x = 0; x < GRAIN_SIZE; x++) {
      const cx = Math.floor((x / GRAIN_SIZE) * 64);
      const cy = Math.floor((y / GRAIN_SIZE) * 64);
      const n = rand() * 0.65 + coarse[cy * 64 + cx] * 0.35;
      const value = Math.round((1 - amount + n * amount) * 255);
      const i = (y * GRAIN_SIZE + x) * 4;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** How much of the studio rig the camera glass is allowed to mirror back. */
const CAMERA_ENV_MAP_INTENSITY = 0.05;
/**
 * High, but deliberately short of 1. At 0.55 the softbox still resolves into
 * the lens elements and you are back where you started; at 1 the glass reads
 * as paint. This scatters the highlight into a faint sheen.
 */
const CAMERA_ROUGHNESS = 0.95;

/** Multiplies the details atlas down so it reads at every angle, not only the
    ones where the softbox happened to be out of the reflection. */
const CAMERA_TINT = 0x232325;

const DRAG_SLOP = 4;

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
  const startRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  /** Total travel since the gesture began — what decides the locked axis. */
  const travelRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const target = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      // One pointer at a time. A second finger landing mid-drag used to
      // overwrite the tracked pointer id, so when the FIRST finger lifted its
      // id no longer matched and the drag was never ended -- the model stayed
      // captured and kept turning with anything that moved afterwards. On a
      // phone a stray second touch is not an edge case; it is how people hold
      // the thing.
      if (draggingRef.current) return;
      draggingRef.current = true;
      movedRef.current = false;
      travelRef.current = { x: 0, y: 0 };
      pointerIdRef.current = e.pointerId;
      startRef.current = { x: e.clientX, y: e.clientY };
      lastRef.current = { x: e.clientX, y: e.clientY };
      target.setPointerCapture(e.pointerId);
      target.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || e.pointerId !== pointerIdRef.current) return;
      const dx = e.clientX - lastRef.current.x;
      const dy = e.clientY - lastRef.current.y;
      // A finger is not a mouse: it lands with a few pixels of roll and it
      // never lifts from exactly where it touched down. Without a threshold
      // every tap on the stage nudged the model a degree or two and left it
      // sitting slightly off, which reads as the phone drifting on its own.
      // A mouse never trips this -- a click has no travel.
      if (!movedRef.current) {
        if (Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y) < DRAG_SLOP) return;
        movedRef.current = true;
        // Start from where the drag actually became a drag, so the model does
        // not jump by the slop the moment it crosses the threshold.
        lastRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      lastRef.current = { x: e.clientX, y: e.clientY };
      travelRef.current.x += Math.abs(dx);
      travelRef.current.y += Math.abs(dy);

      /*
       * Shift locks the turn to one axis.
       *
       * A free drag turns the phone about two axes at once, which is right for
       * finding a pose and wrong for adjusting one: a nudge sideways to check
       * a reflection also tips the model a degree, and the pose you had is
       * gone. Held, the drag keeps whichever axis it has travelled furthest in
       * and drops the other entirely.
       *
       * Measured over the whole gesture rather than this event: per-event, a
       * hand wobbling by a pixel would flip the lock back and forth and the
       * model would judder between the two axes. Accumulated, the direction
       * you set out in is the one it commits to, and it can still change its
       * mind if you genuinely turn a corner.
       */
      if (e.shiftKey) {
        const { x, y } = travelRef.current;
        rotateRef.current(x >= y ? { dx, dy: 0 } : { dx: 0, dy });
        return;
      }
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
function makeRoundedShape(width: number, height: number, radius: number) {
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

  return shape;
}

/** The same rectangle as flat geometry, with UVs remapped to 0..1. */
function makeRoundedRect(width: number, height: number, radius: number) {
  const w = width / 2;
  const h = height / 2;
  const geometry = new ShapeGeometry(makeRoundedShape(width, height, radius), 16);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + w) / width, (pos.getY(i) + h) / height);
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * Any artwork, as an object in the same studio.
 *
 * The point is how little this needs. The spring transform lives on a wrapper
 * group in PhoneScene rather than on the phone, so anything rendered inside
 * inherits every camera move and keyframe; the fit is MEASURED off a bounding
 * box rather than assuming a phone; the shadow is a CSS filter over the canvas
 * alpha, so it follows whatever silhouette is there; and the export reads the
 * canvas. None of that had to change to put a picture on the stage.
 *
 * A card with thickness, not a plane. At zero depth it reads as paper the
 * moment the camera comes off head-on, and every camera move here is oblique.
 *
 * The face is unlit, for the same reason the phone's screen is: what goes in
 * is what comes out. The edges are not -- they are the only part that should
 * catch the room, and they are what makes it read as an object.
 */
/** Fallbacks, for the rare caller that renders the stage without the editor. */
const DEFAULT_EDITOR_STATE_CARD_RADIUS = 0.03;
const DEFAULT_EDITOR_STATE_CARD_DEPTH = 0.012;

function ImageCardScene({
  texture,
  finishId,
  radius,
  depth,
}: {
  texture: Texture | null;
  finishId: string;
  /** Fraction of the card's shorter side. */
  radius: number;
  depth: number;
}) {
  const finish = getFinish(finishId);

  const built = useMemo(() => {
    const image = texture?.image as { width?: number; height?: number } | undefined;
    const iw = image?.width ?? 0;
    const ih = image?.height ?? 0;
    // Square until an image says otherwise, so the stage is never empty and
    // never guesses an aspect it has to correct a frame later.
    const aspect = iw > 0 && ih > 0 ? iw / ih : 1;

    /*
     * Fitted the same way the GLB path fits a model: normalise to the height
     * budget, then pull back if the width would overflow. Built at
     * PHONE_HEIGHT alone, a landscape card came out 1.8x wider than the stage
     * allows, because a phone is never the thing that tests the width.
     */
    const fit = Math.min(1, PHONE_WIDTH_BUDGET / (PHONE_HEIGHT * aspect));
    const height = PHONE_HEIGHT * fit;
    const width = height * aspect;
    const shape = makeRoundedShape(
      width,
      height,
      Math.min(width, height) * radius,
    );

    // A card can be asked for at zero thickness. Extrude with a bevel on a
    // zero depth collapses, so below a hair's breadth it becomes a plain flat
    // face -- which is what zero thickness means anyway.
    const flat = depth <= 0.0005;
    const geometry = new ExtrudeGeometry(shape, {
      depth: flat ? 0.0005 : depth,
      bevelEnabled: !flat,
      bevelThickness: depth * 0.25,
      bevelSize: depth * 0.25,
      bevelSegments: 2,
      curveSegments: 16,
    });
    // Extrude builds forward from z = 0; centring puts the card on the origin
    // so it turns about itself rather than swinging around its own back face.
    geometry.center();

    // UVs remapped against the shape extents, for the same reason the screen
    // plane does it: extrude derives them from raw shape coordinates, which on
    // a centred shape run negative, and the artwork would tile instead of
    // landing once. The side wall gets odd UVs, which costs nothing -- it is
    // painted with a flat colour, not the map.
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(
        i,
        (pos.getX(i) + width / 2) / width,
        (pos.getY(i) + height / 2) / height,
      );
    }
    uv.needsUpdate = true;

    /*
     * The artwork gets its own plane, laid on the front.
     *
     * Extrude puts BOTH flat faces in one material group, so a single map on
     * the card painted the back with a mirrored copy of the picture -- which
     * is not what a printed card looks like from behind. Splitting that group
     * means sorting triangles by depth and rebuilding the ranges; a separate
     * plane is the same result for a fraction of the work, and it lets the
     * front be unlit while the body stays lit.
     */
    const faceGeometry = makeRoundedRect(
      width,
      height,
      Math.min(width, height) * radius,
    );
    /*
     * Where the front face actually is, measured rather than derived.
     *
     * This used to be `depth / 2`, which is where the face would be if the
     * extrude were a plain prism. It is not: `bevelThickness` extends the
     * solid BEYOND the requested depth at both ends, so the real half-extent
     * is 0.75 * depth with the bevel set to a quarter. The artwork plane was
     * therefore always inside the card -- by a tenth of a millimetre at the
     * thinnest setting, where it still z-fought its way through and looked
     * fine, and by centimetres once the thickness slider was raised, at which
     * point the picture vanished into the body entirely.
     *
     * Taken from the bounding box so it stays correct if the bevel is ever
     * retuned. Deriving it a second time from the same constants is how the
     * two got out of step in the first place.
     */
    geometry.computeBoundingBox();
    const halfDepth = geometry.boundingBox
      ? -geometry.boundingBox.min.z
      : (flat ? 0.0005 : depth) / 2;
    const faceZ = halfDepth + 0.0004;

    return { geometry, faceGeometry, faceZ };
  }, [texture, radius, depth]);

  const face = useMemo(() => {
    const m = new MeshBasicMaterial({ toneMapped: false, side: DoubleSide });
    m.map = texture ?? null;
    // No artwork yet: the plane simply takes the finish, so an empty card is a
    // blank card rather than a black hole where the picture will go.
    m.color.set(texture ? "#ffffff" : finish.color);
    return m;
  }, [texture, finish.color]);

  const edge = useMemo(() => {
    // Two-sided: an extruded card is a closed solid, but the caps are wound
    // for a front view and the whole thing vanished the moment the camera got
    // behind it. Cheaper to draw both faces than to trust the winding.
    const m = new MeshBasicMaterial({ toneMapped: false, side: DoubleSide });
    m.color.set(finish.color);
    return m;
  }, [finish.color]);

  useEffect(() => {
    if (!texture) return;
    /* eslint-disable react-hooks/immutability -- the texture is ours to set up,
       and this is the same colour-space assignment the screen path makes. */
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    /* eslint-enable react-hooks/immutability */
  }, [texture]);

  return (
    <group>
      {/* The card itself: blank on both faces and around the wall. */}
      <mesh geometry={built.geometry} material={edge} />
      {/*
        * The artwork, on the face the camera is actually on.
        *
        * The stage opens at yAxis 180, because the phone GLBs put their screen
        * on -z -- so the side you see is the model's BACK in its own terms.
        * Extrude builds forward along +z, which is why the card first arrived
        * showing a blank face, and why raising the thickness pushed the
        * picture further away until the body hid it. One cause, both symptoms:
        * the plane was sitting on the side nobody was looking at.
        *
        * Mirrored in x rather than turned, so it reads the right way round
        * from that side instead of back to front.
        */}
      <mesh
        geometry={built.faceGeometry}
        material={face}
        position={[0, 0, -built.faceZ]}
        scale={[-1, 1, 1]}
      />
    </group>
  );
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
  fit = DEFAULT_SCREEN_FIT,
}: {
  texture: Texture | null;
  width: number;
  height: number;
  position: [number, number, number];
  /** +1 when the screen is on the +Z face, -1 when it is on -Z. */
  facing?: 1 | -1;
  cornerRadiusPct: number;
  insetPct: number;
  fit?: ScreenFit;
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
    const img = texture.image as HTMLVideoElement & { width: number; height: number };

    const applyFit = () => {
      // A <video> carries its real size on videoWidth/videoHeight. `width` and
      // `height` are the HTML attributes, which are 0 on an element nobody
      // sized — so reading those alone silently skipped the fit for every
      // moving source and the frame arrived stretched to the plane.
      const srcWidth = img.videoWidth || img.width;
      const srcHeight = img.videoHeight || img.height;
      if (!srcWidth || !srcHeight) return;

      const planeAspect = width / height;
      const srcAspect = srcWidth / srcHeight;
      if (Math.abs(srcAspect - planeAspect) < 0.001) {
        texture.repeat.set(1, 1);
        texture.offset.set(0, 0);
      } else if (srcAspect > planeAspect) {
        // Source is wider: keep full height, trim the sides evenly. This is
        // what crops a mirrored window's chrome and letterboxing away instead
        // of squeezing a landscape desktop window onto a portrait screen.
        const scale = planeAspect / srcAspect;
        texture.repeat.set(scale, 1);
        texture.offset.set((1 - scale) / 2, 0);
      } else {
        // Source is taller: keep full width, trim top and bottom evenly.
        const scale = srcAspect / planeAspect;
        texture.repeat.set(1, scale);
        texture.offset.set(0, (1 - scale) / 2);
      }

      // Manual nudge, applied to whatever the automatic fit decided.
      //
      // Zooming shrinks the sampled window and has to re-centre on the same
      // point, or turning the dial would slide the image toward a corner
      // instead of scaling about the middle. The pans are then a fraction of
      // the visible window, so a nudge moves the same apparent distance
      // whatever the zoom.
      const zoom = fit.scale > 0 ? fit.scale : 1;
      const rx = texture.repeat.x / zoom;
      const ry = texture.repeat.y / zoom;
      texture.offset.set(
        texture.offset.x + (texture.repeat.x - rx) / 2 - fit.offsetX * rx,
        texture.offset.y + (texture.repeat.y - ry) / 2 + fit.offsetY * ry,
      );
      texture.repeat.set(rx, ry);

      texture.needsUpdate = true;
    };

    applyFit();

    // A still knows its size the moment it decodes; a video does not, and a
    // live capture can change size mid-stream when the shared window is
    // resized. Both cases have to re-fit or the crop is computed once against
    // a size that no longer holds.
    if (typeof img.videoWidth !== "number") return;
    img.addEventListener("loadedmetadata", applyFit);
    img.addEventListener("resize", applyFit);
    return () => {
      img.removeEventListener("loadedmetadata", applyFit);
      img.removeEventListener("resize", applyFit);
    };
  }, [texture, width, height, fit.scale, fit.offsetX, fit.offsetY]);

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

/*
 * Warm the DEFAULT device only.
 *
 * This used to warm every registered model, on the reasoning that they were
 * all about a megabyte and warming them cost less than a stall on first
 * switch. That stopped being true: the registry now carries a 14" MacBook at
 * 5MB compressed and 10MB decoded, and the four together were 7.9MB fetched,
 * parsed and uploaded to the GPU before the first frame -- which is a stall on
 * EVERY load rather than one on a switch that may never happen.
 *
 * The others load when they are chosen, which is what the loading capsule over
 * the stage is for.
 */
useGLTF.preload(getDevice(DEFAULT_DEVICE_ID).modelPath as string);

function GLBPhoneScene({
  screenTexture,
  device,
  finishId,
  screenFit,
  fold,
  coverTexture,
  coverScreenFit,
  animation,
  timeRef,
  playing,
  immediate,
}: {
  screenTexture: Texture | null;
  device: Device;
  finishId?: string;
  screenFit?: ScreenFit;
  /** 0-100, how far the hinge is closed. Unused by rigid devices. */
  fold?: number;
  /** Source for the second screen, where the device has one. */
  coverTexture?: Texture | null;
  coverScreenFit?: { scale: number; offsetX: number; offsetY: number };
  /** The hinge is sampled in the frame loop, so playback and export drive it
      at render rate rather than at React's. */
  animation?: Animation;
  timeRef?: React.RefObject<number>;
  playing?: boolean;
  immediate?: boolean;
}) {
  /*
   * Built once. The inputs are module constants, so this is a memo purely to
   * keep a 512x512 canvas out of every render rather than to track anything.
   */
  const grainTexture = useMemo(
    () => (GRAIN_AMOUNT > 0 ? makeGrainTexture(GRAIN_AMOUNT, GRAIN_SEED) : null),
    [],
  );
  useEffect(() => () => grainTexture?.dispose(), [grainTexture]);

  const {
    color: bodyColor,
    metalness: bodyMetalness,
    roughness: bodyRoughness,
    // The RESOLVED id, not the prop: a grille stated per finish has to key off
    // the finish actually being rendered, which is not always the one asked
    // for. See finishForDevice.
    id: activeFinishId,
  } = finishForDevice(device.finishIds, finishId);

  // Only ever mounted for a device that has one; the branch that chooses
  // between this and the generated bodies is in PhoneScene.
  const gltf = useGLTF(device.modelPath as string);
  const {
    scene, width, height, depth, screen, screenMaterials, coverMaterials, mixer,
    leafRest, hinge, foldRoot,
  } = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as Group;

    // Before the posing and the measuring below, so the added rim is part of
    // the silhouette everything downstream is fitted to.
    if (device.cameraCopies?.length) addCameraCopies(cloned, device.cameraCopies);

    /*
     * Freeze the model at one frame of its own animation.
     *
     * A rigid phone has one pose and its node transforms are it. A folding one
     * does not: the iPhone Fold ships a hinge animation, and its NODE
     * transforms are just wherever the author left the rig -- for that file,
     * the two leaves lying flat while the skinned inner display is still
     * folded shut, which renders as a screen detached from the body.
     *
     * The coherent poses are the frames of the clip, so the pose is picked by
     * asking for one. Sampled once and left there rather than played: this is
     * a mockup studio, and the fold is a property of the device you chose, not
     * something to animate.
     *
     * Done before the measuring below, so the fit and the screen placement see
     * the pose that will actually be rendered.
     */
    const clip = gltf.animations?.[0];
    let mixer: AnimationMixer | null = null;
    const leafRest: { leaf: Object3D; rest: Quaternion }[] = [];
    let hinge: Object3D | null = null;
    if (device.fold && clip) {
      mixer = new AnimationMixer(cloned);
      mixer.clipAction(clip).play();
      // Posed OPEN for the measuring below, whatever the hinge is currently
      // set to. Measuring the live pose instead would refit the camera as the
      // phone closed, so the thing would appear to grow while shutting -- and
      // the screen, whose placement comes off the same measurement, would
      // drift with it. One silhouette, taken at the pose the device is for.
      mixer.setTime(device.fold.openSec);
      cloned.updateMatrixWorld(true);

      /*
       * Remember the open pose of each leaf, and where the hinge sits.
       *
       * The clip swings ONE leaf and leaves the other where it is, so the
       * device folds off one edge like a door rather than closing like a book:
       * the fixed half stays put and the moving half sweeps the frame. The rig
       * is not wrong -- it is just anchored to a leaf instead of to the hinge.
       *
       * Correcting it needs the pose the leaves start from, so it is taken
       * here, once, while the model is posed open.
       */
      /*
       * Matched loosely, because GLTFLoader renames as it loads.
       *
       * three sanitises node names through PropertyBinding.sanitizeNodeName,
       * which turns whitespace into underscores -- so the file's "Frame L"
       * arrives as "Frame_L" and an exact getObjectByName finds nothing. That
       * failed silently: leafRest stayed empty, the block below never ran, and
       * every attempt at fixing the fold appeared to do nothing at all because
       * none of the code was reached.
       */
      const norm = (n: string) => n.toLowerCase().replace(/[\s_]+/g, "");
      const wanted = ["Frame L", "Frame R"].map(norm);
      const found = new Map<string, Object3D>();
      cloned.traverse((o) => {
        const i = wanted.indexOf(norm(o.name ?? ""));
        if (i >= 0 && !found.has(wanted[i])) found.set(wanted[i], o);
      });
      for (const key of wanted) {
        const leaf = found.get(key);
        if (leaf) leafRest.push({ leaf, rest: leaf.quaternion.clone() });
      }
      let foundHinge: Object3D | null = null;
      cloned.traverse((o) => {
        const n = norm(o.name ?? "");
        if (!foundHinge && (n === "pivot" || n === "hinge")) foundHinge = o;
      });
      hinge = foundHinge as Object3D | null;
      // Where the hinge sits with the phone open. Every later frame puts it
      // back here, so the device turns about its spine instead of drifting.
      // Where the hinge sits with the phone open, in the same space the frame
      // loop will measure it in. The root is unparented and at the origin here,
      // so world, parent and local all coincide.
      if (hinge) (hinge as Object3D).getWorldPosition(FOLD_ANCHOR_REST);
    }
    /*
     * Stand the model up by MEASURING, not by naming an angle.
     *
     * Exports disagree about which way is up, and the obvious fix -- a pitch
     * in degrees per device -- does not survive contact with them: a glTF
     * scene carries its own node transforms, so a rotation applied to a
     * wrapper composes with whatever the author already baked in. Asking the
     * iPhone Air for -90 about X rotated it about a different axis entirely,
     * and no amount of staring at the number explains which.
     *
     * So poses are tried and the RESULT is measured. Two nested groups keep
     * the two rotations from fighting: the inner one searches for upright, the
     * outer one carries the device's own yaw, which is a fact about which face
     * the model calls front and not something to search for.
     */
    const stood = new Group();
    stood.add(cloned);
    const posed = new Group();
    posed.add(stood);
    posed.rotation.set(0, ((device.modelYawDeg ?? 0) * Math.PI) / 180, 0);

    const quarter = Math.PI / 2;
    const candidates: Array<[number, number, number]> = device.autoStand
      ? ([0, -quarter, quarter] as number[]).flatMap((rx) =>
          ([0, -quarter, quarter, Math.PI] as number[]).map(
            (ry) => [rx, ry, 0] as [number, number, number],
          ),
        )
      : [[0, 0, 0]];

    let bestScore = -Infinity;
    let bestPose: [number, number, number] = [0, 0, 0];
    for (const pose of candidates) {
      stood.rotation.set(pose[0], pose[1], pose[2]);
      posed.updateMatrixWorld(true);
      const candidateBox = new Box3().setFromObject(posed);
      const s3 = new Vector3();
      candidateBox.getSize(s3);
      // Upright and facing the camera: tall in Y, shallow in Z. Subtracting
      // depth is what separates a phone standing up from one standing on its
      // edge -- both are tall, only one is thin front to back.
      let score = s3.y - s3.z;

      /*
       * Height and depth alone cannot tell front from back: a phone facing
       * away is exactly as tall and as thin as one facing you. Naming the
       * screen and preferring the pose that puts it forward was tried and
       * removed -- it fired for some models and not others, so the same file
       * could come up facing either way between runs, which is worse than
       * consistently wrong. Uprightness is decided here; which way round is
       * `modelYawDeg`, set once per model and verified by looking.
       */
      if (score > bestScore) {
        bestScore = score;
        bestPose = pose;
      }
    }
    stood.rotation.set(bestPose[0], bestPose[1], bestPose[2]);
    posed.updateMatrixWorld(true);


    const screenLocalBox = new Box3().makeEmpty();
    // Materials the screen texture gets bound onto, for models that carry a
    // real screen. Built per instance so two devices on screen at once do not
    // share one map.
    const screenMaterials: MeshBasicMaterial[] = [];
    const coverMaterials: MeshBasicMaterial[] = [];
    // Hide any mesh that looks like a baked screen / display so our React
    // overlay isn't competing with a placeholder texture.
    cloned.traverse((child) => {
      const m = child as Mesh & {
        name?: string;
        isMesh?: boolean;
        material?: { name?: string } | Array<{ name?: string }>;
      };
      if (!m.isMesh) return;
      // The phone casts; it does not receive. Self-shadowing a slab lit
      // almost entirely by an environment map buys nothing and costs a
      // shadow-acne pass on the one surface anyone looks at.
      m.castShadow = true;
      m.receiveShadow = false;
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

      /*
       * Veils over the screen, hidden before anything else looks at this mesh.
       *
       * This has to be its own test, not part of the screen-material branch
       * below. GLTFLoader splits a mesh's primitives into SEPARATE meshes, so
       * "Glass flex" is never an entry in the screen mesh's material array --
       * it is a mesh of its own, and the earlier attempt to catch it in that
       * array could not have fired.
       *
       * Measured with a step wedge: black at 0.336 alpha over the panel
       * multiplied everything on the screen by a flat 0.686, which is the dull
       * screen exactly. A constant ratio across the whole range is what says
       * "layer on top" rather than "tone curve".
       */
      if (
        device.screenOverlayHide?.some((n) => lowerNames.includes(n.toLowerCase()))
      ) {
        m.visible = false;
        return;
      }

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
          /*
           * Only the screen material, not every material on the mesh.
           *
           * This used to convert the lot. On a one-material screen mesh that
           * is the same thing, which is why it went unnoticed -- but the
           * Fold's inner panel is four prims, and "Glass flex", "Display
           * Frame" and "Rubber" were all being handed the screenshot and
           * turned unlit alongside it. The glass laid a second, washed copy
           * of the image over the real one, which is the dull, faded screen.
           */
          if (Array.isArray(m.material)) {
            m.material = m.material.map((entry) => {
              const named = entry as { name?: string } | undefined;
              return named?.name?.toLowerCase() === target ? bind(entry) : entry;
            }) as never;
          } else {
            m.material = bind(m.material) as never;
          }
          screenLocalBox.union(new Box3().setFromObject(m));
          return;
        }
      }

      // The second screen, where the device has one. Same swap, its own list,
      // and deliberately NOT unioned into screenLocalBox -- the cover panel is
      // a screen, but it is not the screen the camera frames or the notch is
      // placed against.
      const cover = device.coverScreen;
      if (cover && lowerNames.includes(cover.material.toLowerCase())) {
        const bindCover = (entry: unknown) => {
          const source = entry as MeshStandardMaterial | undefined;
          const basic = new MeshBasicMaterial({
            toneMapped: false,
            side: source?.side,
          });
          basic.name = source?.name ?? "cover screen";
          coverMaterials.push(basic);
          return basic;
        };
        // Same rule as the main screen: swap the screen material only, and
        // leave the glass and frame prims sharing the mesh alone.
        const coverTarget = cover.material.toLowerCase();
        if (Array.isArray(m.material)) {
          m.material = m.material.map((entry) => {
            const named = entry as { name?: string } | undefined;
            return named?.name?.toLowerCase() === coverTarget ? bindCover(entry) : entry;
          }) as never;
        } else {
          m.material = bindCover(m.material) as never;
        }
        return;
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
      /**
       * The finish's colour at a different lightness, hue and saturation held.
       *
       * In sRGB rather than the linear working space: "a bit lighter" is a
       * judgement about what the eye sees, and linear lightness does not match
       * it. Mixing toward white or black would do the brightness change and
       * desaturate at the same time, which is what made a lifted panel read as
       * pale rather than as the same colour lit better.
       */
      const shiftLightness = (hex: string, amount: number, saturate = 1) => {
        const hsl = { h: 0, s: 0, l: 0 };
        new Color(hex).getHSL(hsl, SRGBColorSpace);
        const next =
          amount >= 0 ? hsl.l + (1 - hsl.l) * amount : hsl.l * (1 + amount);
        return `#${new Color()
          .setHSL(
            hsl.h,
            Math.min(1, Math.max(0, hsl.s * saturate)),
            Math.min(1, Math.max(0, next)),
            SRGBColorSpace,
          )
          .getHexString()}`;
      };

      const tintMaterial = (mat: unknown, meshName?: string) => {
        /*
         * Named as untouchable by the device: hand it back exactly as it came.
         *
         * First, before the logo, glass and body branches, because this is the
         * one answer none of them can produce -- each of those rewrites the
         * material in some way, and what a lens barrel or a LiDAR window wants
         * is for nothing to happen to it at all.
         */
        const keepName = (mat as { name?: string } | null)?.name?.toLowerCase();
        if (keepName && device.keepMaterials?.some((n) => n.toLowerCase() === keepName)) {
          return mat;
        }

        /*
         * A colour the device states outright, for a part the model authored
         * as body but that is not body on the real hardware.
         *
         * Second, straight after the untouchables: it has to beat the body
         * branch and lose to nothing. Only the colour is set -- the maps,
         * metalness and roughness the model shipped are left alone, because
         * those are what make a grille read as a grille rather than as a flat
         * dark patch.
         */
        // A mesh named outright wins over one named by material: it is the
        // more specific statement, and it exists precisely for the cases where
        // the material is shared by parts that are not alike.
        const byMesh = device.meshColors
          ? Object.entries(device.meshColors).find(
              ([name]) => name.toLowerCase() === meshName?.toLowerCase(),
            )?.[1]
          : undefined;
        /*
         * A grille stated per finish, which no other override needs to be.
         * Wins over `materialColors` so the two cannot disagree.
         */
        const grille = device.speakerGrille;
        const tuned: MaterialOverride | undefined =
          grille && grille.material.toLowerCase() === keepName
            ? grille.byFinish[activeFinishId] ??
              Object.values(grille.byFinish)[0]
            : undefined;
        const stated =
          tuned ??
          byMesh ??
          (device.materialColors
            ? Object.entries(device.materialColors).find(
                ([name]) => name.toLowerCase() === keepName,
              )?.[1]
            : undefined);
        if (stated) {
          const source = mat as {
            clone?: () => unknown;
            color?: { set?: (hex: string) => void };
            map?: Texture | null;
            opacity?: number;
            transparent?: boolean;
            depthWrite?: boolean;
          };
          if (typeof source?.clone !== "function") return mat;
          // Cloned, so an override cannot mutate the model's shared instance.
          const fixed = source.clone() as typeof source;
          const spec = typeof stated === "string" ? { color: stated } : stated;

          // `plainMaterials` is honoured here too, and has to be: a stated
          // colour MULTIPLIES the base map, so leaving a painted gradient in
          // place would put its banding straight back under the new colour.
          const flat = device.plainMaterials?.some(
            (n) => n.toLowerCase() === keepName,
          );
          if (flat && fixed.map) fixed.map = null;

          const saturate = spec.saturate ?? 1;
          if (spec.darken !== undefined) {
            fixed.color?.set?.(shiftLightness(bodyColor, -Math.abs(spec.darken), saturate));
          } else if (spec.lighten !== undefined || spec.saturate !== undefined) {
            /*
             * Lighter, not paler.
             *
             * The first version mixed the finish toward white, which raises
             * brightness and strips saturation in the same move -- so the
             * panel came out washed rather than simply lit, and read as a
             * white sheet laid over the phone instead of the same anodised
             * colour catching more light.
             *
             * Raising HSL lightness alone keeps the hue and the saturation
             * exactly where the finish put them. Done in sRGB rather than the
             * linear working space, because "a bit lighter" is a judgement
             * about what the eye sees and linear lightness does not match it.
             */
            // `saturate` on its own is a valid statement: same lightness, more
            // colour, which is exactly what polished trim is against glass.
            fixed.color?.set?.(shiftLightness(bodyColor, spec.lighten ?? 0, saturate));
          } else if (spec.color) {
            fixed.color?.set?.(spec.color);
          }
          // Stated surface wins over the model's, where given.
          if (spec.roughness !== undefined && "roughness" in fixed) {
            (fixed as { roughness: number }).roughness = spec.roughness;
          }
          if (spec.metalness !== undefined && "metalness" in fixed) {
            (fixed as { metalness: number }).metalness = spec.metalness;
          }
          if (spec.envMapIntensity !== undefined && "envMapIntensity" in fixed) {
            (fixed as { envMapIntensity: number }).envMapIntensity = spec.envMapIntensity;
          }
          if (spec.opacity !== undefined) {
            fixed.opacity = spec.opacity;
            fixed.transparent = spec.opacity < 1;
            // A half-clear pane must not write depth, or the body behind it
            // stops being drawn and the phone reads hollow.
            fixed.depthWrite = spec.opacity >= 1;
          }
          return fixed;
        }

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
        // An etched mark: white, and mostly transparent. Handled before the
        // body test, since a logo is neither body nor glass.
        const markName = (candidate as { name?: string }).name?.toLowerCase();
        if (device.logoMaterials?.some((n) => n.toLowerCase() === markName)) {
          if (typeof candidate.clone !== "function") return mat;
          const mark = candidate.clone() as typeof candidate;
          /*
           * A milled mark, not a printed one.
           *
           * Two earlier passes got this wrong. Tinting it with the finish hid
           * it; making it 10% transparent removed it altogether, because it
           * sits flush against the back panel and two coplanar surfaces where
           * the front one is nearly clear is exactly what depth sorting cannot
           * resolve.
           *
           * What it wants is the model own trim: a light grey, mostly matte,
           * and holding back from the environment. The blown-out white came
           * from the studio rig -- at full env strength a smooth light surface
           * on a flat back mirrors the lighting straight down the lens.
           */
          mark.color?.set?.(
            device.logoDarken !== undefined
              ? shiftLightness(bodyColor, -Math.abs(device.logoDarken))
              : (device.logoColor ?? "#9c9c9c"),
          );
          if ("metalness" in mark) mark.metalness = 0.1;
          if ("roughness" in mark) mark.roughness = 0.55;
          if ("envMapIntensity" in mark) mark.envMapIntensity = 0.25;
          /*
           * Opaque unless the device asks otherwise.
           *
           * The default stays 1 because of the failure recorded above: where a
           * mark is coplanar with the back panel, a nearly-clear front surface
           * is exactly what depth sorting cannot resolve and the logo
           * disappears. Apple's stands 0.4mm proud of the panel, so alpha
           * behaves there -- a fact about that model, not one to assume.
           */
          const markOpacity = device.logoOpacity ?? 1;
          if ("transparent" in mark) mark.transparent = markOpacity < 1;
          if ("opacity" in mark) mark.opacity = markOpacity;
          // A mostly see-through mark must not also punch a hole in the depth
          // buffer, or the panel behind it stops being drawn.
          if ("depthWrite" in mark) {
            (mark as { depthWrite: boolean }).depthWrite = markOpacity >= 1;
          }
          return mark;
        }

        /*
         * An allow-list, where `keepMaterials` is a deny-list.
         *
         * Both say which materials the finish paints, and they fail in
         * opposite directions. With a deny-list, a material nobody thought
         * about gets painted: on the MacBook that put the body colour on the
         * five surfaces around the keyboard, so the keys read as coloured, and
         * nothing announced it. Fixing it meant naming five more hashes, and
         * the next reconversion would have needed the same again.
         *
         * The reason a deny-list cannot be made safe here is that there is no
         * property of a material that separates the two groups. Darkness does
         * not: this file is the Space Black machine, whose aluminium is
         * authored at 0.09 linear, right in the middle of the 0.03-0.3 range
         * the keyboard parts occupy. Nor does position -- the trackpad is
         * interior to the deck and is body, while the keyboard well beside it
         * is not.
         *
         * What IS knowable is the other direction. A device has a handful of
         * surfaces that are its finish -- five here, two on the Studio
         * Display -- and everything else, however many materials that turns
         * out to be, keeps what the file says. An unlisted material then comes
         * out in its authored colour, which for an Apple asset is already
         * right for the colourway it shipped as. That is a safe default; being
         * painted an arbitrary tint is not.
         *
         * Placed after the stated-colour branches on purpose, so a device can
         * still name an exception -- the white key legends and the darkened
         * speaker below are both materials the finish must not touch and that
         * still need saying something about.
         */
        if (
          device.finishMaterials &&
          !device.finishMaterials.some((n) => n.toLowerCase() === keepName)
        ) {
          return mat;
        }

        // ...unless the device says this one is body. See bodyMaterials.
        const forcedBody = device.bodyMaterials?.some(
          (n) => n.toLowerCase() === (candidate as { name?: string }).name?.toLowerCase(),
        );
        if (candidate.transparent && !forcedBody) {
          if (typeof candidate.clone !== "function") return mat;
          const glass = candidate.clone() as typeof candidate;
          const spec = (candidate as { name?: string }).name
            ? device.bodySurfaces?.[(candidate as { name?: string }).name!]
            : undefined;
          if (spec) {
            if (spec.color !== undefined) {
              (glass as { color?: { set: (hex: string) => void } }).color?.set(spec.color);
            }
            if (spec.roughness !== undefined) glass.roughness = spec.roughness;
            if (spec.metalness !== undefined && "metalness" in glass) {
              (glass as { metalness: number }).metalness = spec.metalness;
            }
            if (spec.envMapIntensity !== undefined && "envMapIntensity" in glass) {
              (glass as { envMapIntensity: number }).envMapIntensity = spec.envMapIntensity;
            }
          }
          if ("envMapIntensity" in glass) {
            glass.envMapIntensity = GLASS_ENV_MAP_INTENSITY;
          }
          if ("roughness" in glass) {
            glass.roughness = GLASS_ROUGHNESS;
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
        // Asked to be flat: drop the painted map and let the finish fill it.
        const plain = device.plainMaterials?.some(
          (n) => n.toLowerCase() === (candidate as { name?: string }).name?.toLowerCase(),
        );
        if (plain && next.map) next.map = null;

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

        /*
         * The grain, as a modulation of the roughness the finish just set.
         *
         * three multiplies factor by map, so the factor is divided by the
         * map's own mean: the AVERAGE roughness stays exactly what the finish
         * asked for, and the grain lives as variation either side of it. That
         * is the whole reason this works where the model's own maps did not --
         * those replaced the finish, this one rides on top of it.
         *
         * Only where a material has no roughness map already. Nothing here
         * ships one today, but overwriting a real one with noise would be a
         * quiet downgrade if a future model does.
         */
        if (grainTexture && "roughness" in next && !(next as { roughnessMap?: unknown }).roughnessMap) {
          const scaled = grainTexture.clone();
          scaled.wrapS = RepeatWrapping;
          scaled.wrapT = RepeatWrapping;
          scaled.repeat.set(GRAIN_SCALE, GRAIN_SCALE);
          scaled.needsUpdate = true;
          (next as { roughnessMap?: unknown }).roughnessMap = scaled;
          const mean = 1 - GRAIN_AMOUNT / 2;
          next.roughness = Math.min(1, bodyRoughness / Math.max(0.05, mean));
        }
        next.emissive?.set?.(BODY_EMISSIVE_COLOR);
        if ("emissiveIntensity" in next) next.emissiveIntensity = BODY_EMISSIVE_INTENSITY;
        /*
         * A fresh surface, where the imported one cannot be reasoned with.
         *
         * The converted models arrive with a metallic-roughness TEXTURE — the
         * exporter merged the two into one on the way through, and the 18's
         * chassis states `metallicFactor 0.87` with a map over it. three
         * multiplies the scalar by the map, so the map has the final say: no
         * value of roughness in `finishes.ts` could reach that surface, which
         * is why raising it from 0.36 to 0.75 changed nothing visible at all.
         *
         * Rather than subtract one map at a time and hope, a device can ask
         * for the surface to be REBUILT: every map dropped, and colour,
         * roughness and metalness taken from the finish alone. What is lost is
         * the variation those maps encoded, which on anodised aluminium is
         * close to nothing — it is a uniform finish, and the map in question
         * was a 256px tile whose main contribution was speckle.
         */
        const named = (candidate as { name?: string }).name;
        if (named && device.plainBodyMaterials?.includes(named)) {
          for (const slot of [
            "map",
            "roughnessMap",
            "metalnessMap",
            "aoMap",
            "emissiveMap",
            "specularIntensityMap",
          ]) {
            if (slot in next) (next as Record<string, unknown>)[slot] = null;
          }
          next.color?.set?.(bodyColor);
          if ("roughness" in next) next.roughness = bodyRoughness;
          if ("metalness" in next) next.metalness = bodyMetalness;
        }
        // ...and then whatever the device says about THIS material, which is
        // how one body can hold a frame and a panel with different surfaces.
        const surface = named ? device.bodySurfaces?.[named] : undefined;
        if (surface) {
          if (surface.color !== undefined) next.color?.set?.(surface.color);
          if (surface.roughness !== undefined && "roughness" in next) {
            next.roughness = surface.roughness;
          }
          if (surface.metalness !== undefined && "metalness" in next) {
            next.metalness = surface.metalness;
          }
        }

        /*
         * 2.1 is a studio default that suits the models authored for it. The
         * converted 18s are not: their bodies came out of a USD with baked
         * roughness maps, and at 2.1 the chamfers read as mirror streaks
         * rather than the soft gradient Apple's own render shows. A device may
         * state its own.
         */
        if ("envMapIntensity" in next) {
          next.envMapIntensity = device.bodyEnvMapIntensity ?? BODY_ENV_MAP_INTENSITY;
        }
        if ("opacity" in next) next.opacity = BODY_OPACITY;
        if ("transparent" in next) next.transparent = BODY_OPACITY < 1;
        return next;
      };
      const mat2 = m.material as unknown;
      if (Array.isArray(mat2)) {
        (m as Mesh).material = mat2.map((entry) =>
          tintMaterial(entry, m.name),
        ) as unknown as Mesh["material"];
      } else if (mat2) {
        (m as Mesh).material = tintMaterial(mat2, m.name) as unknown as Mesh["material"];
      }
    });
    /*
     * Calm the front camera down.
     *
     * The lens and sensor sit on the model's small-details atlas
     * (PaletteMaterial001/002) and are metallic with a low roughness, so what
     * you saw in the island was the studio softbox mirrored back at you: a
     * bright cross of specular with the lens elements picked out around it.
     * On a real product shot the camera is a dark circle you have to look for.
     *
     * The fix is the REFLECTION, not the colour. A metal shows almost none of
     * its albedo -- tinting these materials bright red changes nothing on
     * screen, which is what made the first few attempts look like they had not
     * applied at all. Dropping envMapIntensity is what actually darkens it.
     *
     * Roughness is raised most of the way but stops short of fully matte, so
     * the glass keeps a faint sheen instead of reading as a dot of paint.
     *
     * This runs AFTER the finish and tint passes above, which clone their
     * materials -- anything set before them is discarded with the originals.
     */
    cloned.traverse((child) => {
      const materials = (child as Mesh).material as unknown;
      if (!materials) return;
      const list = (Array.isArray(materials) ? materials : [materials]) as Array<{
        name?: string;
        roughness?: number;
        envMapIntensity?: number;
        color?: { setHex?: (hex: number) => void };
        needsUpdate?: boolean;
      }>;
      list.forEach((material) => {
        if (!material?.name || !/^PaletteMaterial/.test(material.name)) return;
        material.envMapIntensity = CAMERA_ENV_MAP_INTENSITY;
        material.roughness = CAMERA_ROUGHNESS;
        // Dimming the reflection alone only fixed the angles where the
        // softbox was in it. Turn the phone and these parts went light grey
        // again, because that is their ALBEDO showing through once the
        // specular is gone. `color` multiplies the base colour texture, so
        // this darkens the whole atlas without flattening its detail.
        material.color?.setHex?.(CAMERA_TINT);
        material.needsUpdate = true;
      });
    });
    /*
     * Pose the model before measuring it.
     *
     * Orientation used to be a wrapper group around the loaded scene, which
     * meant the bounding box was taken from the model's authored pose and the
     * fit was computed for an object in a different position to the one on
     * screen. A device lying on its side measured as short and wide, got
     * scaled as though it were, and then stood up far too large.
     */
    // Re-measured rather than reused: the traverse above may have hidden the
    // model's own screen mesh, and a body box that still counted it would be
    // fractionally too deep.
    const box = new Box3().setFromObject(posed);
    const size = new Vector3();
    box.getSize(size);
    const center = new Vector3();
    box.getCenter(center);
    /*
     * Fit on whichever side runs out first, not on height alone.
     *
     * Normalising to PHONE_HEIGHT assumed every device is taller than it is
     * wide, which held while the registry was all phones. A 14" MacBook is
     * about 1.5x wider than it is tall, so scaling it to one unit TALL made it
     * one and a half units wide and it filled the frame edge to edge -- the
     * stage opened somewhere inside the lid.
     *
     * The frame is portrait, so the width budget is the smaller one. Phones
     * are unaffected: height still binds for anything portrait, and the
     * existing framing is unchanged.
     */
    const heightFit = size.y > 0 ? PHONE_HEIGHT / size.y : 1;
    const widthFit = size.x > 0 ? PHONE_WIDTH_BUDGET / size.x : 1;
    const scaleFactor = Math.min(heightFit, widthFit);
    posed.scale.setScalar(scaleFactor);
    posed.position.set(
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
      scene: posed,
      width: size.x * scaleFactor,
      height: size.y * scaleFactor,
      depth: size.z * scaleFactor,
      screen,
      screenMaterials,
      coverMaterials,
      mixer,
      leafRest,
      hinge,
      foldRoot: cloned,
    };
    // Grain is in here because the tint pass is where it is applied: the
    // materials are cloned per finish, so the texture has to be a dependency
    // or a rebuild of it would not reach them.
  }, [
    gltf.scene,
    device,
    bodyColor,
    bodyMetalness,
    bodyRoughness,
    grainTexture,
    activeFinishId,
  ]);

  // Bind the live screen texture onto the model's own screen material.
  //
  // glTF authors UVs for flipY = false, but TextureLoader and CanvasTexture
  // both default to true — leave it and the screenshot renders upside down.
  const invalidate = useThree((state) => state.invalidate);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  /*
   * Drive the hinge from the frame loop, not from React.
   *
   * It used to be an effect on the `fold` prop, which meant the hinge only
   * moved when React re-rendered. Two things fell out of that. During playback
   * and export the pose is sampled per FRAME from `timeRef` and React is not
   * in that path at all, so an animated fold rendered partly or not at all --
   * the export especially, which advances time and draws without ever
   * re-rendering. And interactively it stepped at React's cadence while every
   * other transform was being smoothed by the spring in PhoneScene, so it read
   * as coarse next to a rigid phone whose moves are all critically damped.
   *
   * Here it goes through the same spring at the same omega, off the same
   * clock as the rest of the phone.
   */
  const foldRange = device.fold;
  const foldVel = useRef<Record<string, number>>({ f: 0 });
  const foldNow = useRef<number | null>(null);
  useFrame((state, dt) => {
    if (!mixer || !foldRange) return;
    let target = fold ?? 0;
    if (animation && timeRef) {
      const pose = sampleAnimation(animation, timeRef.current);
      if (pose.fold !== undefined) target = pose.fold;
    }
    // Playback and export ask for the pose they were given, exactly -- the
    // spring is for a value you are dragging, and on a keyed track it would
    // trail every keyframe and round off the extremes that were set on
    // purpose.
    if (foldNow.current === null || immediate || playing) {
      foldNow.current = target;
      foldVel.current.f = 0;
    } else {
      foldNow.current = springTo(foldNow.current, target, foldVel.current, "f", dt);
    }
    const t = foldNow.current / 100;
    mixer.setTime(
      foldRange.openSec + (foldRange.closedSec - foldRange.openSec) * t,
    );

    /*
     * Lock the hinge, and let the leaves swing.
     *
     * Measuring what the clip actually does settled this: both leaves already
     * rotate by the SAME angle -- 13.9 and 13.9 at a quarter closed, 89.9 and
     * 89.9 at the end -- in their own mirrored frames. The rig was symmetric
     * all along. What made it read as a door is that the pair pivots about a
     * point that is not the hinge, so the whole device swings across the frame
     * and the eye reads the leaf that moved least as "fixed".
     *
     * Two earlier attempts got this wrong in different ways. One counter-
     * rotated the entire model, which is the wrong shape of fix. The other
     * redistributed the swing between the leaves, which flattened both to zero
     * because they were already even. Neither had ever run: the lookup used
     * "Frame L" while GLTFLoader sanitises whitespace to underscores, so the
     * names never matched and the code was silently unreachable.
     *
     * What is left is the small true thing: translate the model each frame so
     * the hinge stays where it sat when the phone was open. Leaves rotate,
     * spine holds.
     */
    if (hinge) {
      // Recomputed from zero each frame, not accumulated. Adding the
      // correction to the existing offset compounds it, and the phone leaves
      // the frame within a few frames of touching the slider.
      foldRoot.position.set(0, 0, 0);
      foldRoot.updateMatrixWorld(true);
      hinge.getWorldPosition(FOLD_ANCHOR);
      foldRoot.parent?.worldToLocal(FOLD_ANCHOR);
      foldRoot.position.copy(FOLD_ANCHOR_REST).sub(FOLD_ANCHOR);
    }

    if (
      Math.abs(foldNow.current - target) > 0.01 ||
      Math.abs(foldVel.current.f) > 0.01
    ) {
      state.invalidate();
    }
  });

  // A change while the loop is asleep has to wake it; the frame callback
  // cannot ask for a frame it is not being given.
  useEffect(() => {
    invalidate();
  }, [fold, invalidate]);

  // Pulled apart so the effect depends on the three numbers rather than on the
  // object, which the editor rebuilds every render — depending on the object
  // would rebind every material on every frame.
  const fitScale = screenFit?.scale ?? DEFAULT_SCREEN_FIT.scale;
  const fitOffsetX = screenFit?.offsetX ?? DEFAULT_SCREEN_FIT.offsetX;
  const fitOffsetY = screenFit?.offsetY ?? DEFAULT_SCREEN_FIT.offsetY;
  useEffect(() => {
    if (!screenMaterials.length) return;
    /* eslint-disable react-hooks/immutability -- three.js state lives on the
       objects themselves: assigning a map and raising needsUpdate is the only
       way to rebind a material. Both the texture and the materials are owned
       by this component, so nothing outside it observes the mutation. */
    // Fit the source to the model's own screen, then apply the manual nudge.
    //
    // This has to happen HERE as well as in ScreenPlane, and that is the whole
    // reason the zoom control appeared to do nothing: when the GLB carries a
    // screen material the texture is bound straight to it and ScreenPlane is
    // never rendered, so the fit that lives there never ran. This path used to
    // set `repeat` to a bare flip, which stretched every non-matching source.
    //
    // `center` is (0.5, 0.5) below, so `repeat` scales about the middle and
    // the crop needs no centring offset of its own — unlike ScreenPlane, whose
    // centre is the origin.
    const applyFit = () => {
      if (!screenTexture) return;
      const image = screenTexture.image as
        | (HTMLVideoElement & { width: number; height: number })
        | undefined;
      const srcWidth = image?.videoWidth || image?.width || 0;
      const srcHeight = image?.videoHeight || image?.height || 0;

      const flip = device.screenFlipX ? -1 : 1;
      const flipV = device.screenFlipY ? -1 : 1;
      let fx = 1;
      let fy = 1;

      // An odd number of quarter turns swaps which way the screen is long, so
      // the crop has to be computed against the shape the source will occupy
      // AFTER the turn, not before it.
      const quarterTurned =
        Math.abs(Math.round((device.screenRotateDeg ?? 0) / 90)) % 2 === 1;

      if (srcWidth && srcHeight) {
        const flat = screen
          ? screen.width / screen.height
          : device.screenNative.width / device.screenNative.height;
        // What shape of source region comes out undistorted. Where the model's
        // UVs are laid out proportionally that is just the geometry; where
        // they are not, the mapping's own stretch has to be divided back out.
        const undistorted =
          device.screenUvAspect !== undefined ? device.screenUvAspect / flat : flat;
        const screenAspect = quarterTurned ? 1 / undistorted : undistorted;
        const srcAspect = srcWidth / srcHeight;
        if (srcAspect > screenAspect) fx = screenAspect / srcAspect;
        else if (srcAspect < screenAspect) fy = srcAspect / screenAspect;
      }

      /*
       * The crop is chosen against the turned aspect, but fx and fy scale the
       * texture's OWN axes and three applies the scale BEFORE the rotation --
       * so after a quarter turn the shrink meant for one axis lands on the
       * other. Left alone, a square source came out pulled 2.1x sideways
       * across the panel, which is a circle rendering as an ellipse twice as
       * wide as it is tall.
       *
       * Verified with a test card carrying a circle and a square, because
       * reasoning about it got the direction wrong twice: the matrix says one
       * thing and the render says the other, and the render is what ships.
       */
      if (quarterTurned) {
        const turned = fx;
        fx = fy;
        fy = turned;
      }

      const zoom = fitScale > 0 ? fitScale : 1;
      fx /= zoom;
      fy /= zoom;

      screenTexture.center.set(0.5, 0.5);
      screenTexture.rotation = ((device.screenRotateDeg ?? 0) * Math.PI) / 180;
      /*
       * Clamped, deliberately. Repeat wrapping was tried here to make a
       * negative repeat mirror correctly for a model whose UVs ran right to
       * left; that model is gone, and on one whose UVs stray outside 0..1 the
       * wrap tiles the screenshot and smears it down the screen. Clamping is
       * the safer default: a UV past the edge returns the edge pixel rather
       * than a copy of the whole image.
       */
      screenTexture.wrapS = ClampToEdgeWrapping;
      screenTexture.wrapT = ClampToEdgeWrapping;
      screenTexture.repeat.set(fx * flip, fy * flipV);
      // Nudges follow the turn, so Screen X still moves the image the way the
      // screen looks rather than the way its UVs happen to run.
      screenTexture.offset.set(
        quarterTurned ? -fitOffsetY * fx : -fitOffsetX * fx,
        quarterTurned ? fitOffsetX * fy : fitOffsetY * fy,
      );
      screenTexture.needsUpdate = true;
      invalidate();
    };

    for (const material of screenMaterials) {
      if (screenTexture) {
        screenTexture.flipY = false;
        // The renderer's maximum, not a guessed 4. The screen is the one
        // surface guaranteed to be viewed at a slant, and anisotropy is
        // exactly the setting that decides whether a screenshot stays legible
        // there or smears into mush.
        screenTexture.anisotropy = maxAnisotropy;
        screenTexture.colorSpace = SRGBColorSpace;
        applyFit();
      }
      material.map = screenTexture;
      // No source: the screen is off. Near-black rather than pure, so the
      // glass over it still has something to sit on.
      material.color.set(screenTexture ? 0xffffff : 0x050505);
      material.needsUpdate = true;
    }
    /* eslint-enable react-hooks/immutability */
    invalidate();

    // A video does not know its size until metadata lands, and a shared window
    // can be resized mid-stream. Without these the crop is computed once
    // against a size that no longer holds.
    const image = screenTexture?.image as HTMLVideoElement | undefined;
    if (!image || typeof image.videoWidth !== "number") return;
    image.addEventListener("loadedmetadata", applyFit);
    image.addEventListener("resize", applyFit);
    return () => {
      image.removeEventListener("loadedmetadata", applyFit);
      image.removeEventListener("resize", applyFit);
    };
  }, [
    screenMaterials,
    screenTexture,
    device,
    invalidate,
    maxAnisotropy,
    screen,
    fitScale,
    fitOffsetX,
    fitOffsetY,
  ]);

  /*
   * The cover screen, from its own source.
   *
   * A separate effect rather than a second pass through the one above: that
   * path carries the Screen zoom / X / Y nudges, and those belong to the panel
   * you are composing. The cover is a second, smaller screen -- it wants a
   * plain cover-crop and nothing to tune, and giving it the same controls
   * would mean one pair of sliders quietly moving two images at once.
   */
  const coverConfig = device.coverScreen;
  const coverFit = coverScreenFit ?? DEFAULT_SCREEN_FIT;
  useEffect(() => {
    if (!coverMaterials.length) return;
    /* eslint-disable react-hooks/immutability */
    const fitCover = () => {
      if (!coverTexture || !coverConfig) return;
      const image = coverTexture.image as
        | (HTMLVideoElement & { width: number; height: number })
        | undefined;
      const srcWidth = image?.videoWidth || image?.width || 0;
      const srcHeight = image?.videoHeight || image?.height || 0;

      const turned =
        Math.abs(Math.round((coverConfig.rotateDeg ?? 0) / 90)) % 2 === 1;
      const flat = coverConfig.native.width / coverConfig.native.height;
      const panel = turned ? 1 / flat : flat;

      let fx = 1;
      let fy = 1;
      if (srcWidth && srcHeight) {
        const srcAspect = srcWidth / srcHeight;
        if (srcAspect > panel) fx = panel / srcAspect;
        else if (srcAspect < panel) fy = srcAspect / panel;
      }
      // Same reason as the main screen: the scale is applied before the
      // rotation, so a quarter turn puts each shrink on the other axis.
      if (turned) {
        const swap = fx;
        fx = fy;
        fy = swap;
      }

      coverTexture.center.set(0.5, 0.5);
      coverTexture.rotation = ((coverConfig.rotateDeg ?? 0) * Math.PI) / 180;
      coverTexture.wrapS = ClampToEdgeWrapping;
      coverTexture.wrapT = ClampToEdgeWrapping;
      /*
       * Map the mesh's UV span onto the chosen window of the source.
       *
       * three composes the transform as
       *   sampled = repeat * uv + centre * (1 - repeat) + offset
       * so with the mesh's UVs running ry..ry+rh and the window running A..B:
       *   repeat = (B - A) / rh
       *   offset = A - repeat * ry - centre * (1 - repeat)
       *
       * Worth deriving rather than adjusting by eye. The cover panel's UVs
       * start at v = 0.3138, and the earlier arithmetic left the offset about
       * 0.46 low -- which is exactly what "the image keeps falling to the
       * bottom" looks like. The same formula reduces to the main screen's
       * existing numbers when the UVs span the full square, which is how it
       * was checked.
       */
      const rect = coverConfig.uvRect;
      const rw = rect?.w ?? 1;
      const rh = rect?.h ?? 1;
      const rx = rect?.x ?? 0;
      const ry = rect?.y ?? 0;

      // The centred crop, nudged. A flip swaps which end of the window the
      // mesh's first UV lands on, which is all a mirror is.
      const u0 = (1 - fx) / 2 - coverFit.offsetX * fx;
      const u1 = u0 + fx;
      const v0 = (1 - fy) / 2 + coverFit.offsetY * fy;
      const v1 = v0 + fy;
      const [ua, ub] = coverConfig.flipX ? [u1, u0] : [u0, u1];
      const [va, vb] = coverConfig.flipY ? [v1, v0] : [v0, v1];

      const sx = (ub - ua) / rw;
      const sy = (vb - va) / rh;
      coverTexture.repeat.set(sx, sy);
      coverTexture.offset.set(
        ua - sx * rx - 0.5 * (1 - sx),
        va - sy * ry - 0.5 * (1 - sy),
      );
      coverTexture.needsUpdate = true;
      invalidate();
    };

    for (const material of coverMaterials) {
      if (coverTexture) {
        coverTexture.flipY = false;
        coverTexture.anisotropy = maxAnisotropy;
        coverTexture.colorSpace = SRGBColorSpace;
        fitCover();
      }
      material.map = coverTexture ?? null;
      material.color.set(coverTexture ? 0xffffff : 0x050505);
      material.needsUpdate = true;
    }
    /* eslint-enable react-hooks/immutability */
    invalidate();

    const image = coverTexture?.image as HTMLVideoElement | undefined;
    if (!image || typeof image.videoWidth !== "number") return;
    image.addEventListener("loadedmetadata", fitCover);
    image.addEventListener("resize", fitCover);
    return () => {
      image.removeEventListener("loadedmetadata", fitCover);
      image.removeEventListener("resize", fitCover);
    };
  }, [coverMaterials, coverTexture, coverConfig, invalidate, maxAnisotropy,
      coverFit.scale, coverFit.offsetX, coverFit.offsetY]);

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
          fit={screenFit}
        />
      )}
      {/* Suppressed for a live mirror: the captured screen already has one. */}
      {!isBound && device.notch && !screenFit?.sourceHasNotch ? (
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
  screenFit,
}: {
  rail: Phone3DRail | undefined;
  screenTexture: Texture | null;
  device: Device;
  screenFit?: ScreenFit;
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
        fit={screenFit}
        cornerRadiusPct={device.screenCornerRadiusPct}
        insetPct={device.screenInsetPct}
      />
    </>
  );
}

/**
 * When a live pose counts as arrived, as a quaternion dot product.
 *
 * `dot` between two unit quaternions is cos(theta/2), so this threshold is an
 * angle: 1 - 1e-7 is about 0.05 degrees. Sensor noise below that moves the
 * model by a fraction of a pixel and is not worth a frame.
 *
 * It exists because "a live feed never settles" was taken to mean the renderer
 * must never idle while one is attached, and that turned out to be expensive
 * in a specific way. Every frame a live pose asked for was a full re-upload of
 * the broadcast video texture -- which on a current iPhone is a 1320x2868
 * frame, about 15 MB -- so a phone lying perfectly still on a desk pinned a
 * 120 Hz display at 120 uploads a second to render an image that was not
 * changing. Gyro and broadcast then appeared to fight each other, which is the
 * same fight `VideoFrameDriver` was written to end on the video side.
 */
const LIVE_SETTLED_DOT = 1 - 1e-7;

/** Scratch target for the live-pose slerp. Module scope so the frame loop
    does not allocate a quaternion sixty times a second. */
const LIVE_TARGET = new Quaternion();

/** Scratch for the fold re-anchor, so the frame loop allocates nothing. */
const FOLD_SWING = new Quaternion();
const FOLD_DELTA = new Quaternion();
const FOLD_HALF = new Quaternion();
const FOLD_HALF_INV = new Quaternion();
const FOLD_ANCHOR = new Vector3();
const FOLD_ANCHOR_REST = new Vector3();

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
  animating,
  livePose,
  screenFit,
  fold,
  cardRadius,
  cardDepth,
  coverTexture,
  coverScreenFit,
  offsetZ = 0,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1,
}: {
  rail: Phone3DRail | undefined;
  screenTexture: Texture | null;
  device: Device;
  finishId?: string;
  immediate?: boolean;
  animation?: Animation;
  timeRef?: React.MutableRefObject<number>;
  playing?: boolean;
  animating?: boolean;
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
  /** Manual nudge on the screen crop. */
  screenFit?: ScreenFit;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  offsetX: number;
  offsetY: number;
  /** Along the line of sight, in world units. See `panZ` in editorState. */
  offsetZ?: number;
  scale: number;
  /** Per-axis multipliers on `scale`. 1 is uniform, which is what every caller
      that does not ask for otherwise gets. */
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  heightPct: number;
  fold?: number;
  coverTexture?: Texture | null;
  coverScreenFit?: { scale: number; offsetX: number; offsetY: number };
  cardRadius: number;
  cardDepth: number;
}) {
  const rad = Math.PI / 180;
  const groupRef = useRef<Group>(null);

  /** Live velocity for each sprung transform. A ref, not state — it is written
      every frame and nothing renders off it. */
  const springVel = useRef<Record<string, number>>({
    sz: 0,
    ox: 0,
    oy: 0,
    oz: 0,
    kx: 0,
    ky: 0,
    kz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
  });

  /**
   * The sprung scale, kept apart from the object's own.
   *
   * `g.scale` is now the PRODUCT of a uniform size and three per-axis
   * multipliers, so it is no longer something a spring can read its own last
   * value back out of — `g.scale.x` would answer with the product and the
   * uniform would drift toward it. The four factors are tracked here and the
   * object is composed from them each frame.
   */
  const springScale = useRef({ u: 1, x: 1, y: 1, z: 1 });

  const targetSizeScale = (heightPct / 100) * (scale / 100);
  const targetOffsetX = (offsetX / 500) * PHONE_HEIGHT;
  const targetOffsetY = -(offsetY / 500) * PHONE_HEIGHT;
  // Already in world units — unlike X and Y, which arrive as percentages of
  // the phone's height because that is what the panel and the presets speak.
  const targetOffsetZ = offsetZ;
  const targetRX = rotateX * rad;
  const targetRY = rotateY * rad;
  const targetRZ = rotateZ * rad;

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    springScale.current = { u: targetSizeScale, x: scaleX, y: scaleY, z: scaleZ };
    g.scale.set(targetSizeScale * scaleX, targetSizeScale * scaleY, targetSizeScale * scaleZ);
    g.position.set(targetOffsetX, targetOffsetY, targetOffsetZ);
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
    let oz = targetOffsetZ;
    let sz = targetSizeScale;
    if (playing && animation && timeRef) {
      const pose = sampleAnimation(animation, timeRef.current);
      if (pose.xAxis !== undefined) rx = pose.xAxis * rad;
      if (pose.yAxis !== undefined) ry = pose.yAxis * rad;
      if (pose.zAxis !== undefined) rz = pose.zAxis * rad;
      if (pose.panX !== undefined) ox = (pose.panX * 100 / 500) * PHONE_HEIGHT;
      if (pose.panY !== undefined) oy = -(pose.panY * 100 / 500) * PHONE_HEIGHT;
      // Already world units, unlike X and Y — see `offsetZ`.
      if (pose.panZ !== undefined) oz = pose.panZ;
      if (pose.zoom !== undefined) sz = (heightPct / 100) * pose.zoom;
      /*
       * Demand loop: ask for the next frame, or playback stops after one.
       *
       * `animating` and not `playing`, and the difference is the whole reason
       * this line has a history. `playing` here means "the pose comes from the
       * clock", which is also true when the clock is stopped -- a preset
       * applied and paused, scrubbed, or being exported a frame at a time. So
       * it cannot decide whether to ask for another frame: leave it asking
       * always and the canvas redraws at 60Hz forever after a clip ends;
       * compare against the time last drawn instead and playback never STARTS,
       * because on its first frame the transport has not advanced the head yet
       * and the two are equal.
       *
       * The honest question is whether the clock is running, which only the
       * transport knows, so it says so.
       */
      if (animating) state.invalidate();
    }

    // Playback and export ask for the pose they were given, exactly. The
    // spring below is a filter: lovely on a slider nudge, but during an
    // animation it trails every keyframe and quietly rounds off the extremes
    // that were keyed on purpose.
    const vel = springVel.current;
    const live = livePose?.current;
    const k = springScale.current;
    if (immediate) {
      k.u = sz;
      k.x = scaleX;
      k.y = scaleY;
      k.z = scaleZ;
      g.position.x = ox;
      g.position.y = oy;
      g.position.z = targetOffsetZ;
      // A spring carries velocity, so snapping has to clear it too or the next
      // interactive move starts mid-flight from wherever playback stopped.
      for (const key in vel) vel[key] = 0;
    } else {
      k.u = springTo(k.u, sz, vel, "sz", dt);
      k.x = springTo(k.x, scaleX, vel, "kx", dt);
      k.y = springTo(k.y, scaleY, vel, "ky", dt);
      k.z = springTo(k.z, scaleZ, vel, "kz", dt);
      g.position.x = springTo(g.position.x, ox, vel, "ox", dt);
      g.position.y = springTo(g.position.y, oy, vel, "oy", dt);
      g.position.z = springTo(g.position.z, oz, vel, "oz", dt);
    }
    g.scale.set(k.u * k.x, k.u * k.y, k.u * k.z);

    if (live) {
      // The live feed keeps its lag filter rather than the spring. A spring is
      // the right shape for a move between two settled poses; a gyro stream
      // never settles, and what it needs is noise smoothed off a signal that
      // is already continuous. A second-order filter on top of that would add
      // its own momentum to a hand that has already stopped moving.
      const k = immediate ? 1 : 1 - Math.exp(-dt * TRANSFORM_OMEGA);
      LIVE_TARGET.set(live.x, live.y, live.z, live.w).multiply(MODEL_FACING);
      // Measured BEFORE the step: how far the model still has to travel is
      // what decides whether another frame is worth asking for.
      const arrived = Math.abs(g.quaternion.dot(LIVE_TARGET)) >= LIVE_SETTLED_DOT;
      g.quaternion.slerp(LIVE_TARGET, k);
      /*
       * Only while the model is still catching up.
       *
       * This used to invalidate unconditionally, on the reasoning that a live
       * feed never settles. The MODEL does settle, though -- the filter above
       * converges within a frame or two of the phone stopping -- and the cost
       * of not noticing is paid by whatever else is in the scene, which here
       * is a full-resolution video texture being re-uploaded per frame.
       *
       * The loop cannot deadlock by stopping here: `LivePoseWaker` watches the
       * sample ref from a plain rAF, outside the demand loop, and wakes it when
       * a genuinely new orientation lands. An invalidate that only ever fires
       * from INSIDE `useFrame` cannot restart a loop that has already parked,
       * which is the trap this pair of changes exists to stay out of.
       */
      if (!arrived) state.invalidate();
    } else if (immediate) {
      g.rotation.x = rx;
      g.rotation.y = ry;
      g.rotation.z = rz;
    } else {
      g.rotation.x = springTo(g.rotation.x, rx, vel, "rx", dt);
      g.rotation.y = springTo(g.rotation.y, ry, vel, "ry", dt);
      g.rotation.z = springTo(g.rotation.z, rz, vel, "rz", dt);
    }

    // Settled is measured against the largest remaining delta rather than each
    // axis separately: rotation in radians and scale in units are different
    // magnitudes, and stopping on whichever finishes first leaves the others
    // frozen mid-move.
    // Velocity counts as well as distance. A spring passes close to its target
    // while still carrying speed, and testing position alone would park the
    // demand loop mid-move and freeze the phone a fraction short.
    const moving = Object.values(springVel.current).some((v) => Math.abs(v) > 1e-3);
    const settled =
      !live &&
      !moving &&
      Math.abs(sz - k.u) < 1e-4 &&
      Math.abs(scaleX - k.x) < 1e-4 &&
      Math.abs(scaleY - k.y) < 1e-4 &&
      Math.abs(scaleZ - k.z) < 1e-4 &&
      Math.abs(ox - g.position.x) < 1e-4 &&
      Math.abs(oy - g.position.y) < 1e-4 &&
      Math.abs(targetOffsetZ - g.position.z) < 1e-4 &&
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
    targetOffsetZ,
    scaleX,
    scaleY,
    scaleZ,
    targetRX,
    targetRY,
    targetRZ,
  ]);

  return (
    <group ref={groupRef}>
      {device.kind === "image" ? (
        /* Generated on the spot from the upload -- no loader, no Suspense. */
        <ImageCardScene
          texture={screenTexture}
          finishId={finishId ?? DEFAULT_FINISH_ID}
          radius={cardRadius}
          depth={cardDepth}
        />
      ) : USE_GLB ? (
        /*
         * Nothing while the model loads, not a stand-in phone.
         *
         * This used to fall back to the procedural body, which drew a
         * featureless black slab in the model's place -- so the stage showed a
         * phone that was not the phone, and then swapped it for the real one
         * once the GLB arrived. It read as a box appearing out of nowhere,
         * because that is what it was.
         *
         * The loading capsule over the stage covers the "is it working"
         * question now, which is the job the stand-in was doing badly. An
         * empty stage plus an honest label beats a decoy.
         */
        <Suspense fallback={null}>
          <GLBPhoneScene
            screenTexture={screenTexture}
            device={device}
            finishId={finishId}
            screenFit={screenFit}
            fold={fold}
            coverTexture={coverTexture}
            coverScreenFit={coverScreenFit}
            animation={animation}
            timeRef={timeRef}
            playing={playing}
            immediate={immediate}
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
  offsetZ,
  scale,
  scaleX,
  scaleY,
  scaleZ,
  heightPct,
  finishId,
  immediate,
  animation,
  timeRef,
  playing,
  animating,
  livePose,
  fold,
  cardRadius,
  cardDepth,
  coverTexture,
  coverScreenFit,
  fov = 38,
  shadow = DEFAULT_SHADOW,
  lighting = DEFAULT_LIGHTING,
  screenFit,
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
  /** Toward the camera and away from it, in world units. */
  offsetZ?: number;
  scale: number;
  /** Per-axis multipliers on `scale`; 1 each is the uniform default. */
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  heightPct: number;
  /** Body finish id from `finishes.ts`; falls back to the first entry. */
  finishId?: string;
  /** Snap to the given transform instead of easing toward it. */
  immediate?: boolean;
  /** Sampled inside the frame loop while `playing`, bypassing React. */
  animation?: Animation;
  timeRef?: React.MutableRefObject<number>;
  playing?: boolean;
  /** The transport is RUNNING, as opposed to the pose merely coming from
      the clock. Only this asks for the next frame — see `PhoneScene`. */
  animating?: boolean;
  /** A paired phone's live orientation. Overrides the rotation props while
      present — see the note on PhoneScene. */
  livePose?: React.RefObject<Quat> | null;
  /** Camera field of view, in degrees. */
  /** 0-100, how far a folding device is closed. */
  fold?: number;
  cardRadius?: number;
  cardDepth?: number;
  coverTexture?: Texture | null;
  coverScreenFit?: { scale: number; offsetX: number; offsetY: number };
  fov?: number;
  shadow?: ShadowSettings;
  lighting?: LightingId;
  /** Manual nudge on the screen crop — see ScreenFit. */
  screenFit?: ScreenFit;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  captureRef?: React.MutableRefObject<StageCapture | null>;
  /** Frame-by-frame access, for recording video. */
  recorderRef?: React.MutableRefObject<StageRecorder | null>;
  onRotateDrag?: (delta: { dx: number; dy: number }) => void;
  /** Wheel / trackpad pinch over the canvas, in scale percentage points. */
  onScaleWheel?: (deltaPct: number) => void;
}) {
  const device = getDevice(deviceId);
  const { id: shadowFilterId, defs: shadowDefs } = useShadowFilter(shadow);
  return (
    <>
      {shadowDefs}
      <StageLoader />
      <Canvas
        className="!h-full !w-full"
        /*
         * The drop shadow is a CSS filter on the canvas, and it works because
         * the stage renders transparent over the background: the only opaque
         * thing in the canvas is the phone, so `drop-shadow` reads its
         * silhouette directly and follows every rotation for free. No light,
         * no surface for it to land on, and nothing it can fall across.
         */

        // Initial only — r3f reads this once. CameraFov keeps it current.
        camera={{ position: [0, 0, 1.8], fov }}
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
        /*
         * The drop shadow is a CSS filter on the canvas, and it works because
         * the stage renders transparent over the background: the only opaque
         * thing in the canvas is the phone, so `drop-shadow` reads its
         * silhouette directly and follows every rotation for free. No light,
         * no surface for it to land on, and nothing it can fall across.
         */
        style={{ background: "transparent", filter: shadowFilterId ? `url(#${shadowFilterId})` : undefined }}
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
        <LivePoseWaker livePose={livePose} />
        {onRotateDrag ? (
          <PointerDragRotation
            onRotateChange={onRotateDrag}
            onScaleChange={onScaleWheel}
          />
        ) : null}
        <StudioEnvironment lighting={lighting} />
        {/* Live surface tuning for the converted 18s — see `MaterialLab`. It
            writes onto the materials after the retint, which is the only place
            these values can be set at all. */}
        <MaterialLab active={device.id.startsWith("apple-iphone-18")} />
        <CameraFov fov={fov} animation={animation} timeRef={timeRef} playing={playing} />
        <PhoneScene
          animating={animating}
          rail={rail}
          screenTexture={screenTexture}
          device={device}
          rotateX={rotateX}
          rotateY={rotateY}
          rotateZ={rotateZ}
          offsetX={offsetX}
          offsetY={offsetY}
          offsetZ={offsetZ}
          scale={scale}
          scaleX={scaleX}
          scaleY={scaleY}
          scaleZ={scaleZ}
          heightPct={heightPct}
          finishId={finishId}
          immediate={immediate}
          animation={animation}
          timeRef={timeRef}
          playing={playing}
          livePose={livePose}
          screenFit={screenFit}
          fold={fold}
          cardRadius={cardRadius ?? DEFAULT_EDITOR_STATE_CARD_RADIUS}
          cardDepth={cardDepth ?? DEFAULT_EDITOR_STATE_CARD_DEPTH}
          coverTexture={coverTexture}
          coverScreenFit={coverScreenFit}
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
