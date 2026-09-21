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

import { ANIMATABLE, type AnimatableKey } from "../animation";
import { canFold, getDevice } from "../devices";
import {
  DEFAULT_EDITOR_STATE,
  RANGES,
  type EditorState,
} from "../editor/editorState";
import {
  applyMode,
  BLUR_MODES,
  DEFAULT_BLUR,
  type BlurMode,
  type BlurSettings,
} from "../blurStyles";
import { LIGHTING_PRESETS } from "../lighting";
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
const degFromMm = (mm: number) =>
  (2 * Math.atan(SENSOR_MM / 2 / mm) * 180) / Math.PI;
const mmFromDeg = (deg: number) =>
  SENSOR_MM / 2 / Math.tan((deg * Math.PI) / 360);

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
  /** The frame puts a diamond after the readout on these. */
  reset?: boolean;
  /**
   * Which animatable channel this row IS, where it is one.
   *
   * What turns the row's diamond from decoration into a keyframe toggle. Most
   * rows have one and it is simply the state field they read -- but not all:
   * Focal Length is `fov` seen through a lens conversion, and the blur rows
   * are not animatable at all. Stated rather than inferred from `key`, because
   * `key` is a React key and only has to be unique within its popup.
   */
  channel?: AnimatableKey;
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

/**
 * One of a short list of named looks, chosen rather than dialled.
 *
 * The third kind, and it exists because the first two could not say this. A
 * lighting rig is not a number: "Contrast" is a balance across four emitters
 * and a white point, and the six presets are not points on any one axis you
 * could put a slider along. Offering them as `key`, `edge`, `fill`, `bounce`
 * and `warmth` sliders would be five controls where the honest answer is one,
 * and would ask the reader to rediscover each preset by hand.
 *
 * The list is short on purpose. This is not a general enum row — it is for
 * where a handful of named states IS the whole domain.
 */
export type ChoiceField = Conditional & {
  kind: "choice";
  label: string;
  key: string;
  options: { id: string; label: string }[];
  get: (s: EditorState) => string;
  set: (s: EditorState, id: string) => EditorState;
};

/**
 * The same kind of answer as `ChoiceField`, as a dropdown: a value row that
 * opens its options. For a mode that decides what the rest of the popup IS —
 * the blur's — where a list of four rows would push the parameters it governs
 * off the bottom of the panel.
 */
export type SelectField = Conditional & {
  kind: "select";
  label: string;
  key: string;
  options: { id: string; label: string }[];
  get: (s: EditorState) => string;
  set: (s: EditorState, id: string) => EditorState;
};

/** On or off, for a parameter that is a switch rather than an amount. */
export type ToggleField = Conditional & {
  kind: "toggle";
  label: string;
  key: string;
  get: (s: EditorState) => boolean;
  set: (s: EditorState, on: boolean) => EditorState;
};

/**
 * A point in the frame, 0..1 from the left and from the top, placed on a pad
 * shaped like the frame. Two sliders said the same thing, and nobody reads
 * "where should the sharp part be" as two numbers.
 */
export type PointField = Conditional & {
  kind: "point";
  label: string;
  key: string;
  get: (s: EditorState) => { x: number; y: number };
  set: (s: EditorState, p: { x: number; y: number }) => EditorState;
};

export type Field =
  | NumberField
  | ColorField
  | ChoiceField
  | SelectField
  | ToggleField
  | PointField;

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
    /*
     * Derived, because for these rows the state field IS the channel: the nine
     * transform axes are animatable under exactly the names they are stored
     * under. Rows whose value is a VIEW of a channel rather than the channel
     * itself -- Focal Length, which is `fov` through a lens conversion -- say
     * so themselves in `extra`, which is why this comes before the spread.
     */
    channel: ANIMATABLE.some((a) => a.key === key)
      ? (key as AnimatableKey)
      : undefined,
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
/**
 * An angle, shown inside the slider's range, written back without a spin.
 *
 * Rotations are free to run past a full turn -- the canvas drag adds degrees
 * and never wraps, and a preset can wind the phone round twice on purpose --
 * so the stored number can sit far outside the row's range. Shown raw, the
 * readout said -398 and the knob had nowhere on the track to be.
 *
 * READ as the equivalent angle inside the range. WRITTEN as the equivalent of
 * the slider's value nearest to what is stored: taking -398 to -38 literally
 * would ask the stage to spring a full turn to get there, and the first touch
 * of the slider would spin the phone once before it moved where you meant.
 */
const wrapInto = (v: number, r: Range) => {
  let x = v;
  while (x > r.max) x -= 360;
  while (x < r.min) x += 360;
  return x;
};
/*
 * Of the angles equal to `target` whole turns apart, the nearest to what is
 * stored -- among those that READ BACK as `target`. On a narrow range that is
 * plain nearest-turn. On Y's ±360 it matters: 0 typed with the phone at 180
 * would otherwise be written as 360, which is in range, so the row showed 360
 * and the typed number looked ignored.
 */
const nearestTurn = (target: number, current: number, r: Range) => {
  const k0 = Math.round((current - target) / 360);
  let best = target;
  for (let k = k0 - 2; k <= k0 + 2; k++) {
    const c = target + 360 * k;
    if (wrapInto(c, r) !== target) continue;
    if (
      wrapInto(best, r) !== target ||
      Math.abs(c - current) < Math.abs(best - current)
    )
      best = c;
  }
  return best;
};

const triple = (
  prefix: string,
  keys: readonly [
    keyof EditorState & string,
    keyof EditorState & string,
    keyof EditorState & string,
  ],
  ranges: readonly [Range, Range, Range],
  format: (n: number) => string,
  angles = false,
): Field[] =>
  (["X", "Y", "Z"] as const).map((axis, i) => {
    const key = keys[i];
    return scalar(`${prefix} ${axis}`, key, ranges[i], format, {
      axis,
      ...(angles
        ? {
            get: (s: EditorState) => wrapInto(s[key] as number, ranges[i]),
            set: (s: EditorState, n: number) => ({
              ...s,
              [key]: nearestTurn(n, s[key] as number, ranges[i]),
            }),
          }
        : {}),
    });
  });

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
const restore = (
  s: EditorState,
  keys: readonly (keyof EditorState)[],
): EditorState => {
  const next = { ...s };
  for (const k of keys) (next[k] as EditorState[typeof k]) = D[k];
  return next;
};

const TRANSFORM_KEYS = [
  "panX",
  "panY",
  "panZ",
  "xAxis",
  "yAxis",
  "zAxis",
  // `zoom` is the row the Scale group draws; the three axis scales are the
  // stretch behind it, which a preset can still have moved. Reset means all of
  // them, or a shot could return to neutral and stay stretched.
  "zoom",
  "scaleX",
  "scaleY",
  "scaleZ",
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
export const resetTransform = (s: EditorState): EditorState =>
  restore(s, TRANSFORM_KEYS);

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
          true,
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
            // The row reads as openness and the channel is closedness; the
            // keyframe stores the state value, so this is still `fold`.
            channel: "fold",
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
            // `fov` seen through a lens conversion. The row's own key is a
            // React key, so the channel has to be said outright.
            channel: "fov",
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
    icon: "depth-of-field",
    sections: [
      {
        fields: [
          {
            kind: "select",
            label: "Mode",
            key: "mode",
            options: BLUR_MODES,
            get: (s) => s.blur.mode,
            // Through `applyMode`, so a mode opens on numbers that read for it
            // rather than on whatever the last mode left behind.
            set: (s, id) => ({ ...s, blur: applyMode(s.blur, id as BlurMode) }),
          },
          blurNum(
            "Strength",
            "strength",
            { min: 0, max: 100, step: 1 },
            (n) => `${Math.round(n)}`,
          ),
          blurNum(
            "Size",
            "focusSize",
            { min: 0, max: 1, step: 0.01 },
            fmt.plain,
          ),
          blurNum(
            "Falloff",
            "falloff",
            { min: 0, max: 1, step: 0.01 },
            fmt.plain,
          ),
          {
            ...blurNum(
              "Angle",
              "angle",
              { min: 0, max: 360, step: 1 },
              fmt.deg,
            ),
            // A circle has no direction.
            when: (s) =>
              s.blur.mode === "directional" || s.blur.mode === "tilt-shift",
          },
        ],
      },
      {
        title: "Focus Position",
        fields: [
          {
            kind: "point",
            label: "Focus Position",
            key: "focus",
            get: (s) => ({ x: s.blur.focusX, y: s.blur.focusY }),
            set: (s, p) => ({
              ...s,
              blur: { ...s.blur, focusX: p.x, focusY: p.y },
            }),
          },
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
    // On means radial -- the mode that answers "depth of field" -- and the
    // mode dropdown is where the other two live.
    toggle: (s, on) =>
      on
        ? {
            ...s,
            blur: applyMode(
              s.blur,
              s.blur.mode === "off" ? "radial" : s.blur.mode,
            ),
          }
        : { ...s, blur: { ...s.blur, mode: "off" } },
    /*
     * Reset and dirty measure against the CURRENT mode's defaults, not the
     * global ones: those hold the mode-off numbers, so a generic reset would
     * move strength somewhere no mode opens at, and the header would light
     * its reset glyph the moment the effect was switched on.
     */
    reset: (s) => ({
      ...s,
      blur: {
        ...applyMode(s.blur, s.blur.mode === "off" ? "radial" : s.blur.mode),
        bokeh: false,
        focusX: 0.5,
        focusY: 0.5,
      },
    }),
    dirty: (s) => {
      const base = applyMode(s.blur, s.blur.mode);
      return (
        Math.abs(s.blur.focusX - 0.5) > 1e-6 ||
        Math.abs(s.blur.focusY - 0.5) > 1e-6 ||
        (["strength", "focusSize", "falloff", "angle"] as const).some(
          (k) => Math.abs(s.blur[k] - base[k]) > 1e-6,
        )
      );
    },
  },
  {
    id: "lighting",
    /*
     * How the shot is LIT, so it belongs with the model and the lens rather
     * than among the things painted behind it — same reasoning as the shadow
     * below, which is also thrown by the phone rather than laid under it.
     */
    group: "stage",
    name: "Lighting",
    icon: "lighting",
    sections: [
      {
        fields: [
          {
            kind: "choice",
            label: "Rig",
            key: "lighting",
            /*
             * Read from `LIGHTING_PRESETS` rather than restated here.
             *
             * Same rule as the ranges at the top of this file: the domain
             * already knows what the presets are, and a second list would be
             * one that drifts. Adding a preset there makes it appear here.
             */
            options: LIGHTING_PRESETS.map((preset) => ({
              id: preset.id,
              label: preset.label,
            })),
            get: (s) => s.lighting,
            // Only the rig: the direction it comes from is its own, and stays.
            set: (s, id) => ({ ...s, lighting: id as EditorState["lighting"] }),
          },
        ],
      },
      {
        title: "Light Direction",
        fields: [
          /*
           * Where the light comes from, on the same pad as the blur's focus:
           * across turns the rig round the phone (−180° to 180°), down tips it
           * from above (+60°) to below (−60°). Centre is the rig as authored.
           */
          {
            kind: "point",
            label: "Light Direction",
            key: "light-direction",
            get: (s) => ({
              x: ((s.lightAngle ?? 0) + 180) / 360,
              y: (60 - (s.lightElevation ?? 0)) / 120,
            }),
            set: (s, p) => ({
              ...s,
              lightAngle: Math.round(p.x * 360 - 180),
              lightElevation: Math.round(60 - p.y * 120),
            }),
          },
          // The same two numbers as rows, which is where their keyframe
          // diamonds live: a pad has no single value to key.
          scalar("Angle", "lightAngle", RANGES.lightAngle, fmt.deg),
          scalar("Height", "lightElevation", RANGES.lightElevation, fmt.deg),
        ],
      },
    ],
    /*
     * Never absent, like the transform and the lens: a scene is always lit by
     * something. So "on" means lit by something other than the default, and
     * taking it out is going back to Studio.
     */
    removable: false,
    isOn: (s) => layerIsDirty(getLayer("lighting")!, s),
    toggle: (s, on) =>
      on
        ? s
        : {
            ...s,
            lighting: DEFAULT_EDITOR_STATE.lighting,
            lightAngle: 0,
            lightElevation: 0,
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
    // The canvas itself: a colour or an image, and Transparent. Gradient and
    // Dots stay their own rows; the image lives in this popup, under the colour.
    name: "Canvas background",
    icon: "canvas-color",
    sections: [
      {
        fields: [
          {
            // Picking a colour is choosing a solid canvas, so it also turns
            // Transparent off.
            kind: "color",
            label: "Color",
            key: "color",
            get: (s) => s.background.color,
            set: (s, hex) => ({
              ...s,
              background: { ...s.background, kind: "solid", color: hex },
            }),
          },
          {
            kind: "toggle",
            label: "Transparent",
            key: "transparent",
            get: (s) => s.background.kind === "transparent",
            set: (s, on) => ({
              ...s,
              background: {
                ...s.background,
                kind: on ? "transparent" : "solid",
              },
            }),
          },
        ],
      },
    ],
    isOn: (s) => s.background.kind === "solid" || s.background.kind === "image",
    toggle: (s, on) => ({
      ...s,
      // Off is not "no background" as a missing thing — it is the transparent
      // one, which is a real choice in the registry and the one an export with
      // an alpha channel wants. On keeps an image if that is what the canvas
      // was showing.
      background: {
        ...s.background,
        kind: !on
          ? "transparent"
          : s.background.kind === "image"
            ? "image"
            : "solid",
      },
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
            set: (s, n) => ({
              ...s,
              background: { ...s.background, gradientAngle: n },
            }),
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
            set: (s, n) => ({
              ...s,
              background: { ...s.background, dotSize: n },
            }),
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
        // The arms are the same line and have to be written out per kind:
        // `Field` is a union, and until the `kind` is checked `set` is a
        // signature taking string OR number while `get` returns string AND
        // number, which no call can satisfy. The check is what pairs them up.
        (acc, f) =>
          f.kind === "color"
            ? f.set(acc, f.get(DEFAULT_EDITOR_STATE))
            : f.kind === "choice" || f.kind === "select"
              ? f.set(acc, f.get(DEFAULT_EDITOR_STATE))
              : f.kind === "toggle"
                ? f.set(acc, f.get(DEFAULT_EDITOR_STATE))
                : f.kind === "point"
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
        : // A named look is dirty or it is not; there is no tolerance to
          // apply to "Contrast" being a different answer from "Studio".
          f.kind === "choice" || f.kind === "select" || f.kind === "toggle"
          ? f.get(s) !== f.get(DEFAULT_EDITOR_STATE)
          : f.kind === "point"
            ? Math.abs(f.get(s).x - f.get(DEFAULT_EDITOR_STATE).x) > 1e-6 ||
              Math.abs(f.get(s).y - f.get(DEFAULT_EDITOR_STATE).y) > 1e-6
            : Math.abs(f.get(s) - f.get(DEFAULT_EDITOR_STATE)) > 1e-6,
    ),
  );
}

export type LayerId = string;

export function getLayer(id: LayerId): Layer | undefined {
  return LAYERS.find((l) => l.id === id);
}

/**
 * A layer read and written through Motion's own depth of field.
 *
 * The depth-of-field layer, with every get, set, test and toggle pointed at
 * `motionBlur` instead of `blur`: the same popup, the same rules, a separate
 * setting. Crafting keeps `blur` for its stills; Motion edits this one, and
 * it is what a composed move uses and follows.
 */
export function motionBlurLayer(layer: Layer): Layer {
  const view = (s: EditorState): EditorState => ({
    ...s,
    blur: s.motionBlur ?? DEFAULT_BLUR,
  });
  const back = (prev: EditorState, out: EditorState): EditorState => ({
    ...prev,
    motionBlur: out.blur,
  });
  const field = (f: Field): Field =>
    ({
      ...f,
      get: (s: EditorState) => f.get(view(s) as never),
      set: (s: EditorState, v: never) =>
        back(
          s,
          (f.set as (s: EditorState, v: never) => EditorState)(view(s), v),
        ),
      when: f.when ? (s: EditorState) => f.when!(view(s)) : undefined,
    }) as Field;
  return {
    ...layer,
    id: `motion-${layer.id}`,
    sections: layer.sections.map((section) => ({
      ...section,
      fields: section.fields.map(field),
    })),
    isOn: (s) => layer.isOn(view(s)),
    toggle: (s, on) => back(s, layer.toggle(view(s), on)),
    reset: layer.reset ? (s) => back(s, layer.reset!(view(s))) : undefined,
    dirty: layer.dirty ? (s) => layer.dirty!(view(s)) : undefined,
  };
}
