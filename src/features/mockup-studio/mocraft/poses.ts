/**
 * The seven named poses a foldable is shown in.
 *
 * Read off Apple's own iPhone Duo product viewer, which offers exactly these
 * seven and no more: a continuous Foldable gesture plus six discrete states.
 * The names are theirs, and so are the fold values -- a fold is a fraction of
 * the same hinge on both sides, so those are the one thing that carries over
 * as a quantity rather than as an intention.
 *
 * The fold values are INVERTED on the way in, and that is not a detail. Their
 * `fold` is how far OPEN the device is, 0 shut and 1 flat; this rig's is how
 * far the lid is CLOSED, which is the sense a lid slider reads in. Copying
 * their numbers across would have given a dock where Landscape shuts the
 * phone and Closed opens it — the one mistake here that looks like a working
 * feature until you press it.
 *
 * The FRAMING does not transfer exactly either, and pretending otherwise would
 * have produced seven wrong numbers. Their viewer orbits a camera around a device
 * that lies flat: a state names a spherical `[radius, phi, theta]` against a
 * default of `[35, PI/2, PI]`. This stage does the opposite -- the camera is
 * fixed and the model turns in front of it -- so each state is converted
 * rather than copied:
 *
 *   yAxis  the camera's theta, negated: swinging the eye left is swinging the
 *          model right, and the two are the same picture.
 *   xAxis  the same for phi, which is the tilt.
 *   zoom   35 / radius, against this stage's own 0.85 default rather than 1 --
 *          a ratio, so "a third closer" stays a third closer.
 *
 * What is NOT converted is their per-state `pose.rotation`, because the axis
 * it turns about is theirs. Their device lies face-up with Y as the screen
 * normal, so a Y rotation is the ROLL that takes an open device from landscape
 * to portrait; here the device stands facing the camera down Z, and the same
 * roll is `zAxis`. Transcribing the numbers straight across would have rolled
 * the phone about an axis that points at the viewer and shown it edge-on.
 */

import { RANGES } from "../editor/editorState";
import type { EditorState } from "../editor/editorState";

export type PoseId =
  | "foldable"
  | "landscape"
  | "portrait"
  | "closed"
  | "seated"
  | "standing"
  | "durability";

export type Pose = {
  id: PoseId;
  label: string;
  /**
   * What this pose sets. A partial, deliberately: a state says only what it
   * is ABOUT, and anything it leaves out keeps whatever the shot already had.
   *
   * Landscape is the clearest case -- it is a statement about the hinge and
   * nothing else, so choosing it after framing a shot opens the device and
   * leaves the framing alone.
   */
  set: Partial<Pick<EditorState, "fold" | "xAxis" | "yAxis" | "zAxis" | "zoom">>;
};

/** The neutral this file's conversions are relative to. */
const BASE_YAW = 180;
const BASE_ZOOM = 0.85;

/** Their openness, as this rig's closedness. */
const shut = (open: number) => Math.round((1 - open) * 100);

/** Apple's `35 / radius`, against this stage's zoom rather than theirs. */
const closer = (radius: number) =>
  Number((BASE_ZOOM * (35 / radius)).toFixed(2));

export const POSES: Pose[] = [
  /*
   * The default, and the only one that is a gesture rather than a position:
   * Apple opens on it at a third folded, with the slider live. Ours is live
   * always -- the Lid row is in the crafting panel whatever pose is chosen --
   * so this is simply the state that returns the framing to neutral.
   */
  {
    id: "foldable",
    label: "Foldable",
    set: { fold: shut(0.3333), xAxis: 0, yAxis: BASE_YAW, zAxis: 0, zoom: BASE_ZOOM },
  },
  // Fully open, framed as it was. A statement about the hinge alone.
  { id: "landscape", label: "Landscape", set: { fold: shut(1) } },
  /*
   * Also fully open, turned upright. `zAxis` and not `yAxis`: see the header
   * -- this is the roll their model does about Y, on the axis that means the
   * same thing here.
   */
  { id: "portrait", label: "Portrait", set: { fold: shut(1), zAxis: 90 } },
  // Shut. Again the hinge only.
  { id: "closed", label: "Closed", set: { fold: shut(0) } },
  /*
   * Half open and stood on its edge, the way a laptop sits on a desk. From
   * `fold .5111`, `orbit [31, 1.38, -PI/2]` and a -90 degree roll.
   */
  {
    id: "seated",
    label: "Seated",
    set: { fold: shut(0.5111), xAxis: 11, yAxis: BASE_YAW, zAxis: -90, zoom: closer(31) },
  },
  // A quarter open and stood up like a tent. From `orbit [29, 1.45, PI*.8]`.
  {
    id: "standing",
    label: "Standing",
    set: { fold: shut(0.25), xAxis: 8, yAxis: 216, zAxis: 0, zoom: closer(29) },
  },
  /*
   * Close on the hinge, tilted so the spine catches the light. The tightest
   * of the seven at `radius 25`, which is what makes it a look at the
   * mechanism rather than at the device.
   */
  {
    id: "durability",
    label: "Durability",
    set: { fold: shut(0.3333), xAxis: 9, yAxis: 266, zAxis: -30, zoom: closer(25) },
  },
];

/**
 * Apply a pose, clamped to what the rig actually accepts.
 *
 * Clamped rather than trusted: `zoom` here is derived from a ratio, and a
 * ratio against a default that someone later retunes could land outside the
 * slider's range -- at which point the panel would show a number its own
 * control could not produce.
 */
export function applyPose(state: EditorState, pose: Pose): EditorState {
  const next = { ...state, ...pose.set };
  const clamp = (key: "fold" | "xAxis" | "yAxis" | "zAxis" | "zoom") => {
    const range = RANGES[key];
    if (!range) return;
    next[key] = Math.min(range.max, Math.max(range.min, next[key]));
  };
  for (const key of Object.keys(pose.set) as (keyof typeof pose.set)[]) {
    clamp(key);
  }
  return next;
}
