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

import { memo } from "react";
import PhoneStage3D from "../PhoneStage3D";
import { OverlayLayer } from "../OverlayLayer";
import { backgroundCss } from "../backgrounds";
import { isOverlayActive } from "../overlay";
import type { Studio } from "./useStudio";

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
  const { state, ratio, screenTexture, coverTexture, playing, playheadRef, exporting, presetId } = studio;

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
  const timeDriven = playing || exporting?.kind === "video" || presetId !== null;

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
      </div>
    </div>
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
