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
  easing: { kind: "smooth" },
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

/**
 * An easing, as parameters rather than a name.
 *
 * It used to be a string union, which is fine while every curve is one the
 * code already knows. It stops being fine the moment someone wants to drag a
 * control point: a custom bezier is four numbers, and a spring is two, and
 * neither fits in an identifier. So the value carries its own parameters and
 * the named curves become presets that produce one.
 */
export type Easing =
  /** Monotone spline through the keys — not a curve applied to a segment, but
      a different interpolation entirely, which is why it has no parameters. */
  | { kind: "smooth" }
  | { kind: "cubic"; p: [number, number, number, number] }
  | { kind: "spring"; damping: number; frequency: number };

export const EASING_PRESETS: Array<{ id: string; label: string; easing: Easing }> = [
  { id: "smooth", label: "Smooth", easing: { kind: "smooth" } },
  { id: "linear", label: "Linear", easing: { kind: "cubic", p: [0, 0, 1, 1] } },
  { id: "easeIn", label: "Ease in", easing: { kind: "cubic", p: [0.42, 0, 1, 1] } },
  { id: "easeOut", label: "Ease out", easing: { kind: "cubic", p: [0, 0, 0.58, 1] } },
  { id: "easeInOut", label: "Ease in and out", easing: { kind: "cubic", p: [0.42, 0, 0.58, 1] } },
  // The "back" curves put a control point outside 0..1, which is what makes
  // them pull away before they go or overshoot before they land.
  { id: "easeInBack", label: "Ease in back", easing: { kind: "cubic", p: [0.36, 0, 0.66, -0.56] } },
  { id: "easeOutBack", label: "Ease out back", easing: { kind: "cubic", p: [0.34, 1.56, 0.64, 1] } },
  { id: "easeInOutBack", label: "Ease in and out back", easing: { kind: "cubic", p: [0.68, -0.6, 0.32, 1.6] } },
  { id: "gentle", label: "Gentle", easing: { kind: "spring", damping: 0.8, frequency: 1.1 } },
  { id: "quick", label: "Quick", easing: { kind: "spring", damping: 0.62, frequency: 1.7 } },
];

export const DEFAULT_EASING: Easing = { kind: "smooth" };

/** Which preset an easing IS, if any — so the picker can show a name rather
    than four numbers whenever the value happens to match one. */
export function easingPresetId(easing: Easing): string | null {
  const match = EASING_PRESETS.find((preset) => {
    const a = preset.easing;
    if (a.kind !== easing.kind) return false;
    if (a.kind === "cubic" && easing.kind === "cubic") {
      return a.p.every((v, i) => Math.abs(v - easing.p[i]) < 1e-6);
    }
    if (a.kind === "spring" && easing.kind === "spring") {
      return (
        Math.abs(a.damping - easing.damping) < 1e-6 &&
        Math.abs(a.frequency - easing.frequency) < 1e-6
      );
    }
    return true;
  });
  return match?.id ?? null;
}

/**
 * A CSS-style cubic bezier, as a function of t.
 *
 * The control points describe the curve parametrically, so getting y for a
 * given x means solving for the parameter first. Newton-Raphson converges in
 * a handful of steps here because the curve is monotonic in x; the bisection
 * fallback exists for the "back" curves, whose control points sit outside
 * 0..1 and can defeat the derivative.
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number, t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
  };
  const slope = (a: number, b: number, t: number) => {
    const u = 1 - t;
    return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b);
  };
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = curve(x1, x2, t) - x;
      if (Math.abs(dx) < 1e-6) return curve(y1, y2, t);
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const cx = curve(x1, x2, t);
      if (Math.abs(cx - x) < 1e-6) break;
      if (cx < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return curve(y1, y2, t);
  };
}

/**
 * An under-damped spring, in closed form.
 *
 * Normalised by its own value at t=1 so a segment still lands exactly on its
 * keyframe — a spring left unnormalised ends near 1 but not on it, which shows
 * up as a small jump at every interior key.
 */
function spring(dampingRatio: number, frequency: number) {
  const zeta = Math.min(0.999, Math.max(0.05, dampingRatio));
  const raw = (t: number) => {
    const w = frequency * Math.PI * 2;
    const wd = w * Math.sqrt(1 - zeta * zeta);
    return (
      1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t))
    );
  };
  const end = raw(1);
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return raw(t) / end;
  };
}

/** The curve itself, so a picker can draw what it is offering. */
export function easingCurve(easing: Easing): (t: number) => number {
  if (easing.kind === "smooth") return (t) => t;
  if (easing.kind === "spring") return spring(easing.damping, easing.frequency);
  return cubicBezier(easing.p[0], easing.p[1], easing.p[2], easing.p[3]);
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
  easing: Easing = DEFAULT_EASING,
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

  if (easing.kind === "smooth") {
    const m = monotoneTangents(keys);
    return hermite(a, b, m[i], m[i + 1], time);
  }
  const t = (time - a.time) / span;
  return a.value + (b.value - a.value) * easingCurve(easing)(t);
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
