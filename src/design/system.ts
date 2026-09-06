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
  /** A floating panel or popup. */
  panel: 24,
  /** A row while selected. */
  selected: 41.217,
  /** The vertical icon rail, which is a capsule at its own width. */
  rail: 88,
  /** Slider knobs and anything else fully round-ended. */
  pill: 999,
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

  /** A selected row: white lifted off the glass rather than a colour. */
  selected: "rgb(255 255 255 / 0.2)",
  /** A slider knob. Nearly opaque, so it reads as a solid object on glass. */
  knob: "rgb(255 255 255 / 0.9)",
  /** Published Figma variables. */
  accent: {
    red: "#ff383c",
    green: "#34c759",
    blue: "#0088ff",
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
export const material = {
  glass: {
    /**
     * TUNED, not measured — see the note above the object.
     *
     * The file's 160 (≈80.8px in CSS) was the starting point; 98 is where it
     * landed against real content on the system page.
     */
    blur: 98,
    angle: -7.9,
    /**
     * The fill now FADES OUT rather than crossing between two greys: it starts
     * at black 9% and ends fully transparent. The measured version went 20% to
     * 16%, which is nearly a flat film — this one lets the blur carry the
     * surface and only darkens the near edge.
     *
     * `toAlpha` at zero is why the second colour still matters: it sets the hue
     * the fade passes through, not where it ends.
     */
    washFrom: "rgb(0 0 0 / 0.09)",
    washFromStop: 0,
    washTo: "rgb(90 90 90 / 0)",
    washToStop: 82.8,
    /**
     * The rim, and the part that is easy to get wrong.
     *
     * It is not a stroke, it is a GRADIENT stroke running down the shape:
     * white, then almost nothing across the middle, then white again. That is
     * a specular highlight — the edge catches light where it curves toward the
     * viewer at top and bottom and vanishes where it turns away. A flat
     * `1px solid white` was the first reading and it looks drawn on, because a
     * uniform outline is the one thing a curved glass edge never is.
     *
     * `border` cannot take a gradient, so it is painted as a ring instead.
     * See `.mo-glass::after`.
     */
    rim: "linear-gradient(142deg, rgb(255 255 255 / 1) 5%, rgb(255 255 255 / 0) 48%, rgb(255 255 255 / 1) 100%)",
    rimWidth: 1.4,
    /**
     * A contact shadow, not a cast one. The −44 spread pulls the 56.8 blur
     * back under the surface so the panel sits ON the page instead of floating
     * a long way above it, which is what the measured 206px blur at zero
     * spread was doing.
     */
    shadow: "5.7px 44.2px 56.8px -44px rgb(94 94 94 / 0.12)",
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
   * A selected row. The hairline is inside so the row does not grow, and the
   * enormous soft shadow is a glow rather than a drop -- zero offset, 137px of
   * blur.
   */
  selected: {
    shadow:
      "0 0 0 1px rgb(0 0 0 / 0.05), 0 0 137.391px 0 rgb(0 0 0 / 0.2)",
  },
  /** Three stacked shadows: a contact hairline, a tight core, a soft cast. */
  knob: {
    blur: 1.9,
    shadow:
      "0 0 0 1px rgb(0 0 0 / 0.1), 0 0.5px 4px 0 rgb(0 0 0 / 0.12), 0 6px 13px 0 rgb(0 0 0 / 0.12)",
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

  --mo-glass-blur: ${px(material.glass.blur)};
  --mo-glass-wash: linear-gradient(${material.glass.angle}deg, ${material.glass.washFrom} ${material.glass.washFromStop}%, ${material.glass.washTo} ${material.glass.washToStop}%);
  --mo-glass-rim: ${material.glass.rim};
  --mo-glass-rim-w: ${px(material.glass.rimWidth)};
  --mo-glass-shadow: ${material.glass.shadow};
  --mo-glow-size: ${px(material.glow.size)};
  --mo-glow-core: ${material.glow.core};
  --mo-glow-edge: ${material.glow.edge};
  --mo-glow-fade: ${material.glow.fade}ms;
  --mo-selected-shadow: ${material.selected.shadow};
  --mo-knob-shadow: ${material.knob.shadow};
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
 * The material, as one class.
 *
 * A class rather than four variables applied by hand at each call site,
 * because the four properties are only correct together -- see the note on
 * \`material.glass\`. Somewhere down the line a surface would get the blur and
 * miss the hairline, and it would take a while to notice.
 */
.mo-glass {
  position: relative;
  background-image: var(--mo-glass-wash);
  backdrop-filter: blur(var(--mo-glass-blur));
  -webkit-backdrop-filter: blur(var(--mo-glass-blur));
  box-shadow: var(--mo-glass-shadow);
}

/*
 * The cursor bloom.
 *
 * Positioned from --mo-mx / --mo-my, which the surface writes straight to
 * its own inline style on pointermove -- routing a 120Hz pointer through React
 * state would re-render an entire panel per frame to move a gradient.
 *
 * --mo-glow is the on/off, so entering and leaving is one transitioned
 * property rather than a mounted and unmounted element. The gradient itself is
 * always there; only its opacity moves.
 *
 * Children are lifted to z-index 1 because an absolutely positioned
 * pseudo-element paints above static in-flow content. Without it the bloom
 * would wash across the labels rather than under them.
 */
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

.mo-glass > * { position: relative; z-index: 1; }

/*
 * The rim, painted as a ring rather than set as a border.
 *
 * A gradient stroke has no CSS property. The ring is a 1px-padded box filled
 * with the gradient and masked to its own padding, so only the frame survives
 * -- \`exclude\` subtracts the content box from the border box and leaves the
 * outline. It follows \`border-radius: inherit\`, so a rail and a panel each get
 * the right corner without being told which they are.
 *
 * Drawn OVER the surface rather than as a real border, which keeps the box
 * model untouched: switching from \`border: 1px\` would otherwise have moved
 * every child by a pixel.
 */
.mo-glass::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: var(--mo-glass-rim-w);
  background: var(--mo-glass-rim);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

/*
 * Backdrop blur is the one property here with no cheap fallback: where it is
 * unavailable the wash alone renders as a dark film over live content. These
 * two queries swap it for an opaque surface instead.
 */
@media (prefers-reduced-transparency: reduce) {
  .mo-glass {
    background-image: none;
    background-color: rgb(240 240 242);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  /* The rim is a lighting effect on glass. With no glass it is just a line. */
  .mo-glass::after { background: rgb(0 0 0 / 0.08); }
  /* And a reflection with nothing to reflect in is a white smear. */
  .mo-glass::before { display: none; }
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mo-glass {
    background-image: none;
    background-color: rgb(240 240 242);
  }
}

.mo-title { font: var(--mo-text-title); color: var(--mo-ink); }
.mo-label { font: var(--mo-text-label); color: var(--mo-ink); }
.mo-code  { font: var(--mo-text-code);  color: var(--mo-ink-muted); }
.mo-value { font: var(--mo-text-value); color: var(--mo-ink); }

/* Idle rows and icons are the same ink at half strength. */
.mo-muted { color: var(--mo-ink-muted); }
`;
