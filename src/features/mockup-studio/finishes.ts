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
 * Every colour any device here ships in, and no more. It carried eight
 * invented ones for a while -- graphite, black, white, desert, gold -- which
 * was a swatch row of phones Apple does not sell. A mockup tool's job is to
 * look like the real thing, and half the palette was working against that.
 *
 * The list is global but not every device offers all of it: a `Device` names
 * the ids it ships in, and the panel shows only those. An iPhone Air in Cosmic
 * Orange would be exactly the same kind of wrong the eight-swatch row was.
 *
 * `getFinish` falls back to the first entry, so a shot saved against a removed
 * id opens on Cosmic Orange rather than failing.
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
  // iPhone 17 Pro / Pro Max.
  { id: "cosmic-orange", label: "Cosmic Orange", color: "#cf5f28", metalness: 0.6, roughness: 0.27 },
  { id: "deep-blue", label: "Deep Blue", color: "#3d4c6b", metalness: 0.66, roughness: 0.24 },
  { id: "silver", label: "Silver", color: "#d8dade", metalness: 0.74, roughness: 0.16 },
  /*
   * iPhone Air. A different lineup, and a different surface: the Air is
   * titanium, so these run a little more metallic and a little smoother than
   * the Pro's anodised aluminium.
   *
   * These are the BACK, not the rail. On Apple's own renders the two differ --
   * a cream Light Gold back against an unmistakably gold rail, a near-white
   * Sky Blue back against a bluer one -- because the trim is polished metal
   * and the back is matte glass. The rail is derived from these with
   * `saturate` on the device rather than listed separately, so it stays right
   * across all four.
   *
   * Roughness runs high for a finish: these numbers describe the GLASS back,
   * which is the largest surface, and the chrome trim keeps its own authored
   * 0.01 rather than taking this.
   */
  { id: "sky-blue", label: "Sky Blue", color: "#cfe0f2", metalness: 0.55, roughness: 0.38 },
  { id: "light-gold", label: "Light Gold", color: "#f0e8d8", metalness: 0.55, roughness: 0.38 },
  { id: "cloud-white", label: "Cloud White", color: "#f4f4f5", metalness: 0.5, roughness: 0.4 },
  { id: "space-black", label: "Space Black", color: "#1e1e21", metalness: 0.6, roughness: 0.34 },
];

export const DEFAULT_FINISH_ID = FINISHES[0].id;

export function getFinish(id: string | undefined): Finish {
  return FINISHES.find((f) => f.id === id) ?? FINISHES[0];
}

/**
 * The finishes a device offers, in order.
 *
 * An unknown id in a device's list is dropped rather than rendered as a blank
 * swatch, and a device that names none gets everything -- which is right for
 * the Fold and the image card, neither of which is a specific colourway.
 */
export function finishesFor(ids: readonly string[] | undefined): Finish[] {
  if (!ids?.length) return FINISHES;
  return ids
    .map((id) => FINISHES.find((f) => f.id === id))
    .filter((f): f is Finish => Boolean(f));
}
