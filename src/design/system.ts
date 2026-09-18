/**
 * The Mocraft design system — one source of truth for the look.
 *
 * ---------------------------------------------------------------------------
 * Why this is TypeScript and not a stylesheet
 * ---------------------------------------------------------------------------
 *
 * The drift this file exists to end is between CSS and TS. Before it there were
 * two token sets and neither was authoritative: a marketing `@theme` block in
 * `globals.css` inherited from a site that no longer exists, and the live
 * `--ks-*` set, which is a template string injected at runtime and therefore
 * unreadable to any module. So components hardcoded values that were already
 * declared as custom properties a file away.
 *
 * Declaring them here, once, in a form both sides can read fixes that: the
 * stylesheet is GENERATED from these objects by `SYSTEM_CSS`, and a component
 * that needs a number in JavaScript imports the same constant the CSS was built
 * from. There is no second place to update.
 *
 * ---------------------------------------------------------------------------
 * Where the values come from
 * ---------------------------------------------------------------------------
 *
 * Read out of the Mocraft UI Figma file, not chosen here. The file publishes
 * only a handful of variables -- three accents, `space/0|8|12`, a grabber
 * height and one label tone -- so nearly everything below was taken from the
 * design context of the components themselves and given a name at this end.
 *
 * That is worth knowing when a value looks oddly precise. `41.217px`,
 * `68.696px`, `80.8px` and `137.391px` are not judgement calls; they are what
 * the file says. They are kept exactly rather than rounded, because rounding
 * them would be a silent redesign and there is no way to tell later which
 * numbers were measured and which were tidied.
 */

/* ===========================================================================
   Space
   =========================================================================== */

/**
 * The spacing scale.
 *
 * `0`, `8` and `12` are published Figma variables; `4`, `6`, `10` and `16`
 * appear as raw gaps in the components and are named here to keep one scale
 * rather than two.
 */
export const space = {
  0: 0,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
} as const;

/* ===========================================================================
   Radius
   =========================================================================== */

/**
 * Corner radii, named by what they are on rather than by size.
 *
 * `selected` is the odd one: a row at rest is `row` (24px) and the same row
 * selected is 41.217px. The design does not round a selected row more by
 * accident -- the pill is what marks it -- so the two are separate names, not
 * one name with a modifier.
 */
export const radius = {
  /** The numeric readout beside a slider. */
  field: 4,
  /** A colour swatch. */
  swatch: 4.8,
  /** A row inside a panel, at rest. */
  row: 24,
  /**
   * A media well — the screen preview, and anything else that holds content
   * rather than controls. Tighter than a row on purpose: a well is a hole in
   * the panel, and at the row's corner it reads as another panel inside it.
   */
  well: 16,
  /** A floating panel or popup. */
  panel: 20,
  /**
   * A row while selected — a capsule, not a large corner.
   *
   * The file says 1000, which is the usual way of asking for "fully round
   * whatever this turns out to be". At the 40px row it resolves to the same
   * shape the old 41.217 did; it stays correct if the row ever changes height.
   */
  selected: 920,
  /** The vertical icon rail, which is a capsule at its own width. */
  rail: 88,
  /** Slider knobs and anything else fully round-ended. */
  pill: 999,
  /**
   * The segmented switch's track. Its own value rather than `pill`, because a
   * slider track is a capsule for a different reason and should not move when
   * the switch does — `Glass` reads it as `--mo-r-switch` with `pill` behind.
   */
  switch: 889,
} as const;

/* ===========================================================================
   Type
   =========================================================================== */

/**
 * Four styles, and that is the whole ramp.
 *
 * Saans is already loaded by the app as a local variable font exposed at
 * `--font-saans`, so the family here points at that rather than naming the
 * `Saans-TRIAL` face the Figma file references.
 *
 * Every size shares a 20px line box. That is not a simplification -- the file
 * sets 20px leading on 14, 12 and 10px text alike, which is what lets a row of
 * mixed sizes align on one baseline grid without per-row nudging.
 */
export const font = {
  family: "var(--font-saans, var(--font-sans, system-ui, sans-serif))",
  /** Panel and row titles. */
  title: { size: 14, leading: 20, weight: 510 },
  /** Control labels beside a slider. */
  label: { size: 12, leading: 20, weight: 510 },
  /** A hex code, or any value the eye reads rather than scans. */
  code: { size: 12, leading: 20, weight: 400 },
  /** The numeric readout in a field. */
  value: { size: 10, leading: 20, weight: 510 },
} as const;

/* ===========================================================================
   Colour
   =========================================================================== */

/**
 * Ink is one hue at three strengths.
 *
 * LIGHT ONLY, by decision rather than by omission. There is no dark palette
 * here and no light/dark split in the shape of these objects, because the
 * product has one appearance. Anyone adding a second later is making a product
 * decision, not filling in a gap someone forgot.
 *
 * This is also why the material below can state a plain white hairline and a
 * grey shadow outright. On a two-theme system both would have to be tokens
 * that flip, and the glass would be harder to reason about for no benefit.
 *
 * `#595959` is the only text colour in the design; secondary text and the field
 * background are the same grey at 50% and 10%. Written as `rgb(… / a)` off a
 * single channel triple so the relationship survives a change of hue -- pick a
 * new ink and the whole ramp follows.
 */
const INK_RGB = "89 89 89";

export const color = {
  ink: `rgb(${INK_RGB})`,
  inkMuted: `rgb(${INK_RGB} / 0.5)`,
  /** The tinted plate behind a numeric readout. */
  field: `rgb(${INK_RGB} / 0.1)`,

  /**
   * A selected row.
   *
   * The file paints this at `mix-blend-mode: luminosity`, which is dropped
   * here on purpose rather than by omission. Luminosity keeps the backdrop's
   * hue and saturation and takes only the source's lightness — and over an
   * achromatic backdrop, which every surface in this system is, that is
   * arithmetically identical to painting the colour normally. The pill also
   * rides inside a transformed lens, and a transform opens a stacking context
   * that would isolate the blend from the panel it is supposed to read
   * against, so the faithful-looking version would in fact be the wrong one.
   */
  selected: "rgb(255 255 255 / 0.14)",
  /**
   * A slider knob at rest: solid, full stop.
   *
   * It was 0.9, which let a tenth of the track show through and left the knob
   * looking faintly unresolved against its own fill. The knob only becomes
   * translucent under a press — see `material.knob.film` — and that transition
   * only reads if there is something opaque for it to start from.
   */
  knob: "rgb(255 255 255)",
  /** Published Figma variables. */
  accent: {
    red: "#ff383c",
    green: "#34c759",
    blue: "#0088ff",
    /** `accents/yellow` in the file — the pairing light while it waits. */
    yellow: "#ffcc00",
  },
} as const;

/* ===========================================================================
   Material
   =========================================================================== */

/**
 * The glass every floating surface is made of.
 *
 * Four layers, and all four are load-bearing: a heavy backdrop blur, a dark
 * diagonal wash, a gradient rim, and a very large soft shadow. Drop any one and
 * it stops reading as glass -- without the rim it is fog, without the shadow it
 * is painted on, and without the wash the blur alone leaves it looking like a
 * smear.
 *
 * The gradient ANGLE is one value, not three. Figma bakes a gradient transform
 * per node, so the same fill exports as -51.87deg on the icon rail, -26.42deg
 * on the device list and -19.10deg on the popup, varying only with aspect
 * ratio. A consistent light direction is the point of having a material.
 *
 * ---------------------------------------------------------------------------
 * These numbers are TUNED, and the rest of this file is measured
 * ---------------------------------------------------------------------------
 *
 * Everywhere else, an odd-looking value is what the Figma file says. Here it is
 * not: the four layers were set on sliders against real content and read off
 * when they looked right. The exported values were the starting point and every
 * one of them moved.
 *
 * The distinction matters when something looks wrong later. A measured value is
 * wrong only if it was mis-read; these are judgement, and re-judging them is
 * allowed. The panel that produced them is in the git history of
 * `src/app/website-system/page.tsx` if they need revisiting.
 */
/**
 * The selected pill's rim and drop, as PARTS.
 *
 * `material.selected.shadow` is one string by the time CSS sees it, but four
 * separate decisions when anyone is judging it: the hairline colour, how far
 * the two side lines sit out, how much they are pulled back, and the ring
 * under both. Authored only as a string, the system page had to keep its own
 * copy of those numbers to put on sliders — and two copies of a value drift.
 */
const PILL_RIM = {
  color: "#939393",
  offset: 1.73,
  spread: -0.8,
  ring: 0.35,
} as const;
const PILL_DROP = { y: 13.4, blur: 18.5, alpha: 0.06 } as const;

/**
 * Koshmoney's button material, as the site actually built it.
 *
 * Recovered from `src/components/ui/Button.tsx` at 2e10646^, before the
 * marketing site this repo was copied from was stripped out. Worth having on
 * the system page for one reason above all: it is a glass that stays legible
 * over anything, and reading it says why.
 *
 * ITS BODY IS PAINT, NOT BLUR. `surface` is an ordinary translucent fill on
 * normal blend at 75% — three quarters of what you see is the button — and
 * the blur behind it is 7.5px, less than half of `glass.blur`. The panel
 * material next door has no equivalent layer: its only near-white fill is on
 * `multiply`, which for white is the identity, so its body is whatever happens
 * to be behind it. That is the whole difference between a glass that holds up
 * over a dark composition and one that disappears into it.
 *
 * Two tones for two grounds, and that is the other lesson: a single surface
 * cannot serve both. Light content gets the dark fill, dark content the white
 * one, and the ink flips with it.
 */
const BUTTON_TONES = {
  primary: { surface: "rgb(255 255 255 / 0.75)", ink: "#000", glow: 1, rim: 1 },
  secondary: {
    surface: "rgb(39 39 39 / 0.52)",
    ink: "#fff",
    glow: 0.35,
    rim: 0.3,
  },
  prominent: {
    // `color-mix` against the site's accent in the original; the studio has no
    // accent token, so the same 75% is written out against ours.
    surface: "rgb(0 136 255 / 0.75)",
    ink: "#fff",
    glow: 0.5,
    rim: 0.8,
  },
  highlighted: {
    surface: "rgb(39 39 39 / 0.52)",
    ink: "#fff",
    glow: 0.35,
    rim: 1,
  },
} as const;

export type ButtonTone = keyof typeof BUTTON_TONES;

export const material = {
  /**
   * The button, as above. Kept beside `glass` rather than inside it because
   * the two are different materials that happen to share a vocabulary — and
   * the point of having both on one page is the comparison.
   */
  button: {
    blur: 7,
    tones: BUTTON_TONES,
    /** A 1px gradient edge, drawn as a padded background through a mask —
        light at both ends and dark through the middle, so the rim reads as a
        bevel catching light rather than as a border. */
    rim: "linear-gradient(170deg, #fff 10%, rgb(0 0 0 / 0.11) 50%, #fff 90%)",
    /** The same rim at the icon size, where 170deg across a square reads as
        almost vertical. */
    rimIcon:
      "linear-gradient(150deg, #fff 10%, rgb(0 0 0 / 0.11) 50%, #fff 90%)",
    /** The cursor-tracking glow: core, edge, and where it fades out. */
    glow: {
      core: "rgb(255 255 255 / 0.88)",
      edge: "rgb(255 255 255 / 0.52)",
      /** Of the button's longest side. Touch spreads wider than a cursor. */
      sizeMouse: 0.92,
      sizeTouch: 1.18,
    },
  },

  /**
   * The panel, named and ordered as the file's anatomy does: two layers,
   * `Main base bottom` under `Main base top (glass)`.
   *
   * Blend modes sit on the PARTS, not on the layers.
   *
   * On the top layer the white fill is MULTIPLY — and multiply by white is the
   * identity, so the pane is invisible on purpose: its job is to carry the
   * frost. Each of its three inner shadows is PLUS LIGHTER on its own.
   *
   * PLUS DARKER, not plus lighter. Plus-lighter adds toward white, and these
   * bands are #282828 on a near-white panel — addition moved them almost
   * nowhere and clamped to nothing at the light end, which is why they never
   * read. Plus-darker subtracts, so the same value darkens the edge.
   *
   * Browser support is the catch, and it is worth knowing before this gets
   * judged: `plus-darker` ships in Safari and NOT in Chrome. An unsupported
   * blend mode is an invalid value, so Chrome computes it to `normal` — which
   * still darkens here, just without the linear-burn falloff. `darken` or
   * `multiply` are the closest things that behave the same in both.
   *
   * Either way each effect needs an element of its own: a `box-shadow` list
   * cannot carry a blend mode — shadows in one list composite against each
   * other and only the result would blend. Bands one and three both run
   * downward from the top edge and overlap across most of the panel, which is
   * exactly where "composite then blend" and "blend each" diverge.
   *
   * The cast shadow stays out of it — black at 15%, and it composites normally.
   */
  glass: {
    /**
     * 7.5, taken from `material.button` rather than from the file.
     *
     * The file says 16, which converts to 8 by Figma's double-radius rule, and
     * that was this value for a long time. Then the panel looked unfrosted
     * over a composition and the radius was the obvious thing to blame, so it
     * went to 16 — which changed nothing, because the radius was never the
     * problem.
     *
     * The button material settles it: Koshmoney's glass ran at 7.5 and held
     * up over anything, on a quarter of the blur this was reaching for. What
     * carried it was `surface`, a real fill. So the blur comes back down to
     * theirs and `veil` does the work it was always doing on their side.
     */
    /* Locked 2026-09-18 from the Glass tuner, on the real interface: a much
       deeper frost, with the veil, base and top eased back so the panels
       read as glass over the shot rather than white plates. */
    blur: 34,
    /**
     * How much of the panel is panel, rather than what is behind it.
     *
     * A backdrop blur does not make a surface less see-through — it moves
     * detail around and leaves every bit of the backdrop's light exactly where
     * it was. Obscuration comes from a FILL, and read down this material there
     * is none: both base fills are 13% and 10% at `plus-darker`, the rim and
     * the three bands are `plus-darker`, and the only near-white layer is the
     * pane, which is white on `multiply` and therefore the identity. Blur at
     * any radius over that stack is a clear pane with the view slightly
     * softened and slightly darkened — which is what "I can still see the
     * background" is.
     *
     * So this is the body the glass never had: a plain white layer on NORMAL
     * blend over the frost, under the pane and the bands, so the ink and the
     * lighting still sit on top of it. It is the same thing every real frosted
     * material pairs its blur with.
     *
     * 0.75 is `material.button`'s `primary` surface exactly — the number the
     * site shipped, now that the bench has both materials on one ground and
     * the button is the one that reads. Not a coincidence to be re-derived:
     * the same fill at the same strength, so the two glasses in this system
     * are the same glass.
     *
     * It is deliberately NOT mapped into `.mo-mat-selection`: the travelling
     * pill is tuned, sits ON a panel rather than on the composition, and its
     * complaint was never this one.
     */
    veil: 0.67,
    /** `Main base bottom` — two fills, the rim, and the cast. */
    base: {
      /** The layer's own opacity, above whatever its fills carry. */
      opacity: 0.48,
      /**
       * Both fills went grey and subtractive. They were white-lighten and
       * grey-darken, which is the file's own pair — but once the whole
       * material moved to plus-darker, a lightening fill was working against
       * every other layer on the panel.
       */
      lighten: "rgb(232 232 232 / 0.13)",
      lightenBlend: "plus-darker",
      darken: "rgb(219 219 219 / 0.1)",
      darkenBlend: "plus-darker",
      /** Three hairlines: right, left, and a 0.4px ring under both. */
      rim: "3.75px 0 0 -3px #a8a8a8, -3.75px 0 0 -3px #a8a8a8, 0 0 0 0.4px #a8a8a8",
      rimBlend: "plus-darker",
      cast: "0 18px 50px 0 rgb(0 0 0 / 0.15)",
    },
    /** `Main base top (glass)` — the frost, a multiplied pane, three bands. */
    top: {
      /**
       * The layer's own opacity. Below 1 it becomes an isolated group, so its
       * pane and bands blend against each other rather than against the base
       * layer underneath — which is the reason the frost reads softer here
       * than the blur alone would give.
       */
      opacity: 0.2,
      fill: "rgb(255 255 255)",
      fillBlend: "multiply",
      depthBlend: "plus-darker",
      /** One entry per effect: each is additive on its own. See above. */
      /**
       * White, not #282828 — the bands inverted along with the blend mode.
       * Subtracting white is what darkens under plus-darker, where adding it
       * was what did nothing under plus-lighter. The third band stayed a grey
       * so it lands heavier than the two edges it sits between.
       */
      depth: [
        "inset 0 45px 13px -38px #ffffff",
        "inset 0 -43px 10px -33px #ffffff",
        "inset 0 -25px 24px -40px #8a8a8a",
      ],
    },
  },
  /**
   * The light the surface catches under the cursor.
   *
   * Glass is only glass because it responds to a light source. The rim says
   * where the light is coming from and never moves; this is the part that does
   * -- a soft specular bloom that tracks the pointer, so the material reads as
   * something being lit rather than something painted to look lit.
   *
   * Kept well under half strength on purpose. At full it stops being a
   * reflection and becomes a torch, and it has to pass under body text without
   * washing it.
   */
  glow: {
    size: 180,
    /**
     * Two stops, not one: a hot core falling into a wider soft edge. A single
     * stop gives a flat disc that slides around behind the content and reads
     * as a bug; the falloff is what makes it a reflection.
     *
     * The shape is the one the marketing site used
     * (--material-interactive-glow-core / -edge, still in globals.css), and
     * the fade duration is its 240ms unchanged. The intensities are lower
     * because the ground is different -- those were tuned for white light on
     * pure black, and carried over unchanged onto light grey glass they blow
     * out to a white blob.
     */
    core: "rgb(255 255 255 / 0.38)",
    edge: "rgb(255 255 255 / 0.14)",
    fade: 240,
  },
  /**
   * The selected pill, as `Liquid Glass - Small` stacks it. Same two plates as
   * the panel at a smaller scale — rim hairlines and a short drop below, depth
   * bands above — and no frost of its own: it sits on the panel's blur rather
   * than adding a second one.
   *
   * `shadow` goes on the travelling lens and `inset` on its specular layer, so
   * the depth bands stay above the refraction instead of being bent by it.
   */
  selected: {
    rim: PILL_RIM,
    drop: PILL_DROP,
    /**
     * The rim composites normally while the bands blend.
     *
     * Both live inside the lens, which is transformed and therefore an
     * isolated group — a blend here resolves against the lens rather than the
     * panel underneath it. The bands are inset and read fine that way; the rim
     * is the pill's outline against the panel, and is the one place where a
     * blend doing something other than it appears to would show.
     */
    rimBlend: "normal",
    depthBlend: "plus-darker",
    shadow: [
      `${PILL_RIM.offset}px 0 0 ${PILL_RIM.spread}px ${PILL_RIM.color}`,
      `${-PILL_RIM.offset}px 0 0 ${PILL_RIM.spread}px ${PILL_RIM.color}`,
      `0 0 0 ${PILL_RIM.ring}px ${PILL_RIM.color}`,
      `0 ${PILL_DROP.y}px ${PILL_DROP.blur}px 0 rgb(0 0 0 / ${PILL_DROP.alpha})`,
    ].join(", "),
    /**
     * Two tight white edges and a wide grey sheen behind them, all blended
     * subtractively — the pill's own version of the panel's three bands.
     */
    depth: [
      "inset 0 49.5px 14.2px -40px #ffffff",
      "inset 0 -49.5px 14.2px -40px #ffffff",
      "inset 0 49.5px 60px -40px #a6a6a6",
    ],
  },
  /**
   * Three stacked shadows: a contact hairline, a tight core, a soft cast.
   *
   * `blur` frosts the copy of the track drawn inside the lens; `film` is how
   * much of the knob's white survives a press.
   *
   * The pressed knob went to a clear window over a heavily smeared track
   * rather than to a tinted film: `film` at zero, `blur` at 20. Two pixels of
   * blur did nothing here — the track is two flat colours and the panel behind
   * it is already backdrop-blurred to 98px, so there was no detail left to
   * remove and the earlier 1.9 was indistinguishable from zero. At 20 the 6px
   * track smears into a soft wash across the whole knob, and THAT is what
   * reads as glass, which is what makes the film unnecessary rather than
   * merely optional.
   */
  knob: {
    blur: 20,
    film: 0,
    shadow:
      "0 0 0 1px rgb(0 0 0 / 0.1), 0 0.5px 4px 0 rgb(0 0 0 / 0.12), 0 6px 13px 0 rgb(0 0 0 / 0.12)",
  },
  /**
   * The travelling lens, per control.
   *
   * `bend` multiplies the displacement map's own scale and `bevel` is how far
   * in from the rim the glass curves. They are per-control rather than one
   * pair because the lens is a different size in each: the same bend over a
   * 16px knob and over a 40px row reads as two different materials, not as one
   * material at two sizes.
   */
  lens: {
    row: { bend: 0.45, bevel: 8 },
    segmented: { bend: 0.8, bevel: 8 },
    /**
     * The knob does not refract at all — `bend` is zero, which `AaveGlass`
     * treats as an off switch rather than a weak bend, so no displacement
     * filter is ever attached to a slider.
     *
     * It lost the argument to the blur. Displacement bends what is behind the
     * lens, and behind this one is a 6px bar; the bend either did nothing or,
     * pushed hard enough to see, dragged that bar's edge into the corners and
     * squared the pill off. Smearing the bar instead says the same thing about
     * thickness without deforming the knob. `bevel` is kept meaningful for the
     * moment the bend is turned back up.
     */
    knob: { bend: 0, bevel: 1 },
  },
  swatch: {
    edge: "0.8px solid rgb(0 0 0 / 0.1)",
    shadow: "0 3.2px 21.6px 0 rgb(0 0 0 / 0.25)",
  },
  /**
   * Titles and labels sit ON the glass, so they carry their own shadow to stay
   * legible over whatever the blur happens to pick up behind them.
   */
  text: {
    shadow: "drop-shadow(0 0 40px rgb(0 0 0 / 0.3))",
  },
} as const;

/* ===========================================================================
   Controls
   =========================================================================== */

/** Geometry shared by every control, so a row built anywhere lines up. */
export const control = {
  /** Panels and popups are one width. */
  panelW: 250,
  /** The vertical icon rail. */
  railW: 56,
  /** A title or list row. */
  rowH: 40,
  /** A slider row. */
  paramH: 24,
  /** Every icon in the interface. */
  icon: 20,
  /** The label column in a slider row — fixed, so sliders align down a panel. */
  labelW: 48,
  slider: {
    trackH: 6,
    knobW: 24,
    knobH: 16,
  },
  /** The numeric readout. */
  fieldW: 40,
} as const;

/**
 * The corner SHAPE, as distinct from its size.
 *
 * `border-radius` alone draws a circular quarter-arc, which meets the straight
 * edge at a visible break in curvature — the thing that makes a rounded
 * rectangle read as a rectangle with its corners cut off. A squircle is a
 * superellipse: curvature ramps in from the edge and the join disappears. It
 * is what Apple's hardware and interfaces use, and at the radii in this file —
 * 18px panels, 1000px capsules — the difference is plain.
 *
 * `corner-shape` reshapes whatever `border-radius` already says, so this can
 * be applied across the system without touching a single radius value, and
 * browsers that do not know the property ignore it and draw the arcs they
 * would have drawn anyway.
 */
export const corner = {
  /**
   * Panels, popups and the rail — back to the circular arc.
   *
   * At a 20px corner the superellipse read as a corner trying to be noticed;
   * the shape earns its keep on the selection, where the radius is large
   * enough for the curvature ramp to have somewhere to happen.
   */
  base: 1,
  /**
   * The travelling selection pill, and the one place this is turned up hard.
   * A high exponent pushes the outline out to the bounding box, so at the
   * pill's near-capsule radius the sides run straight and turn late.
   */
  selection: 172,
  /** The switch, matching the panels rather than the pill it contains. */
  switch: 1,
} as const;

/**
 * What the exponent means, since the named keywords are only points on it:
 *
 *   0    bevel      — a straight diagonal across the corner
 *   1    round      — the circular arc `border-radius` draws on its own
 *   2    squircle   — Apple's shape, and the default here
 *   4+              — corner tightens, sides flatten, toward a square
 *
 * Below zero it scoops inward instead. Higher is not "more rounded" in the
 * everyday sense — it pushes the outline OUT toward the bounding box, so the
 * corner reads tighter and the sides straighter. To make a corner softer,
 * raise `radius`; to change how it gets there, change this.
 */

/**
 * The ground the panels sit on.
 *
 * Glass over flat colour looks like a grey rectangle — the blur has nothing to
 * work on and the material reads as broken when it is fine. The dot grid is
 * not decoration; it is what gives the frost something to pick up, and it is
 * why the system page has carried one from the start. A token rather than two
 * copies of the same gradient, because the studio needs the same surface for
 * the same reason.
 */
export const surface = {
  /**
   * 0.12, where it was 0.07.
   *
   * The grid has two jobs and was doing neither well at 7%: it says the
   * workspace is a surface rather than an empty page, and it is the only fine
   * detail on that surface — so it is what the panels' frost has to pick up.
   * Blur a wash with nothing in it and the glass reads as a grey rectangle,
   * which is the note at the top of this file's material section.
   *
   * Still ink at low alpha rather than a grey of its own, so it tracks the
   * palette instead of drifting from it.
   */
  // 0.12 read as barely there on a large screen; 0.2 keeps it a texture
  // rather than a pattern while the grid is plainly visible.
  dot: `rgb(${INK_RGB} / 0.2)`,
  /** Spacing of the grid, both axes. */
  pitch: 22,
} as const;

/* ===========================================================================
   Motion
   =========================================================================== */

/**
 * How a selection travels.
 *
 * One spring for every control that moves a lens — the segmented indicator, a
 * row list, the icon rail — so the whole interface settles at one rate. A
 * control that eased differently would read as a different control, and the
 * point of hoisting the lens out of the row was to make them one behaviour.
 *
 * Tuned on the system page to land in about 240ms, at a damping ratio of 0.89
 * — quick, and settling essentially without overshoot. The first pass was
 * slower and nearly critically damped, so the last tenth of every travel
 * crawled and the whole control felt sluggish even though it covered most of
 * the distance immediately; the fix was the arrival, not the top speed.
 *
 * The mass above 1 is doing real work rather than being a spare knob: it is
 * what keeps a lens this quick from reading as weightless, and it is why the
 * stiffness is high without the motion feeling brittle.
 *
 * `boost` briefly deepens the bend while the lens is moving and releases it
 * once the spring settles. That is what makes the travel read as glass forming
 * around what it slides over rather than a shape being teleported.
 *
 * `perUnit` is deliberately not independent of the spring: peak velocity rises
 * with the stiffness, so leaving it where it was would have pinned the boost
 * at `max` for the whole travel and flattened the ramp into a step. It is
 * scaled down by the same factor the spring sped up by.
 */
/**
 * How long text takes to become different text, and content to arrive.
 *
 * Matched to what `motion.selection` settles in, so a title resolving, a panel
 * resizing and its body appearing all finish together.
 */
export const morph = 240;

export const motion = {
  selection: { stiffness: 450, damping: 43, mass: 1.3 },
  /**
   * How far a knob swells while it is held.
   *
   * Small on purpose. The press already changes the knob's material, and a
   * swell big enough to notice on its own would read as the knob having been
   * picked up off the track rather than pressed into it. This is confirmation
   * that the grab landed, nothing more — it rides `selection`, so it arrives
   * with the glass rather than on a timing of its own.
   */
  press: { scale: 1.12 },
  boost: { perUnit: 0.025, max: 0.18 },
} as const;

/* ===========================================================================
   CSS
   =========================================================================== */

const px = (n: number) => `${n}px`;

/**
 * The stylesheet, generated.
 *
 * Emitted on `:root` as `--mo-*`. A separate prefix from the editor's existing
 * `--ks-*` on purpose: the two systems have to coexist while the interface is
 * moved across, and a name collision mid-migration would be invisible until
 * something rendered wrong in one place only.
 */
export const SYSTEM_CSS = `
:root {
  --mo-font: ${font.family};

${Object.entries(space)
  // Sorted by value, not by key: JavaScript orders integer-like keys first, so
  // an unsorted emit puts 1.5 and 2.5 after 4 and the scale reads as nonsense.
  .sort((a, b) => a[1] - b[1])
  .map(([k, v]) => `  --mo-space-${String(k).replace(".", "_")}: ${px(v)};`)
  .join("\n")}

${Object.entries(radius)
  .map(([k, v]) => `  --mo-r-${k}: ${px(v)};`)
  .join("\n")}

${(
  [
    ["title", font.title],
    ["label", font.label],
    ["code", font.code],
    ["value", font.value],
  ] as const
)
  .map(
    ([k, v]) =>
      `  --mo-text-${k}: ${v.weight} ${px(v.size)}/${px(v.leading)} var(--mo-font);`,
  )
  .join("\n")}

  --mo-ink: ${color.ink};
  --mo-ink-muted: ${color.inkMuted};
  --mo-field: ${color.field};
  --mo-selected: ${color.selected};
  --mo-knob: ${color.knob};
  --mo-accent-red: ${color.accent.red};
  --mo-accent-green: ${color.accent.green};
  --mo-accent-blue: ${color.accent.blue};
  --mo-accent-yellow: ${color.accent.yellow};

  --mo-dots: radial-gradient(circle at 1px 1px, ${surface.dot} 1px, transparent 0);
  --mo-dots-pitch: ${px(surface.pitch)} ${px(surface.pitch)};

  --mo-morph: ${morph}ms;

  --mo-corner-base: ${corner.base};
  --mo-corner-selection: ${corner.selection};
  --mo-corner-switch: ${corner.switch};

  --mo-btn-blur: ${px(material.button.blur)};
  --mo-btn-rim: ${material.button.rim};
  --mo-btn-rim-icon: ${material.button.rimIcon};
  --mo-btn-glow-core: ${material.button.glow.core};
  --mo-btn-glow-edge: ${material.button.glow.edge};

  --mo-glass-blur: ${px(material.glass.blur)};
  --mo-glass-veil: ${material.glass.veil};
  --mo-glass-base-opacity: ${material.glass.base.opacity};
  --mo-glass-top-opacity: ${material.glass.top.opacity};
  --mo-glass-lighten: ${material.glass.base.lighten};
  --mo-glass-lighten-blend: ${material.glass.base.lightenBlend};
  --mo-glass-darken: ${material.glass.base.darken};
  --mo-glass-darken-blend: ${material.glass.base.darkenBlend};
  --mo-glass-rim: ${material.glass.base.rim};
  --mo-glass-rim-blend: ${material.glass.base.rimBlend};
  --mo-glass-cast: ${material.glass.base.cast};
  --mo-glass-fill: ${material.glass.top.fill};
  --mo-glass-fill-blend: ${material.glass.top.fillBlend};
  --mo-glass-depth-blend: ${material.glass.top.depthBlend};
${material.glass.top.depth
  .map((band, i) => `  --mo-glass-depth-${i + 1}: ${band};`)
  .join("\n")}
  --mo-glow-size: ${px(material.glow.size)};
  --mo-glow-core: ${material.glow.core};
  --mo-glow-edge: ${material.glow.edge};
  --mo-glow-fade: ${material.glow.fade}ms;
  --mo-selected-shadow: ${material.selected.shadow};
${material.selected.depth
  .map((band, i) => `  --mo-selected-depth-${i + 1}: ${band};`)
  .join("\n")}
  --mo-selected-depth-blend: ${material.selected.depthBlend};
  --mo-selected-rim-blend: ${material.selected.rimBlend};
  --mo-knob-shadow: ${material.knob.shadow};
  --mo-swatch-edge: ${material.swatch.edge};
  --mo-swatch-shadow: ${material.swatch.shadow};
  --mo-text-shadow: ${material.text.shadow};

  --mo-panel-w: ${px(control.panelW)};
  --mo-rail-w: ${px(control.railW)};
  --mo-row-h: ${px(control.rowH)};
  --mo-param-h: ${px(control.paramH)};
  --mo-icon: ${px(control.icon)};
  --mo-label-w: ${px(control.labelW)};
  --mo-track-h: ${px(control.slider.trackH)};
  --mo-knob-w: ${px(control.slider.knobW)};
  --mo-knob-h: ${px(control.slider.knobH)};
  --mo-field-w: ${px(control.fieldW)};
}

/*
 * The button material: a painted surface over a light blur, a masked gradient
 * rim, and a glow that follows the cursor.
 *
 * \`surface\` and the two opacities come in as inline style from the tone table
 * rather than as variables, which is how the original wrote it too — a tone is
 * four values chosen together, and splitting them across four custom
 * properties makes it possible to set three of them.
 */
.mo-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--mo-r-selected);
  backdrop-filter: blur(var(--mo-btn-blur));
  -webkit-backdrop-filter: blur(var(--mo-btn-blur));
}
.mo-btn:disabled {
  opacity: 0.45;
  pointer-events: none;
}
/*
 * Padding plus two masks is how a gradient becomes a 1px edge: the element is
 * filled with the gradient, then the mask keeps only what falls OUTSIDE the
 * content box. A border cannot take a gradient, and a pseudo-element ring
 * would need its own radius kept in step with the button's.
 */
.mo-btn-rim {
  position: absolute;
  inset: -1px;
  padding: 1px;
  border-radius: inherit;
  pointer-events: none;
  background: var(--mo-btn-rim);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
.mo-btn-icon .mo-btn-rim { background: var(--mo-btn-rim-icon); }
/*
 * \`overlay\` blend: it lightens where the surface is dark and darkens where it
 * is light, so one white glow serves both tones instead of a second asset for
 * the dark one. Opacity is the tone's, and the gradient itself is written by
 * the pointer handler.
 */
.mo-btn-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  mix-blend-mode: overlay;
  transition: opacity 200ms;
}

/*
 * ONE material, two configurations.
 *
 * The panel and the travelling selection are the same construction at two
 * scales — two blended fills, a rim, a frost, a multiplied pane, three depth
 * bands — so it is written once against \`--mo-mat-*\` and each surface maps
 * those to its own values. Duplicating it was how the pill ended up with a
 * flat plate and a shadow while the panel had a layer stack.
 *
 * The layers are SIBLINGS, all of them, and that is load-bearing. A blended
 * element blends against its backdrop only as far as the nearest isolating
 * ancestor, and \`backdrop-filter\` isolates — it groups everything inside it.
 * Nest the pane under the frost and it has nothing beneath it to multiply
 * against but transparency; blending against transparency returns the source
 * untouched, so the pane renders as a flat opaque plate and its blend mode
 * does nothing whatsoever. Flat siblings mean each layer blends against the
 * accumulated result below it, which is Figma's model.
 */
.mo-mat-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  pointer-events: none;
}

.mo-mat-base {
  box-shadow: var(--mo-mat-cast);
  opacity: var(--mo-mat-base-opacity, 1);
}
.mo-mat-base::before,
.mo-mat-base::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
.mo-mat-base::before { background: var(--mo-mat-lighten); mix-blend-mode: var(--mo-mat-lighten-blend); }
.mo-mat-base::after { background: var(--mo-mat-darken); mix-blend-mode: var(--mo-mat-darken-blend); }

/* A sibling, because a shadow list cannot carry a blend mode of its own. */
.mo-mat-rim {
  box-shadow: var(--mo-mat-rim);
  mix-blend-mode: var(--mo-mat-rim-blend);
  opacity: var(--mo-mat-base-opacity, 1);
}

/*
 * The top layer as three siblings: frost, then the pane that multiplies over
 * it, then the bands that blend over that. Layer opacity goes on each rather
 * than on a wrapper, since a wrapper below 1 would isolate exactly the
 * blending this arrangement exists to preserve.
 */
/*
 * The surface and the blur on ONE element, which is the whole of what the
 * button material does — see \`material.button\`.
 *
 * They were two layers, and the difference is not academic. A fill on its own
 * layer above the frost is composited AFTER the frost has been faded by its
 * own opacity, so the blur arrived at 62% with better than a third of the
 * backdrop still sharp underneath, and then the fill, the pane and three
 * bands each added coverage on top of that. Same 0.75 as the button, a far
 * more opaque panel, and too little backdrop left to read as a blur at all.
 *
 * Together, they behave the way the button does: blur what is behind, paint
 * three quarters of a white surface over it, let the last quarter through.
 * Full opacity here, because the softening the layer opacity used to provide
 * is now the surface's job — which is where the button always had it.
 */
.mo-mat-frost {
  backdrop-filter: blur(var(--mo-mat-blur));
  -webkit-backdrop-filter: blur(var(--mo-mat-blur));
  background: rgb(255 255 255 / var(--mo-mat-veil, 0));
  opacity: var(--mo-mat-frost-opacity, var(--mo-mat-top-opacity, 1));
}
.mo-mat-pane {
  background: var(--mo-mat-fill);
  mix-blend-mode: var(--mo-mat-fill-blend);
  opacity: var(--mo-mat-top-opacity, 1);
}
.mo-mat-depth {
  mix-blend-mode: var(--mo-mat-depth-blend);
  opacity: var(--mo-mat-top-opacity, 1);
}
.mo-mat-depth-1 { box-shadow: var(--mo-mat-depth-1); }
.mo-mat-depth-2 { box-shadow: var(--mo-mat-depth-2); }
.mo-mat-depth-3 { box-shadow: var(--mo-mat-depth-3); }

/* The panel's configuration. */
/*
 * Nothing on a surface is selectable text.
 *
 * Every control here is dragged — a slider knob, the gizmo, the phone itself —
 * and a drag that starts on a control still travels across labels on its way,
 * which is all a browser needs to begin selecting them. What you get is a
 * panel full of blue highlight for having nudged a value, and it persists
 * until you click somewhere else.
 *
 * Inputs are exempt, because the one place text is genuinely text is the hex
 * field, where selecting it is the point.
 */
.mo-glass,
.mo-glass * {
  -webkit-user-select: none;
  user-select: none;
}
.mo-glass input,
.mo-glass textarea {
  -webkit-user-select: text;
  user-select: text;
}

/*
 * Scrolls, shows nothing.
 *
 * A scrollbar inside a glass panel is the one piece of chrome the system does
 * not draw itself — it arrives with the platform's own colours and its own
 * idea of a gutter, and on a panel whose content runs edge to edge it takes a
 * bite out of the right-hand column that nothing else in the interface has.
 * Overflow still scrolls by wheel, trackpad and keyboard; it is only the bar
 * that is gone.
 */
.mo-noscroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.mo-noscroll::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.mo-glass {
  position: relative;
  --mo-mat-veil: var(--mo-glass-veil);
  --mo-mat-frost-opacity: 1;
  --mo-mat-base-opacity: var(--mo-glass-base-opacity);
  --mo-mat-top-opacity: var(--mo-glass-top-opacity);
  --mo-mat-lighten: var(--mo-glass-lighten);
  --mo-mat-lighten-blend: var(--mo-glass-lighten-blend);
  --mo-mat-darken: var(--mo-glass-darken);
  --mo-mat-darken-blend: var(--mo-glass-darken-blend);
  --mo-mat-rim: var(--mo-glass-rim);
  --mo-mat-rim-blend: var(--mo-glass-rim-blend);
  --mo-mat-cast: var(--mo-glass-cast);
  --mo-mat-blur: var(--mo-glass-blur);
  --mo-mat-fill: var(--mo-glass-fill);
  --mo-mat-fill-blend: var(--mo-glass-fill-blend);
  --mo-mat-depth-blend: var(--mo-glass-depth-blend);
  --mo-mat-depth-1: var(--mo-glass-depth-1);
  --mo-mat-depth-2: var(--mo-glass-depth-2);
  --mo-mat-depth-3: var(--mo-glass-depth-3);
}

/*
 * The travelling selection's configuration: the panel's fills, frost and pane,
 * with the rim, cast and bands measured for a 40px pill instead of a panel.
 *
 * Its blends resolve inside the lens, which is transformed and therefore an
 * isolated group. That is a real limit of putting a blended material on
 * something that moves on the compositor — the alternative is animating with
 * \`left\`/\`top\`, which relayouts every frame of every travel.
 */
.mo-mat-selection {
  --mo-mat-lighten: var(--mo-glass-lighten);
  --mo-mat-lighten-blend: var(--mo-glass-lighten-blend);
  --mo-mat-darken: var(--mo-glass-darken);
  --mo-mat-darken-blend: var(--mo-glass-darken-blend);
  /*
   * No rim or cast INSIDE the lens: the lens clips its children, and an outer
   * shadow on a clipped child is a shadow you never see. Both stay on the lens
   * chrome itself, where nothing clips them — at the cost of the rim's blend
   * mode, since a box-shadow cannot carry one and the chrome also holds the
   * refraction. Everything inset — fills, frost, pane, bands — is unaffected.
   */
  --mo-mat-rim: none;
  --mo-mat-cast: none;
  --mo-mat-blur: var(--mo-glass-blur);
  --mo-mat-fill: var(--mo-glass-fill);
  --mo-mat-fill-blend: var(--mo-glass-fill-blend);
  --mo-mat-depth-blend: var(--mo-selected-depth-blend);
  --mo-mat-depth-1: var(--mo-selected-depth-1);
  --mo-mat-depth-2: var(--mo-selected-depth-2);
  --mo-mat-depth-3: var(--mo-selected-depth-3);
}

.mo-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--mo-glow, 0);
  transition: opacity var(--mo-glow-fade) ease;
  background: radial-gradient(
    circle var(--mo-glow-size) at var(--mo-mx, 50%) var(--mo-my, 50%),
    var(--mo-glow-core),
    var(--mo-glow-edge) 45%,
    transparent 72%
  );
}

/*
 * Content sits above the plates. The exclusion is load-bearing, not tidiness:
 * the plates are direct children too, so a bare \`> *\` matches them at the same
 * specificity as their own rule and — coming later — wins, dropping them into
 * flow at z-index 1 where they cover the rows they are supposed to sit under.
 */
.mo-glass > *:not(.mo-mat-layer) { position: relative; z-index: 1; }


/*
 * Backdrop blur is the one property here with no cheap fallback: where it is
 * unavailable the wash alone renders as a dark film over live content. These
 * two queries swap it for an opaque surface instead.
 */
@media (prefers-reduced-transparency: reduce) {
  .mo-mat-frost {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  /* Tints and depth bands are lighting on glass. With no glass they are dirt. */
  .mo-glass-base::before,
  .mo-glass-base::after,
  .mo-mat-rim,
  .mo-mat-pane,
  .mo-mat-depth { display: none; }
  .mo-mat-frost { background-color: rgb(240 240 242); }
  /* And a reflection with nothing to reflect in is a white smear. */
  .mo-glass::before { display: none; }
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mo-mat-frost { background-color: rgb(240 240 242); }
  .mo-mat-pane { display: none; }
}

/*
 * Continuous corners on everything the system draws.
 *
 * A blanket rule rather than a property on each surface, because \`corner-shape\`
 * is inert wherever \`border-radius\` is zero — there is nothing to reshape — so
 * the only elements it reaches are the ones already asking for a corner. That
 * also means the material's seven plates, which take \`border-radius: inherit\`,
 * pick it up without being listed: \`corner-shape\` does not inherit, but this
 * matches them directly.
 *
 * The exponent comes from \`--mo-corner\`, and a custom property DOES inherit
 * where \`corner-shape\` itself does not — so each
 * surface sets it once and everything it contains follows, until something
 * inside sets it again. A panel hands its shape to its rows; the selection
 * pill inside overrides it with its own; and inside the switch, the indicator
 * takes the switch's rather than the selection's, which is the one case where
 * two of those rules meet and the more specific one has to win.
 *
 * \`:where()\` keeps the corner rule itself at zero specificity, so any single
 * surface can still opt out with a plain \`corner-shape: round\`.
 */
.mo-glass { --mo-corner: var(--mo-corner-base); }
.mo-switch { --mo-corner: var(--mo-corner-switch); }

/*
 * \`.mo-mat-selection\` deliberately sets NO corner.
 *
 * It used to set \`--mo-corner-selection\`, and that never worked: the corner
 * belongs to the shape with the \`border-radius\`, which for a travelling pill is
 * the lens chrome — the PARENT of the element wearing this class. A variable
 * set here cannot cascade upward to it, so the chrome drew at the base
 * exponent while its own material layers drew at 172, and the two disagreed.
 *
 * Everything else that wants this material — a button, a preset tile — is a
 * plain box that sets its own radius, and inherited 172 from here as a
 * squared-off corner it had to override inline. Taking the corner out means
 * the material is a material: it takes the shape of whatever wears it.
 */

:where(
  .mo-glass,
  .mo-glass *,
  .mo-glass *::before,
  .mo-glass *::after,
  .mo-mat-layer,
  .mo-mat-layer::before,
  .mo-mat-layer::after,
  .mo-mat-selection,
  .mo-mat-selection *
) {
  corner-shape: superellipse(var(--mo-corner));
}

/*
 * Content arriving in a panel that is already there.
 *
 * A CSS animation and not a spring, deliberately. A spring is for something
 * with a position to travel from — this has none: the old contents are gone
 * and the new ones were never anywhere. Re-triggering a spring on every swap
 * would also mean resetting it from an effect on each change, which is a
 * setState in an effect body and the thing the rest of this file avoids.
 *
 * The duration is the one \`MorphText\` uses, so a title changing and the body
 * under it arriving read as one event.
 */
@keyframes mo-appear {
  from { opacity: 0; }
  to { opacity: 1; }
}
.mo-appear { animation: mo-appear var(--mo-morph) ease-out; }

.mo-title { font: var(--mo-text-title); color: var(--mo-ink); }
.mo-label { font: var(--mo-text-label); color: var(--mo-ink); }
.mo-code  { font: var(--mo-text-code);  color: var(--mo-ink-muted); }
.mo-value { font: var(--mo-text-value); color: var(--mo-ink); }

/* Idle rows and icons are the same ink at half strength. */
.mo-muted { color: var(--mo-ink-muted); }

/*
 * No held focus ring, on anything this system draws.
 *
 * The browser outlines whatever was last focused -- the gizmo's canvas after a
 * drag, a pose in the dock after a click -- and leaves the ring there until
 * something else takes focus. In a chrome where selection is already drawn
 * by the lens and the travelling indicator, that ring is a second, louder
 * selection on top of the real one, and it outlives the gesture that made it.
 *
 * Scoped by where this stylesheet is mounted: the Mocraft chrome and the
 * system reference page, and nowhere else on the site. Anything that genuinely
 * needs to say "you are editing this" draws its own ring -- a value field
 * being typed into does, in the chrome's ink.
 */
*:focus,
*:focus-visible { outline: none; }
`;
