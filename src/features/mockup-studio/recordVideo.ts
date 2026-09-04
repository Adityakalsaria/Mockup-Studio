"use client";

import { paintBackground, type BackgroundSettings } from "./backgrounds";
import { paintOverlay, type OverlaySettings } from "./overlay";
import { applyCanvasShadow, clearCanvasShadow, type ShadowSettings } from "./shadow";
import type { StageRecorder } from "./PhoneStage3D";

/**
 * Records the stage to a video file.
 *
 * The recording is composited the same way the PNG export is, and for the
 * same reason: the WebGL buffer holds the phone and nothing else, so the
 * backdrop has to be painted underneath every single frame rather than once.
 * That compositing canvas — not the WebGL one — is what gets captured.
 *
 * Capture is REAL TIME, and it has to be, because MediaRecorder timestamps
 * every frame by the wall clock at the moment it arrives. There is no API for
 * telling it "this frame is 1/30th of a second after the last one".
 *
 * The tempting alternative — pause the clip, seek to `i / fps`, render, hand
 * over the frame — is deterministic on paper and wrong in the file: a 3-second
 * clip that takes 24 seconds to render comes out as a 24-second video playing
 * at an eighth speed, because those are the timestamps the recorder wrote.
 * Measured, not guessed: that exact export produced a 24.5s MP4.
 *
 * So the clip plays at its own speed and every frame we manage to composite
 * is pushed as it is ready. Render slower than `fps` and the file simply has
 * fewer frames in it — it stutters, but it stays the right length and plays
 * at the right speed, which is the failure worth having. Frame-exact export
 * regardless of GPU needs WebCodecs and a muxer, which is a bigger change
 * than this one.
 */

/** Candidates in preference order; the first the browser admits to wins. */
const MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E"',
  "video/mp4",
  'video/webm;codecs="vp9"',
  'video/webm;codecs="vp8"',
  "video/webm",
];

export interface RecordingFormat {
  mimeType: string;
  extension: "mp4" | "webm";
}

/**
 * What this browser can actually write.
 *
 * MediaRecorder gained MP4 relatively recently and not everywhere, so this is
 * a real branch rather than a formality — the caller is expected to tell the
 * user when the answer comes back WebM instead of quietly handing them a file
 * with the wrong extension on it.
 */
export function pickRecordingFormat(): RecordingFormat | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return { mimeType, extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm" };
    }
  }
  return null;
}

export interface RecordOptions {
  /*
   * The overlay and the shadow, which this path was silently exporting
   * without.
   *
   * `renderVideoExact` composites both and this one composited neither, so a
   * shot with either set came out of the fallback missing them -- and the
   * fallback is what any browser lacking WebCodecs takes, which is every
   * Firefox. The two encoders producing different pictures from the same
   * settings is the kind of difference nobody looks for until they hit it.
   */
  recorder: StageRecorder;
  background: BackgroundSettings;
  overlay?: OverlaySettings;
  shadow?: ShadowSettings;
  /** Resolution multiplier over the on-screen canvas. */
  scale: number;
  durationSec: number;
  fps: number;
  /** Played from the start so the capture begins on a clean loop. */
  video?: HTMLVideoElement | null;
  /**
   * Called with the elapsed time before each frame is composited, for
   * animation that is driven by React state rather than by the clock. It has
   * to land before the render, so an implementation is expected to flush
   * synchronously.
   */
  onTime?: (seconds: number) => void;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export async function recordStageVideo({
  recorder,
  background,
  overlay,
  shadow,
  scale,
  durationSec,
  fps,
  video,
  onTime,
  onProgress,
  signal,
}: RecordOptions): Promise<{ blob: Blob; format: RecordingFormat }> {
  const format = pickRecordingFormat();
  if (!format) throw new Error("This browser cannot record video.");

  const { width, height } = recorder.begin(scale);
  const composite = document.createElement("canvas");
  composite.width = width;
  composite.height = height;
  const ctx = composite.getContext("2d", { alpha: true });
  if (!ctx) {
    recorder.end();
    throw new Error("Could not open a compositing canvas.");
  }

  // Pushed, not sampled. `captureStream(fps)` lets the browser take frames off
  // the canvas on its own compositor timer, and the compositor does not get a
  // turn while the main thread is inside a synchronous WebGL render — on a
  // slow machine that produced a one-frame file out of a four-second capture.
  // `captureStream(0)` hands over exactly the frames we composited.
  const stream = composite.captureStream(0);
  const [track] = stream.getVideoTracks() as CanvasCaptureMediaStreamTrack[];
  const chunks: Blob[] = [];
  const media = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    // Generous: a phone against a flat backdrop is mostly smooth gradient,
    // and gradients are exactly where a stingy bitrate shows banding.
    videoBitsPerSecond: 12_000_000,
  });
  media.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const finished = new Promise<void>((resolve) => {
    media.onstop = () => resolve();
  });

  if (video) {
    try {
      video.currentTime = 0;
      await video.play();
    } catch {
      // A clip that refuses to play still records, as a still frame. Better
      // than refusing to export.
    }
  }

  const composeFrame = () => {
    // Clear first: "None" paints nothing, and without this the previous frame
    // would still be sitting there under the transparent phone.
    ctx.clearRect(0, 0, width, height);
    paintBackground(ctx, background, width, height, scale);
    // The shadow is a CSS filter on the live canvas, which a pixel read does
    // not carry, so it is laid down here -- scaled, because the settings are
    // in 1x pixels and the export may be 2x or 3x.
    if (shadow) applyCanvasShadow(ctx, shadow, scale);
    recorder.frame((source) => ctx.drawImage(source, 0, 0, width, height));
    if (shadow) clearCanvasShadow(ctx);
    // After the phone: the layer sits over the shot, which is the order the
    // live stage uses and the order `renderVideoExact` uses.
    if (overlay) paintOverlay(ctx, overlay, width, height);
  };

  // Prime the canvas without pushing: the recorder is not running yet, so a
  // `requestFrame` here would be thrown away.
  onTime?.(0);
  composeFrame();
  media.start();
  const started = performance.now();

  try {
    await new Promise<void>((resolve) => {
      // Throttled to `fps` rather than pushing on every animation frame: a
      // 120Hz display would otherwise put four times the frames into the file
      // for no visible gain and four times the size.
      let nextFrameAt = 0;
      const tick = () => {
        const elapsed = (performance.now() - started) / 1000;
        if (signal?.aborted || elapsed >= durationSec) {
          resolve();
          return;
        }
        if (elapsed >= nextFrameAt) {
          onTime?.(elapsed);
          composeFrame();
          track.requestFrame();
          nextFrameAt += 1 / fps;
        }
        onProgress?.(Math.min(1, elapsed / durationSec));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  } finally {
    media.stop();
    await finished;
    track.stop();
    recorder.end();
    video?.pause();
  }

  return { blob: new Blob(chunks, { type: format.mimeType }), format };
}
