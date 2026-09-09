/**
 * What every control in the Mocraft chrome is actually connected to.
 *
 * `StudioChrome` used to carry a `POPUPS` table of labels and mock initial
 * values — a description of the Figma frames, with a `values` bag behind it
 * that nothing read. This is the same description with the other half filled
 * in: each field now says which part of `EditorState` it is a view of, and how
 * to read and write it.
 *
 * Written as `get`/`set` pairs rather than dotted string paths. A path has to
 * be parsed at runtime and cannot be checked at all — `"shadow.offsetX"` and
 * `"shadow.offestX"` are the same kind of string — where a closure is ordinary
 * typed code and a wrong field name is a build error.
 *
 * Two rules run through the whole file:
 *
 *  1. RANGES COME FROM THE DOMAIN. `editorState.RANGES`, `SHADOW_RANGES` and
 *     `OVERLAY_RANGES` already state what each value's limits are, and they are
 *     the numbers the old editor's sliders and the preset lerps agree on.
 *     Restating them here would be a second set that drifts.
 *  2. NO DEAD CONTROLS. Every row below moves something on the stage. That is
 *     the standard `editorState.ts` already sets for itself, in its own words:
 *     rows whose value nothing rendered "were removed rather than left as
 *     sliders that move a number and change nothing on screen". Where the frame
 *     asked for an axis the rig did not have — a Z translate, per-axis scale —
 *     the rig grew it, rather than the row being dropped or faked.
 */

import { canFold, getDevice } from "../devices";
import { DEFAULT_EDITOR_STATE, RANGES, type EditorState } from "../editor/editorState";
import { applyMode, type BlurSettings } from "../blurStyles";
import { OVERLAY_RANGES } from "../overlay";
import { SHADOW_RANGES } from "../shadow";

/* ===========================================================================
   Formatting
   =========================================================================== */

/**
 * The readout's suffix. The number is the value; this says what it is in.
 *
 * Fractions are shown as percentages throughout. The overlay's width, height,
 * position and blur are all stored 0..1 of the frame, and "0.45" tells you
 * nothing about a picture where "45%" tells you most of it.
 */
const fmt = {
  plain: (n: number) => n.toFixed(2),
  deg: (n: number) => `${Math.round(n)}°`,
  px: (n: number) => `${Math.round(n)}px`,
  mm: (n: number) => `${Math.round(n)} mm`,
  pct: (n: number) => `${Math.round(n * 100)}%`,
  times: (n: number) => `${n.toFixed(2)}×`,
} as const;

/* ===========================================================================
   Focal length
   =========================================================================== */

/**
 * The frame's Camera popup asks for millimetres; the stage speaks degrees.
 *
 * Both describe the same lens, and the conversion is the standard one against
 * a full-frame sensor's 24mm height — the height, because `fov` here is the
 * VERTICAL angle. So "55 mm" on the panel is a real 55mm lens and not a number
 * scaled to look plausible, and the two ends of the slider are wherever the
 * stage's own 14°-90° range actually lands.
 */
const SENSOR_MM = 24;
const degFromMm = (mm: number) => (2 * Math.atan(SENSOR_MM / 2 / mm) * 180) / Math.PI;
const mmFromDeg = (deg: number) => SENSOR_MM / 2 / Math.tan((deg * Math.PI) / 360);

/** Widest lens first: a bigger fov is a shorter lens, so the range inverts. */
const FOCAL = {
  min: Math.ceil(mmFromDeg(RANGES.fov.max)),
  max: Math.floor(mmFromDeg(RANGES.fov.min)),
};

/* ===========================================================================
   Fields
   =========================================================================== */

export type NumberField = Conditional & {
  kind: "number";
  /** Reaches the slider's accessible name even when the row shows a glyph. */
  label: string;
  /** Unique within its popup — React's key, and nothing else. */
  key: string;
  /** Shown in a glyph box instead of the label column — X, Y, Z. */
  axis?: string;
  /** No label column at all: the section title already names the control. */
  bare?: boolean;
  /** The frame puts a reset glyph after the readout on these. */
  reset?: boolean;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  get: (s: EditorState) => number;
  set: (s: EditorState, n: number) => EditorState;
};

export type ColorField = Conditional & {
  kind: "color";
  label: string;
  key: string;
  get: (s: EditorState) => string;
  set: (s: EditorState, hex: string) => EditorState;
};

export type Field = NumberField | ColorField;

/**
 * Is this row worth drawing for the shot as it stands?
 *
 * The one escape from "every row moves something": a rig capability that only
 * some devices have. A lid slider in front of an iMac is the dead control this
 * file refuses to ship — so rather than drop the row or fake it, the row states
 * what it needs and the chrome leaves it out when the need is not met.
 */
export type Conditional = { when?: (s: EditorState) => boolean };

export type Section = { title?: string; fields: Field[] };

type Range = { min: number; max: number; step: number };

/** A row on a top-level number — the nine transform axes and the lens. */
function scalar(
  label: string,
  key: keyof EditorState & string,
  range: Range,
  format: (n: number) => string,
  extra: Partial<NumberField> = {},
): NumberField {
  return {
    kind: "number",
    label,
    key,
    ...range,
    format,
    get: (s) => s[key] as number,
    set: (s, n) => ({ ...s, [key]: n }),
    reset: true,
    ...extra,
  };
}

/** The image card is the one device the Card rows describe — see that section.
    Written once because both of its rows ask the same question. */
const isCard = (s: EditorState) => getDevice(s.deviceId).kind === "image";

/**
 * A row on one field of `state.blur`.
 *
 * The lens model is already normalised 0..1 (bar `strength`, which is 0..100
 * to match its slider), so these ranges are stated here rather than imported:
 * `blurStyles` describes what the numbers MEAN and the shape of each one is in
 * its doc comment, but unlike shadow and overlay it ships no RANGES table.
 */
function blurNum(
  label: string,
  key: keyof BlurSettings & string,
  range: Range,
  format: (n: number) => string,
): NumberField {
  return {
    kind: "number",
    label,
    key,
    ...range,
    format,
    get: (s) => s.blur[key] as number,
    set: (s, n) => ({ ...s, blur: { ...s.blur, [key]: n } }),
  };
}

/** A row on one field of `state.overlay`. */
function overlayNum(
  label: string,
  key: keyof EditorState["overlay"] & string,
  range: Range,
  format: (n: number) => string,
): NumberField {
  return {
    kind: "number",
    label,
    key,
    ...range,
    format,
    get: (s) => s.overlay[key] as number,
    set: (s, n) => ({ ...s, overlay: { ...s.overlay, [key]: n } }),
  };
}

/** A row on one field of `state.shadow`. */
function shadowNum(
  label: string,
  key: keyof EditorState["shadow"] & string,
  range: Range,
  format: (n: number) => string,
): NumberField {
  return {
    kind: "number",
    label,
    key,
    ...range,
    format,
    get: (s) => s.shadow[key] as number,
    set: (s, n) => ({ ...s, shadow: { ...s.shadow, [key]: n } }),
  };
}

function bgColor(
  label: string,
  key: "color" | "gradientFrom" | "gradientTo" | "dotColor",
): ColorField {
  return {
    kind: "color",
    label,
    key,
    get: (s) => s.background[key],
    set: (s, hex) => ({ ...s, background: { ...s.background, [key]: hex } }),
  };
}

/**
 * The frame's three-axis groups, as three rows on three real fields.
 *
 * The axis letter goes in the glyph box and the spoken label stays a full
 * phrase, because "X" as an image is not something a screen reader can
 * announce.
 */
const triple = (
  prefix: string,
  keys: readonly [keyof EditorState & string, keyof EditorState & string, keyof EditorState & string],
  ranges: readonly [Range, Range, Range],
  format: (n: number) => string,
): Field[] =>
  (["X", "Y", "Z"] as const).map((axis, i) =>
    scalar(`${prefix} ${axis}`, keys[i], ranges[i], format, { axis }),
  );

/* ===========================================================================
   Layers
   =========================================================================== */

export type Layer = {
  id: string;
  /** As the frame names it. */
  name: string;
  /** File in `public/figma-assets/mockup-studio/icons`. */
  icon: string;
  sections: Section[];
  /**
   * Is this effect part of the composition?
   *
   * Derived from the state rather than held beside it, so a shot restored from
   * storage opens with the same rows lit that it was saved with — and so the
   * stack cannot disagree with what the stage is drawing.
   */
  isOn: (s: EditorState) => boolean;
  /**
   * Which half of the stack it belongs to.
   *
   * `stage` is the model and how it sits: where it is, the lens it is seen
   * through, and the shadow it casts. `effect` is what is layered onto the
   * composition around it — the overlay and the four backgrounds. The stack
   * draws a divider where the two meet, and reads as two short lists rather
   * than one of eight, which is worth more than the rule it costs.
   *
   * The shadow is the model's, not the composition's: it is thrown BY the
   * phone and moves when the phone does, which is why it sits above the line
   * with the transform and the lens rather than among the things painted
   * behind it.
   *
   * Carried here rather than as an index the chrome counts to, so the split
   * survives a reorder: move a row and its side moves with it.
   */
  group: "stage" | "effect";
  /**
   * Can this effect be taken OUT of the shot, as opposed to returned to
   * neutral?
   *
   * False for Transform and Camera, and the file already says why: "there is
   * no transform to delete, only one to return to neutral" — the phone is
   * always somewhere, at some angle, at some size. Their `toggle(false)` and
   * their reset are the same nine assignments, so a delete beside the reset in
   * their headers would be a second glyph for an act the first one already
   * did. Every other layer is genuinely absent when it is off.
   */
  removable?: boolean;
  /**
   * What this popup's reset means, where walking its fields is not it.
   *
   * Only the Image layer needs one: its body is an upload well rather than a
   * list of fields, so there is nothing for the walk below to find and reset
   * would be a glyph that does nothing. Everything else is its fields.
   */
  reset?: (s: EditorState) => EditorState;
  /** And whether there is anything to put back. Same reason. */
  dirty?: (s: EditorState) => boolean;
  /**
   * Put it in or take it out.
   *
   * The four background layers share one `kind`, so switching one on switches
   * the others off — they are one choice wearing four rows, and that falls out
   * of this rather than needing the chrome to know about it.
   */
  toggle: (s: EditorState, on: boolean) => EditorState;
};

const D = DEFAULT_EDITOR_STATE;

/** True when any of these has been moved off its default. */
const moved = (s: EditorState, keys: readonly (keyof EditorState)[]) =>
  keys.some((k) => s[k] !== D[k]);

/** Put them all back. What "remove" means for a transform: there is no
    transform to delete, only one to return to neutral. */
const restore = (s: EditorState, keys: readonly (keyof EditorState)[]): EditorState => {
  const next = { ...s };
  for (const k of keys) (next[k] as EditorState[typeof k]) = D[k];
  return next;
};

const TRANSFORM_KEYS = [
  "panX", "panY", "panZ",
  "xAxis", "yAxis", "zAxis",
  // `zoom` is the row the Scale group draws; the three axis scales are the
  // stretch behind it, which a preset can still have moved. Reset means all of
  // them, or a shot could return to neutral and stay stretched.
  "zoom", "scaleX", "scaleY", "scaleZ",
  // Only some devices can be folded, but neutral is open for all of them.
  "fold",
] as const;

const CAMERA_KEYS = ["fov", "xAxis", "yAxis"] as const;

/**
 * The nine axes that say where the model is, back to neutral.
 *
 * The gizmo's double-tap, and the Transform row's own remove, are the same
 * act — so they are the same function rather than two lists of axes that have
 * to be kept identical. Location, rotation AND scale: the popup calls those
 * three groups one transform, and a reset that left the phone stretched or a
 * quarter-turn off would be resetting some of where it is.
 */
export const resetTransform = (s: EditorState): EditorState => restore(s, TRANSFORM_KEYS);

/**
 * The crafting stack, straight off the file's nine frames — with the other
 * half of each row filled in.
 *
 * Order is the frame's. The "Overlay popup" the file draws for the Effects row
 * is `state.overlay` exactly, field for field, which is why that section reads
 * as a straight list: it was already a description of this.
 */
export const LAYERS: Layer[] = [
  {
    id: "transform",
    group: "stage",
    removable: false,
    name: "Transform",
    icon: "transform",
    sections: [
      {
        title: "Location",
        fields: triple(
          "Location",
          ["panX", "panY", "panZ"],
          [RANGES.panX, RANGES.panY, RANGES.panZ],
          fmt.plain,
        ),
      },
      {
        // "Roatation" in three places in the file. A typo rather than a name.
        title: "Rotation",
        fields: triple(
          "Rotation",
          ["xAxis", "yAxis", "zAxis"],
          [RANGES.xAxis, RANGES.yAxis, RANGES.zAxis],
          fmt.deg,
        ),
      },
      {
        /*
         * Only for devices that fold.
         *
         * `canFold` is the registry's own statement that a model has a hinge
         * clip to drive: `iphone-fold.glb` carries a 5s animation and its entry
         * names the seconds that are open and shut. Nothing else does — the
         * MacBooks were tried and their lids are modelled welded open, with no
         * clips at all — so the row stays away from them. A slider that moves a
         * number no mesh reads is the dead control this file exists to avoid.
         * Rig those lids and add `fold`, and the row appears on its own.
         */
        title: "Lid",
        fields: [
          {
            kind: "number",
            label: "Lid",
            key: "fold",
            bare: true,
            reset: true,
            when: (s) => canFold(getDevice(s.deviceId)),
            min: 0,
            max: 1,
            step: RANGES.fold.step / 100,
            format: fmt.pct,
            /*
             * Shown as how far it is OPEN, stored as how far it is CLOSED.
             *
             * `state.fold` is 0 at rest because a fold's whole point is the
             * big inner screen and a mockup that opens shut is no use. But a
             * control labelled Lid that reads 0% on an open laptop is a
             * control read backwards, so the row inverts what the state says.
             */
            get: (s) => (100 - s.fold) / 100,
            set: (s, n) => ({ ...s, fold: 100 - n * 100 }),
          },
        ],
      },
      {
        /*
         * Only for the image card, and the same rule as the Lid above: the
         * registry says which devices these mean anything for.
         *
         * `ImageCardScene` is the only mesh that reads them — every other
         * device is a GLB whose corners and thickness were modelled — so on a
         * phone these would be two sliders moving numbers no geometry looks at,
         * which is the dead control this file exists to avoid.
         */
        title: "Card",
        fields: [
          {
            kind: "number",
            label: "Corner Radius",
            key: "cardRadius",
            reset: true,
            when: isCard,
            ...RANGES.cardRadius,
            // Stored as a fraction of the card's shorter side, so a radius set
            // on a wide image still reads the same when a tall one is dropped
            // in — which is also why it is shown as a percentage rather than
            // in pixels it does not have.
            format: fmt.pct,
            get: (s) => s.cardRadius,
            set: (s, n) => ({ ...s, cardRadius: n }),
          },
          {
            kind: "number",
            label: "Thickness",
            key: "cardDepth",
            reset: true,
            when: isCard,
            ...RANGES.cardDepth,
            /*
             * World units, and small ones: the range tops out at 0.08 against
             * a card about a unit across, so the whole slider spans a business
             * card to a coaster. Shown to the thousandth because the useful
             * part of that range is the first fifth of it, and two decimals
             * would give the entire lower half one value.
             */
            format: (n) => n.toFixed(3),
            get: (s) => s.cardDepth,
            set: (s, n) => ({ ...s, cardDepth: n }),
          },
        ],
      },
      {
        /*
         * One scale, not three.
         *
         * The three axis rows wrote `scaleX/Y/Z`, which STRETCH the phone —
         * useful to a rig, and almost never what anyone opening a Scale group
         * wants. What they want is the size of the thing in frame, and the
         * studio already has that in `zoom`: it is what the wheel over the
         * canvas moves and what the stage reads as its overall scale.
         *
         * So this row and the wheel are two views of one value, the same way
         * the Camera popup's rotation rows are a second view of the model's
         * angle. The per-axis fields stay in the state and the rig still
         * applies them — presets author with them — they just no longer have
         * three sliders in front of a group whose title promises one number.
         */
        title: "Scale",
        fields: [
          {
            kind: "number",
            label: "Scale",
            key: "zoom",
            // Titled and labelled the same word twice, in a 48px column.
            bare: true,
            reset: true,
            ...RANGES.zoom,
            format: fmt.times,
            get: (s) => s.zoom,
            set: (s, n) => ({ ...s, zoom: n }),
          },
        ],
      },
    ],
    // A transform is never absent — the phone is always somewhere, at some
    // angle, at some size. So "on" means moved, and taking it out is putting
    // it back to neutral, which is the only sense in which a transform can be
    // removed from a composition.
    isOn: (s) => moved(s, TRANSFORM_KEYS),
    toggle: (s, on) => (on ? s : restore(s, TRANSFORM_KEYS)),
  },
  {
    id: "camera",
    group: "stage",
    removable: false,
    name: "Camera",
    icon: "camera",
    sections: [
      {
        title: "Focal length",
        fields: [
          {
            kind: "number",
            label: "Focal length",
            key: "focal",
            // Titled "Focal length" and then labelled "Focal length" is the
            // same word twice, and it wraps onto two lines in a 48px column.
            bare: true,
            reset: true,
            min: FOCAL.min,
            max: FOCAL.max,
            step: 1,
            format: fmt.mm,
            get: (s) => mmFromDeg(s.fov),
            set: (s, mm) => ({ ...s, fov: degFromMm(mm) }),
          },
        ],
      },
      {
        /*
         * The same two angles the Transform popup's Rotation X and Y write to,
         * and deliberately so.
         *
         * This rig has one rotation. The camera sits still and the model turns
         * in front of it — which is what a product shot is, and why there is no
         * separate camera-rig rotation in `EditorState`; `editorState.ts` notes
         * that one existed and was removed for driving nothing.
         *
         * So these rows are a second view of one truth rather than a second
         * truth. Move either popup's X and the other's follows, because there
         * is only the one angle between the lens and the phone. The alternative
         * was two sliders that look independent and quietly fight.
         */
        title: "Rotation",
        fields: (["X", "Y"] as const).map((axis, i) =>
          scalar(
            `Rotation ${axis}`,
            (["xAxis", "yAxis"] as const)[i],
            [RANGES.xAxis, RANGES.yAxis][i],
            fmt.deg,
            { axis, key: `camera.${axis}` },
          ),
        ),
      },
    ],
    isOn: (s) => moved(s, CAMERA_KEYS),
    toggle: (s, on) => (on ? s : restore(s, CAMERA_KEYS)),
  },
  {
    id: "depth-of-field",
    // A lens property, so it sits with the camera rather than among the things
    // painted behind the phone: the blur is what the shot was TAKEN through.
    group: "stage",
    name: "Depth of Field",
    // TODO: its own glyph. Sharing the camera's is honest about what this is
    // -- both rows are the lens -- but two identical icons in a list of nine
    // is a worse row to scan than it should be. Wants a Figma asset.
    icon: "camera",
    sections: [
      {
        fields: [
          /*
           * Focus X and Y are the answer to "blur everywhere except HERE".
           *
           * They are a point in the FRAME, 0..1 across it, which the layer
           * maps onto the phone's own plane to get a point in the scene. That
           * indirection is why they are a pair of sliders rather than a depth
           * in millimetres: you pick the part of the picture that should be
           * sharp, and the distance falls out of where that lands.
           */
          blurNum("Focus X", "focusX", { min: 0, max: 1, step: 0.01 }, fmt.pct),
          blurNum("Focus Y", "focusY", { min: 0, max: 1, step: 0.01 }, fmt.pct),
          // "How much stays sharp", not "how far away the sharp bit is" --
          // see the layer, which fixes distance with the target above and
          // spends this on focusRange.
          blurNum("Focus Size", "focusSize", { min: 0, max: 1, step: 0.01 }, fmt.pct),
          blurNum("Falloff", "falloff", { min: 0, max: 1, step: 0.01 }, fmt.pct),
          blurNum("Strength", "strength", { min: 0, max: 100, step: 1 }, fmt.plain),
        ],
      },
    ],
    /*
     * `isBlurActive` is the stage's mount condition and it also requires
     * strength above zero. This asks a narrower question on purpose -- is the
     * effect part of the shot -- because a row that switched itself off when
     * you dragged strength to 0 would take its own sliders away mid-gesture.
     */
    isOn: (s) => s.blur.mode !== "off",
    /*
     * On means RADIAL. The model carries a tilt-shift pass too, and it is a
     * genuinely different pass rather than a variant -- one blurs by screen
     * position, the other by depth -- so it needs a mode control to choose
     * between them, and the field vocabulary here is numbers and colours with
     * nothing that renders a choice. Radial is the one that answers "depth of
     * field"; tilt shift is reachable from the old editor until this panel
     * grows a row that can express it.
     *
     * Bokeh goes on with it. The layer's own comment is that without it "the
     * same strength reads as a plain defocus" -- and a defocus is not what
     * anyone turning on depth of field in a mockup tool is after.
     */
    toggle: (s, on) =>
      on
        ? { ...s, blur: { ...applyMode(s.blur, "radial"), bokeh: true } }
        : { ...s, blur: { ...s.blur, mode: "off" } },
    /*
     * Reset and dirty both measure against the RADIAL defaults, not the
     * global ones, and they have to be spelled out because the generic
     * versions compare against `DEFAULT_EDITOR_STATE` -- which holds the
     * mode-off numbers. Left generic, this row lit its reset glyph the moment
     * you switched it on, having done nothing but switch it on, and resetting
     * would have moved strength somewhere the radial pass never opens at.
     */
    reset: (s) => ({ ...s, blur: { ...applyMode(s.blur, "radial"), bokeh: true } }),
    dirty: (s) => {
      const base = applyMode(s.blur, "radial");
      return (["focusX", "focusY", "focusSize", "falloff", "strength"] as const).some(
        (k) => Math.abs(s.blur[k] - base[k]) > 1e-6,
      );
    },
  },
  {
    id: "drop-shadow",
    group: "stage",
    name: "Drop Shadow",
    icon: "drop-shadow",
    sections: [
      {
        fields: [
          {
            kind: "color",
            label: "Color",
            key: "color",
            get: (s) => s.shadow.color,
            set: (s, hex) => ({ ...s, shadow: { ...s.shadow, color: hex } }),
          },
          shadowNum("X", "offsetX", SHADOW_RANGES.offsetX, fmt.px),
          shadowNum("Y", "offsetY", SHADOW_RANGES.offsetY, fmt.px),
          shadowNum("Blur", "blur", SHADOW_RANGES.blur, fmt.px),
          shadowNum("Opacity", "opacity", SHADOW_RANGES.opacity, fmt.pct),
          shadowNum("Spread", "spread", SHADOW_RANGES.spread, fmt.px),
        ],
      },
    ],
    isOn: (s) => s.shadow.enabled,
    toggle: (s, on) => ({ ...s, shadow: { ...s.shadow, enabled: on } }),
  },
  {
    id: "effects",
    group: "effect",
    // The file called this row Effects and its popup "Overlay popup", which is
    // what the row actually is: `state.overlay`, field for field. The id stays
    // `effects` — nothing outside this file reads it, and renaming it would
    // churn the popup's key for a label change.
    name: "Overlay",
    icon: "effects",
    sections: [
      {
        fields: [
          {
            kind: "color",
            label: "Color",
            key: "color",
            get: (s) => s.overlay.color,
            set: (s, hex) => ({ ...s, overlay: { ...s.overlay, color: hex } }),
          },
          overlayNum("X", "x", OVERLAY_RANGES.x, fmt.pct),
          overlayNum("Y", "y", OVERLAY_RANGES.y, fmt.pct),
          overlayNum("Blur", "blur", OVERLAY_RANGES.blur, fmt.pct),
          overlayNum("Opacity", "opacity", OVERLAY_RANGES.opacity, fmt.pct),
          overlayNum("Width", "width", OVERLAY_RANGES.width, fmt.pct),
          overlayNum("Height", "height", OVERLAY_RANGES.height, fmt.pct),
        ],
      },
    ],
    isOn: (s) => s.overlay.enabled,
    toggle: (s, on) => ({ ...s, overlay: { ...s.overlay, enabled: on } }),
  },
  {
    id: "background",
    group: "effect",
    // Named for what it holds. Four rows in this stack paint a background —
    // this one, Gradient, Dots and Image — so "Background" alone said the
    // category rather than which of the four you were opening.
    name: "Background Color",
    icon: "background",
    sections: [{ fields: [bgColor("Color", "color")] }],
    isOn: (s) => s.background.kind === "solid",
    toggle: (s, on) => ({
      ...s,
      // Off is not "no background" as a missing thing — it is the transparent
      // one, which is a real choice in the registry and the one an export with
      // an alpha channel wants.
      background: { ...s.background, kind: on ? "solid" : "transparent" },
    }),
  },
  {
    id: "gradient",
    group: "effect",
    name: "Gradient",
    icon: "gradient",
    sections: [
      {
        fields: [
          bgColor("Top", "gradientFrom"),
          bgColor("Bottom", "gradientTo"),
          {
            kind: "number",
            label: "Angle",
            key: "angle",
            min: 0,
            max: 360,
            step: 1,
            format: fmt.deg,
            get: (s) => s.background.gradientAngle,
            set: (s, n) => ({ ...s, background: { ...s.background, gradientAngle: n } }),
          },
        ],
      },
    ],
    isOn: (s) => s.background.kind === "gradient",
    toggle: (s, on) => ({
      ...s,
      background: { ...s.background, kind: on ? "gradient" : "solid" },
    }),
  },
  {
    id: "dots",
    group: "effect",
    name: "Dots",
    icon: "dots",
    sections: [
      {
        fields: [
          // The frame's "Base" is the ground the dots are drawn on, which is
          // the same `color` the solid background uses — one field, two rows
          // that reach it, because that is what the file draws.
          bgColor("Base", "color"),
          bgColor("Dots", "dotColor"),
          {
            kind: "number",
            label: "Space",
            key: "space",
            // The pitch, in CSS pixels. Below about 2 the grid is a flat wash
            // and above 80 there is roughly one dot in frame.
            min: 2,
            max: 80,
            step: 1,
            format: fmt.px,
            get: (s) => s.background.dotSize,
            set: (s, n) => ({ ...s, background: { ...s.background, dotSize: n } }),
          },
        ],
      },
    ],
    isOn: (s) => s.background.kind === "dots",
    toggle: (s, on) => ({
      ...s,
      background: { ...s.background, kind: on ? "dots" : "solid" },
    }),
  },
  {
    id: "image",
    group: "effect",
    name: "Image",
    icon: "image",
    // No sections: this one's body is the image well, which is a component
    // rather than a list of fields. The chrome special-cases it by id.
    sections: [],
    isOn: (s) => s.background.kind === "image" && Boolean(s.background.imageSrc),
    // Reset is the upload, because the upload is the whole layer. The kind
    // goes back with it: leaving `image` selected with nothing to draw would
    // paint an empty frame, which is the same trap `toggle` steps around.
    reset: (s) => ({
      ...s,
      background: { ...s.background, kind: "solid", imageSrc: null },
    }),
    dirty: (s) => Boolean(s.background.imageSrc),
    toggle: (s, on) => ({
      ...s,
      background: {
        ...s.background,
        // Switching it on with nothing uploaded would paint an empty frame, so
        // the kind only moves once there is an image to show. The popup opens
        // either way — that is where the upload button is.
        kind: on && s.background.imageSrc ? "image" : on ? s.background.kind : "solid",
      },
    }),
  },
];

/* ===========================================================================
   Reset
   =========================================================================== */

/**
 * Every value this popup shows, back to what `DEFAULT_EDITOR_STATE` says.
 *
 * Walked from the fields rather than listed per layer, so a row added to a
 * popup is reset by the header for free and cannot be forgotten — the same
 * reason the fields carry their own `get`/`set` instead of a table of paths.
 *
 * `f.get(DEFAULT_EDITOR_STATE)` rather than a stored default: a field's value
 * is not always a field of the state — Camera's focal length is millimetres
 * over a state that holds degrees — and asking the getter for the default's
 * reading is right whatever conversion sits in between.
 *
 * What it deliberately leaves alone is whether the effect is IN the shot.
 * `enabled` and `background.kind` are not fields of any popup, so a reset
 * returns a drop shadow to its default offsets and keeps the shadow; removing
 * it is what the stack's toggle is for, one click away.
 */
export function resetLayer(layer: Layer, s: EditorState): EditorState {
  if (layer.reset) return layer.reset(s);
  return layer.sections.reduce(
    (state, section) =>
      section.fields.reduce(
        // The two arms are the same line and have to be written twice: `Field`
        // is a union, and until the `kind` is checked `set` is a signature
        // taking string OR number while `get` returns string AND number, which
        // no call can satisfy. The check is what pairs them up.
        (acc, f) =>
          f.kind === "color"
            ? f.set(acc, f.get(DEFAULT_EDITOR_STATE))
            : f.set(acc, f.get(DEFAULT_EDITOR_STATE)),
        state,
      ),
    s,
  );
}

/**
 * Is anything in this popup off its default?
 *
 * Numbers compare with a tolerance, because a field can round-trip through a
 * conversion and land a hair off where it started — Camera's focal length is
 * degrees read as millimetres and written back — and a reset button lit
 * forever by a millionth of a degree is a lie about there being work to do.
 */
export function layerIsDirty(layer: Layer, s: EditorState): boolean {
  if (layer.dirty) return layer.dirty(s);
  return layer.sections.some((section) =>
    section.fields.some((f) =>
      f.kind === "color"
        ? f.get(s).toLowerCase() !== f.get(DEFAULT_EDITOR_STATE).toLowerCase()
        : Math.abs(f.get(s) - f.get(DEFAULT_EDITOR_STATE)) > 1e-6,
    ),
  );
}

export type LayerId = string;

export function getLayer(id: LayerId): Layer | undefined {
  return LAYERS.find((l) => l.id === id);
}
