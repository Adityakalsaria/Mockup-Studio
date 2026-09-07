/**
 * The one spring every 3D transform in the studio settles on.
 *
 * Lifted out of `PhoneStage3D` when the gizmo started reporting the phone's
 * orientation. Two objects showing one rotation have to arrive together — a
 * gizmo that snapped while the phone eased, or eased at a rate of its own,
 * would be a second opinion about where the model is pointing, and the eye
 * catches that immediately at this size. One module, one omega, one integrator.
 */

/**
 * The phone's transform spring, in rad/s. Applied to every transform (scale,
 * position, rotation) so auto-driven step transitions, slider input and
 * cursor-drag rotation all move with the same weight.
 *
 * 14 is measured, not chosen: fitting a reference recording frame by frame
 * gives a critically damped spring at omega 14, zeta 1.01, and the panel
 * chrome runs the same number through --ks-spring. The phone and the controls
 * around it settle together as a result.
 *
 * What this replaced was `1 - exp(-dt / 0.18)`, which is a first-order lag,
 * not the critically damped spring its comment claimed. The difference is the
 * first frame: a lag filter's velocity is highest at t=0 and only decays, so
 * the phone left instantly and then crawled into place. A spring starts from
 * rest, which is what makes a heavy object look heavy.
 */
export const TRANSFORM_OMEGA = 14;

/**
 * One step of a critically damped spring towards `target`.
 *
 * The textbook integration (v += (-2*w*v - w*w*(x - target)) * dt) goes
 * unstable once w * dt approaches 1, and on a canvas that renders on demand
 * dt is whatever the gap since the last frame happened to be — a tab left in
 * the background hands back a dt of seconds. This is the stable closed form
 * (Game Programming Gems 4), which is exact for any dt and needs no exp():
 * `decay` is a Pade approximation of e^-x, well under a pixel of error across
 * the range and a good deal cheaper six times a frame.
 *
 * Velocity has to persist across frames, so it lives in `vel` under `key`.
 */
export function springTo(
  current: number,
  target: number,
  vel: Record<string, number>,
  key: string,
  dt: number,
): number {
  const x = TRANSFORM_OMEGA * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (vel[key] + TRANSFORM_OMEGA * change) * dt;
  vel[key] = (vel[key] - TRANSFORM_OMEGA * temp) * decay;
  return target + (change + temp) * decay;
}
