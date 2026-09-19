/**
 * Points on the phone, and where they land on screen.
 *
 * Focus areas live ON THE PHONE -- in the model group's own coordinates -- so
 * they stay on the part of the device they were drawn over while the camera
 * moves, the phone turns, or a composed move plays. These two functions are
 * the whole bridge, and both are the stage's rig exactly: the camera sits at
 * z = 1.8 looking down -z with a vertical fov; the group is placed at
 * (panX * 0.2, -panY * 0.2, panZ), turned by an XYZ Euler of the axis angles,
 * and scaled by zoom times the per-axis scale.
 */

import { Euler, Matrix4, Vector3 } from "three";

export const CAMERA_Z = 1.8;

/** An area on the phone: centre and size in the group's own x/y units. */
export type FocusArea = { cx: number; cy: number; w: number; h: number };

export type FocusPose = {
  xAxis: number;
  yAxis: number;
  zAxis: number;
  zoom: number;
  panX: number;
  panY: number;
  panZ: number;
  fov: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
};

const DEG = Math.PI / 180;

function place(pose: FocusPose) {
  const rotation = new Matrix4().makeRotationFromEuler(
    new Euler(pose.xAxis * DEG, pose.yAxis * DEG, pose.zAxis * DEG),
  );
  const scale = new Vector3(
    pose.zoom * pose.scaleX,
    pose.zoom * pose.scaleY,
    pose.zoom * pose.scaleZ,
  );
  const position = new Vector3(pose.panX * 0.2, -pose.panY * 0.2, pose.panZ);
  return { rotation, scale, position };
}

/** A point on the phone to a place on screen, as fractions of the frame
    (x from the left, y from the top). */
export function toScreen(
  local: Vector3,
  pose: FocusPose,
  aspect: number,
): { x: number; y: number } {
  const { rotation, scale, position } = place(pose);
  const world = local
    .clone()
    .multiply(scale)
    .applyMatrix4(rotation)
    .add(position);
  const depth = CAMERA_Z - world.z;
  const halfTan = Math.tan((pose.fov * DEG) / 2);
  return {
    x: 0.5 + world.x / depth / (halfTan * aspect) / 2,
    y: 0.5 - world.y / depth / halfTan / 2,
  };
}

/** A place on screen back onto the phone: the camera ray through it, met with
    the phone's own plane (z = 0 in its coordinates). Null when the ray runs
    parallel to the phone or meets it behind the camera. */
export function toPhone(
  screen: { x: number; y: number },
  pose: FocusPose,
  aspect: number,
): Vector3 | null {
  const { rotation, scale, position } = place(pose);
  const halfTan = Math.tan((pose.fov * DEG) / 2);
  const origin = new Vector3(0, 0, CAMERA_Z);
  const dir = new Vector3(
    (screen.x - 0.5) * 2 * halfTan * aspect,
    (0.5 - screen.y) * 2 * halfTan,
    -1,
  );
  // The plane's normal under a non-uniform scale: the inverse-scaled z axis,
  // turned.
  const normal = new Vector3(0, 0, 1 / scale.z)
    .applyMatrix4(rotation)
    .normalize();
  const facing = dir.dot(normal);
  if (Math.abs(facing) < 1e-9) return null;
  const t = position.clone().sub(origin).dot(normal) / facing;
  if (t <= 0) return null;
  const hit = origin.add(dir.multiplyScalar(t));
  const inverse = rotation.clone().invert();
  return hit
    .sub(position)
    .applyMatrix4(inverse)
    .divide(scale)
    .setZ(0);
}

/** The pose a studio state is showing, with the animation sampled in. */
export function poseOf(
  state: FocusPose,
  sampled: Partial<Record<keyof FocusPose, number>>,
): FocusPose {
  return { ...state, ...stripUndefined(sampled) };
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

/**
 * When a composed move is at each area: the camera arrives at `arrive[i]` and
 * leaves at `leave[i]`. Saved with the shot so depth of field can find its
 * subject on any frame -- playback, a scrub, or an export stepping through.
 */
export type FocusFollow = {
  areas: FocusArea[];
  arrive: number[];
  leave: number[];
  /** When the move ends -- back on the wide shot. */
  end: number;
};

/**
 * How much depth of field the frame at `t` gets, 0..1.
 *
 * None at the start: the blur grows as the camera travels to the first area
 * and is whole by the time it arrives. Whole through the areas, then it
 * drains away as the camera pulls back from the last, and the final frame is
 * sharp -- so the clip begins and ends on a clean shot, and a paused shot at
 * the top shows no blur at all.
 */
export function followFade(follow: FocusFollow, t: number): number {
  const smooth = (k: number) => {
    const c = Math.min(1, Math.max(0, k));
    return c * c * (3 - 2 * c);
  };
  const first = follow.arrive[0] ?? 0;
  const last = follow.leave[follow.leave.length - 1] ?? 0;
  /*
   * `end` was added after the first moves were composed, and a schedule
   * saved without it never faded out -- the blur rose and then stayed on to
   * the last frame. Missing, the pull-back is taken to last as long as the
   * way in did, which is how Compose times it anyway.
   */
  const end =
    Number.isFinite(follow.end) && follow.end > last
      ? follow.end
      : last + (first > 0 ? first : 1.4);
  if (t >= end) return 0;
  const rise = first > 0 ? smooth(t / first) : 1;
  const fall = 1 - smooth((t - last) / (end - last));
  return Math.min(rise, fall);
}

/**
 * Where the sharp spot belongs at time `t`, as a fraction of the frame.
 *
 * On an area while the camera is on it -- which is also through the wide
 * shot before the first and after the last, so the lens is already on its
 * subject as the move begins and stays on it as it ends. Between two areas it
 * glides from one to the next with the travel, eased the same way the camera
 * is, so focus is pulled in step with the move. Each area's centre is
 * projected through the pose the frame is actually showing.
 */
export function followPoint(
  follow: FocusFollow,
  t: number,
  pose: FocusPose,
  aspect: number,
): { x: number; y: number } | null {
  const { areas, arrive, leave } = follow;
  if (!areas.length) return null;
  const at = (i: number) =>
    toScreen(new Vector3(areas[i].cx, areas[i].cy, 0), pose, aspect);
  for (let i = 0; i < areas.length - 1; i++) {
    if (t <= leave[i]) return at(i);
    if (t < arrive[i + 1]) {
      const span = arrive[i + 1] - leave[i];
      const k = span > 0 ? (t - leave[i]) / span : 1;
      const eased = k * k * (3 - 2 * k);
      const a = at(i);
      const b = at(i + 1);
      return { x: a.x + (b.x - a.x) * eased, y: a.y + (b.y - a.y) * eased };
    }
  }
  return at(areas.length - 1);
}
