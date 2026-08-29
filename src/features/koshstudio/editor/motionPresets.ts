import type { AnimatableKey, Animation, Keyframe } from "../animation";
import { RANGES } from "./editorState";

/**
 * Ready-made camera moves.
 *
 * Every preset is built RELATIVE to the pose currently on screen, and every
 * one-way preset ENDS on it. That is the whole idea: you frame the shot you
 * want by hand, then pick how the camera arrives at it. Presets with absolute
 * poses baked in would throw that framing away the moment you applied one,
 * and you would be back to rebuilding the shot by hand afterwards.
 *
 * The looping presets start and end on the same values instead, so the last
 * frame cuts back to the first without a jump.
 */

export interface Pose {
  xAxis: number;
  yAxis: number;
  zAxis: number;
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Rotation is cyclic — 400 degrees is a real pose and the turntable needs it —
 * so only the bounded properties are clamped. An unclamped zoom would happily
 * go negative and turn the phone inside out.
 */
const BOUNDED: Partial<Record<AnimatableKey, { min: number; max: number }>> = {
  zoom: RANGES.zoom,
  panX: RANGES.panX,
  panY: RANGES.panY,
};

function clamp(key: AnimatableKey, value: number): number {
  const bounds = BOUNDED[key];
  if (!bounds) return value;
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

/** Rounded because a keyframe you might later nudge by hand should be legible. */
function track(key: AnimatableKey, points: Array<[number, number]>): Keyframe[] {
  return points.map(([time, value]) => ({
    time,
    value: Number(clamp(key, value).toFixed(4)),
  }));
}

export interface MotionPreset {
  id: string;
  label: string;
  /** Shown in the picker; says what it does, not what it is called. */
  hint: string;
  /**
   * Easing is deliberately not part of a preset: it is a global preference
   * about how motion should feel, and applying a preset should not silently
   * overrule the one already chosen.
   */
  build: (pose: Pose) => Omit<Animation, "easing">;
}

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: "rotate-in",
    label: "Rotate in",
    hint: "Turns in and settles on your framing",
    build: (p) => ({
      durationSec: 2.5,
      tracks: {
        yAxis: track("yAxis", [
          [0, p.yAxis - 55],
          [2.5, p.yAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.85],
          [2.5, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "turntable",
    label: "Turntable",
    hint: "Full 360° spin — loops seamlessly",
    build: (p) => ({
      durationSec: 6,
      tracks: {
        // Three keys, not two. Under Smooth the even spacing gives the
        // monotone fit a constant slope, so the spin runs at one rate the
        // whole way round and the loop point is invisible; under Ease it
        // stops the single pair crawling at both ends.
        yAxis: track("yAxis", [
          [0, p.yAxis],
          [3, p.yAxis + 180],
          [6, p.yAxis + 360],
        ]),
      },
    }),
  },
  {
    id: "push-in",
    label: "Push in",
    hint: "Starts wide, moves in close",
    build: (p) => ({
      durationSec: 2.5,
      tracks: {
        zoom: track("zoom", [
          [0, p.zoom * 0.5],
          [2.5, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "pull-back",
    label: "Pull back",
    hint: "Starts tight, reveals the whole phone",
    build: (p) => ({
      durationSec: 2.5,
      tracks: {
        zoom: track("zoom", [
          [0, p.zoom * 1.8],
          [2.5, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "slide-in",
    label: "Slide in",
    hint: "Enters from the left and stops centred",
    build: (p) => ({
      durationSec: 2,
      tracks: {
        panX: track("panX", [
          [0, p.panX - 0.5],
          [2, p.panX],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis - 14],
          [2, p.yAxis],
        ]),
      },
    }),
  },
  {
    id: "pan-across",
    label: "Pan across",
    hint: "Drifts left to right past your framing",
    build: (p) => ({
      durationSec: 4,
      tracks: {
        panX: track("panX", [
          [0, p.panX - 0.32],
          [4, p.panX + 0.32],
        ]),
      },
    }),
  },
  {
    id: "tilt-reveal",
    label: "Tilt reveal",
    hint: "Tips up from flat into your framing",
    build: (p) => ({
      durationSec: 2.5,
      tracks: {
        xAxis: track("xAxis", [
          [0, p.xAxis - 42],
          [2.5, p.xAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.9],
          [2.5, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "float",
    label: "Float",
    hint: "Slow idle drift — loops seamlessly",
    build: (p) => ({
      durationSec: 5,
      tracks: {
        // Ends exactly where it began so the loop is invisible. The two axes
        // are deliberately out of phase — in step they read as one rocking
        // motion, offset they read as something gently suspended.
        yAxis: track("yAxis", [
          [0, p.yAxis - 5],
          [2.5, p.yAxis + 5],
          [5, p.yAxis - 5],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis + 3],
          [1.25, p.xAxis - 3],
          [3.75, p.xAxis + 3],
          [5, p.xAxis + 3],
        ]),
        panY: track("panY", [
          [0, p.panY],
          [2.5, p.panY + 0.035],
          [5, p.panY],
        ]),
      },
    }),
  },
  {
    id: "hero",
    label: "Hero sweep",
    hint: "Rotate, tilt and push in together",
    build: (p) => ({
      durationSec: 3.5,
      tracks: {
        yAxis: track("yAxis", [
          [0, p.yAxis - 38],
          [3.5, p.yAxis],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis + 20],
          [3.5, p.xAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.62],
          [3.5, p.zoom],
        ]),
      },
    }),
  },
];

export function getMotionPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS.find((preset) => preset.id === id);
}

/**
 * Stretch a preset to cover the loaded clip.
 *
 * Presets carry their own length — 2.5s for a push-in, 6s for a turntable —
 * which is right with nothing else on the timeline and wrong the moment there
 * is a video, because applying one would shorten the timeline to the preset
 * and the clip would appear to stop partway through. The move is the thing
 * being chosen here, not how long the shot runs, so the timing is rescaled to
 * whatever the footage needs and the shape of the motion is preserved exactly.
 */
export function fitToClip(
  animation: Omit<Animation, "easing">,
  clipSec: number,
): Omit<Animation, "easing"> {
  if (!clipSec || clipSec <= 0) return animation;
  const target = Math.min(30, Math.max(0.5, clipSec));
  const factor = target / animation.durationSec;
  if (!Number.isFinite(factor) || factor <= 0) return animation;

  const tracks: Animation["tracks"] = {};
  for (const [key, keys] of Object.entries(animation.tracks)) {
    if (!keys) continue;
    tracks[key as AnimatableKey] = keys.map((k) => ({
      time: Number((k.time * factor).toFixed(4)),
      value: k.value,
    }));
  }
  return { durationSec: Number(target.toFixed(2)), tracks };
}
