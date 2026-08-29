/**
 * Orientation maths for the phone remote.
 *
 * Euler angles are what the sensor hands out and the wrong thing to send.
 * Two failures, both visible immediately:
 *
 *  - **Wrap.** `alpha` runs 0–360, so a phone crossing north jumps 359° → 1°
 *    and anything interpolating toward it sweeps the long way round.
 *  - **Gimbal lock.** As `beta` approaches ±90° — a phone held upright, which
 *    is exactly how you hold one — the `alpha` and `gamma` axes align and the
 *    decomposition becomes unstable. Tiny real movements produce ~180° swings
 *    in the reported angles. That is the flicker.
 *
 * A quaternion has neither problem: it is continuous everywhere and there is
 * no representation to lock. So the phone converts once, at the source, and
 * everything downstream interpolates quaternions.
 *
 * The conversion is the one from three.js's DeviceOrientationControls, which
 * is the reference implementation of the W3C spec's frame.
 */

export type Quat = { x: number; y: number; z: number; w: number };

export const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

const DEG = Math.PI / 180;
/** −90° about X: the sensor frame has Z out of the screen, the world frame has
    Y up, and this is the constant rotation between them. */
const SCREEN_TILT: Quat = { x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };

export function multiply(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function conjugate(q: Quat): Quat {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

export function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  if (!length) return IDENTITY;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

/**
 * `deviceorientation` angles to a quaternion.
 *
 * `screenAngle` is `screen.orientation.angle` — without it, rotating the phone
 * to landscape rotates the model too, because the sensor reports in the
 * device's frame while the user is thinking in the screen's.
 */
export function fromDeviceOrientation(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle: number,
): Quat {
  // Intrinsic Y-X-Z, with the axes as the spec assigns them.
  const x = beta * DEG;
  const y = alpha * DEG;
  const z = -gamma * DEG;

  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  const base: Quat = {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 - s1 * s2 * c3,
    w: c1 * c2 * c3 + s1 * s2 * s3,
  };

  const half = (-screenAngle * DEG) / 2;
  const screenSpin: Quat = { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) };

  return normalize(multiply(multiply(base, SCREEN_TILT), screenSpin));
}

/**
 * Spherical interpolation, the shortest way round.
 *
 * The sign flip is the part that matters: q and −q are the same orientation,
 * so without it half of all interpolations take the 358° route and the model
 * appears to snap.
 */
export function slerp(from: Quat, to: Quat, t: number): Quat {
  let cos = from.x * to.x + from.y * to.y + from.z * to.z + from.w * to.w;

  let end = to;
  if (cos < 0) {
    cos = -cos;
    end = { x: -to.x, y: -to.y, z: -to.z, w: -to.w };
  }

  // Nearly parallel: sin(θ) underflows, so fall back to a straight blend.
  if (cos > 0.9995) {
    return normalize({
      x: from.x + (end.x - from.x) * t,
      y: from.y + (end.y - from.y) * t,
      z: from.z + (end.z - from.z) * t,
      w: from.w + (end.w - from.w) * t,
    });
  }

  const theta = Math.acos(Math.min(1, cos));
  const sinTheta = Math.sin(theta);
  const a = Math.sin((1 - t) * theta) / sinTheta;
  const b = Math.sin(t * theta) / sinTheta;

  return normalize({
    x: from.x * a + end.x * b,
    y: from.y * a + end.y * b,
    z: from.z * a + end.z * b,
    w: from.w * a + end.w * b,
  });
}

/** The pose relative to a captured neutral — the "reset calibration" button.
    Without it the model points at magnetic north rather than at the user. */
export function relativeTo(zero: Quat, current: Quat): Quat {
  return normalize(multiply(conjugate(zero), current));
}

/**
 * Axis-angle, ready for a CSS `rotate3d()`.
 *
 * CSS 3D has Y pointing DOWN the screen where the sensor frame has it up, and
 * mirroring one axis turns a rotation `(a, θ)` into `(−Sa, θ)` — hence the
 * negated X and Z rather than a negated angle.
 */
export function toCssRotate3d(q: Quat): { x: number; y: number; z: number; deg: number } {
  const n = normalize(q);
  const w = Math.min(1, Math.max(-1, n.w));
  const angle = 2 * Math.acos(w);
  const s = Math.sqrt(1 - w * w);

  // At zero rotation the axis is arbitrary; any unit vector renders the same.
  if (s < 1e-6) return { x: 1, y: 0, z: 0, deg: 0 };

  return {
    x: -(n.x / s),
    y: n.y / s,
    z: -(n.z / s),
    deg: (angle * 180) / Math.PI,
  };
}
