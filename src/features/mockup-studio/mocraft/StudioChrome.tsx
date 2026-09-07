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

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
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
  HeaderButton,
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
import { Stage } from "./Stage";
import { DEFAULT_RATIO_ID, useStudio, type Studio } from "./useStudio";
import { LAYERS, layerIsDirty, resetLayer, resetTransform, type Layer } from "./bindings";
import { DEVICES } from "../devices";
import { getMotionPreset } from "../editor/motionPresets";
import { DEFAULT_EDITOR_STATE } from "../editor/editorState";
import { STORE_RATIOS } from "../editor/framing";
import type { BroadcastState } from "../broadcast/useBroadcastLink";

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
/*
 * Eight tiles, eight real moves from `motionPresets`.
 *
 * The captions are the presets' own labels rather than the frame's. The file
 * draws two tiles captioned "Swirl" and two "Pan left in", which are mock
 * strings standing in for a gallery that did not exist yet — and a tile that
 * says "Pan In" while playing a push would be worse than one whose caption
 * moved. The artwork is kept exactly as exported; it is what distinguishes the
 * tiles at a glance, and the pairing below is by what each drawing depicts.
 */
const PRESETS = [
  { id: "push-in", art: "pan-in", w: 387, h: 387 },
  { id: "pull-back", art: "pan-out", w: 200, h: 232 },
  { id: "slide-in", art: "pan-left", w: 200, h: 232 },
  { id: "turntable", icon: "macbook", rotate: -20.53 },
  { id: "pan-across", icon: "laptop" },
  { id: "hero-orbit", art: "swirl", w: 194, h: 222 },
  { id: "crane-down", art: "sweep", w: 200, h: 232 },
  { id: "hero", art: "sweep", w: 200, h: 232 },
] as const;

type Preset = (typeof PRESETS)[number];

function PresetTile({
  preset,
  label,
  selected,
  onClick,
}: {
  preset: Preset;
  label: string;
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
        {label}
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
 * source, the wording and both actions arrive as props.
 *
 * The file input is the element's own rather than a shared one on the page:
 * two wells can be mounted at once (the rail's panel beside the popup), and a
 * single hidden input would hand a picked file to whichever of them wired it
 * up last.
 *
 * No padding of its own: the frame runs this block at the panel's full 234,
 * the same inset the header already sits on.
 */
function ImageWell({
  src,
  empty,
  onPick,
  onClear,
}: {
  src: string | null;
  empty: string;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

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
        {src ? (
          /*
           * A plain `img`, not `next/image`. The source is a data URL of a file
           * the browser already holds — there is no origin to fetch it from and
           * nothing for the optimiser to do but refuse it.
           */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-full w-full object-contain"
            style={{ pointerEvents: "none" }}
          />
        ) : (
          <span className="mo-code" style={{ color: "var(--mo-ink-muted)" }}>
            {empty}
          </span>
        )}
      </div>
      <div className="flex items-center" style={{ gap: 6 }}>
        <Button grow onClick={() => input.current?.click()}>
          Upload
        </Button>
        <Button width={44} height={44} title="Remove image" onClick={onClear}>
          <Glyph>
            <Icon name="trash" />
          </Glyph>
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        // Video as well as stills: `useScreenTexture` takes either, and a
        // moving screen is the thing this studio is for.
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onPick(file);
          // Cleared so picking the SAME file again still fires a change.
          event.currentTarget.value = "";
        }}
      />
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
 * The add / remove glyph: a plus whose upright retracts into a minus.
 *
 * It used to be a plus rotated 45 degrees into a cross, on the reasoning that
 * the two are the same three strokes at a different angle and so can actually
 * interpolate. True, and the wrong pair: a cross beside a row means "close
 * this", and the row is not a thing to be closed — it is an effect that is in
 * the composition or is not. Plus and minus are that pair, and they turn out to
 * interpolate even more directly: they ARE the same mark, one with its upright
 * and one without, so the change is a single stroke retracting into the other.
 *
 * Which is why the plus is drawn here rather than taken from `expand.svg`. An
 * image cannot animate half of itself. The geometry is that file's, read off
 * it and not approximated — a 20 box, arms 4 to 16, a 1.333 stroke, and the
 * 0.667 radius that rounds its ends. Rendered at rest the two are the same
 * pixels.
 *
 * The upright animates by its `y` and `height` rather than a transform: an SVG
 * child needs `transform-box` set before a percentage origin means anything,
 * and two numbers that meet at the centre need no origin at all.
 */
const PLUS = { min: 4, max: 16, thickness: 4 / 3, radius: 2 / 3 } as const;

function ToggleGlyph({ on }: { on: boolean }) {
  // 1 is the full upright, 0 is none of it.
  const { value: upright } = useSpring(on ? 0 : 1);
  const span = PLUS.max - PLUS.min;
  const centre = (PLUS.min + PLUS.max) / 2;

  return (
    <span
      className="grid place-items-center"
      style={{ width: control.icon, height: control.icon }}
    >
      <svg
        viewBox="0 0 20 20"
        width={control.icon}
        height={control.icon}
        aria-hidden
        fill="currentColor"
      >
        <rect
          x={PLUS.min}
          y={centre - PLUS.thickness / 2}
          width={span}
          height={PLUS.thickness}
          rx={PLUS.radius}
        />
        <rect
          x={centre - PLUS.thickness / 2}
          y={centre - (span / 2) * upright}
          width={PLUS.thickness}
          height={span * upright}
          rx={PLUS.radius}
        />
      </svg>
    </span>
  );
}

/**
 * The popup header's three acts, as the file draws them.
 *
 * Reset and delete were a drawn approximation until the designer exported this
 * set — three 20x20 frames meant to sit in one header — and the set answers a
 * question the approximation had got wrong. They are NOT the same size: the
 * close's X spans 10.96 of its box, the reset's ring 12.8, the trash 14.6. A
 * ring of thin strokes and a solid X carry different weight at equal size, so
 * equal size is exactly what makes them look unequal; the file compensates by
 * drawing the lighter marks bigger, and the three read as peers because of it.
 *
 * Which is why these are the exported assets and not geometry rebuilt here:
 * that balance is a judgement per glyph, not a rule that can be derived.
 *
 * The set's Close is byte-identical to `close-rounded.svg`, already in the
 * file and already this header's close — so there is no fourth asset, and
 * nothing to reconcile.
 */
const HEADER_ICON = { reset: "header-reset", delete: "header-delete" } as const;

/**
 * What a crafting popup can do to itself, beside its close.
 *
 * Two verbs, and they are not the same one: reset puts every value back and
 * leaves the effect IN the composition, delete takes the effect out and leaves
 * the values alone. A drop shadow you have dialled in and want gone is the
 * second; one you have dialled into a corner and want to start again on is the
 * first. Collapsing them would lose whichever case the survivor was not.
 *
 * Delete closes the popup after it, because what the popup is a view of is no
 * longer part of the shot — the rail row it came from is still there to put it
 * back, lit as it was before.
 */
function LayerActions({
  layer,
  studio,
  onDone,
}: {
  layer: Layer;
  studio: Studio;
  onDone: () => void;
}) {
  const { state, edit } = studio;
  // The Image layer's body is an upload well rather than rows, so there is
  // nothing for a reset to walk and dropping the file is the only act it has.
  const hasFields = layer.sections.some((section) => section.fields.length > 0);

  return (
    <>
      {hasFields ? (
        <HeaderButton
          label={`Reset ${layer.name}`}
          disabled={!layerIsDirty(layer, state)}
          onClick={() => edit((prev) => resetLayer(layer, prev))}
        >
          <Icon name={HEADER_ICON.reset} />
        </HeaderButton>
      ) : null}
      {layer.removable === false ? null : (
        <HeaderButton
          label={`Delete ${layer.name}`}
          disabled={!layer.isOn(state)}
          onClick={() => {
            // The Image layer deletes by dropping the file — `toggle` only
            // changes which background is drawn and would leave the upload
            // behind, ready to reappear.
            edit((prev) => (hasFields ? layer.toggle(prev, false) : resetLayer(layer, prev)));
            onDone();
          }}
        >
          <Icon name={HEADER_ICON.delete} />
        </HeaderButton>
      )}
    </>
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

function Gizmo({ studio }: { studio: Studio }) {
  /*
   * The three angles the phone is actually at — the same fields the Transform
   * popup's Rotation rows and the canvas drag write, read straight off the
   * state rather than tracked beside it. There is one rotation in this studio
   * and this is a view of it, so the gizmo cannot fall out of step with the
   * shot however the shot was turned: slider, drag, preset or undo.
   *
   * Rebuilt only when an angle moves, because `GizmoCanvas` springs towards
   * whatever object it is handed and a fresh one every render would be a new
   * target sixty times a second.
   */
  const { xAxis, yAxis, zAxis } = studio.state;
  const rotation = useMemo(
    () => ({ x: xAxis, y: yAxis, z: zAxis }),
    [xAxis, yAxis, zAxis],
  );

  return (
    <div className="pointer-events-auto absolute" style={{ left: 16, bottom: 16 }}>
      <Glass
        shape="pill"
        width={GIZMO_SIZE}
        className="items-center justify-center"
        style={{ height: GIZMO_SIZE }}
      >
        <GizmoCanvas
          size={GIZMO_CANVAS}
          shape={GIZMO_SHAPE}
          rotation={rotation}
          onTurn={studio.turn}
          /* Double tap. `resetTransform` is the Transform row's own idea of
             neutral, so the gizmo and the stack cannot disagree about where
             the model started. One `edit`, so one undo brings the pose back
             if the tap was not meant. */
          onReset={() => studio.edit(resetTransform)}
          animation={studio.state.animation}
          playing={studio.playing}
          timeRef={studio.playheadRef}
        />
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
/**
 * What the pairing link is doing, in the words the panel can show.
 *
 * Keyed by `BroadcastState` so adding a state to the hook is a type error here
 * rather than a row that silently says nothing.
 */
const PAIRING_LABEL: Record<BroadcastState, string> = {
  idle: "Status",
  pairing: "Preparing",
  waiting: "Waiting",
  connecting: "Connecting",
  live: "Connected",
  failed: "Failed",
};

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

/**
 * A glyph for each device in the registry.
 *
 * The registry is the list — nine mock names have been replaced by the eleven
 * devices that actually load — so this only has to say which of the frame's
 * exported symbols each one wears. Keyed by id rather than by label, since the
 * label is what changes when a product is renamed.
 *
 * `image` for the flat card, which is not a device: it is an upload standing on
 * its own, and the frame's picture glyph is what it is.
 */
const DEVICE_ICONS: Record<string, string> = {
  "apple-iphone-17": "iphone",
  "apple-iphone-17-pro": "iphone",
  "apple-iphone-17-pro-max": "iphone",
  "apple-iphone-air": "iphone",
  "iphone-fold": "iphone",
  "apple-ipad-pro": "ipad-pro",
  "apple-macbook-neo": "laptop",
  "apple-macbook-pro-14": "macbook",
  "apple-imac-24": "imac",
  "apple-studio-display": "display-xdr",
  "image-card": "image",
};

/**
 * The finishes offered are the DEVICE'S, not a fixed three.
 *
 * The frame draws Cosmic Orange, Deep Blue and Silver, which is the iPhone 17
 * Pro's lineup and correct only while that phone is selected — an iMac comes in
 * seven other colours and no orange at all. `finishesFor` already resolves this
 * per device, so the panel asks the registry rather than holding a copy.
 *
 * The crafting stack and every popup in it now live in `bindings.ts`, beside
 * the state each row writes to. What was a `POPUPS` table of labels and mock
 * initial values is the same description with the other half filled in.
 */

/**
 * Node 66:1869, against the frame registry.
 *
 * Six of the seven rows name a ratio the editor already knows — the ids here
 * are `framing.RATIOS`'s own. The seventh is Custom, which the frame draws with
 * a chevron: it drills into the store presets, which are the sizes that come
 * with a pixel readout rather than a ratio, and are exactly what a chevron on a
 * ratio row promises.
 *
 * The pixel values are the frame's own, and they are what that ratio means at
 * 1080-class output.
 */
const CANVAS_SIZES = [
  { id: "16:9", name: "16:9", icon: "ratio-16-9", value: "1920 X 1080" },
  { id: "9:16", name: "9:16", icon: "ratio-9-16", value: "1080 X 1920" },
  { id: "3:4", name: "3:4", icon: "ratio-3-4", value: "1080 X 1440" },
  { id: "4:3", name: "4:3", icon: "ratio-4-3", value: "1440 X 1080" },
  { id: "1:1", name: "1:1", icon: "ratio-1-1", value: "1080 X 1080" },
  { id: "fill", name: "Fill", icon: "ratio-fill" },
  { id: "custom", name: "Custom", icon: "ratio-custom", drill: true },
];

/** Every ratio the store list offers, for the row that drills into them. */
const CUSTOM_IDS = new Set(STORE_RATIOS.map((r) => r.id));

export default function StudioChrome() {
  /*
   * The composition, and everything that acts on it. See `useStudio`.
   *
   * Every list below now comes from a registry and every slider writes into
   * this — the chrome holds no copy of the shot, only of which parts of it are
   * on screen.
   */
  const studio = useStudio();
  const { state, edit } = studio;

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
  const [menuOpen, setMenuOpen] = useState(false);
  /** Whether the canvas panel is showing its Custom page. Resets whenever the
      panel is put away, so it never reopens two levels deep. */
  const [customOpen, setCustomOpen] = useState(false);

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
      setCustomOpen(false);
    },
    [tool, panelOpen],
  );

  /*
   * Pairing runs only while its panel is up.
   *
   * `useBroadcastLink` opens a session and fetches a QR the moment it starts,
   * and a studio that never pairs should pay for neither. Stopping on the way
   * out releases the peer connection rather than leaving one open for the life
   * of the tab.
   *
   * `stop` is latched in a ref, and that is load-bearing rather than tidiness.
   * The hook rebuilds it whenever the session id changes — which is precisely
   * what STARTING a session does — so an effect that depended on it directly
   * would tear itself down the moment it succeeded, call `stop`, and start
   * again: an endless pair-and-hang-up loop for as long as the panel was open.
   * Depending on the one boolean that actually says whether pairing should be
   * running is the whole of the fix.
   */
  const { start: startPairing } = studio.broadcast;
  const stopPairing = useRef(studio.broadcast.stop);
  useEffect(() => {
    stopPairing.current = studio.broadcast.stop;
  });

  const pairing = panelOpen && tool === "remote";
  useEffect(() => {
    if (!pairing) return;
    startPairing();
    return () => stopPairing.current();
  }, [pairing, startPairing]);

  const [tab, setTab] = useState<"crafting" | "presets">("crafting");
  const [history, setHistory] = useState<"undo" | "reset" | "redo">("reset");

  /*
   * The three history glyphs are one control, so they are a `Segmented` — but
   * unlike every other switch in the interface, choosing one performs an action
   * rather than entering a state. The pill travels to whichever was pressed and
   * stays, which is what the frame draws; what changes is that pressing it now
   * steps the shot.
   */
  const runHistory = useCallback(
    (id: "undo" | "reset" | "redo") => {
      setHistory(id);
      if (id === "undo") studio.undo();
      else if (id === "redo") studio.redo();
      else studio.reset();
    },
    [studio],
  );

  /*
   * Which row is lit, and whether its popup is showing — the same split the
   * rail uses, for the same reason. Closing a popup is putting a panel away,
   * not forgetting which effect you were working on: the stack keeps your
   * place, and reopening it is one press on the row that is already selected.
   */
  const [selectedLayer, setSelectedLayer] = useState<string>("drop-shadow");
  const [popupOpen, setPopupOpen] = useState(true);

  /**
   * Add an effect or take it away — for real, now.
   *
   * Membership is not a list the chrome keeps any more; it is whatever the
   * composition says. `Layer.isOn` reads it out of the state and `Layer.toggle`
   * writes it back, so the stack cannot drift from what the stage is drawing,
   * and a shot restored from storage opens with the right rows already on.
   */
  const toggleLayer = useCallback(
    (layer: Layer) => {
      const on = layer.isOn(state);
      edit((prev) => layer.toggle(prev, !on));
      // Removing an effect puts its popup away — there is nothing left to edit
      // — but the row stays selected, because that is still where you were.
      setPopupOpen(!on);
      setSelectedLayer(layer.id);
    },
    [state, edit],
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

  /** Select a row, switching its effect on if it is not in the shot yet. */
  const openOrAdd = useCallback(
    (layer: Layer) => {
      if (!layer.isOn(state)) edit((prev) => layer.toggle(prev, true));
      setPopupOpen(layer.id === selectedLayer ? !popupOpen : true);
      setSelectedLayer(layer.id);
    },
    [state, edit, selectedLayer, popupOpen],
  );

  const [account, setAccount] = useState<"settings" | "sign-out">("settings");
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
        {/* The shot itself, under everything. See `Stage`. */}
        <Stage studio={studio} />

        <div className="pointer-events-none absolute inset-0">
          {/*
            The gizmo. FIRST in this stack so every panel paints above it:
            it is pinned to the corner while the device list is vertically
            centred, so the two meet at about 890px of viewport height and
            overlap below it. Paint order does not stop them colliding, it
            decides which survives — and a list you are reading beats a
            readout you glance at.
          */}
          <Gizmo studio={studio} />

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
          {/*
            Centred by inset and flex, never by `transform`.

            A transform on an ancestor makes that ancestor a BACKDROP ROOT: a
            `backdrop-filter` inside it can only sample what is painted within
            it, and what is painted within this one is the panel itself. So
            every glass surface in this cluster was frosting a transparent
            backdrop -- the blur landed on nothing, and the panel was reduced
            to its own fills over whatever showed through.

            That is why the gizmo, pinned to the corner with plain offsets and
            no transform, has always frosted correctly while the popups next to
            the composition never did, and why raising the radius kept changing
            nothing. `inset-y-0` plus `justify-center` puts the cluster in the
            same place with no transform to group the backdrop away.

            `pointer-events-none` on the full-height wrapper, `auto` on the
            content: the box now spans the viewport, and a transparent column
            down the side of the workspace would eat every drag on the shot.
          */}
          <div
            className="pointer-events-none absolute inset-x-0 flex justify-center"
            style={{ top: 16 }}
          >
            <div className="pointer-events-auto">
            <Segmented
              value={history}
              onChange={runHistory}
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
            className="pointer-events-none absolute inset-y-0 flex items-center"
            style={{ left: 16, gap: 16 }}
          >
            <Glass shape="rail" className="pointer-events-auto">
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
              <div className="pointer-events-auto flex flex-col items-center" style={{ gap: 8 }}>
                <Glass width={control.panelW}>
                  <AutoHeight token={customOpen ? `${tool}:custom` : tool}>
                    {tool === "devices" ? (
                      <RowGroup>
                        {DEVICES.map((d) => (
                          <Row
                            key={d.id}
                            icon={<Icon name={DEVICE_ICONS[d.id] ?? "iphone"} />}
                            selected={d.id === state.deviceId}
                            onClick={() => studio.pickDevice(d.id)}
                          >
                            {d.label}
                          </Row>
                        ))}
                      </RowGroup>
                    ) : null}

                    {tool === "finish" ? (
                      <RowGroup>
                        {studio.finishes.map((f) => (
                          <Row
                            key={f.id}
                            icon={<Swatch color={f.color} />}
                            selected={f.id === state.finishId}
                            onClick={() => studio.pickFinish(f.id)}
                          >
                            {f.label}
                          </Row>
                        ))}
                      </RowGroup>
                    ) : null}

                    {tool === "image" ? (
                      <div className="flex flex-col">
                        <Header
                          icon={<Icon name="image" />}
                          /* Delete, not reset: this panel IS the upload, so
                             the only thing to put back is nothing, and that is
                             a deletion however it is labelled. The well below
                             has the same act as a full-width button; this is
                             it in the header, where every other popup keeps
                             what it can do to itself. */
                          trailing={
                            <HeaderButton
                              label="Delete image"
                              disabled={!studio.screenSrc}
                              onClick={studio.clearScreen}
                            >
                              <Icon name={HEADER_ICON.delete} />
                            </HeaderButton>
                          }
                          closeIcon={<Icon name="close-rounded" />}
                          onClose={closePanel}
                        >
                          {/* The file's name once there is one: it is the only
                              thing that tells two screenshots apart. */}
                          <MorphText>{studio.screenName ?? "Image"}</MorphText>
                        </Header>
                        <ImageWell
                          src={studio.screenSrc}
                          empty="No screen yet"
                          onPick={studio.uploadScreen}
                          onClear={studio.clearScreen}
                        />
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
                          {studio.broadcast.qr ? (
                            /*
                              The real pairing code, as the SVG the session
                              returns. `dangerouslySetInnerHTML` because it IS
                              markup — our own, built from our own session id,
                              never anything a user typed.

                              The frame's exported QR stays as the state before
                              this arrives, so the panel is never a blank square
                              while the session is being set up.
                            */
                            <div
                              className="grid h-full w-full place-items-center [&>svg]:h-full [&>svg]:w-full"
                              aria-label="Pairing code"
                              role="img"
                              dangerouslySetInnerHTML={{ __html: studio.broadcast.qr }}
                            />
                          ) : (
                            <Image
                              src="/figma-assets/mockup-studio/qr.svg"
                              alt="Pairing code"
                              width={QR.size}
                              height={QR.size}
                              unoptimized
                              className="pointer-events-none absolute max-w-none"
                              style={{ left: QR.x, top: QR.y }}
                            />
                          )}
                        </div>
                        {/* `Header`, not `Row`: the frame draws Status at full
                            ink with nothing selected, and in a Row full ink IS
                            the selection — it would arrive with a pill. */}
                        <Header
                          trailing={<StatusDot connected={studio.broadcast.state === "live"} />}
                        >
                          {/* The frame says "Status", which is a heading rather
                              than an answer. The link knows which of six things
                              is true, and morphing between them is the same
                              move the popup title makes. */}
                          <MorphText>{PAIRING_LABEL[studio.broadcast.state]}</MorphText>
                        </Header>
                      </div>
                    ) : null}

                    {tool === "canvas" && !customOpen ? (
                      <RowGroup>
                        {CANVAS_SIZES.map((c) => (
                          <Row
                            key={c.id}
                            icon={<Icon name={c.icon} />}
                            value={c.value}
                            trailing={c.drill ? <Icon name="chevron" /> : undefined}
                            selected={
                              c.drill
                                ? CUSTOM_IDS.has(studio.ratioId)
                                : c.id === studio.ratioId
                            }
                            onClick={() =>
                              c.drill ? setCustomOpen(true) : studio.setRatioId(c.id)
                            }
                          >
                            {c.name}
                          </Row>
                        ))}
                      </RowGroup>
                    ) : null}

                    {tool === "canvas" && customOpen ? (
                      /* The frame's chevron promised somewhere to go. These are
                         the store sizes — the ones that come with a pixel count
                         rather than a bare ratio, which is what "custom" means
                         on a row that already lists every plain one above it. */
                      <div className="flex flex-col">
                        <Header
                          icon={<Icon name="ratio-custom" />}
                          /* Back to the frame the studio opens on. The
                             trailing glyph here is a chevron that goes UP a
                             level rather than a close, and reset is still the
                             other thing you can do to a panel — so it keeps
                             its place beside it. */
                          trailing={
                            <HeaderButton
                              label="Reset canvas size"
                              disabled={studio.ratioId === DEFAULT_RATIO_ID}
                              onClick={() => studio.setRatioId(DEFAULT_RATIO_ID)}
                            >
                              <Icon name={HEADER_ICON.reset} />
                            </HeaderButton>
                          }
                          /* Turned, not a second export. The rail's chevron
                             points the way a row drills IN, and this one is the
                             way back out — the same mark reversed, which is
                             what a back affordance is. */
                          closeIcon={
                            <span
                              className="grid place-items-center"
                              style={{ transform: "rotate(180deg)" }}
                            >
                              <Icon name="chevron" />
                            </span>
                          }
                          onClose={() => setCustomOpen(false)}
                        >
                          Custom
                        </Header>
                        <RowGroup>
                          {STORE_RATIOS.map((r) => (
                            <Row
                              key={r.id}
                              value={r.size}
                              selected={r.id === studio.ratioId}
                              onClick={() => studio.setRatioId(r.id)}
                            >
                              {r.label}
                            </Row>
                          ))}
                        </RowGroup>
                      </div>
                    ) : null}
                  </AutoHeight>
                </Glass>

                {/* Outside the panel in the frame, so a sibling rather than a
                    last row — and it belongs to one tool, not to the surface. */}
                {tool === "remote" ? (
                  <span className="mo-code" style={{ color: "var(--mo-ink-muted)" }}>
                    <MorphText>
                      {studio.broadcast.state === "live"
                        ? "Mirroring this phone"
                        : "Scan in the Mocraft app"}
                    </MorphText>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Right cluster: the mode switch over the open popup and the stack. */}
          <div
            className="pointer-events-none absolute inset-y-0 flex flex-col items-end justify-center [&>*]:pointer-events-auto"
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
                    trailing={<LayerActions layer={open} studio={studio} onDone={closePopup} />}
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
                    <ImageWell
                      src={state.background.imageSrc}
                      empty="No background image"
                      onPick={studio.uploadBackground}
                      onClear={studio.clearBackground}
                    />
                  ) : (
                    <div
                      className="flex flex-col"
                      style={{ gap: "var(--mo-space-2)", paddingBottom: 10 }}
                    >
                      {open.sections
                        // A section whose every row is out — the Lid on a
                        // device with no hinge — takes its title and its rule
                        // with it, rather than leaving a heading over nothing.
                        .map((section) => ({
                          ...section,
                          fields: section.fields.filter((f) => f.when?.(state) ?? true),
                        }))
                        .filter((section) => section.fields.length > 0)
                        .map((section, i) => (
                        <Fragment key={section.title ?? i}>
                          {i > 0 ? <Divider /> : null}
                          <ParamGroup title={section.title}>
                            {section.fields.map((f) =>
                              f.kind === "color" ? (
                                <ColorRow
                                  key={f.key}
                                  label={f.label}
                                  value={f.get(state)}
                                  onChange={(hex) => edit((prev) => f.set(prev, hex))}
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
                                  /* The frame's reset glyph, and it resets:
                                     back to whatever `DEFAULT_EDITOR_STATE`
                                     says this field is, which is the only
                                     definition of neutral there is. */
                                  trailing={
                                    f.reset ? (
                                      <button
                                        type="button"
                                        aria-label={`Reset ${f.label}`}
                                        className="grid cursor-pointer place-items-center"
                                        onClick={() =>
                                          edit((prev) => f.set(prev, f.get(DEFAULT_EDITOR_STATE)))
                                        }
                                      >
                                        <Icon name="reset-value" size={12} />
                                      </button>
                                    ) : undefined
                                  }
                                  value={f.get(state)}
                                  min={f.min}
                                  max={f.max}
                                  step={f.step}
                                  bare={f.bare}
                                  format={f.format}
                                  onChange={(n) => edit((prev) => f.set(prev, n))}
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
                    {/*
                      FLAT, not rows wrapped with their rule.

                      `RowGroup` finds the selection by looking for the child
                      whose `selected` is true and measures the column's boxes
                      by the same index. A `Fragment` around each row hides that
                      prop one level down, so nothing is ever found and the
                      travelling pill parks at zero — which is the selection
                      disappearing. A divider emitted as its own sibling counts
                      in both places and stays in step.
                    */}
                    {LAYERS.flatMap((l, i) => {
                      const on = l.isOn(state);
                      // Where the two halves meet — see `Layer.group`. Read off
                      // the rows rather than a counted index, so the rule lands
                      // in the right place whatever the order becomes.
                      const opensEffects =
                        i > 0 && l.group === "effect" && LAYERS[i - 1].group === "stage";
                      const row = (
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
                                toggleLayer(l);
                              }}
                              className="grid cursor-pointer place-items-center"
                            >
                              <ToggleGlyph on={l.id === selectedLayer} />
                            </button>
                          }
                          selected={l.id === selectedLayer}
                          onClick={() => openOrAdd(l)}
                        >
                          {l.name}
                        </Row>
                      );
                      return opensEffects
                        // 8 either side: a selected row's pill runs to the
                        // edge of its box, so a rule with no air reads as
                        // touching whichever row is lit next to it.
                        ? [<Divider key={`${l.id}-rule`} inset={8} />, row]
                        : [row];
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
                        key={preset.id}
                        preset={preset}
                        label={getMotionPreset(preset.id)?.label ?? preset.id}
                        selected={preset.id === studio.presetId}
                        // Applies the move AND plays it once. This shell has no
                        // transport, so a preset that only loaded keyframes
                        // would look like a tile that does nothing.
                        onClick={() => studio.pickPreset(preset.id)}
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
