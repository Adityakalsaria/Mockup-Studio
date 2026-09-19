import { parseHex, toHex } from "@/design/color";

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

export type LightingId =
  | "studio"
  | "dramatic"
  | "top"
  | "high-key"
  | "rim";

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
  // Edges at their brightest over almost nothing: a black body cut out by two
  // hard lines of light.
  { id: "dramatic", label: "Dramatic", key: 0.55, edge: 2.2, fill: 0.08, bounce: 0.15, warmth: -0.1 },
  // All from above: the top chamfer and the upper back carry it, the lower
  // half falls away.
  { id: "top", label: "Top light", key: 1.9, edge: 0.6, fill: 0.35, bounce: 0.1, warmth: 0.05 },
  // Everything up and even, for a bright catalogue shot with no dark side.
  { id: "high-key", label: "High-key", key: 1.3, edge: 1.1, fill: 2.2, bounce: 1.8, warmth: 0.05 },
  // Light only from the sides and behind: a glowing outline on a dim face.
  { id: "rim", label: "Rim", key: 0.3, edge: 2, fill: 0.15, bounce: 0.6, warmth: -0.2 },
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
