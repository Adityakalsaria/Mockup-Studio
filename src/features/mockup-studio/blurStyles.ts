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
export type BlurMode = "off" | "radial" | "directional" | "tilt-shift";

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
  /**
   * Degrees. Tilt shift: the angle of the sharp band, 0 lying it flat.
   * Directional: the way the blur grows, 90 toward the top of the frame.
   */
  angle: number;
  /** 0..1 across the frame. Unused since the focus pad; kept so saved shots load. */
  scan: number;
  /** 0..1 across the frame, from the left and from the top. Every mode: where
      the sharp point, or the middle of the sharp band, sits. */
  focusX: number;
  focusY: number;
}

export const BLUR_MODES: { id: BlurMode; label: string }[] = [
  { id: "off", label: "None" },
  { id: "radial", label: "Radial" },
  { id: "directional", label: "Directional" },
  { id: "tilt-shift", label: "Tilt shift" },
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
  // Strong enough to read the moment the mode is picked: a 10 used to open
  // onto a shot that looked unchanged, which reads as a control that is broken.
  radial: { strength: 40, focusSize: 0.3, falloff: 0.3 },
  directional: { strength: 40, focusSize: 0.1, falloff: 0.4, angle: 90 },
  "tilt-shift": { strength: 40, focusSize: 0.2, falloff: 0.3, angle: 0 },
};

export function applyMode(current: BlurSettings, mode: BlurMode): BlurSettings {
  return { ...current, ...MODE_DEFAULTS[mode], mode };
}

/** True when the effect would actually change a pixel — the mount condition. */
export function isBlurActive(b: BlurSettings): boolean {
  return b.mode !== "off" && b.strength > 0;
}
