"use client";

/**
 * The canvas the chrome floats over.
 *
 * `StudioChrome` had a comment where this goes — "The stage goes here. Left
 * empty on purpose: this file is the chrome, and the canvas is a different
 * problem with a different owner." This is that owner.
 *
 * The frame the shot is composed inside is a rounded rectangle in the middle of
 * the dotted workspace, and the panels sit OVER it rather than beside it. That
 * is not a layout accident: the whole material is a refracting glass, and glass
 * with nothing behind it is a grey rectangle. The chrome is legible over the
 * shot because it bends the shot.
 *
 * `container-type: size` is what lets the frame size itself off the workspace
 * in CSS — `cqw`/`cqh` are the two numbers needed to fit a ratio inside a box,
 * and reading them here avoids a resize observer that would re-render the whole
 * scene on every drag of the window edge. Same technique as the editor's.
 */

import { memo, useEffect, useRef, useState } from "react";
import PhoneStage3D from "../PhoneStage3D";
import { OverlayLayer } from "../OverlayLayer";
import { backgroundClass, backgroundCss } from "../backgrounds";
import BackgroundImage from "../BackgroundImage";
import { isOverlayActive } from "../overlay";
import type { Studio } from "./useStudio";
import { sampleAnimation } from "../animation";
import {
  poseOf,
  toPhone,
  toScreen,
  type FocusArea,
  type FocusPose,
} from "./focusMath";
import { Vector3 } from "three";
import type { SnapGuides } from "./snapping";
import { DEFAULT_BLUR, isBlurActive, type BlurSettings } from "../blurStyles";

/**
 * How much workspace is left around the canvas.
 *
 * Enough that the dot grid reads as a surface the frame is sitting on, and not
 * so much that the shot is a stamp in the middle of it. The panels overlap it
 * either way — see above.
 */
export const INSET = 40;

/**
 * How much of the room the frame actually takes.
 *
 * `min(100cqw, ratio * 100cqh)` is the largest the shot could be, and the
 * largest is not the right size: it left the composition running edge to edge
 * under the chrome with no ground showing, so the panels had nothing to sit on
 * and the shot read as the page rather than as something placed on it.
 *
 * A fraction rather than a bigger inset, because a fixed margin is a different
 * proportion on every window — 40px around a laptop screen and 40px around a
 * 27-inch one are not the same picture. This holds the same margin at any size.
 *
 * Fill is exempt: it is the one ratio whose name is a promise about the room it
 * takes.
 */
export const FRAME = 0.82;

function StageInner({
  studio,
  modelToken = null,
  focusDrawing = false,
}: {
  studio: Studio;
  /** Signed link for the device models — see `lib/modelToken`. */
  modelToken?: string | null;
  /** The Focus points panel is open: drags on the shot draw areas. */
  focusDrawing?: boolean;
}) {
  const {
    state,
    ratio,
    screenTexture,
    coverTexture,
    playing,
    playheadRef,
    exporting,
    presetId,
    motionMode,
  } = studio;

  /*
   * The pose follows the playhead while the transport runs AND while a video
   * is being written.
   *
   * Those are two different things and it cost an export to find out. The
   * stage samples the animation only when it is told something is playing,
   * and `exportVideo` deliberately calls `setPlaying(false)` first -- it
   * drives time itself, one frame at a time, so that the file does not
   * inherit this machine's stutters. The two together meant the recorder
   * advanced the playhead 75 times and the phone never once looked at it:
   * every frame of the clip was the same static pose, at the right length,
   * which is precisely the shape of bug that survives being watched.
   *
   * The third case is a preset simply being applied. The head can be parked
   * anywhere -- paused mid-clip, dropped by a scrub, resting on the last frame
   * -- and in every one of those the phone has to show the frame the timeline
   * says it is showing. Without it a scrub moves the marker and nothing else,
   * and a finished clip snaps back to the pre-preset pose.
   *
   * `immediate` rides along for the same reason it does during playback: the
   * spring is a lag filter, and a filter on top of frame-exact export would
   * smear each keyframe a fifth of a second late.
   */
  /* Motion is the only tab that shows the clip; Crafting shows the rest
     pose, as the device was set before anything moved it. */
  const timeDriven =
    exporting?.kind === "video" ||
    (motionMode &&
      (playing ||
        presetId !== null ||
        // Any keys at all, not only a preset's: a composed focus move or keys
        // set by hand have to follow a scrub too. Gated on the preset alone, a
        // scrub moved the depth of field -- which samples the clip itself --
        // and left the phone standing still.
        Object.values(state.animation.tracks).some(
          (keys) => keys && keys.length > 0,
        )));
  /* Each tab's own depth of field: Motion's travels with its moves. */
  const blur = motionMode ? (state.motionBlur ?? DEFAULT_BLUR) : state.blur;

  return (
    <div
      className="absolute inset-0 grid place-items-center"
      /*
       * No margin at Fill, and the inset at every other ratio.
       *
       * Fill means the whole surface: at a ratio the shot is an object sitting
       * on a workspace and wants ground around it, but Fill is the workspace,
       * and a 40px band of dot grid around it would be a frame it did not ask
       * for.
       */
      style={{ containerType: "size", padding: ratio === null ? 0 : INSET }}
      // No browser menu over the shot: "Save Image As" / "Copy Image" would
      // hand out the render outside the studio's export (and its
      // watermark). Scoped to the stage -- text fields elsewhere keep theirs.
      onContextMenu={(event) => event.preventDefault()}
    >
      {/*
        The canvas fills its frame by CSS, not by the pixel size R3F last
        measured. The frame changes size -- eased when the timeline comes and
        goes, at once when the ratio changes -- and R3F's measurement trails it
        by a few frames; sized in pixels, the canvas sat at the OLD size inside
        the new frame for those frames, cropped and off centre, then snapped.

        CONTAIN, not stretch: stretched, the last render took the new frame's
        proportions and a ratio change squashed the phone flat for those
        frames. Contained, it keeps its shape and is only scaled until the new
        render lands. The canvas is transparent, so the space around it is the
        frame's own background and shows nothing. Exports read the drawing
        buffer, so they are untouched.
      */}
      <style>{`.mo-shot canvas { width: 100% !important; height: 100% !important; object-fit: contain; }`}</style>
      <div
        className={`mo-shot relative overflow-hidden ${backgroundClass(state.background)}`}
        style={{
          // Square at Fill: a corner is what tells you where a shot ends, and
          // at Fill it ends at the window.
          borderRadius: ratio === null ? 0 : "var(--mo-r-panel)",
          ...backgroundCss(state.background),
          ...(ratio === null
            ? { width: "100%", height: "100%" }
            : {
                aspectRatio: String(ratio),
                // Whichever of the two constraints binds first wins, so the
                // frame always fits and never overflows.
                width: `calc(min(100cqw, ${ratio} * 100cqh) * ${FRAME})`,
              }),
        }}
      >
        <BackgroundImage bg={state.background} />
        <PhoneStage3D
          rail={undefined}
          /* The two doors export goes through: one frame on demand for the
             still, and a held-open resolution for the clip. Both are refs the
             scene fills in — see `CaptureBridge` and `RecorderBridge`. */
          captureRef={studio.captureRef}
          recorderRef={studio.recorderRef}
          focusFollow={motionMode ? (state.focusFollow ?? null) : null}
          canvasRef={studio.stageCanvasRef}
          screenTexture={screenTexture}
          coverTexture={coverTexture}
          deviceId={state.deviceId}
          modelToken={modelToken}
          finishId={state.finishId}
          blur={blur}
          rotateX={state.xAxis}
          rotateY={state.yAxis}
          rotateZ={state.zAxis}
          fov={state.fov}
          fold={state.fold}
          cardRadius={state.cardRadius}
          cardDepth={state.cardDepth}
          shadow={state.shadow}
          lighting={state.lighting}
          lightAngle={state.lightAngle ?? 0}
          lightElevation={state.lightElevation ?? 0}
          coverScreenFit={studio.coverFit}
          screenFit={{
            ...studio.screenFit,
            // A mirrored device screen already contains its own island.
            sourceHasNotch: Boolean(studio.liveStream),
          }}
          offsetX={state.panX * 100}
          offsetY={state.panY * 100}
          offsetZ={state.panZ}
          scale={state.zoom * 100}
          scaleX={state.scaleX}
          scaleY={state.scaleY}
          scaleZ={state.scaleZ}
          heightPct={100}
          /*
           * Easing is a lag filter — right for a slider nudge, wrong for
           * playback, where it would smear every keyframe a fifth of a second
           * late and round off the poses a preset was authored around.
           */
          immediate={timeDriven}
          animation={state.animation}
          timeRef={playheadRef}
          playing={timeDriven}
          /* The clock is RUNNING — only true for the transport, never for a
             parked head or a frame-at-a-time export, both of which drive time
             themselves. It is what keeps the demand loop asking. */
          animating={playing}
          /*
           * Direct handling. `PhoneStage3D` mounts its pointer listener only
           * when a handler is passed, so without these the model is a picture:
           * the drag and the wheel have nothing on the canvas to reach.
           */
          onRotateDrag={studio.nudgeRotation}
          onScaleWheel={studio.nudgeZoom}
          onPanDrag={studio.nudgePan}
        />

        {/*
          Over the phone by definition — a layer blur is composited on top of
          the shot, and putting it under the canvas would make it a background,
          which the Background layer already is.

          AFTER the phone, and with no z-index: paint order is what lifts it
          now. `raise` exists because the alternative was containing a stray
          `z-10`, and the only way to contain one is a stacking context on this
          frame — which composites the stage as its own group and stops the
          chrome's `backdrop-filter` from sampling it. The popups lost their
          frost every time that was tried.
        */}
        {isOverlayActive(state.overlay) ? (
          <OverlayLayer overlay={state.overlay} raise={false} />
        ) : null}

        <SnapGuideLayer guides={studio.guides} />
        {focusDrawing ? <FocusLayer studio={studio} /> : null}
        {isBlurActive(blur) ? (
          <FocusGuide blur={blur} pinned={studio.focusPicking} />
        ) : null}
        {/* After the guide, so its handles sit on top of the lines they slide
            along rather than under them. */}
        {studio.focusPicking ? <FocusPickLayer studio={studio} /> : null}
      </div>
    </div>
  );
}

/**
 * The alignment guides, Figma's way: a dashed line through the frame's centre
 * for each axis the phone has snapped onto, and a small label for a snap a
 * line cannot draw — an angle, a scale, a depth.
 *
 * Over the shot and never in it: this is a DOM layer on the frame, not part of
 * the canvas, so no export or recording can pick it up. It takes no pointer
 * events, so a drag on the model passes straight through the lines it causes.
 */
const GUIDE = "#0D99FF"; // Figma's selection blue

/**
 * The rotate cursor: a curved arrow with a head at each end, black on a white
 * outline so it reads over any shot -- the one Figma shows on a corner. Drawn
 * here as an SVG because CSS has no cursor that says "turn"; the hotspot is its
 * middle, and `grab` is the fallback if a browser will not take the image.
 */
const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><g stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 14Q13 4.5 20.5 14" fill="none" stroke="#fff" stroke-width="5"/><path d="M2.6 13.2h5.8L5.5 18.6zM17.6 13.2h5.8L20.5 18.6z" fill="#fff" stroke="#fff" stroke-width="2.6"/><path d="M5.5 14Q13 4.5 20.5 14" fill="none" stroke="#000" stroke-width="2"/><path d="M2.6 13.2h5.8L5.5 18.6zM17.6 13.2h5.8L20.5 18.6z" fill="#000"/></g></svg>',
)}") 13 13, grab`;

function SnapGuideLayer({ guides }: { guides: SnapGuides }) {
  const line = {
    position: "absolute",
    pointerEvents: "none",
  } as const;
  return (
    <>
      {guides.vertical ? (
        <div
          aria-hidden
          style={{
            ...line,
            top: 0,
            bottom: 0,
            left: "calc(50% - 0.5px)",
            // A dotted border, not a gradient: at 1px a gradient's dashes are
            // blended into the ground and the red read as grey.
            borderLeft: `1px dotted ${GUIDE}`,
          }}
        />
      ) : null}
      {guides.horizontal ? (
        <div
          aria-hidden
          style={{
            ...line,
            left: 0,
            right: 0,
            top: "calc(50% - 0.5px)",
            borderTop: `1px dotted ${GUIDE}`,
          }}
        />
      ) : null}
      {guides.label ? (
        <div
          aria-hidden
          className="mo-code"
          style={{
            ...line,
            left: "50%",
            top: 12,
            transform: "translateX(-50%)",
            padding: "2px 6px",
            borderRadius: 4,
            background: GUIDE,
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {guides.label}
        </div>
      ) : null}
    </>
  );
}

/**
 * Where the blur is, drawn over the shot: solid where sharp ends, dotted where
 * the blur is fully in. The numbers are `DepthOfFieldLayer`'s own — radius
 * `focusSize / 2` and a falloff of `0.02 + falloff × 0.6`, both in frame
 * heights — so the marks sit exactly on the edges the shader draws.
 */
function FocusGuide({
  blur,
  pinned = false,
}: {
  blur: BlurSettings;
  /** Aiming by hand: the guide stays up instead of fading after each change. */
  pinned?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  /*
   * At rest until the blur is being edited: shown on each change and gone a
   * beat after the last, like the snap guides. The first render is not an
   * edit, so switching DOF on — or loading a shot with it — draws nothing.
   */
  // Written to the node, not state: it is a fade, not something to render.
  const first = useRef(true);
  useEffect(() => {
    const node = ref.current;
    if (pinned && node) {
      node.style.transition = "opacity 100ms ease-out";
      node.style.opacity = "1";
      return;
    }
    if (first.current || !node) {
      first.current = false;
      return;
    }
    node.style.transition = "opacity 100ms ease-out";
    node.style.opacity = "1";
    const t = window.setTimeout(() => {
      node.style.transition = "opacity 300ms ease-out";
      node.style.opacity = "0";
    }, 800);
    return () => window.clearTimeout(t);
  }, [blur, pinned]);
  const [aspect, setAspect] = useState(1);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setAspect(width / height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Frame heights across, so a circle is round at any ratio.
  const cx = blur.focusX * aspect;
  const cy = blur.focusY;
  const inner = blur.focusSize * 0.5;
  const outer = inner + 0.02 + blur.falloff * 0.6;
  // The shader's direction is y-up; the SVG's is y-down.
  const a = (blur.angle * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: -Math.sin(a) };
  const stroke = {
    stroke: GUIDE,
    fill: "none",
    vectorEffect: "non-scaling-stroke" as const,
    strokeWidth: 1.5,
  };
  const dotted = { ...stroke, strokeDasharray: "2 4" };

  /** A line through the frame, `d` along `n` from the focus point. */
  const across = (n: { x: number; y: number }, d: number, dots: boolean) => {
    const px = cx + n.x * d;
    const py = cy + n.y * d;
    const L = 10;
    return (
      <line
        key={`${d}-${dots}`}
        x1={px - n.y * L}
        y1={py + n.x * L}
        x2={px + n.y * L}
        y2={py - n.x * L}
        {...(dots ? dotted : stroke)}
      />
    );
  };
  // Tilt shift measures across the band, along its normal; directional along
  // the direction itself.
  const normal = { x: -Math.sin(a), y: -Math.cos(a) };

  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox={`0 0 ${aspect} 1`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0 }}
    >
      {blur.mode === "radial" ? (
        <>
          <circle cx={cx} cy={cy} r={inner} {...stroke} />
          <circle cx={cx} cy={cy} r={outer} {...dotted} />
        </>
      ) : blur.mode === "directional" ? (
        [across(dir, inner, false), across(dir, outer, true)]
      ) : (
        [
          across(normal, inner, false),
          across(normal, -inner, false),
          across(normal, outer, true),
          across(normal, -outer, true),
        ]
      )}
    </svg>
  );
}

/**
 * Skipped whenever nothing about the shot has changed.
 *
 * `useStudio` hands back one memoised object, so this only re-renders when the
 * composition, a texture or a handler actually moved — not on every frame of a
 * selection travelling across a panel in front of it.
 */
export const Stage = memo(StageInner);

/**
 * Aim the blur by hand: while the Depth of Field popup is open with a blur on,
 * a press on the shot puts the focus there, dragging carries it along, and two
 * fingers (pinch or scroll) size it -- in every mode, where "there" is the sharp
 * point, or the middle of the sharp band. The layer is only mounted then, so the rest of the time the
 * shot orbits and drags as usual.
 *
 * The frame is what the blur is measured against -- `focusX`/`focusY` are shares
 * of it, y down -- so the press is read against this layer's own box, which is
 * the frame. `FocusGuide` flashes the ring on every change, so each click shows
 * where it landed.
 */
function FocusPickLayer({ studio }: { studio: Studio }) {
  const { edit } = studio;
  const layerRef = useRef<HTMLDivElement>(null);
  /*
   * Two fingers on the trackpad set the spot's size: pinch out or scroll up for
   * bigger, pinch in or scroll down for smaller. A pinch arrives as a wheel event
   * with ctrlKey set, which the browser would otherwise turn into a page zoom --
   * so this is a native, non-passive listener that can cancel it, and it stops
   * there so the same gesture does not also zoom the phone behind it.
   */
  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Multiplicative, so it feels the same at 5% as at 60%. A pinch reports far
      // smaller deltas than a scroll, hence the two rates.
      const rate = event.ctrlKey ? 0.01 : 0.004;
      const factor = Math.exp(-event.deltaY * rate);
      edit((prev) => ({
        ...prev,
        blur: {
          ...prev.blur,
          focusSize: Math.min(1, Math.max(0.02, prev.blur.focusSize * factor)),
        },
      }));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [edit]);
  const blur = studio.state.blur;
  // The frame's shape, so the handles sit in frame heights like the shader does.
  const [aspect, setAspect] = useState(1);
  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setAspect(width / height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /*
   * Handles on the guide: one for Size (the solid edge of the sharp region) and
   * one for Falloff (the dotted edge where the blur is full), in every mode.
   * Radial puts them on the rings; Directional on its two lines; Tilt shift on
   * both sides of the band. Each is dragged to where the edge should be, and
   * `reach` measures that the way the shader does -- distance from the focus,
   * along the direction or across the band.
   */
  const angle = (blur.angle * Math.PI) / 180;
  const dir = { x: Math.cos(angle), y: -Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: -Math.cos(angle) };
  const axis =
    blur.mode === "radial"
      ? // Up and to the left: the panels are on the right, and a handle under one
        // cannot be reached.
        { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }
      : blur.mode === "directional"
        ? dir
        : normal;
  const reach = (dx: number, dy: number) =>
    blur.mode === "radial"
      ? Math.hypot(dx, dy)
      : blur.mode === "directional"
        ? Math.max(0, dx * dir.x + dy * dir.y)
        : Math.abs(dx * normal.x + dy * normal.y);
  const inner = blur.focusSize * 0.5;
  const outer = inner + 0.02 + blur.falloff * 0.6;
  const sides = blur.mode === "tilt-shift" ? [1, -1] : [1];
  /*
   * Rotation, for the two modes that have a direction (a circle has none), is
   * done from the ring around the Size dot: the point you grab follows the
   * pointer, so the line turns by how far the pointer has swung round the focus
   * point, not to where it points.
   */
  const handles = sides.flatMap((side) => [
    { kind: "size" as const, side, at: inner * side },
    { kind: "falloff" as const, side, at: outer * side },
  ]);
  const swing = useRef<{ from: number; angle: number } | null>(null);
  /** The pointer's bearing from the focus point, degrees, y down. */
  const bearing = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = layerRef.current?.getBoundingClientRect();
    if (!box || box.height <= 0) return null;
    const dx =
      (event.clientX - box.left) / box.height -
      blur.focusX * (box.width / box.height);
    const dy = (event.clientY - box.top) / box.height - blur.focusY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };
  const turn = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swing.current;
    const now = bearing(event);
    if (!start || now === null) return;
    // On screen (y down) a bearing that grows is clockwise, and this angle grows
    // the other way -- so the sweep is subtracted.
    let degrees = start.angle - (now - start.from);
    if (event.shiftKey) degrees = Math.round(degrees / 15) * 15;
    const wrapped = ((Math.round(degrees) % 360) + 360) % 360;
    edit((prev) => ({ ...prev, blur: { ...prev.blur, angle: wrapped } }));
  };
  const drag = (
    event: React.PointerEvent<HTMLDivElement>,
    kind: "size" | "falloff",
  ) => {
    const box = layerRef.current?.getBoundingClientRect();
    if (!box || box.height <= 0) return;
    const ratio = box.width / box.height;
    // Pointer relative to the focus point, in frame heights.
    const dx = (event.clientX - box.left) / box.height - blur.focusX * ratio;
    const dy = (event.clientY - box.top) / box.height - blur.focusY;
    const d = reach(dx, dy);
    edit((prev) => ({
      ...prev,
      blur:
        kind === "size"
          ? { ...prev.blur, focusSize: Math.min(1, Math.max(0, d * 2)) }
          : {
              ...prev.blur,
              falloff: Math.min(
                1,
                Math.max(0, (d - prev.blur.focusSize * 0.5 - 0.02) / 0.6),
              ),
            },
    }));
  };
  // Press to put the focus there; hold and move to drag it along.
  const place = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (n: number) => Math.min(1, Math.max(0, n));
    const focusX = share((event.clientX - box.left) / box.width);
    const focusY = share((event.clientY - box.top) / box.height);
    edit((prev) => ({ ...prev, blur: { ...prev.blur, focusX, focusY } }));
  };
  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      style={{ cursor: "crosshair", touchAction: "none" }}
      onPointerDown={(event) => {
        // The popup this belongs to dismisses on a press outside it; this press
        // is part of using it, so it must not reach that.
        event.stopPropagation();
        // Captured, so the drag keeps following the pointer past the frame's
        // edge and the release lands here whatever is under it.
        event.currentTarget.setPointerCapture(event.pointerId);
        place(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          place(event);
      }}
    >
      {handles.map(({ kind, side, at }) => {
        /*
         * The Size dot has two zones. Its middle slides the edge in and out; the
         * ring just outside it turns the line about the focus point -- with the
         * rotate cursor -- so rotating lives on the same dot, at its edge. Radial
         * has no direction, so there its dot is just the dot.
         */
        const turnable = kind === "size" && blur.mode !== "radial";
        const RING = 46;
        const DOT = 22;
        const box = turnable ? RING : DOT;
        const marker = (
          <span
            style={{
              width: kind === "size" ? 12 : 9,
              height: kind === "size" ? 12 : 9,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: `0 0 0 1.5px ${GUIDE}, 0 1px 4px rgb(0 0 0 / 0.25)`,
            }}
          />
        );
        return (
          <div
            // Keyed by what it is, not where it is: it moves under the pointer
            // as it is dragged, and a new key would replace it and drop the
            // capture.
            key={`${kind}${side}`}
            role="slider"
            aria-label={kind === "size" ? "Focus size" : "Focus falloff"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(
              (kind === "size" ? blur.focusSize : blur.falloff) * 100,
            )}
            className="absolute"
            style={{
              // In frame shares: x over the frame's width, y over its height.
              left: `${(blur.focusX + (axis.x * at) / aspect) * 100}%`,
              top: `${(blur.focusY + axis.y * at) * 100}%`,
              width: box,
              height: box,
              margin: -box / 2,
              display: "grid",
              placeItems: "center",
              cursor: turnable ? ROTATE_CURSOR : "grab",
              touchAction: "none",
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              if (turnable) {
                const from = bearing(event);
                swing.current =
                  from === null ? null : { from, angle: blur.angle };
              } else drag(event, kind);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId))
                return;
              if (turnable) turn(event);
              else drag(event, kind);
            }}
            onPointerUp={() => {
              swing.current = null;
            }}
          >
            {turnable ? (
              <div
                style={{
                  width: DOT,
                  height: DOT,
                  display: "grid",
                  placeItems: "center",
                  cursor: "grab",
                }}
                onPointerDown={(event) => {
                  // The middle of the dot sizes; the ring around it turns.
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag(event, kind);
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    drag(event, kind);
                }}
              >
                {marker}
              </div>
            ) : (
              marker
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The focus areas, pinned to the phone, drawn over the shot while their
 * panel is open.
 *
 * Each area lives in the phone's own coordinates (see `focusMath`), so it is
 * drawn by projecting its corners through the pose the stage is showing --
 * the animated one during playback -- and stays on the part of the device it
 * was drawn over while the camera moves, the phone turns or a move plays. A
 * tilted phone draws it as the tilted quad it really is.
 *
 * Every pointer gesture goes the other way, through `toPhone`: a new box is
 * drawn on screen and its corners laid onto the phone; a move or a resize
 * follows the pointer across the phone rather than across the screen.
 */
function FocusLayer({ studio }: { studio: Studio }) {
  const { state, playing, playheadRef, parkedAt, focusPoints: points } = studio;
  const onChange = studio.setFocusPoints;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [aspect, setAspect] = useState(1);
  /* Where the playhead is, as state: copied off the ref on each animation
     frame while playing, since a ref must not be read during render. */
  const [liveTime, setLiveTime] = useState(0);
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const gesture = useRef<
    | { kind: "draw"; from: { x: number; y: number } }
    | { kind: "move" | "resize"; index: number; from: Vector3; area: FocusArea }
    | null
  >(null);

  // The frame's shape, for the projection.
  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;
    const measure = () =>
      setAspect(node.clientHeight ? node.clientWidth / node.clientHeight : 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // While the clip plays the pose changes every frame and nothing in React
  // hears of it; redraw on the animation frame so the boxes ride along.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setLiveTime(playheadRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, playheadRef]);
  const time = playing ? liveTime : (parkedAt ?? 0);

  const hasTracks = Object.values(state.animation.tracks).some(
    (keys) => keys && keys.length > 0,
  );
  const pose: FocusPose = poseOf(
    {
      xAxis: state.xAxis,
      yAxis: state.yAxis,
      zAxis: state.zAxis,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      panZ: state.panZ,
      fov: state.fov ?? 35,
      scaleX: state.scaleX ?? 1,
      scaleY: state.scaleY ?? 1,
      scaleZ: state.scaleZ ?? 1,
    },
    hasTracks ? sampleAnimation(state.animation, time) : {},
  );

  const screenOf = (event: React.PointerEvent) => {
    const box = layerRef.current!.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    };
  };
  const phoneOf = (event: React.PointerEvent) =>
    toPhone(screenOf(event), pose, aspect);

  const corners = (a: FocusArea) =>
    [
      [a.cx - a.w / 2, a.cy + a.h / 2],
      [a.cx + a.w / 2, a.cy + a.h / 2],
      [a.cx + a.w / 2, a.cy - a.h / 2],
      [a.cx - a.w / 2, a.cy - a.h / 2],
    ].map(([x, y]) => toScreen(new Vector3(x, y, 0), pose, aspect));

  const grab = (
    event: React.PointerEvent,
    kind: "move" | "resize",
    index: number,
  ) => {
    event.stopPropagation();
    const from = phoneOf(event);
    if (!from) return;
    layerRef.current?.setPointerCapture(event.pointerId);
    gesture.current = { kind, index, from, area: points[index] };
  };

  const MIN = 0.02;
  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      // No z-index. The frame is not a stacking context, so a number here
      // competed with the whole page -- and at Fill, where the frame is the
      // window, it put this layer over every panel and took their clicks.
      // After the canvas in the DOM, it already paints above it.
      style={{ cursor: "crosshair", touchAction: "none" }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const from = screenOf(event);
        gesture.current = { kind: "draw", from };
        setDraft({ ...from, w: 0, h: 0 });
        studio.setFocusDrafting(true);
      }}
      onPointerMove={(event) => {
        const g = gesture.current;
        if (!g) return;
        if (g.kind === "draw") {
          const now = screenOf(event);
          setDraft({
            x: Math.min(g.from.x, now.x),
            y: Math.min(g.from.y, now.y),
            w: Math.abs(now.x - g.from.x),
            h: Math.abs(now.y - g.from.y),
          });
          return;
        }
        const now = phoneOf(event);
        if (!now) return;
        const a = g.area;
        let next: FocusArea;
        if (g.kind === "move") {
          next = {
            ...a,
            cx: a.cx + (now.x - g.from.x),
            cy: a.cy + (now.y - g.from.y),
          };
        } else {
          // The corner under the pointer; the opposite corner stays put.
          const left = a.cx - a.w / 2;
          const top = a.cy + a.h / 2;
          const w = Math.max(MIN, now.x - left);
          const h = Math.max(MIN, top - now.y);
          next = { cx: left + w / 2, cy: top - h / 2, w, h };
        }
        onChange(points.map((p, i) => (i === g.index ? next : p)));
      }}
      onPointerUp={() => {
        const g = gesture.current;
        gesture.current = null;
        const box = draft;
        setDraft(null);
        studio.setFocusDrafting(false);
        if (g?.kind !== "draw" || !box || box.w < 0.03 || box.h < 0.03) return;
        // The drawn box's corners, laid onto the phone; the area is what
        // they cover there.
        const hits = [
          { x: box.x, y: box.y },
          { x: box.x + box.w, y: box.y },
          { x: box.x + box.w, y: box.y + box.h },
          { x: box.x, y: box.y + box.h },
        ]
          .map((c) => toPhone(c, pose, aspect))
          .filter((p): p is Vector3 => p !== null);
        if (hits.length < 4) return;
        const xs = hits.map((p) => p.x);
        const ys = hits.map((p) => p.y);
        const [x0, x1, y0, y1] = [
          Math.min(...xs),
          Math.max(...xs),
          Math.min(...ys),
          Math.max(...ys),
        ];
        onChange([
          ...points,
          { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 },
        ]);
      }}
      onPointerCancel={() => {
        gesture.current = null;
        setDraft(null);
        studio.setFocusDrafting(false);
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={{ overflow: "visible" }}
      >
        {points.map((a, i) => (
          <polygon
            key={i}
            points={corners(a)
              .map((c) => `${c.x},${c.y}`)
              .join(" ")}
            fill="rgb(59 130 246 / 0.1)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: "move" }}
            onPointerDown={(event) => grab(event, "move", i)}
          />
        ))}
      </svg>
      {points.map((a, i) => {
        const [, topRight, bottomRight] = corners(a);
        return (
          <div key={i}>
            <button
              type="button"
              title="Remove this area"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onChange(points.filter((_, j) => j !== i))}
              className="mo-label absolute grid cursor-pointer place-items-center"
              style={{
                left: `calc(${topRight.x * 100}% - 11px)`,
                top: `calc(${topRight.y * 100}% - 11px)`,
                width: 22,
                height: 22,
                borderRadius: 11,
                background: "#3b82f6",
                color: "#fff",
              }}
            >
              {i + 1}
            </button>
            {/* The corner: drag to resize. */}
            <span
              aria-hidden
              onPointerDown={(event) => grab(event, "resize", i)}
              className="absolute"
              style={{
                left: `calc(${bottomRight.x * 100}% - 6px)`,
                top: `calc(${bottomRight.y * 100}% - 6px)`,
                width: 12,
                height: 12,
                borderRadius: 3,
                background: "#fff",
                border: "1.5px solid #3b82f6",
                cursor: "nwse-resize",
              }}
            />
          </div>
        );
      })}
      {draft ? (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.w * 100}%`,
            height: `${draft.h * 100}%`,
            border: "1.5px solid #3b82f6",
            background: "rgb(59 130 246 / 0.1)",
            borderRadius: 6,
          }}
        />
      ) : null}
    </div>
  );
}
