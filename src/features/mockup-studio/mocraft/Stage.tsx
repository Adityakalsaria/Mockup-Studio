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
import { backgroundCss } from "../backgrounds";
import { isOverlayActive } from "../overlay";
import type { Studio } from "./useStudio";
import type { SnapGuides } from "./snapping";
import { isBlurActive, type BlurSettings } from "../blurStyles";

/**
 * How much workspace is left around the canvas.
 *
 * Enough that the dot grid reads as a surface the frame is sitting on, and not
 * so much that the shot is a stamp in the middle of it. The panels overlap it
 * either way — see above.
 */
const INSET = 40;

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
const FRAME = 0.82;

function StageInner({ studio }: { studio: Studio }) {
  const {
    state,
    ratio,
    screenTexture,
    coverTexture,
    playing,
    playheadRef,
    exporting,
    presetId,
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
  const timeDriven =
    playing || exporting?.kind === "video" || presetId !== null;

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
    >
      <div
        className="relative overflow-hidden"
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
        <PhoneStage3D
          rail={undefined}
          /* The two doors export goes through: one frame on demand for the
             still, and a held-open resolution for the clip. Both are refs the
             scene fills in — see `CaptureBridge` and `RecorderBridge`. */
          captureRef={studio.captureRef}
          recorderRef={studio.recorderRef}
          screenTexture={screenTexture}
          coverTexture={coverTexture}
          deviceId={state.deviceId}
          finishId={state.finishId}
          blur={state.blur}
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
        {isBlurActive(state.blur) ? (
          <FocusGuide blur={state.blur} />
        ) : null}
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
function FocusGuide({ blur }: { blur: BlurSettings }) {
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
  }, [blur]);
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
