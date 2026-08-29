/**
 * Body finishes for the phone.
 *
 * The GLB ships one authored body colour; the renderer already retints every
 * body material at load, so a finish is just the three numbers that retint
 * pass reads. Metalness and roughness travel with the colour because they are
 * what separates the finishes as much as hue does — polished aluminium is
 * mirror-smooth and near-fully metallic, a matte titanium is neither, and
 * giving them the same surface makes every swatch read as the same phone in
 * a different paint.
 *
 * `graphite` is first and is the default: its values are the ones the stage
 * used before finishes existed, so the out-of-the-box render is unchanged.
 */
export interface Finish {
  id: string;
  label: string;
  /** What the swatch shows. Also what the body is tinted to. */
  color: string;
  metalness: number;
  roughness: number;
}

export const FINISHES: Finish[] = [
  { id: "graphite", label: "Graphite", color: "#727272", metalness: 0.68, roughness: 0.22 },
  { id: "silver", label: "Silver", color: "#d8dade", metalness: 0.74, roughness: 0.16 },
  { id: "black", label: "Black", color: "#2f3033", metalness: 0.62, roughness: 0.3 },
  { id: "white", label: "White", color: "#e9e6e1", metalness: 0.5, roughness: 0.3 },
  { id: "deep-blue", label: "Deep Blue", color: "#3d4c6b", metalness: 0.66, roughness: 0.24 },
  { id: "cosmic-orange", label: "Cosmic Orange", color: "#cf5f28", metalness: 0.6, roughness: 0.27 },
  { id: "desert", label: "Desert", color: "#bda28c", metalness: 0.66, roughness: 0.24 },
  { id: "gold", label: "Gold", color: "#d5bd8d", metalness: 0.72, roughness: 0.2 },
];

export const DEFAULT_FINISH_ID = FINISHES[0].id;

export function getFinish(id: string | undefined): Finish {
  return FINISHES.find((f) => f.id === id) ?? FINISHES[0];
}
