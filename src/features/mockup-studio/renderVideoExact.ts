"use client";

import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { paintBackground, type BackgroundSettings } from "./backgrounds";
import { paintOverlay, type OverlaySettings } from "./overlay";
import { loadWatermark, paintWatermark } from "./watermark";
import { applyCanvasShadow, clearCanvasShadow, type ShadowSettings } from "./shadow";
import type { StageRecorder } from "./PhoneStage3D";

/**
 * Frame-exact video export, using the device's own encoder.
 *
 * The MediaRecorder path this replaces records in real time and stamps every
 * frame with the wall-clock moment it arrived, which means the output is only
 * as good as the machine's worst moment during capture. A measured export of
 * a ten-second animation at 60fps came back with 536 frames instead of 600,
 * an average of 53.8fps, and — the reason it looked broken — a single 1067ms
 * gap where the render loop hitched and the freeze was written into the file
 * as though the animation had stopped.
 *
 * None of that is fixable while the encoder is deciding timestamps from a
 * clock. Here the timestamps are OURS: frame `i` is at `i / fps`, stated
 * explicitly, so the loop can take as long as it likes per frame and the file
 * comes out identical either way. Slow machine, fast machine, a garbage
 * collection pause in the middle — same 600 frames, evenly spaced.
 *
 * That also makes the video screen work properly for the first time. Seeking
 * the clip frame by frame was always the right way to sample it; it was
 * unusable before only because real-time capture then stretched the result to
 * however long the seeking took.
 */

export interface ExactRenderOptions {
  recorder: StageRecorder;
  background: BackgroundSettings;
  /** The layer over the shot, where one is on. */
  overlay?: OverlaySettings;
  /** Composited behind the stage on every frame, as the live preview does. */
  shadow: ShadowSettings;
  scale: number;
  durationSec: number;
  fps: number;
  /** Stepped frame by frame rather than played. */
  video?: HTMLVideoElement | null;
  /** Marked dirty after each seek so the paused frame reaches the GPU. */
  videoTexture?: { needsUpdate: boolean } | null;
  /** Maps a timeline moment to a moment in the clip, so a layer that has been
      moved or resized exports where it was put rather than at zero. */
  clipTimeFor?: (seconds: number) => number;
  /** Drives the animation; must apply synchronously. */
  onTime?: (seconds: number) => void;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Whether this browser can encode without going through MediaRecorder. */
export function supportsExactRender(): boolean {
  return typeof globalThis.VideoEncoder === "function";
}

/**
 * H.264 needs even dimensions in both axes, and a canvas sized from a CSS
 * box at an arbitrary scale frequently is not. Rounding down by a pixel is
 * invisible; handing the encoder an odd height is a configuration error.
 */
function evenDown(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2);
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 1e-4 && video.readyState >= 2) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener("seeked", finish);
      clearTimeout(timer);
      resolve();
    };
    // A backstop, not a policy: a seek that never reports back should cost
    // one stale frame, not the whole export.
    const timer = setTimeout(finish, 2000);
    video.addEventListener("seeked", finish);
    video.currentTime = time;
  });
}

export async function renderVideoExact({
  recorder,
  background,
  overlay,
  shadow,
  scale,
  durationSec,
  fps,
  video,
  videoTexture,
  clipTimeFor,
  onTime,
  onProgress,
  signal,
}: ExactRenderOptions): Promise<Blob> {
  if (!supportsExactRender()) throw new Error("WebCodecs is not available.");

  const size = recorder.begin(scale);
  const width = evenDown(size.width);
  const height = evenDown(size.height);

  const composite = document.createElement("canvas");
  composite.width = width;
  composite.height = height;
  const ctx = composite.getContext("2d", { alpha: false });
  if (!ctx) {
    recorder.end();
    throw new Error("Could not open a compositing canvas.");
  }

  // High profile, level 4.2 — enough for 4K30 or 1080p120, and the level is
  // stated rather than guessed so the encoder does not silently refuse a
  // large frame. Falls back to baseline where High is unsupported.
  const candidates = ["avc1.640034", "avc1.640028", "avc1.42E01E"];
  let codec = "";
  let acceleration: HardwareAcceleration = "prefer-hardware";
  // Hardware first, and asked for by name.
  //
  // Left at the default of "no-preference" the browser is free to pick its
  // software encoder, and on a long export it usually does — libx264 on the
  // CPU while a media engine that does this in silicon sits idle. Asking for
  // hardware is only a preference either way, so the whole search runs again
  // without it rather than failing: a machine with no hardware H.264, or a
  // resolution its encoder will not take, still exports.
  for (const preference of ["prefer-hardware", "no-preference"] as const) {
    for (const candidate of candidates) {
      const support = await VideoEncoder.isConfigSupported({
        codec: candidate,
        width,
        height,
        framerate: fps,
        hardwareAcceleration: preference,
      });
      if (support.supported) {
        codec = candidate;
        acceleration = preference;
        break;
      }
    }
    if (codec) break;
  }
  if (!codec) {
    recorder.end();
    throw new Error("No supported H.264 encoder configuration.");
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    // The rate is STATED, not left to be inferred from the timestamps.
    //
    // Without it the muxer picks a timescale from the chunks it is given, and
    // the track header ends up declaring something other than what was asked
    // for — which is what a player, or Premiere, reads and reports when it
    // says a 60fps export is 30. The frames themselves were always correct;
    // the file was describing itself wrongly.
    video: { codec: "avc", width, height, frameRate: fps },
    // The whole file is assembled in memory anyway, so put the index at the
    // front: a progressive MP4 starts playing before it has fully downloaded,
    // and these get dropped straight into decks and browsers.
    fastStart: "in-memory",
  });

  let encodeError: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encodeError = error;
    },
  });
  encoder.configure({
    codec,
    width,
    height,
    framerate: fps,
    hardwareAcceleration: acceleration,
    // Generous. A phone against a flat backdrop is mostly smooth gradient,
    // and gradients are where a mean bitrate shows as banding.
    bitrate: Math.round(width * height * fps * 0.12),
    latencyMode: "quality",
  });

  video?.pause();

  const frameCount = Math.max(1, Math.round(durationSec * fps));
  const mark = await loadWatermark();
  const markCache = {};
  const frameDurationUs = 1_000_000 / fps;
  const clipLength =
    video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

  try {
    for (let i = 0; i < frameCount; i++) {
      if (signal?.aborted) break;

      const seconds = i / fps;
      onTime?.(seconds);

      if (video && clipLength) {
        await seekTo(video, clipTimeFor ? clipTimeFor(seconds) : seconds % clipLength);
        // A paused video only re-uploads when something says it changed.
        if (videoTexture) videoTexture.needsUpdate = true;
      }

      ctx.clearRect(0, 0, width, height);
      paintBackground(ctx, background, width, height, scale);
      // Same reason as the still export: the shadow lives in a CSS filter on
      // the live canvas and has to be re-laid here to reach the file.
      applyCanvasShadow(ctx, shadow, scale);
      recorder.frame((source) => {
        ctx.drawImage(source, 0, 0, width, height);
        if (overlay) paintOverlay(ctx, overlay, width, height);
      });
      clearCanvasShadow(ctx);
      if (mark) paintWatermark(ctx, width, height, mark, markCache);

      const frame = new VideoFrame(composite, {
        timestamp: Math.round(i * frameDurationUs),
        duration: Math.round(frameDurationUs),
      });
      // A keyframe every two seconds keeps the file seekable without paying
      // for one on every frame.
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      // Backpressure. The encoder runs on its own thread and will happily
      // accept frames faster than it can compress them, which on a long
      // export means the queue, not the video, is what runs out of memory.
      while (encoder.encodeQueueSize > 8) {
        await new Promise((resolve) => setTimeout(resolve, 4));
        if (encodeError) throw encodeError;
      }
      if (encodeError) throw encodeError;

      onProgress?.((i + 1) / frameCount);
    }

    await encoder.flush();
    if (encodeError) throw encodeError;
    muxer.finalize();
  } finally {
    if (encoder.state !== "closed") encoder.close();
    recorder.end();
  }

  return new Blob([muxer.target.buffer], { type: "video/mp4" });
}
