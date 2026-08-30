import { parseHex, toHex } from "./editor/color";

/**
 * Lighting presets.
 *
 * There is no HDRI in this scene to swap. The environment is built from six
 * Lightformer emitters rendered into a cube map once, which is why the phone
 * reflects a soft studio rather than a photograph of a room -- and why a
 * preset here changes the light itself rather than loading a different file.
 *
 * That is the better trade for this project. drei's built-in `preset` names
 * fetch their .hdr from a CDN at runtime, and this repo was deliberately made
 * to run with no external dependency at all; a real HDRI would also be several
 * megabytes and carry its own licence. Presets cost nothing and are honest
 * about what they are.
 *
 * Each one is a set of multipliers over the base rig rather than a second copy
 * of it, so the geometry of the lighting -- where the key sits, how the edge
 * strips rake down the sides -- stays the thing that was dialled in, and only
 * its balance and temperature move.
 */

export type LightingId = "studio" | "soft" | "contrast" | "warm" | "cool";

export type LightingPreset = {
  id: LightingId;
  label: string;
  /** Multipliers on the base intensities, by role. */
  key: number;
  edge: number;
  fill: number;
  bounce: number;
  /** -1 fully cool, 0 as authored, +1 fully warm. */
  warmth: number;
};

export const LIGHTING_PRESETS: LightingPreset[] = [
  { id: "studio", label: "Studio", key: 1, edge: 1, fill: 1, bounce: 1, warmth: 0 },
  // Lift the fill and pull the edges back: the highlights stop being lines and
  // become gradients. Nothing to catch the eye, which is the point.
  { id: "soft", label: "Soft", key: 0.8, edge: 0.55, fill: 1.7, bounce: 1.35, warmth: 0.1 },
  // The opposite trade. Fill almost off, edges up, so the body goes dark
  // between the rakes and the silhouette does the work.
  { id: "contrast", label: "Contrast", key: 1.3, edge: 1.55, fill: 0.3, bounce: 0.45, warmth: -0.05 },
  { id: "warm", label: "Warm", key: 1.05, edge: 0.95, fill: 1.1, bounce: 1.25, warmth: 0.6 },
  { id: "cool", label: "Cool", key: 1, edge: 1.15, fill: 1, bounce: 0.85, warmth: -0.6 },
];

export const DEFAULT_LIGHTING: LightingId = "studio";

export const getLighting = (id: LightingId): LightingPreset =>
  LIGHTING_PRESETS.find((p) => p.id === id) ?? LIGHTING_PRESETS[0];

/** Where "warm" and "cool" actually point. Both are close to white: an emitter
    pushed to a saturated colour stops reading as light and starts reading as a
    coloured gel, which is a different look from a warmer studio. */
const WARM = { r: 255, g: 196, b: 138 };
const COOL = { r: 175, g: 208, b: 255 };

/** Shift one emitter colour along the temperature axis. */
export function shiftTemperature(hex: string, warmth: number): string {
  const base = parseHex(hex);
  if (!base || warmth === 0) return hex;
  const target = warmth > 0 ? WARM : COOL;
  const t = Math.min(1, Math.abs(warmth)) * 0.55;
  return toHex({
    r: base.r + (target.r - base.r) * t,
    g: base.g + (target.g - base.g) * t,
    b: base.b + (target.b - base.b) * t,
  });
}
