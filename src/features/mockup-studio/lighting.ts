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
  | "soft"
  | "contrast"
  | "product"
  | "warm"
  | "cool"
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
  // Lift the fill and pull the edges back: the highlights stop being lines and
  // become gradients. Nothing to catch the eye, which is the point.
  { id: "soft", label: "Soft", key: 0.8, edge: 0.55, fill: 1.7, bounce: 1.35, warmth: 0.1 },
  // The opposite trade. Fill almost off, edges up, so the body goes dark
  // between the rakes and the silhouette does the work.
  { id: "contrast", label: "Contrast", key: 1.3, edge: 1.55, fill: 0.3, bounce: 0.45, warmth: -0.05 },
  /*
   * Apple's own product shot, read off four of them: the Burgundy, Sky Blue,
   * White and Black 18 Pros.
   *
   * What those renders have in common is not brightness, it is RESTRAINT. One
   * big soft key from the upper left, an edge that catches the chamfer and the
   * camera rings hard enough to draw the whole silhouette in a single bright
   * line, and almost no fill at all — the right-hand third of the body falls
   * to within a few values of the black it sits on. `contrast` is the same
   * idea and stops short: this takes the fill down another third and the edge
   * up, because in the references the rim is the brightest thing in frame and
   * on a dark finish it is the ONLY thing that says where the phone ends.
   *
   * Barely cool. Apple's white balance is close to neutral with the faintest
   * blue in the specular, which is what keeps aluminium reading as metal
   * rather than as paint — a warm key on that grey turns it beige immediately.
   */
  { id: "product", label: "Product", key: 1.25, edge: 1.85, fill: 0.2, bounce: 0.3, warmth: -0.12 },
  { id: "warm", label: "Warm", key: 1.05, edge: 0.95, fill: 1.1, bounce: 1.25, warmth: 0.6 },
  { id: "cool", label: "Cool", key: 1, edge: 1.15, fill: 1, bounce: 0.85, warmth: -0.6 },
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

/**
 * The rig as dialled: a preset's balance, or one moved by hand, plus how far
 * the whole rig is turned around the phone. What the Lighting popup's sliders
 * edit and what the environment builds.
 */
export type LightRig = Omit<LightingPreset, "id" | "label"> & {
  /** Degrees about the vertical, 0 as authored. */
  angle: number;
  /** Degrees the rig is tipped up (+) or down (−), 0 as authored. */
  elevation: number;
};

export const rigOf = (
  id: LightingId,
  angle = 0,
  elevation = 0,
): LightRig => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, label: _label, ...balance } = getLighting(id);
  return { ...balance, angle, elevation };
};

/** A shot's rig — saved before the sliders existed, it is its preset's. */
export const lightOf = (s: {
  lighting: LightingId;
  light?: Partial<LightRig>;
}): LightRig => ({ ...rigOf(s.lighting), ...s.light });

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
