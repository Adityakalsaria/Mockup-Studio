/**
 * Snapping, the way Figma does it: a value dragged near a place worth landing
 * on lands there, and a guide shows the place while it holds.
 *
 * Only for GESTURES — a slider drag, a drag on the model, the wheel, the gizmo.
 * A number typed into a field is taken as typed: someone who asks for 2° wants
 * 2°, not the 0° it happens to be near.
 *
 * The places are the ones a composition is built on: the frame's centre for
 * position, the square angles for rotation, the device's real size for scale.
 * Everything else is free.
 */

export type SnapKey =
  "panX" | "panY" | "panZ" | "xAxis" | "yAxis" | "zAxis" | "zoom";

type Rule = {
  /** Values to land on; `every` adds each multiple of it. */
  targets?: number[];
  every?: number;
  /** How near counts as near, in the value's own units. */
  within: number;
  /** What the guide says while it holds. */
  label: (value: number) => string;
};

const deg = (n: number) => `${Math.round(n)}°`;

const RULES: Record<SnapKey, Rule> = {
  // Pan is in stage units, where 5 is a phone's height: 0.1 is a few pixels
  // of screen at a normal size — a pull you feel without fighting it.
  panX: { targets: [0], within: 0.1, label: () => "Centre" },
  panY: { targets: [0], within: 0.1, label: () => "Centre" },
  panZ: { targets: [0], within: 0.06, label: () => "Depth 0" },
  // The square angles, where a phone faces, turns side-on, or turns its back.
  xAxis: { every: 90, within: 3, label: (v) => `Rotation X ${deg(v)}` },
  yAxis: { every: 90, within: 3, label: (v) => `Rotation Y ${deg(v)}` },
  zAxis: { every: 90, within: 3, label: (v) => `Rotation Z ${deg(v)}` },
  zoom: { targets: [1], within: 0.02, label: () => "Scale 1.00×" },
};

export function isSnapKey(key: string): key is SnapKey {
  return key in RULES;
}

/** Where `raw` lands, and whether it was pulled there. */
export function snap(
  key: SnapKey,
  raw: number,
): { value: number; snapped: boolean; label: string | null } {
  const rule = RULES[key];
  const candidates = [...(rule.targets ?? [])];
  if (rule.every) candidates.push(Math.round(raw / rule.every) * rule.every);
  for (const target of candidates) {
    if (Math.abs(raw - target) <= rule.within) {
      return { value: target, snapped: true, label: rule.label(target) };
    }
  }
  return { value: raw, snapped: false, label: null };
}

/**
 * What the stage draws while something holds: a line through the frame's
 * centre for each axis the position has landed on, and a label for anything
 * a line cannot show — an angle, a scale, a depth.
 */
export type SnapGuides = {
  vertical: boolean;
  horizontal: boolean;
  label: string | null;
};

export const NO_GUIDES: SnapGuides = {
  vertical: false,
  horizontal: false,
  label: null,
};
