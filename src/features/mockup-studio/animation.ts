/**
 * Keyframe animation for the stage transform.
 *
 * Only the six camera values are animatable, and deliberately so: they are
 * the ones whose in-between states are meaningful. Interpolating a device id
 * or a blur mode has no midpoint, and a track for a value that can only jump
 * is a control that lies about what it does.
 */

export const ANIMATABLE = [
  { key: "xAxis", label: "X axis" },
  { key: "yAxis", label: "Y axis" },
  { key: "zAxis", label: "Z axis" },
  { key: "zoom", label: "Zoom" },
  { key: "panX", label: "Pan X" },
  { key: "panY", label: "Pan Y" },
] as const;

export type AnimatableKey = (typeof ANIMATABLE)[number]["key"];

export interface Keyframe {
  time: number;
  value: number;
}

export interface Animation {
  durationSec: number;
  easing: Easing;
  /** Absent key = that property is not animated and holds its static value. */
  tracks: Partial<Record<AnimatableKey, Keyframe[]>>;
}

export const DEFAULT_ANIMATION: Animation = {
  durationSec: 3,
  easing: "smooth",
  tracks: {},
};

/**
 * Two keys landing on the same instant is a track with an undefined value at
 * that instant, so a click within this many seconds of an existing key edits
 * that key rather than adding a second one on top of it.
 */
export const KEY_EPSILON = 1 / 120;

export function hasKeys(animation: Animation): boolean {
  return Object.values(animation.tracks).some((keys) => (keys?.length ?? 0) > 0);
}

export function keyAt(keys: Keyframe[] | undefined, time: number): Keyframe | undefined {
  return keys?.find((k) => Math.abs(k.time - time) <= KEY_EPSILON);
}

/** Add or move a key, keeping the track sorted. */
export function putKey(
  keys: Keyframe[] | undefined,
  time: number,
  value: number,
): Keyframe[] {
  const rest = (keys ?? []).filter((k) => Math.abs(k.time - time) > KEY_EPSILON);
  return [...rest, { time, value }].sort((a, b) => a.time - b.time);
}

export function removeKey(keys: Keyframe[] | undefined, time: number): Keyframe[] {
  return (keys ?? []).filter((k) => Math.abs(k.time - time) > KEY_EPSILON);
}

export type Easing = "smooth" | "ease" | "linear";

export const EASINGS: Array<{ id: Easing; label: string }> = [
  { id: "smooth", label: "Smooth" },
  { id: "ease", label: "Ease" },
  { id: "linear", label: "Linear" },
];

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Tangents for a monotone cubic (Fritsch-Carlson) — what "Smooth" uses, and
 * why it is the default.
 *
 * The first version of this eased in and out between each neighbouring pair.
 * Fine for two keys, wrong for three: easing out into a key and back in out
 * of it means the motion comes to a dead STOP at every interior keyframe, so
 * the animation visibly catches at each one instead of flowing through. A
 * plain Catmull-Rom fixes the stopping but overshoots, and then a key set to
 * 30 degrees gets approached via 34 — the pose that renders is not the pose
 * that was set.
 *
 * Fritsch-Carlson does both. Velocity is continuous through interior keys,
 * and the tangent limiter guarantees every segment stays inside the two
 * values that bound it. Where the data genuinely turns around — the peak of a
 * Float loop — it drives the tangent to zero, so a real extreme still reads
 * as a moment of stillness, which is correct rather than a catch.
 */
function monotoneTangents(keys: Keyframe[]): number[] {
  const n = keys.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dt = keys[i + 1].time - keys[i].time;
    slopes.push(dt > 0 ? (keys[i + 1].value - keys[i].value) / dt : 0);
  }

  const m: number[] = new Array(n);
  m[0] = slopes[0] ?? 0;
  m[n - 1] = slopes[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) m[i] = (slopes[i - 1] + slopes[i]) / 2;

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      // A flat segment must have flat ends too, or the curve bulges off the
      // line joining two identical values.
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slopes[i];
    const b = m[i + 1] / slopes[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slopes[i];
      m[i + 1] = t * b * slopes[i];
    }
  }
  return m;
}

function hermite(a: Keyframe, b: Keyframe, ma: number, mb: number, time: number): number {
  const h = b.time - a.time;
  if (h <= 0) return b.value;
  const t = (time - a.time) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * a.value +
    (t3 - 2 * t2 + t) * h * ma +
    (-2 * t3 + 3 * t2) * b.value +
    (t3 - t2) * h * mb
  );
}

/** The value of one track at a moment; `undefined` when it has no keys. */
export function sampleTrack(
  keys: Keyframe[] | undefined,
  time: number,
  easing: Easing = "smooth",
): number | undefined {
  if (!keys?.length) return undefined;
  if (keys.length === 1) return keys[0].value;
  // Held flat outside the keyed range rather than extrapolated — a track
  // should never invent a pose nobody asked for.
  if (time <= keys[0].time) return keys[0].value;
  const last = keys[keys.length - 1];
  if (time >= last.time) return last.value;

  let i = 0;
  while (i < keys.length - 2 && time > keys[i + 1].time) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const span = b.time - a.time;
  if (span <= 0) return b.value;

  if (easing === "smooth") {
    const m = monotoneTangents(keys);
    return hermite(a, b, m[i], m[i + 1], time);
  }
  const t = (time - a.time) / span;
  return a.value + (b.value - a.value) * (easing === "ease" ? easeInOut(t) : t);
}

/** Every animated property's value at a moment. Unanimated ones are absent. */
export function sampleAnimation(
  animation: Animation,
  time: number,
): Partial<Record<AnimatableKey, number>> {
  const out: Partial<Record<AnimatableKey, number>> = {};
  for (const { key } of ANIMATABLE) {
    const value = sampleTrack(animation.tracks[key], time, animation.easing);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Seconds as `0:00.0`, which is as much precision as scrubbing needs. */
export function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped - mins * 60;
  return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
}
