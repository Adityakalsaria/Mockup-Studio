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

function StageInner({ studio }: { studio: Studio }) {
  const { state, ratio, screenTexture, playing, playheadRef } = studio;

  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ containerType: "size", padding: INSET }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: "var(--mo-r-panel)",
          ...backgroundCss(state.background),
          ...(ratio === null
            ? { width: "100%", height: "100%" }
            : {
                aspectRatio: String(ratio),
                // Whichever of the two constraints binds first wins, so the
                // frame always fits and never overflows.
                width: `min(100cqw, ${ratio} * 100cqh)`,
              }),
        }}
      >
        {/* Over the phone by definition — a layer blur is composited on top of
            the shot, and putting it under the canvas would make it a
            background, which the Background layer already is. */}
        {isOverlayActive(state.overlay) ? <OverlayLayer overlay={state.overlay} /> : null}

        <PhoneStage3D
          rail={undefined}
          screenTexture={screenTexture}
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
          immediate={playing}
          animation={state.animation}
          timeRef={playheadRef}
          playing={playing}
          /*
           * Direct handling. `PhoneStage3D` mounts its pointer listener only
           * when a handler is passed, so without these the model is a picture:
           * the drag and the wheel have nothing on the canvas to reach.
           */
          onRotateDrag={studio.nudgeRotation}
          onScaleWheel={studio.nudgeZoom}
        />
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
