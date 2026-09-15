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
  // A grey, not a near-white: through the tone mapping and a bright studio
  // #d8dade landed as white paint. Metal reads as silver when it is darker
  // than white and reflective enough to carry the highlights.
  { id: "silver", label: "Silver", color: "#b4b8be", metalness: 0.86, roughness: 0.18 },
  /*
   * Burgundy and Sky Blue, CHOSEN rather than measured.
   *
   * Every other entry in this file is read out of a model file or sampled from
   * Apple's own swatch strip, and the comments say which. These two have
   * neither to read, so they were picked by eye — said plainly here, because a
   * reader of a file this careful about provenance is entitled to know which
   * numbers are evidence and which are taste.
   *
   * They appear twice, once per lineup, for the same reason `iphone17-white`
   * exists beside `cloud-white`: the Pro is anodised aluminium and the 17 is
   * glass, so one shared entry would put one body's surface on the other's.
   * The colour is a little deeper here and the surface a good deal tighter —
   * metal holds a dark red where glass lifts it.
   */
  { id: "pro-burgundy", label: "Burgundy", color: "#6b2a3a", metalness: 0.63, roughness: 0.26 },
  { id: "pro-sky-blue", label: "Sky Blue", color: "#8fb6d6", metalness: 0.63, roughness: 0.26 },
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
  /*
   * The Duo's dark colourway. #394452 is Apple's own value for it.
   *
   * Corroborated rather than guessed: forty thousand pixels of the back panel
   * in Apple's render -- logo cut-out and edge highlights dropped -- run from
   * #2a3543 to #3c4552, median #333c49. That is this colour under a curved
   * body's lighting, which is why the published swatch is the one stated here
   * and the measured range is what the studio's lights should reproduce.
   *
   * Blue-grey, not black: it reads as navy against the frame and as near
   * black in shadow, which is the character of the finish.
   */
  { id: "duo-night-sky", label: "Night Sky", color: "#394452", metalness: 0.55, roughness: 0.38 },
  { id: "space-black", label: "Space Black", color: "#1e1e21", metalness: 0.6, roughness: 0.34 },
  /*
   * The iPhone 17's five, sampled from Apple's own swatch strip.
   *
   * apple.com/iphone-17 carries no hex anywhere in its markup, but the buy
   * page loads one 170 x 26 PNG holding all five circles. Reading the opaque
   * column runs out of it finds the swatches at x 3-22, 39-58, 75-94, 111-130
   * and 147-166, and the centre of each is the colour Apple publishes.
   *
   * That beats the model, which is the usual source here: the file states
   * #d0c1e1 for its shell, and Apple's Lavender swatch is #e6d5f1 -- the
   * model's is the glass under studio light, the swatch is the colour named on
   * the box. Sage and Mist Blue had been matched by eye and were both a long
   * way out.
   *
   * White and Black are the phone's own, not the shared Cloud White and Space
   * Black: Apple's Black here is #353839, a good deal lighter than the Air's
   * #1e1e21.
   */
  { id: "lavender", label: "Lavender", color: "#e6d5f1", metalness: 0.5, roughness: 0.4 },
  { id: "sage", label: "Sage", color: "#b4c294", metalness: 0.5, roughness: 0.4 },
  { id: "mist-blue", label: "Mist Blue", color: "#a2b9dc", metalness: 0.5, roughness: 0.4 },
  { id: "iphone17-white", label: "White", color: "#fcfcfc", metalness: 0.5, roughness: 0.4 },
  { id: "iphone17-black", label: "Black", color: "#353839", metalness: 0.5, roughness: 0.4 },
  // The 17's pair of the two chosen colours — see the note on `pro-burgundy`.
  // Lighter than the Pro's, and on the 17's glass surface rather than metal.
  { id: "iphone17-burgundy", label: "Burgundy", color: "#7d3346", metalness: 0.5, roughness: 0.4 },
  { id: "iphone17-sky-blue", label: "Sky Blue", color: "#a8cbe8", metalness: 0.5, roughness: 0.4 },
  /*
   * The iPhone 18 Pro's three, named by the model itself.
   *
   * The variant NAMES came out of the archive; the hexes were read off Apple's
   * own product renders, which is a step better than the guess they replace
   * but still not a measurement.
   *
   * Three things those renders settle. Black is much darker than a first pass
   * assumes -- near #1c1c1e, not a soft charcoal -- because the anodising is
   * nearly matte and the only light on it is the rim. Burgundy is browner and
   * less saturated than a wine red: in the lit third it reads #6d3341 and in
   * the turn it is closer to #4e2530, so the swatch sits between them. And Sky
   * Blue is a GREY that leans blue rather than a blue, which is what keeps it
   * reading as anodised metal.
   *
   * Surface numbers were read the same way, from a side-by-side against
   * Apple's render, and they are far matter than a first guess: 0.5 / 0.75.
   * Anodising is sandblasted before it is dyed, and at anything under about
   * 0.6 roughness the chamfers throw hard white streaks that the real phone
   * does not have anywhere on it. The lens rings and the flash are the only
   * things in Apple's frame allowed to be bright.
   *
   * All four are Apple's published values, replacing the ones read off
   * renders here: black #242424, sky blue #a3b1c4, silver #c4c4c4, and the
   * burgundy noted below. Silver was the same #d8dade as the 17 Pro's when
   * both were guessed from images; published, they differ, which settles the
   * question of whether these four ever wanted to be one shared entry --
   * they are a different phone's swatches and always were.
   */
  { id: "iphone18-black", label: "Black", color: "#242424", metalness: 0.48, roughness: 0.22 },
  /*
   * Apple's own value for the 18's Burgundy, #2e0f14 -- and far darker than
   * the #5e2b38 that stood here, which was read off a render rather than
   * published. Near black until the light catches it, which is what the
   * anodising actually does.
   *
   * The surface below is unchanged, and is the thing to reach for if this
   * reads as black rather than as a deep red: 0.48 / 0.22 was tuned against
   * the lighter tone, and a body a third as light returns a third as much of
   * whatever the rig gives it.
   */
  {
    id: "iphone18-burgundy",
    label: "Burgundy",
    color: "#2e0f14",
    metalness: 0.48,
    roughness: 0.22,
  },
  {
    id: "iphone18-silver",
    label: "Silver",
    color: "#c4c4c4",
    metalness: 0.48,
    roughness: 0.22,
  },
  {
    id: "iphone18-sky-blue",
    label: "Sky Blue",
    color: "#a3b1c4",
    metalness: 0.48,
    roughness: 0.22,
  },
  /*
   * The 24-inch iMac's seven, in the order apple.com/imac lists them.
   *
   * Read out of Apple's own USDZ for each colourway rather than eyedropped off
   * the site: every one is the `diffuseColor` that file states for the REAR
   * SHELL, converted linear to sRGB. Identified by area -- the shell is the
   * one 548 x 373mm panel in the file, and nothing else is close.
   *
   * The first attempt took the chromatic material bound to the most prims
   * instead, which is not the shell but the twelve Thunderbolt connectors, and
   * produced a set of port-coloured swatches. Biggest surface, not most
   * numerous.
   *
   * Matte, not glossy: an iMac back is bead-blasted anodised aluminium, so
   * metalness stays low and roughness high. The stand is the polished part and
   * says so itself, in the device entry.
   */
  { id: "imac-blue", label: "Blue", color: "#73b0ff", metalness: 0.22, roughness: 0.58 },
  { id: "imac-purple", label: "Purple", color: "#938fcb", metalness: 0.22, roughness: 0.58 },
  { id: "imac-pink", label: "Pink", color: "#ff617e", metalness: 0.22, roughness: 0.58 },
  { id: "imac-orange", label: "Orange", color: "#ff6d45", metalness: 0.22, roughness: 0.58 },
  { id: "imac-yellow", label: "Yellow", color: "#ffcf26", metalness: 0.22, roughness: 0.58 },
  { id: "imac-green", label: "Green", color: "#58d38c", metalness: 0.22, roughness: 0.58 },
  { id: "imac-silver", label: "Silver", color: "#e5e6e7", metalness: 0.35, roughness: 0.42 },
  /*
   * The MacBook's four.
   *
   * Citrus is measured -- it is what the file states for its lid shell
   * (`KHHvFZfpkvtZonL`), and the only one of the four with a model to read.
   * The other three are the published names matched by eye, so they are the
   * weakest colours in this file and worth checking against a real one.
   */
  { id: "macbook-blush", label: "Blush", color: "#f0c6c1", metalness: 0.5, roughness: 0.45 },
  { id: "macbook-citrus", label: "Citrus", color: "#f5f381", metalness: 0.5, roughness: 0.45 },
  { id: "macbook-indigo", label: "Indigo", color: "#5b6aa8", metalness: 0.5, roughness: 0.45 },
  { id: "macbook-silver", label: "Silver", color: "#e4e5e7", metalness: 0.5, roughness: 0.42 },
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
/**
 * The finish a device actually renders in.
 *
 * `getFinish` answers "is this id a finish", which is the wrong question once
 * devices have lineups: Lavender is a real finish and not one a MacBook comes
 * in. Switching device clamps the id in `EditorShell`, but only on the switch
 * -- so a session restored from storage, or one open while a device gains a
 * lineup it did not have, keeps rendering a colour whose swatch is not even in
 * the row. That is what put a lavender lid on the yellow MacBook.
 *
 * Resolving at the point of use closes it for good: there is no path to a
 * colour the device does not offer, however the id got there.
 */
export function finishForDevice(
  ids: readonly string[] | undefined,
  id: string | undefined,
): Finish {
  const offered = finishesFor(ids);
  return offered.find((f) => f.id === id) ?? offered[0] ?? getFinish(id);
}

export function finishesFor(ids: readonly string[] | undefined): Finish[] {
  if (!ids?.length) return FINISHES;
  return ids
    .map((id) => FINISHES.find((f) => f.id === id))
    .filter((f): f is Finish => Boolean(f));
}
