/**
 * The lens model, shaped the way ultramock's BLUR panel is shaped.
 *
 * This replaced a list of four fixed presets. The presets were the wrong
 * abstraction: "tilt shift" and "lens" were not variations of one look, they
 * were the SAME depth-of-field pass with different numbers, so picking one
 * could never give you the in-between. Ultramock exposes a mode plus its
 * parameters, and the two modes really are different passes — a tilt shift
 * blurs by SCREEN POSITION (a band across the frame), a radial blur by
 * DEPTH (distance from the plane of focus). No parameter set unifies them.
 *
 * Parameters are stored normalised 0..1 (except `angle`, in degrees, and
 * `strength`, 0..100 to match the sliders) so a saved shot means the same
 * thing regardless of where the camera has since been moved.
 */
export type BlurMode = "off" | "tilt-shift" | "radial";

export interface BlurSettings {
  mode: BlurMode;
  /** 0..100. Drives kernel size in tilt shift, bokeh radius in radial. */
  strength: number;
  /** 0..1. How much of the frame stays sharp. */
  focusSize: number;
  /** 0..1. How abruptly sharp turns to blurred at the edge of that region. */
  falloff: number;
  /** Larger, rounder highlights. Costs a second pass, so it is opt-in. */
  bokeh: boolean;
  /** Degrees. Tilt shift only — the angle of the sharp band. */
  angle: number;
  /** 0..1 across the frame. Tilt shift only — slides the band off centre. */
  scan: number;
  /** 0..1 across the frame. Radial only — where the sharp point sits. */
  focusX: number;
  focusY: number;
}

export const BLUR_MODES: { id: BlurMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "tilt-shift", label: "Tilt shift" },
  { id: "radial", label: "Radial" },
];

export const DEFAULT_BLUR: BlurSettings = {
  mode: "off",
  strength: 30,
  focusSize: 0.1,
  falloff: 0,
  bokeh: false,
  angle: 45,
  scan: 0.5,
  focusX: 0.5,
  focusY: 0.5,
};

/**
 * Sensible starting points per mode, so switching mode lands on something
 * that reads immediately rather than on whatever the other mode was left at.
 * Ultramock does the same — its two modes open with different defaults.
 */
export const MODE_DEFAULTS: Record<BlurMode, Partial<BlurSettings>> = {
  off: {},
  "tilt-shift": { strength: 30, focusSize: 0.1, falloff: 0, angle: 45, scan: 0.5 },
  radial: { strength: 10, focusSize: 0.52, falloff: 0, focusX: 0.5, focusY: 0.5 },
};

export function applyMode(current: BlurSettings, mode: BlurMode): BlurSettings {
  return { ...current, ...MODE_DEFAULTS[mode], mode };
}

/** True when the effect would actually change a pixel — the mount condition. */
export function isBlurActive(b: BlurSettings): boolean {
  return b.mode !== "off" && b.strength > 0;
}
