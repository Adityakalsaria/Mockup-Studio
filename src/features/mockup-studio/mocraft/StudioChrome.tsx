"use client";

/**
 * The Mocraft studio chrome.
 *
 * Everything floating over the canvas: the wordmark, the history control, the
 * account menu, the tool rail, the device list, the crafting stack and the
 * axis gizmo. Not the canvas itself — the stage renders underneath this.
 *
 * There is deliberately almost no styling in here. Every surface is a `Glass`,
 * every list is a `RowGroup` of `Row`s, every selection travels on the lens the
 * design system already owns. Where the Figma frame and the system disagree on
 * a number — the rail is 60 wide there and 56 here, its items 44 tall against
 * 40 — the system wins, because the alternative is a second set of values that
 * looks close and drifts. The panel that gets rebuilt is `Glass`, not this.
 *
 * Positions ARE from the frame, since nothing in the system has an opinion
 * about where a panel sits. They are expressed against the edges rather than
 * as the frame's absolute offsets, so the chrome holds at other window sizes:
 * the right cluster ends 16px from the right in a 1728px frame, so it is
 * `right: 16` here rather than `left: 1196`.
 */

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Leva, useControls } from "leva";
import { GIZMO_SHAPE } from "./GizmoCanvas";
import {
  AutoHeight,
  Button,
  ColorRow,
  DesignSystem,
  Divider,
  Glass,
  Glyph,
  Header,
  MorphText,
  ParamGroup,
  ParamRow,
  RailItem,
  Row,
  RowGroup,
  Segmented,
  Swatch,
  useSpring,
} from "@/design/ui";
import { control, radius } from "@/design/system";

const ICONS = "/figma-assets/mockup-studio/icons";

/**
 * How tall the right-hand panel is, in either tab.
 *
 * Fixed, and shared: the two tabs are one surface with two contents, so a
 * height that followed the contents would make the panel jump on every switch
 * — and grow and shrink under the popup beside it as effects come and go.
 */
const STACK_HEIGHT = 600;

/**
 * The pairing code, scaled to fill the panel.
 *
 * The asset is 405 square with its 184 window opening at (110, 70). Filling
 * the panel's 234 of content is one scale factor applied to all four numbers,
 * derived rather than re-measured — re-typing them would be four magic numbers
 * that agree with each other only until one of them moves.
 */
const QR = {
  window: 234,
  get scale() {
    return this.window / 184;
  },
  get size() {
    return Math.round(405 * this.scale);
  },
  get x() {
    return Math.round(-110 * this.scale);
  },
  get y() {
    return Math.round(-70 * this.scale);
  },
};

/**
 * Stable, and that is load-bearing.
 *
 * Leva springs a panel toward `titleBar` from an effect keyed on that prop, and
 * this page re-renders on every frame of a selection spring. Built inline the
 * object is a new identity each time and the panel is dragged back to its start
 * continuously.
 */
const GIZMO_BAR = { title: "Gizmo" } as const;

/**
 * One exported glyph, at icon size.
 *
 * `unoptimized` because these are SVGs: Next's optimiser refuses them unless
 * the whole app opts into `dangerouslyAllowSVG`, and turning that on globally
 * to serve our own committed files is the wrong trade.
 */
/**
 * The motion presets, from the file's four rows of two.
 *
 * Each tile's artwork is exported larger than the square it sits in — the extra
 * is the drop shadow's room to fall. Clipped to the tile, as the QR is:
 * unclipped they bleed over their neighbours and, being images, take the click
 * on the way past.
 *
 * CENTRED at its natural size rather than placed by the frame's offsets. Those
 * offsets were measured against a 112 tile, and the tile is not 112 any more —
 * the panel is the system's 250 and two tiles share its 234 of content. The
 * offsets were centring the artwork to within three pixels anyway, so centring
 * says the same thing and keeps saying it at any tile width.
 *
 * Two tiles have no export because they are SF Symbols — and they are the same
 * two symbols the device list already ships, so they are drawn from `icons/`
 * with the frame's rotation rather than pulled again.
 */
const PRESETS = [
  { name: "Pan In", art: "pan-in", w: 387, h: 387 },
  { name: "Pan Out", art: "pan-out", w: 200, h: 232 },
  { name: "Pan left in", art: "pan-left", w: 200, h: 232 },
  { name: "Swirl", icon: "macbook", rotate: -20.53 },
  { name: "Pan left in ", icon: "laptop" },
  { name: "Swirl ", art: "swirl", w: 194, h: 222 },
  { name: "Top hero", art: "sweep", w: 200, h: 232 },
  { name: "Sweep", art: "sweep", w: 200, h: 232 },
] as const;

type Preset = (typeof PRESETS)[number];

function PresetTile({
  preset,
  selected,
  onClick,
}: {
  preset: Preset;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // A basis of "half the row minus the gap", so two per line — `flex-1`
      // in a wrapping container would put all eight on one line first.
      style={{ width: "calc(50% - 8px)" }}
      className="flex cursor-pointer flex-col items-center justify-end"
    >
      {/*
        No material of its own. The group's lens carries it and travels between
        tiles, the same way a selected row's does — a tile that painted its own
        would make the selection appear and disappear where everywhere else in
        the interface it moves.
      */}
      {/* `data-lens`: the selection covers the artwork, not the caption
          under it — the group measures this box rather than the whole tile. */}
      <div
        data-lens
        className="relative grid aspect-square w-full place-items-center overflow-hidden"
        style={{ borderRadius: "var(--mo-r-well)" }}
      >
        {"art" in preset ? (
          <Image
            src={`/figma-assets/mockup-studio/presets/${preset.art}.svg`}
            alt=""
            width={preset.w}
            height={preset.h}
            unoptimized
            className="pointer-events-none absolute max-w-none"
            style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 1 }}
          />
        ) : (
          <Image
            src={`${ICONS}/${preset.icon}.svg`}
            alt=""
            width={72}
            height={72}
            unoptimized
            className="pointer-events-none relative"
            style={{
              // The frame tilts this one, and its shadow is a filter on the
              // symbol rather than baked into an export — there is no export.
              transform: "rotate" in preset ? `rotate(${preset.rotate}deg)` : undefined,
              filter: "drop-shadow(0 0 40px rgb(0 0 0 / 0.3))",
              zIndex: 1,
            }}
          />
        )}
      </div>
      <span
        className="mo-code whitespace-nowrap"
        style={{
          color: selected ? "var(--mo-ink)" : "var(--mo-ink-muted)",
          filter: "var(--mo-text-shadow)",
        }}
      >
        {preset.name.trim()}
      </span>
    </button>
  );
}

/**
 * The image well: a preview, an upload, and a way to take it back off.
 *
 * The same body in two places — the rail's screen-image tool and the Image
 * layer's popup — because the file draws them the same. What differs is only
 * what they are an image OF, which is the caller's business and is why the
 * empty state takes its wording from a prop.
 *
 * No padding of its own: the frame runs this block at the panel's full 234,
 * the same inset the header already sits on.
 */
function ImageWell({ empty }: { empty: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {/* `--mo-field` is the system's tinted well — the same ground a numeric
          readout sits on, at the media corner rather than the row's. */}
      <div
        className="grid place-items-center overflow-hidden"
        style={{
          height: 132,
          borderRadius: "var(--mo-r-well)",
          background: "var(--mo-field)",
        }}
      >
        <span className="mo-code" style={{ color: "var(--mo-ink-muted)" }}>
          {empty}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 6 }}>
        <Button grow>Upload</Button>
        <Button width={44} height={44} title="Remove image">
          <Glyph>
            <Icon name="trash" />
          </Glyph>
        </Button>
      </div>
    </div>
  );
}

/**
 * The axis gizmo.
 *
 * Real geometry in its own canvas — see `GizmoCanvas`. The flat export it
 * replaces could only be tilted as a whole, which reads as a card turning; six
 * arms in a scene foreshorten against each other, which is the only reason a
 * gizmo tells you anything.
 *
 * Loaded with `ssr: false` because a WebGL context needs a document. The
 * fallback is the exported artwork at rest, so the corner is never empty and
 * never jumps size when the real one arrives.
 */
const GizmoCanvas = dynamic(() => import("./GizmoCanvas").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <Image
      src={`${ICONS}/gizmo.svg`}
      alt=""
      width={GIZMO_CANVAS}
      height={GIZMO_CANVAS}
      unoptimized
    />
  ),
});

/**
 * The add / remove glyph, which rotates rather than swaps.
 *
 * A plus and a cross are the same shape at 45 degrees — the same three strokes
 * through the same centre — so there is nothing to interpolate between them.
 * Cross-fading two separate exports throws that away: for a moment there are
 * two glyphs at different angles on top of each other, and the eye reads it as
 * a flicker rather than as one mark turning.
 *
 * So one asset, rotated. The exported cross is 4% longer in the arm than the
 * plus — half a pixel at icon size — which is the price of the geometry being
 * continuous, and cheap at that.
 *
 * The rotation rides `useSpring`, so it turns at the rate everything else in
 * the interface moves rather than on a transition of its own.
 */
function ToggleGlyph({ on }: { on: boolean }) {
  const { value: angle } = useSpring(on ? 45 : 0);

  return (
    <span
      className="grid place-items-center"
      style={{
        width: control.icon,
        height: control.icon,
        transform: `rotate(${angle}deg)`,
      }}
    >
      <Icon name="expand" />
    </span>
  );
}

/**
 * The gizmo's surface, and the canvas inside it.
 *
 * The canvas is three quarters of the surface — the ratio the 160 version had
 * — so the arms keep the same margin against the rim at any size. Derived, so
 * there is one number to change rather than two that have to agree.
 */
const GIZMO_SIZE = 112;
const GIZMO_CANVAS = Math.round(GIZMO_SIZE * 0.75);

function Gizmo() {
  // Defaults are `GIZMO_SHAPE`, so the panel opens on what the gizmo ships as
  // and every control reads as a delta. Nothing here writes back to the file.
  const shape = useControls("Gizmo", {
    thickness: { value: GIZMO_SHAPE.thickness, min: 0.01, max: 0.3, step: 0.005 },
    tip: { value: GIZMO_SHAPE.tip, min: 0.02, max: 0.5, step: 0.005 },
    arm: { value: GIZMO_SHAPE.arm, min: 0.2, max: 2, step: 0.05 },
    scale: { value: GIZMO_SHAPE.scale, min: 0.3, max: 2.5, step: 0.05 },
  });

  return (
    <div className="pointer-events-auto absolute" style={{ left: 16, bottom: 16 }}>
      <Glass
        shape="pill"
        width={GIZMO_SIZE}
        className="items-center justify-center"
        style={{ height: GIZMO_SIZE }}
      >
        <GizmoCanvas size={GIZMO_CANVAS} shape={shape} />
      </Glass>
    </div>
  );
}

/**
 * Close when the press lands anywhere else.
 *
 * `pointerdown`, not `click`: a press that starts outside should dismiss on the
 * way down rather than waiting for a release that may never come, and it beats
 * any handler inside the panel to it. The ref goes on whatever should NOT
 * dismiss — for the tool panels that is the rail as well as the panel itself,
 * or picking a tool would close the thing it just opened.
 *
 * `onDismiss` must be stable, or the listener is torn down and rebuilt on every
 * render — and this page renders on every frame of a spring.
 */
function useDismiss<T extends HTMLElement>(open: boolean, onDismiss: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onDismiss]);

  return ref;
}

/**
 * The pairing light: a 12px `Liquid Glass - Clear` in the frame.
 *
 * Amber there, which is a waiting state rather than a colour — so it reads
 * off `color.accent`, and turning it green when a phone actually connects is
 * one token away rather than one hex away.
 */
function StatusDot({ connected = false }: { connected?: boolean }) {
  return (
    <span
      className="block shrink-0"
      style={{
        width: 12,
        height: 12,
        borderRadius: "var(--mo-r-pill)",
        background: connected ? "var(--mo-accent-green)" : "var(--mo-accent-yellow)",
        boxShadow: "var(--mo-swatch-shadow)",
      }}
    />
  );
}

function Icon({ name, size = control.icon }: { name: string; size?: number }) {
  return (
    <Image src={`${ICONS}/${name}.svg`} alt="" width={size} height={size} unoptimized />
  );
}

/**
 * The five tools down the left edge, named for the glyph each one draws.
 *
 * The frame does not label them, so these come from reading the artwork: a
 * monitor with a phone over it, a colour fan, an image with a plus, a split
 * frame, two stacked rectangles. `title` is what a hover reveals, and is the
 * first thing to correct if any of those readings is wrong.
 */
const TOOLS = [
  { id: "devices", icon: "devices", title: "Devices" },
  { id: "finish", icon: "styles", title: "Finish" },
  { id: "image", icon: "add-image", title: "Screen image" },
  { id: "remote", icon: "duplicate", title: "Connect a phone" },
  { id: "canvas", icon: "layout", title: "Canvas size" },
] as const;

type Tool = (typeof TOOLS)[number]["id"];

const DEVICES = [
  { name: "iMac", icon: "imac" },
  { name: "iPad Pro", icon: "ipad-pro" },
  { name: "MacBook Neo", icon: "laptop" },
  { name: "MacBook Pro 14’", icon: "macbook" },
  { name: "Studio Display XDR", icon: "display-xdr" },
  { name: "iPhone 17", icon: "iphone" },
  { name: "iPhone 17 Pro", icon: "iphone" },
  { name: "iPhone 17 Pro Max", icon: "iphone" },
  { name: "Flat Canvas", icon: "iphone" },
];

/**
 * The crafting stack.
 *
 * Two states per row, and they are NOT the same thing:
 *
 *   on    the effect is part of the composition. Shown by the trailing glyph —
 *         `+` to add it, `×` to take it away — so several rows can be on at
 *         once, which is the state the system page's stack was drawn in.
 *   open  its popup is showing. Exactly one row at a time, and the one that
 *         wears the travelling pill and full ink.
 *
 * Folding them together is tempting because the studio frame happens to show a
 * composition with a single effect in it, where on and open coincide. They
 * come apart the moment a second effect is added.
 */
const LAYERS = [
  { id: "transform", name: "Transform", icon: "transform" },
  { id: "effects", name: "Effects", icon: "effects" },
  { id: "camera", name: "Camera", icon: "camera" },
  { id: "background", name: "Background", icon: "background" },
  { id: "drop-shadow", name: "Drop Shadow", icon: "drop-shadow" },
  { id: "gradient", name: "Gradient", icon: "gradient" },
  { id: "dots", name: "Dots", icon: "dots" },
  { id: "image", name: "Image", icon: "image" },
] as const;

type LayerId = (typeof LAYERS)[number]["id"];

/** Measured off node 66:1787. The swatch geometry is the system's, not the frame's. */
const FINISHES = [
  { name: "Cosmic Orange", color: "#ff6800" },
  { name: "Deep Blue", color: "#2a3148" },
  { name: "Silver", color: "#595959" },
];

/** Node 66:1869. `Fill` and `Custom` carry no pixel readout in the frame. */
const CANVAS_SIZES = [
  { name: "16:9", icon: "ratio-16-9", value: "1920 X 1080" },
  { name: "9:16", icon: "ratio-9-16", value: "1080 X 1920" },
  { name: "3:4", icon: "ratio-3-4", value: "1080 X 1440" },
  { name: "4:3", icon: "ratio-4-3", value: "1440 X 1080" },
  { name: "1:1", icon: "ratio-1-1", value: "1080 X 1080" },
  { name: "Fill", icon: "ratio-fill" },
  { name: "Custom", icon: "ratio-custom", drill: true },
];

/**
 * What each effect's popup contains, straight off the file's nine frames.
 *
 * A description rather than nine hand-built panels: they are the same three
 * pieces — a colour row, a slider row, a titled group — in different orders,
 * and written out longhand the ninth would drift from the first. One renderer
 * below reads this.
 *
 * `Rotation` is spelled correctly here; the file says "Roatation" in three
 * places, which is a typo rather than a name.
 */
type Field =
  | { kind: "color"; label: string; key: string; initial: string }
  | {
      kind: "param";
      label: string;
      key: string;
      /** Shown in a glyph box instead of the label column — X, Y, Z. */
      axis?: string;
      unit?: Unit;
      initial: number;
      /** The frame puts a reset glyph after the readout on these. */
      reset?: boolean;
      /** No label column: the section title already names it. */
      bare?: boolean;
    };

type Section = { title?: string; fields: Field[] };

type Unit = "" | "deg" | "mm" | "px" | "m";

const XYZ = (prefix: string, unit: Unit, initial: number) =>
  (["X", "Y", "Z"] as const).map<Field>((axis) => ({
    kind: "param",
    label: `${prefix} ${axis}`,
    key: `${prefix}.${axis}`,
    axis,
    unit,
    initial,
    reset: true,
  }));

const POPUPS: Partial<Record<LayerId, Section[]>> = {
  transform: [
    { title: "Location", fields: XYZ("location", "", 2.4) },
    { title: "Rotation", fields: XYZ("rotation", "deg", 45) },
    { title: "Scale", fields: XYZ("scale", "", 2.4) },
  ],
  camera: [
    {
      title: "Focal length",
      fields: [
        {
          kind: "param",
          label: "Focal length",
          key: "focal",
          unit: "mm",
          initial: 55,
          reset: true,
          // Titled "Focal length" and then labelled "Focal length" is the same
          // word twice, and it wrapped onto two lines in a 48px column.
          bare: true,
        },
      ],
    },
    {
      title: "Rotation",
      fields: (["X", "Y"] as const).map<Field>((axis) => ({
        kind: "param",
        label: `Rotation ${axis}`,
        key: `rotation.${axis}`,
        axis,
        initial: 2.4,
        reset: true,
      })),
    },
  ],
  // The file calls this one "Overlay popup"; it is the Effects row's panel.
  effects: [
    {
      fields: [
        { kind: "color", label: "Color", key: "color", initial: "#FF6800" },
        { kind: "param", label: "X", key: "x", initial: 2.4 },
        { kind: "param", label: "Y", key: "y", initial: 2.4 },
        { kind: "param", label: "Blur", key: "blur", initial: 2.4 },
        { kind: "param", label: "Opacity", key: "opacity", initial: 2.4 },
        { kind: "param", label: "Width", key: "width", initial: 2.4 },
        { kind: "param", label: "Height", key: "height", unit: "m", initial: 2.4 },
      ],
    },
  ],
  background: [
    { fields: [{ kind: "color", label: "Color", key: "color", initial: "#C9C9C9" }] },
  ],
  "drop-shadow": [
    {
      fields: [
        { kind: "color", label: "Color", key: "color", initial: "#000000" },
        { kind: "param", label: "X", key: "x", initial: 2.4 },
        { kind: "param", label: "Y", key: "y", initial: 2.4 },
        { kind: "param", label: "Blur", key: "blur", initial: 2.4 },
        { kind: "param", label: "Opacity", key: "opacity", initial: 2.4 },
        { kind: "param", label: "Spread", key: "spread", initial: 2.4 },
      ],
    },
  ],
  gradient: [
    {
      fields: [
        { kind: "color", label: "Top", key: "top", initial: "#000000" },
        { kind: "color", label: "Bottom", key: "bottom", initial: "#00FFD9" },
        { kind: "param", label: "Angle", key: "angle", unit: "deg", initial: 45 },
      ],
    },
  ],
  dots: [
    {
      fields: [
        { kind: "color", label: "Base", key: "base", initial: "#FF6800" },
        { kind: "color", label: "Dots", key: "dots", initial: "#FF6800" },
        { kind: "param", label: "Space", key: "space", unit: "px", initial: 45 },
      ],
    },
  ],
};

/**
 * What each unit's slider spans: min, max, step.
 *
 * A 2.4 on a 0-100 scale puts the knob two percent along and the row reads as
 * broken. These are ranges the values actually live in — the file's knob
 * positions are mock and cannot be measured back into a scale.
 */
const RANGES: Record<string, [number, number, number]> = {
  "": [0, 10, 0.1],
  deg: [0, 360, 1],
  mm: [10, 200, 1],
  px: [0, 100, 1],
  m: [0, 10, 0.1],
};

/** The readout's suffix. The number is the value; this is what it is measured in. */
const UNITS: Record<string, (n: number) => string> = {
  "": (n) => n.toFixed(1),
  deg: (n) => `${Math.round(n)}°`,
  mm: (n) => `${Math.round(n)} mm`,
  px: (n) => `${Math.round(n)}px`,
  m: (n) => `${n.toFixed(1)} m`,
};

/** Every field in every popup, flattened — the composition's opening state. */
function initialValues() {
  const numbers: Record<string, number> = {};
  const colors: Record<string, string> = {};
  for (const [id, sections] of Object.entries(POPUPS)) {
    for (const section of sections ?? []) {
      for (const f of section.fields) {
        if (f.kind === "color") colors[`${id}.${f.key}`] = f.initial;
        else numbers[`${id}.${f.key}`] = f.initial;
      }
    }
  }
  return { numbers, colors };
}


export default function StudioChrome() {
  const [device, setDevice] = useState("iPhone 17 Pro");
  /*
   * Which tab, and whether its panel is showing, are two different things.
   *
   * The rail is a tab bar: something is always selected, and dismissing the
   * panel does not un-choose it. Fold them into one nullable value and closing
   * the popup would also blank the rail, which reads as having lost your
   * place rather than having put a panel away.
   */
  const [tool, setTool] = useState<Tool>("devices");
  const [panelOpen, setPanelOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);

  const closePanel = useCallback(() => setPanelOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toolRef = useDismiss<HTMLDivElement>(panelOpen, closePanel);
  const menuRef = useDismiss<HTMLDivElement>(menuOpen, closeMenu);

  /*
   * Pick a tab; pressing the one already selected toggles its panel.
   *
   * Read from the render, not from inside an updater. A `setState` updater has
   * to be a pure function of its argument — React calls it twice in
   * development on purpose, to catch exactly this — and a toggle called twice
   * is a toggle that did nothing. That is why pressing the open tool appeared
   * dead rather than closing it, and why pressing it again did not reopen it.
   */
  const pickTool = useCallback(
    (id: Tool) => {
      setPanelOpen(id === tool ? !panelOpen : true);
      setTool(id);
    },
    [tool, panelOpen],
  );
  const [finish, setFinish] = useState("Cosmic Orange");
  const [size, setSize] = useState("1:1");
  const [tab, setTab] = useState<"crafting" | "presets">("crafting");
  const [history, setHistory] = useState<"undo" | "reset" | "redo">("reset");
  /*
   * The composition. This is the object a stage would read: which effects are
   * in play and what each is set to. Everything else on the right is a view of
   * it — the stack lists it, the popup edits one entry of it.
   */
  const [active, setActive] = useState<LayerId[]>(["drop-shadow"]);

  /*
   * Which row is lit, and whether its popup is showing — the same split the
   * rail uses, for the same reason. Closing a popup is putting a panel away,
   * not forgetting which effect you were working on: the stack keeps your
   * place, and reopening it is one press on the row that is already selected.
   */
  const [selectedLayer, setSelectedLayer] = useState<LayerId>("drop-shadow");
  const [popupOpen, setPopupOpen] = useState(true);

  /** Add an effect or take it away. Either way it becomes the selected row. */
  const toggleLayer = useCallback(
    (id: LayerId) => {
      const on = active.includes(id);
      setActive(on ? active.filter((x) => x !== id) : [...active, id]);
      // Removing an effect puts its popup away — there is nothing left to edit
      // — but the row stays selected, because that is still where you were.
      setPopupOpen(!on);
      setSelectedLayer(id);
    },
    [active],
  );

  const closePopup = useCallback(() => setPopupOpen(false), []);
  // The boundary is the popup AND the stack beside it: the stack is what opens
  // the popup, so a press there must not count as an outside press.
  // Armed only while the popup is actually on screen — otherwise a click in
  // Presets would close a popup nobody can see, and switching back would find
  // it shut.
  const popupRef = useDismiss<HTMLDivElement>(
    popupOpen && tab === "crafting",
    closePopup,
  );

  /** Select a row, adding its effect if it is not in the composition yet. */
  const openOrAdd = useCallback(
    (id: LayerId) => {
      setActive((current) => (current.includes(id) ? current : [...current, id]));
      setPopupOpen(id === selectedLayer ? !popupOpen : true);
      setSelectedLayer(id);
    },
    [selectedLayer, popupOpen],
  );
  const [account, setAccount] = useState<"settings" | "sign-out">("settings");
  const [motionPreset, setMotionPreset] = useState<string>("Pan In");
  const [values, setValues] = useState(initialValues);

  const setNumber = useCallback(
    (key: string, n: number) =>
      setValues((v) => ({ ...v, numbers: { ...v.numbers, [key]: n } })),
    [],
  );
  const setColor = useCallback(
    (key: string, hex: string) =>
      setValues((v) => ({ ...v, colors: { ...v.colors, [key]: hex } })),
    [],
  );
  const selected = LAYERS.find((l) => l.id === selectedLayer) ?? null;
  /*
   * The popup belongs to the crafting tab, and `popupOpen` outlives the switch.
   *
   * Gating it here rather than closing it on the way out is what makes coming
   * back feel like returning: Presets hides the popup, and Crafting brings back
   * the same effect still open. Closing it would have thrown that away, and
   * leaving it ungated showed a Drop Shadow panel next to a grid of camera
   * moves, which belongs to neither.
   */
  const open = popupOpen && tab === "crafting" ? selected : null;

  return (
    <>
      <DesignSystem />
      {/* Hidden rather than deleted: the values are settled and written into
          `GIZMO_SHAPE`, so the gizmo renders on them either way, and `hidden`
          is one word to flip when the next one needs judging in place. */}
      <Leva hidden collapsed titleBar={GIZMO_BAR} />
      <div
        className="relative h-dvh w-full overflow-hidden"
        style={{
          // The frame's ground: a flat base, a soft radial lift behind the
          // canvas, and the system's dot grid over both. The dots are what the
          // frost has to pick up — over flat colour the glass reads as a grey
          // rectangle and the whole material looks broken when it is fine.
          backgroundColor: "#e4e4e4",
          backgroundImage:
            "var(--mo-dots), radial-gradient(120% 55% at 50% 50%, rgb(233 233 233 / 0) 0%, rgb(233 233 233) 100%)",
          backgroundSize: "var(--mo-dots-pitch), auto",
        }}
      >
        {/*
          The stage goes here. Left empty on purpose: this file is the chrome,
          and the canvas is a different problem with a different owner.
        */}

        <div className="pointer-events-none absolute inset-0">
          {/*
            The gizmo. FIRST in this stack so every panel paints above it:
            it is pinned to the corner while the device list is vertically
            centred, so the two meet at about 890px of viewport height and
            overlap below it. Paint order does not stop them colliding, it
            decides which survives — and a list you are reading beats a
            readout you glance at.
          */}
          <Gizmo />

          {/*
            The wordmark is an alpha MASK in the frame, filled with #595959 —
            not artwork. Painted as an image it arrives in whatever colours the
            export happens to carry; masked, it is ink like every other mark on
            this page and follows the token.
          */}
          <div
            role="img"
            aria-label="Mocraft"
            className="pointer-events-auto absolute"
            style={{
              left: 32,
              top: 16,
              width: 110,
              height: 38,
              background: "var(--mo-ink)",
              maskImage: "url(/figma-assets/mockup-studio/wordmark.png)",
              WebkitMaskImage: "url(/figma-assets/mockup-studio/wordmark.png)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          />

          {/* History. Three glyphs, one selected — which is a switch, so it is
              `Segmented` rather than three buttons that behave like one. */}
          <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2" style={{ top: 16 }}>
            <Segmented
              value={history}
              onChange={setHistory}
              width={102}
              // 102x40 with 4 of padding leaves 94x32 — three 31/32/31 cells,
              // no gaps. The 16px glyph centred in the 32 gives the 8 the
              // frame annotates; it is a remainder, not a setting.
              height={32}
              /*
                No bend. `Segmented` draws its labels twice — once sharp, once
                inside the lens — and the lens displaces its copy. At 14px of
                text the two land close enough to read as one slightly warped
                word, which is the effect. A 16px glyph with 2px strokes is
                not that forgiving: the displaced copy separates from the sharp
                one and you see the symbol twice.

                Turning the bend off makes the copy sit exactly over the
                original, so they coincide. `AaveGlass` treats zero as an off
                switch, so this costs nothing rather than bending a little.
              */
              bend={0}
              options={[
                // 16, not the system's 20: this control is compact — the
                // frame draws 15-16px symbols in 31px cells — and at icon size
                // the middle glyph overruns the pill it sits in.
                { id: "undo", label: <Icon name="undo" size={16} /> },
                { id: "reset", label: <Icon name="reset" size={16} /> },
                { id: "redo", label: <Icon name="redo" size={16} /> },
              ]}
            />
          </div>

          <div
            ref={menuRef}
            className="pointer-events-auto absolute flex items-start"
            style={{ right: 16, top: 16, gap: 16 }}
          >
            {menuOpen ? (
            <Glass width={200}>
              <RowGroup>
                <Row
                  icon={<Icon name="settings" />}
                  selected={account === "settings"}
                  onClick={() => setAccount("settings")}
                >
                  Settings
                </Row>
                <Row
                  icon={<Icon name="sign-out" />}
                  selected={account === "sign-out"}
                  onClick={() => setAccount("sign-out")}
                >
                  Sign out
                </Row>
              </RowGroup>
            </Glass>
            ) : null}

            {/* The account chip. A round glass surface is `Glass shape="pill"`;
                its portrait is the one asset in this frame with no export. */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Account"
              className="cursor-pointer"
            >
              <Glass
                shape="pill"
                width={44}
                className="items-center justify-center"
                style={{ height: 44, padding: 0 }}
              >
                <Glyph>
                  <Icon name="duplicate" />
                </Glyph>
              </Glass>
            </button>
          </div>

          {/* Left cluster: the tool rail and the device list. */}
          <div
            ref={toolRef}
            className="pointer-events-auto absolute top-1/2 flex -translate-y-1/2 items-center"
            style={{ left: 16, gap: 16 }}
          >
            <Glass shape="rail">
              {/* The rail breathes: 8px between tools, where a list of labels
                  reads fine packed. The lens measures real boxes, so it simply
                  travels further. */}
              <RowGroup gap={8}>
                {TOOLS.map((t) => (
                  <RailItem
                    key={t.id}
                    icon={<Icon name={t.icon} />}
                    title={t.title}
                    selected={t.id === tool}
                    onClick={() => pickTool(t.id)}
                  />
                ))}
              </RowGroup>
            </Glass>

            {/*
              ONE surface, whose contents swap — not five panels that mount and
              unmount. Five would have nothing to animate between: each would
              appear at its own size and vanish at it. Sharing the surface makes
              the change a resize, which is what it looks like.

              One width for all five — the panel width, whatever the tool.
              The frame draws the finish and pairing panels at 200, but a
              surface that changed width as well as height on every switch is
              two things moving where one will do, and the panel reads as the
              same object more clearly when only its height answers to what is
              in it.
            */}
            {panelOpen ? (
              <div className="flex flex-col items-center" style={{ gap: 8 }}>
                <Glass width={control.panelW}>
                  <AutoHeight token={tool}>
                    {tool === "devices" ? (
                      <RowGroup>
                        {DEVICES.map((d) => (
                          <Row
                            key={d.name}
                            icon={<Icon name={d.icon} />}
                            selected={d.name === device}
                            onClick={() => setDevice(d.name)}
                          >
                            {d.name}
                          </Row>
                        ))}
                      </RowGroup>
                    ) : null}

                    {tool === "finish" ? (
                      <RowGroup>
                        {FINISHES.map((f) => (
                          <Row
                            key={f.name}
                            icon={<Swatch color={f.color} />}
                            selected={f.name === finish}
                            onClick={() => setFinish(f.name)}
                          >
                            {f.name}
                          </Row>
                        ))}
                      </RowGroup>
                    ) : null}

                    {tool === "image" ? (
                      <div className="flex flex-col">
                        <Header
                          icon={<Icon name="image" />}
                          closeIcon={<Icon name="close-rounded" />}
                          onClose={closePanel}
                        >
                          Image
                        </Header>
                        <ImageWell empty="No screen yet" />
                      </div>
                    ) : null}

                    {tool === "remote" ? (
                      <div className="flex flex-col">
                        {/*
                          Clipped to its window: the rest of the asset is the
                          shadow's room to fall, and on this panel it reads as a
                          second surface haloing the first. See `QR`.
                        */}
                        <div
                          className="relative shrink-0 overflow-hidden"
                          style={{ width: QR.window, height: QR.window }}
                        >
                          <Image
                            src="/figma-assets/mockup-studio/qr.svg"
                            alt="Pairing code"
                            width={QR.size}
                            height={QR.size}
                            unoptimized
                            className="pointer-events-none absolute max-w-none"
                            style={{ left: QR.x, top: QR.y }}
                          />
                        </div>
                        {/* `Header`, not `Row`: the frame draws Status at full
                            ink with nothing selected, and in a Row full ink IS
                            the selection — it would arrive with a pill. */}
                        <Header trailing={<StatusDot />}>Status</Header>
                      </div>
                    ) : null}

                    {tool === "canvas" ? (
                      <RowGroup>
                        {CANVAS_SIZES.map((c) => (
                          <Row
                            key={c.name}
                            icon={<Icon name={c.icon} />}
                            value={c.value}
                            trailing={c.drill ? <Icon name="chevron" /> : undefined}
                            selected={c.name === size}
                            onClick={() => setSize(c.name)}
                          >
                            {c.name}
                          </Row>
                        ))}
                      </RowGroup>
                    ) : null}
                  </AutoHeight>
                </Glass>

                {/* Outside the panel in the frame, so a sibling rather than a
                    last row — and it belongs to one tool, not to the surface. */}
                {tool === "remote" ? (
                  <span className="mo-code" style={{ color: "var(--mo-ink-muted)" }}>
                    Scan in the Mocraft app
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Right cluster: the mode switch over the open popup and the stack. */}
          <div
            className="pointer-events-auto absolute top-1/2 flex -translate-y-1/2 flex-col items-end"
            style={{ right: 16, gap: 16 }}
          >
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { id: "crafting", label: "Crafting" },
                { id: "presets", label: "Presets" },
              ]}
            />

            <div ref={popupRef} className="flex items-start" style={{ gap: 16 }}>
              {/*
                One popup, belonging to whichever effect is open. It is not a
                fixed panel with a changing title: close it and there is no
                popup, which is why `openLayer` can be null.
              */}
              {open ? (
                /* 250 stated, not inherited: every popup on this side is the
                   panel width whatever it holds, so a one-colour Background
                   and a three-group Transform are the same object resizing
                   vertically rather than two panels of different shapes. */
                <Glass width={control.panelW}>
                  {/*
                    Header and body together inside the spring, not just the
                    body: the popup is one surface, and animating its contents
                    while its own edge jumped would be worse than not animating
                    at all.
                  */}
                  <AutoHeight token={open.id}>
                    {/* The gap under the header is 16 for a popup of
                        parameters and 0 for the image well — the frame runs
                        that one's preview straight off the header. It rides on
                        this column, inside the spring, so the spring measures
                        it along with everything else. */}
                    <div
                      className="flex flex-col"
                      style={{ gap: open.id === "image" ? 0 : "var(--mo-space-4)" }}
                    >
                  <Header
                    icon={<Icon name={open.icon} />}
                    closeIcon={<Icon name="close-rounded" />}
                    onClose={() => setPopupOpen(false)}
                  >
                    {/*
                      The one label in the chrome that becomes a DIFFERENT
                      label rather than appearing or leaving: everything else
                      here is a fixed name in a list. Morphing it letter to
                      letter says the panel changed subject, where a cut says
                      a new panel arrived — and the panel itself has not.
                    */}
                    <MorphText>{open.name}</MorphText>
                  </Header>
                  {open.id === "image" ? (
                    /* `Background image` in the file — the same well as the
                       rail's tool, over the composition rather than the screen. */
                    <ImageWell empty="No background image" />
                  ) : (POPUPS[open.id] ?? []).length === 0 ? (
                    <div
                      className="grid place-items-center"
                      style={{ height: 72, paddingBottom: 10 }}
                    >
                      <span className="mo-code" style={{ color: "var(--mo-ink-muted)" }}>
                        No controls designed yet
                      </span>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col"
                      style={{ gap: "var(--mo-space-2)", paddingBottom: 10 }}
                    >
                      {(POPUPS[open.id] ?? []).map((section, i) => (
                        <Fragment key={section.title ?? i}>
                          {i > 0 ? <Divider /> : null}
                          <ParamGroup title={section.title}>
                            {section.fields.map((f) =>
                              f.kind === "color" ? (
                                <ColorRow
                                  key={f.key}
                                  label={f.label}
                                  value={values.colors[`${open.id}.${f.key}`]}
                                  onChange={(hex) => setColor(`${open.id}.${f.key}`, hex)}
                                />
                              ) : (
                                <ParamRow
                                  key={f.key}
                                  label={f.label}
                                  icon={
                                    f.axis ? (
                                      <span className="mo-label">{f.axis}</span>
                                    ) : undefined
                                  }
                                  trailing={
                                    f.reset ? <Icon name="reset-value" size={12} /> : undefined
                                  }
                                  value={values.numbers[`${open.id}.${f.key}`]}
                                  min={RANGES[f.unit ?? ""][0]}
                                  max={RANGES[f.unit ?? ""][1]}
                                  step={RANGES[f.unit ?? ""][2]}
                                  bare={f.bare}
                                  format={UNITS[f.unit ?? ""]}
                                  onChange={(n) => setNumber(`${open.id}.${f.key}`, n)}
                                />
                              ),
                            )}
                          </ParamGroup>
                        </Fragment>
                      ))}
                    </div>
                  )}
                    </div>
                  </AutoHeight>
                </Glass>
              ) : null}

              {tab === "crafting" ? (
                /*
                  Fixed, not the height of eight rows — see `STACK_HEIGHT`.

                  `key` is what makes the tab switch a switch. Both tabs render
                  a `Glass` holding a `RowGroup` at the same position, so React
                  reuses the instance rather than replacing it — and the lens
                  arrives still holding the spring state of the preset tile it
                  was on, then travels across the panel to find its row. Keyed
                  by tab, each tab gets its own group, and a group that has just
                  been born puts its lens where it belongs.
                */
                <Glass key="crafting" style={{ height: STACK_HEIGHT }}>
                  <RowGroup>
                    {LAYERS.map((l) => {
                      const on = active.includes(l.id);
                      return (
                        <Row
                          key={l.id}
                          icon={<Icon name={l.icon} />}
                          // Its own button: the row opens the effect, this adds
                          // or removes it, and a press on the glyph must not do
                          // both. `stopPropagation` is what keeps them apart.
                          trailing={
                            <button
                              type="button"
                              aria-label={`${on ? "Remove" : "Add"} ${l.name}`}
                              // The glyph follows SELECTION: the row you are
                              // editing offers to close, every other offers to
                              // open. Membership is carried by ink, which is
                              // one signal per state rather than two competing.

                              onClick={(event) => {
                                event.stopPropagation();
                                toggleLayer(l.id);
                              }}
                              className="grid cursor-pointer place-items-center"
                            >
                              <ToggleGlyph on={l.id === selectedLayer} />
                            </button>
                          }
                          selected={l.id === selectedLayer}
                          onClick={() => openOrAdd(l.id)}
                        >
                          {l.name}
                        </Row>
                      );
                    })}
                  </RowGroup>
                </Glass>
              ) : (
                /* Presets replaces the stack, not the column — the switch and
                   any open popup stay put. The system's 250, same as the
                   stack it replaces — the tiles share what is left. */
                <Glass key="presets" style={{ height: STACK_HEIGHT }}>
                  {/*
                    One group, not four rows of two: the lens travels between
                    whichever tiles are selected, and it can only do that if
                    every tile is its sibling. Wrapping turns the same column
                    into a grid, and the lens follows sideways as readily as
                    down because it goes to a measured box either way.
                  */}
                  <RowGroup wrap gap={16} radius={radius.well}>
                    {PRESETS.map((preset) => (
                      <PresetTile
                        key={preset.name}
                        preset={preset}
                        selected={preset.name === motionPreset}
                        onClick={() => setMotionPreset(preset.name)}
                      />
                    ))}
                  </RowGroup>
                </Glass>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
