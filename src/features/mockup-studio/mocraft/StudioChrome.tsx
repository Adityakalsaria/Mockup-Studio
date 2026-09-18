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

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { ColorPickerPanel } from "@/design/ColorPicker";
import Image from "next/image";
import dynamic from "next/dynamic";
import { GIZMO_SHAPE } from "./GizmoCanvas";
import {
  AutoHeight,
  Button,
  Checkbox,
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
  Tip,
  Swatch,
  useDismiss,
  useSpring,
} from "@/design/ui";
import { control, radius } from "@/design/system";
import { FRAME, INSET, Stage } from "./Stage";
import { GlassTuner } from "./GlassTuner";
import { backgroundCss } from "../backgrounds";
import { PANEL_H as TIMELINE_H, Timeline } from "./Timeline";
import { useStudio, type Studio } from "./useStudio";
import {
  LAYERS,
  layerIsDirty,
  motionBlurLayer,
  resetLayer,
  resetTransform,
  type Layer,
} from "./bindings";
import { DEVICES, getDevice } from "../devices";
import { getFinish } from "../finishes";
import { isVideoSource } from "../useScreenTexture";
import { isSnapKey, type SnapKey } from "./snapping";
import {
  DEFAULT_EASING,
  keyAt,
  sampleAnimation,
  type AnimatableKey,
} from "../animation";
import { useClerk, useUser } from "@clerk/nextjs";
import { getMotionPreset } from "../editor/motionPresets";
import { DEFAULT_EDITOR_STATE } from "../editor/editorState";
import type { BroadcastState } from "../broadcast/useBroadcastLink";

const ICONS = "/figma-assets/mockup-studio/icons";

/**
 * Where the side clusters start: under the top bar, whose tallest piece is the
 * 44 account chip at 16 — plus the 16 every surface stands off the next.
 */
const SIDE_TOP = 16 + 44 + 16;

/**
 * The stack's two halves. Always listed: the things every shot has — where
 * the phone is, the lens, the light — and its background colour. Everything
 * else is an effect, listed only once it is added from the Effects menu.
 */
const BASE_IDS = ["transform", "camera", "lighting"];
const BASE_LAYERS = BASE_IDS.map((id) => LAYERS.find((l) => l.id === id)!);
/** The rows the Motion tab carries above its presets: the channels a preset
    animates, so a picked move can be adjusted without leaving the tab. */
const MOTION_IDS = ["transform", "camera", "lighting"];
const MOTION_LAYERS = BASE_LAYERS.filter((l) => MOTION_IDS.includes(l.id));
/** Depth of field, in Motion too: it is part of how a move is shot, and
    tuning it should not mean leaving the tab. The same layer and popup as
    Crafting's, so the two tabs share one setting. */
const MOTION_DOF = motionBlurLayer(
  LAYERS.find((l) => l.id === "depth-of-field")!,
);
/** Every layer whose popup Motion may show. */
const MOTION_POPUP_IDS = [...MOTION_IDS, MOTION_DOF.id];
/** The Motion tab's fourth row, which opens the preset grid in the popup's
    place. Not a layer -- it edits nothing -- but selected and opened the same
    way, so it lights, toggles and dismisses like its neighbours. */
const PRESETS_ID = "presets";
/** The Motion row that opens the focus-camera panel. Selected and opened the
    same way as Presets. */
const FOCUS_ID = "focus";
/** The timeline's slide in and out of the bottom edge. */
const TIMELINE_MS = 320;
const TIMELINE_CURVE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** For everything positioned off the timeline's reserve, so it moves with
    the slide instead of jumping ahead of it. */
const RESERVE_EASE = `bottom ${TIMELINE_MS}ms ${TIMELINE_CURVE}`;
/** Everything else the stack can add -- except the canvas colour, which is
    the rail's Canvas color tool and nowhere else. */
const EFFECT_LAYERS = LAYERS.filter(
  (l) => !BASE_IDS.includes(l.id) && l.id !== "background",
);

/**
 * A menu of rows, opened from a trigger: the Effects plus and the dropdowns in
 * a popup.
 *
 * Portalled to the body, for the reason `ColorPicker` gives — the panels
 * scroll and clip, and a menu inside one would be cut off at its edge.
 * Absolute in page coordinates with no z-index, so the glass still has a
 * backdrop to frost.
 *
 * `side` opens it beside the panel the trigger sits in, where every popup from
 * the stack opens, level with the trigger — hanging under the Effects plus put
 * the menu across the rows it adds to. `below` drops it under the trigger at
 * the trigger's width, which is what a dropdown inside a popup wants.
 */
type MenuItem = {
  id: string;
  label: string;
  icon?: string;
  selected?: boolean;
};

function MenuPopover({
  anchor,
  items,
  label,
  placement,
  onPick,
  onClose,
}: {
  anchor: RefObject<HTMLDivElement | null>;
  items: MenuItem[];
  label: string;
  placement: "side" | "below";
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const trigger = anchor.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const h = rootRef.current?.offsetHeight ?? 0;
      const M = 8;
      if (placement === "side") {
        const w = control.panelW;
        const panel =
          trigger.closest(".mo-glass")?.getBoundingClientRect() ?? rect;
        // Level with the trigger, but never hanging below the panel it
        // came from -- a row near the foot of the panel opened a menu that
        // ran on past it.
        const top = Math.max(
          M,
          Math.min(rect.top - 8, panel.bottom - h, window.innerHeight - M - h),
        );
        // Toward the middle of the window: a panel on the right opens its
        // menu to its left, one on the left -- the rail's -- to its right.
        const onLeftHalf = panel.left + panel.width / 2 < window.innerWidth / 2;
        const left = onLeftHalf
          ? Math.min(window.innerWidth - M - w, panel.right + 16)
          : Math.max(M, panel.left - 16 - w);
        setPos({
          left: left + window.scrollX,
          top: top + window.scrollY,
          width: w,
        });
        return;
      }
      // Under the trigger, or over it when there is no room below.
      const below = rect.bottom + 4;
      const top =
        below + h > window.innerHeight - M
          ? Math.max(M, rect.top - 4 - h)
          : below;
      setPos({
        left: rect.left + window.scrollX,
        top: top + window.scrollY,
        width: rect.width,
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor, placement, items.length]);

  useEffect(() => {
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || anchor.current?.contains(target))
        return;
      onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={rootRef}
      role="menu"
      aria-label={label}
      style={{
        position: "absolute",
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      // The popup's dismiss boundary does not include the body, so a press
      // here must not read as a press outside it.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Glass width={pos?.width}>
        <RowGroup>
          {items.map((item) => (
            <Row
              key={item.id}
              icon={item.icon ? <Icon name={item.icon} /> : undefined}
              selected={item.selected}
              onClick={() => onPick(item.id)}
            >
              {item.label}
            </Row>
          ))}
        </RowGroup>
      </Glass>
    </div>,
    document.body,
  );
}

/**
 * A mode, as a row that opens its options: label at the left, the current
 * answer and a chevron at the right. Inset and type are `ColorRow`'s, so the
 * two sit in one popup as one kind of thing.
 */
function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const current = options.find((o) => o.id === value)?.label ?? value;
  return (
    <div ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center"
        style={{
          gap: "var(--mo-space-2)",
          padding: "6px var(--mo-space-2)",
          filter: "var(--mo-text-shadow)",
        }}
      >
        <span className="mo-title min-w-0 flex-1 text-left">{label}</span>
        <span className="mo-code shrink-0">
          <MorphText>{current}</MorphText>
        </span>
        <span
          className="grid place-items-center"
          style={{
            transform: `rotate(${open ? -90 : 90}deg)`,
            transition: "transform 150ms ease-out",
          }}
        >
          <Glyph muted>
            <Icon name="chevron" />
          </Glyph>
        </span>
      </button>
      {open ? (
        <MenuPopover
          anchor={ref}
          label={label}
          // Beside the popup, like every other menu here: dropped over the
          // popup it laid glass over the very sliders the mode governs.
          placement="side"
          items={options.map((o) => ({ ...o, selected: o.id === value }))}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
          onClose={close}
        />
      ) : null}
    </div>
  );
}

/** A switch, as the system's checkbox at the end of a `ColorRow`-shaped row. */
function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div
      className="flex w-full items-center"
      style={{
        gap: "var(--mo-space-2)",
        padding: "6px var(--mo-space-2)",
        filter: "var(--mo-text-shadow)",
      }}
    >
      <span className="mo-title min-w-0 flex-1">{label}</span>
      <Checkbox
        checked={value}
        label={label}
        icon={<Icon name="checkbox" />}
        checkedIcon={<Icon name="checkbox-checked" />}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * Where in the frame the sharp part sits: a square pad, crosshairs through
 * its middle, and a handle dragged (or pressed) into place. The point is a
 * share of the frame across and down, so the pad's shape does not have to be
 * the frame's. Double-click puts it back in the middle; arrow keys nudge it.
 */
function FocusPad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { x: number; y: number };
  onChange: (p: { x: number; y: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const place = (event: ReactPointerEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    onChange({
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp((event.clientY - box.top) / box.height),
    });
  };
  const HANDLE = 14;
  const rule = "color-mix(in srgb, var(--mo-ink) 14%, transparent)";
  return (
    <div style={{ padding: "0 var(--mo-space-2)" }}>
      <div
        ref={ref}
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(value.x * 100)}
        aria-valuetext={`${Math.round(value.x * 100)}% across, ${Math.round(value.y * 100)}% down`}
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          place(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            place(event);
        }}
        onDoubleClick={() => onChange({ x: 0.5, y: 0.5 })}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.1 : 0.02;
          const nudge: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const d = nudge[event.key];
          if (!d) return;
          event.preventDefault();
          onChange({ x: clamp(value.x + d[0]), y: clamp(value.y + d[1]) });
        }}
        className="relative w-full cursor-crosshair touch-none overflow-hidden"
        style={{
          // Square whatever the layout: a tall frame stretched the pad down the
          // popup, and the point is a share across and down either way.
          aspectRatio: "1",
          // A well's corner, like the image well — not a row's capsule, which
          // on a box this size read as a second panel inside the popup.
          borderRadius: "var(--mo-r-well)",
          background: "var(--mo-field)",
          boxShadow: `inset 0 0 0 1px ${rule}`,
        }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0"
          style={{ left: "50%", width: 1, background: rule }}
        />
        <span
          aria-hidden
          className="absolute inset-x-0"
          style={{ top: "50%", height: 1, background: rule }}
        />
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: HANDLE,
            height: HANDLE,
            left: `calc(${value.x * 100}% - ${HANDLE / 2}px)`,
            top: `calc(${value.y * 100}% - ${HANDLE / 2}px)`,
            background: "#fff",
            boxShadow: "var(--mo-knob-shadow)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * The part of a panel that gives up height when the window cannot fit it.
 *
 * `min-h-0` so the flex column lets it shrink below its contents, and the
 * scroll lives here rather than on the `Glass`, so the surface's padding and
 * anything pinned under this (the export row) stay put while the rows move.
 */
function PanelScroll({ children }: { children: ReactNode }) {
  /*
   * Scrolls only when the window is too short for the panel — and only then
   * carries the room below.
   *
   * A scroll box clips, and the selected pill's rim sits a few px outside its
   * row while its drop shadow falls ~32 under it (`PILL_DROP`: 13.4 down,
   * 18.5 of blur). Clipped at the rows, both were cut square. The room fixes
   * that, but as a constant it was 32 of empty glass under every panel and
   * popup in a window with space to spare — where nothing scrolls, nothing
   * clips, and none of it is needed.
   *
   * Measured on the inner column against the box, less the room while it is
   * there, so adding the room cannot itself keep the box scrolling.
   */
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () =>
      setScrolls((was) => {
        const room = was ? ROOM.top + ROOM.bottom : 0;
        return inner.offsetHeight > outer.clientHeight - room + 1;
      });
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={outerRef}
      className="mo-noscroll flex min-h-0 flex-col"
      style={
        scrolls
          ? {
              overflowY: "auto",
              // The glass's own 8 moved inside the box so the clip edge is
              // the glass's edge, handed back by the margin — except below,
              // where giving it back would slide the export row up under
              // the last row.
              padding: `${ROOM.top}px 8px ${ROOM.bottom}px`,
              margin: `-${ROOM.top}px -8px 0`,
              // The same room for `scrollIntoView`, which otherwise parks a
              // row flush on the clip edge.
              scrollPadding: `${ROOM.top}px 8px ${ROOM.bottom}px`,
            }
          : undefined
      }
    >
      <div ref={innerRef} className="flex flex-col">
        {children}
      </div>
    </div>
  );
}

/** The room a scrolling panel keeps for the selected pill's rim and shadow. */
const ROOM = { top: 8, bottom: 32 };

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
/**
 * What the tile draws, for each preset the studio offers.
 *
 * EMPTY, on purpose. The eight that were here were the frame's placeholders,
 * pointed at whichever `MOTION_PRESETS` entries had roughly the right name —
 * so the artwork and the move it triggered were only loosely related, and the
 * grid was a sampler rather than a set anybody chose. They are being replaced
 * one at a time by moves built against real reference.
 *
 * The registry itself is untouched: `MOTION_PRESETS` still holds all 36 and
 * the old editor still lists them. This is only what the Mocraft chrome puts
 * in front of anyone.
 *
 * Typed rather than inferred from the array, so an empty list is still a list
 * of presets rather than a list of nothing.
 */
type Preset = {
  id: string;
  /** A drawing in `public/figma-assets/mockup-studio/presets`. */
  art?: string;
  /** Or a glyph from the icon set, when the file has no drawing for it. */
  icon?: string;
  w?: number;
  h?: number;
  rotate?: number;
};

/*
 * Reward Pop, and only Reward Pop.
 *
 * The six before it were moves written to a brief; this one is measured off
 * an animated reference, and it is the one worth putting in front of anyone.
 * The others are not deleted -- `MOTION_PRESETS` keeps them and the old
 * editor still lists them -- they are only no longer offered here.
 */
const PRESETS: Preset[] = [
  { id: "reward-pop", art: "swirl", w: 194, h: 222 },
  /*
   * Both tiles are borrowed from the imported set, which is what Reward Pop
   * did with `swirl`. `pan-in` would have suited the slide better and is
   * 386.783 square against these 200 x 232 -- in a square tile that clips and
   * centres at `max-w-none`, it would render at twice the size of its
   * neighbours and crop. Size won over name.
   */
  { id: "slide-up", art: "pan-out", w: 200, h: 232 },
  { id: "rotation-slide-up", art: "sweep", w: 200, h: 232 },
];

/*
 * Eight tiles fit the panel; anything past that scrolls.
 *
 * The cut has to land exactly on a row boundary, and only the layout knows
 * where that is: tiles are square and sized off the column width, so their
 * height depends on how wide the panel happens to be, and the caption under
 * the artwork adds a height nobody has written down. So it is measured rather
 * than assumed — the top of the ninth tile, less the gap above it, IS the
 * bottom edge of row four. Under nine tiles there is no ninth to measure and
 * no cap is set, which is also why the current six presets simply fill the
 * panel with no scrolling in sight.
 *
 * No scrollbar: the tiles already run to both edges of the panel and a gutter
 * appearing between them and the glass would be the only asymmetry in the
 * chrome. Wheel, trackpad and keyboard all still work.
 */
const VISIBLE_PRESETS = 8;

/** How far past the tiles the scroller's clip edge sits. See PresetScroller. */
const SCROLL_ROOM = 8;

function PresetScroller({
  gap,
  children,
}: {
  gap: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const tiles = el.querySelectorAll<HTMLElement>("[data-preset-tile]");
      const cut = tiles[VISIBLE_PRESETS];
      // `offsetTop` is measured against whichever ancestor is positioned, but
      // both tiles share it, so the difference is the layout distance either
      // way and there is nothing to resolve.
      setMaxHeight(
        cut
          ? cut.offsetTop - tiles[0].offsetTop - gap + SCROLL_ROOM * 2
          : undefined,
      );
    };

    measure();
    // Panels resize with the window, and a narrower column means squarer
    // tiles means a different row boundary.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [gap, children]);

  return (
    <div
      ref={ref}
      className="mo-noscroll"
      /*
       * Room for the selection to be drawn in full.
       *
       * A scroller clips on BOTH axes whatever overflow it was asked for, and
       * a selected tile's lens is drawn a little wider than the tile -- so at
       * the edge of the grid its outer side and its foot were sliced off. The
       * padding and the matching negative margin are one gesture: they move
       * the clip edge out without moving a single tile. The row cap above
       * grows by the same amount, so the cut still lands on a row.
       */
      style={{
        maxHeight,
        overflowY: "auto",
        padding: SCROLL_ROOM,
        margin: -SCROLL_ROOM,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A preset's move, played on its tile's drawing while the tile is hovered.
 *
 * The REAL keyframes, not an illustration of them: the preset is built from a
 * neutral pose and sampled every frame, so what the tile shows is what picking
 * it will do — Reward Pop's turn and overshoot, Slide up's rise and untilt.
 * Mapped into the tile's 2D as rotations with perspective, a scale for zoom
 * and depth, and a translate for pan.
 *
 * Loops over the MOVE, not the clip. The presets carry a flat hold at the end
 * so an export has room to settle; in a 100px tile that is a second of nothing
 * per cycle, so the loop ends at the hold and pauses briefly instead.
 *
 * Written straight to the node's style: a state update per frame would
 * re-render the tile, and the lens renders every tile twice.
 */
function usePresetPreview(id: string, playing: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rest = () => {
      node.style.transition = "transform 200ms ease-out";
      node.style.transform = "";
    };
    const preset = getMotionPreset(id);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!playing || !preset || reduced) {
      rest();
      return;
    }

    const animation = {
      ...preset.build({
        xAxis: 0,
        yAxis: 0,
        zAxis: 0,
        zoom: 1,
        panX: 0,
        panY: 0,
        panZ: 0,
        fold: 0,
        fov: 0,
      }),
      easing: DEFAULT_EASING,
    };
    // Where each track stops moving: the start of its closing hold, if it has
    // one.
    const moveEnd = Math.max(
      ...Object.values(animation.tracks).map((keys) => {
        if (!keys?.length) return 0;
        const n = keys.length;
        return n > 1 && keys[n - 1].value === keys[n - 2].value
          ? keys[n - 2].time
          : keys[n - 1].time;
      }),
    );
    const period = moveEnd + 0.6;

    // Pixels per unit of pan: the drawing's phone is about 70 tall and a pan
    // of 5 is one phone height (see the Slide up preset), so ~14.
    const PAN_PX = 14;
    const started = performance.now();
    let frame = 0;
    node.style.transition = "none";
    const tick = (now: number) => {
      const t = ((now - started) / 1000) % period;
      const v = sampleAnimation(animation, Math.min(t, moveEnd));
      const scale = (v.zoom ?? 1) * (1 + (v.panZ ?? 0) * 0.4);
      node.style.transform = [
        `translate(${(v.panX ?? 0) * PAN_PX}px, ${(v.panY ?? 0) * PAN_PX}px)`,
        `rotateX(${v.xAxis ?? 0}deg)`,
        `rotateY(${v.yAxis ?? 0}deg)`,
        `rotateZ(${v.zAxis ?? 0}deg)`,
        `scale(${Math.max(0, scale)})`,
      ].join(" ");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      rest();
    };
  }, [id, playing]);

  return ref;
}

/**
 * Every shortcut the studio answers to, by where it works. Kept to what the
 * code actually does -- the keyboard effect below, the canvas drag in
 * `PhoneStage3D`, the timeline and the gizmo -- so this is a list to read,
 * not a promise.
 */
const SHORTCUTS: { title: string; items: [string[], string][] }[] = [
  {
    title: "General",
    items: [
      [["⌘", "Z"], "Undo"],
      [["⇧", "⌘", "Z"], "Redo"],
      [["Esc"], "Close a menu"],
    ],
  },
  {
    title: "Motion",
    items: [
      [["Space"], "Play / pause"],
      [["B"], "Playhead to the start"],
      [["E"], "Playhead to the end"],
    ],
  },
  {
    title: "Canvas",
    items: [
      [["Drag"], "Turn the device"],
      [["⇧", "Drag"], "Turn on one axis"],
      [["⌘", "⇧", "Drag"], "Move the device"],
      [["Scroll"], "Zoom"],
    ],
  },
  {
    title: "Timeline",
    items: [
      [["Delete"], "Remove selected keys"],
      [["⇧", "Click"], "Add a key to the selection"],
      [["Drag"], "Select keys in a box"],
      [["Double-click"], "Remove a key"],
      [["Click name"], "Select a lane's keys"],
    ],
  },
  {
    title: "Gizmo",
    items: [
      [["Drag"], "Turn the device"],
      [["←", "→", "↑", "↓"], "Turn by a step"],
      [["Double-click"], "Back to the default pose"],
    ],
  },
];

/**
 * What has shipped, newest first. Written for the people using the studio --
 * what they can now do -- not as a commit log; drawn from the repository's
 * history, one entry per release worth telling someone about.
 */
const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  {
    date: "19 Sep 2026",
    title: "Focus camera, and a sharper Motion",
    items: [
      "Focus points: draw areas on the shot and Compose turns them into one camera move — leaning toward each area, with Zoom, Depth and Tilt controls.",
      "Depth of field follows the areas through the move and fades in and out with the clip, with its own setting in Motion.",
      "A cleaner timeline: a full-width time ruler, lanes that colour as you work in them, and drag a lane's bar to move it.",
      "Crafting keeps the phone at rest; keyframes live in Motion, and editing waits while a clip plays.",
      "Devices grouped by category, a Canvas color tool with transparency, your account photo, and a shortcuts sheet.",
    ],
  },
  {
    date: "18 Sep 2026",
    title: "Crafting and Motion",
    items: [
      "The studio splits in two: Crafting for the pose and the still, Motion for presets, keyframes and video.",
      "A rebuilt timeline with coloured lanes, per-span easing and a global curve.",
      "Video export with its own size and frame rate; 3x and 4x exports fixed; watermark on or off.",
    ],
  },
  {
    date: "16–17 Sep 2026",
    title: "iPhone 17 Pro in hand, and faster loading",
    items: [
      "A new device: the iPhone 17 Pro held in a hand, with real skin and shadows.",
      "Device models compressed from 105MB to 42MB, so the studio opens faster.",
    ],
  },
  {
    date: "15 Sep 2026",
    title: "Studio refresh",
    items: [
      "A responsive studio, Figma-style effects, screen-space depth of field, snapping and new lighting.",
      "Light keyframes, a pan shortcut, and a watermark on exports.",
    ],
  },
  {
    date: "13 Sep 2026",
    title: "Multi-select and new moves",
    items: [
      "Select several keyframes — or drag a box around them — and move them as one.",
      "Two new presets: Slide up and Rotation slide up.",
    ],
  },
  {
    date: "12 Sep 2026",
    title: "Mocraft launches",
    items: ["Mocraft opens at mocraft.app, with sign-in."],
  },
  {
    date: "11 Sep 2026",
    title: "iPhone Duo",
    items: [
      "The iPhone Duo arrives, with fold effects that follow the hinge.",
      "Type straight into any value readout.",
    ],
  },
  {
    date: "10 Sep 2026",
    title: "Timeline and depth of field",
    items: ["A timeline for motion, depth of field, and three new devices."],
  },
];

/** The changelog, in the shortcuts' sheet: one entry per release, newest
    first, scrolling inside the sheet when it is taller than the window. */
function ChangelogSheet({ onClose }: { onClose: () => void }) {
  return (
    <Glass width={560} style={{ maxHeight: "80dvh" }}>
      <Header closeIcon={<Icon name="close-rounded" />} onClose={onClose}>
        Changelog
      </Header>
      <div
        className="mo-noscroll flex min-h-0 flex-col overflow-y-auto"
        style={{ gap: 20, padding: "4px var(--mo-space-2) var(--mo-space-2)" }}
      >
        {CHANGELOG.map((entry) => (
          <div key={entry.date} className="flex flex-col" style={{ gap: 6 }}>
            <span className="mo-code" style={{ color: "var(--mo-ink-muted)" }}>
              {entry.date}
            </span>
            <span className="mo-title">{entry.title}</span>
            <ul
              className="mo-label flex flex-col"
              style={{ gap: 4, paddingLeft: 16, listStyle: "disc" }}
            >
              {entry.items.map((item) => (
                <li key={item} style={{ color: "var(--mo-ink-muted)" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Glass>
  );
}

/** The shortcuts, laid out as a sheet: a section per place they work. */
function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Glass width={560}>
      <Header closeIcon={<Icon name="close-rounded" />} onClose={onClose}>
        Shortcuts
      </Header>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 1fr",
          columnGap: 24,
          rowGap: 16,
          padding: "4px var(--mo-space-2) var(--mo-space-2)",
        }}
      >
        {SHORTCUTS.map((section) => (
          <div key={section.title} className="flex flex-col" style={{ gap: 8 }}>
            <span className="mo-label" style={{ color: "var(--mo-ink-muted)" }}>
              {section.title}
            </span>
            {section.items.map(([keys, what]) => (
              <div
                key={what + keys.join()}
                className="flex items-center justify-between"
                style={{ gap: 12 }}
              >
                <span className="mo-label">{what}</span>
                <span className="flex shrink-0" style={{ gap: 4 }}>
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="mo-code"
                      style={{
                        minWidth: 22,
                        padding: "1px 6px",
                        textAlign: "center",
                        borderRadius: 6,
                        background: "var(--mo-field)",
                        color: "var(--mo-ink)",
                        fontFamily: "inherit",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Glass>
  );
}

/**
 * What Focus points does, shown before it has been done: a phone with two
 * numbered areas on it, drawn in the same blue boxes, badges and corner
 * handles the real areas wear on the shot. Built from layout rather than an
 * exported picture, so it can never drift from the real thing's look. Only
 * while there are no areas -- the first one drawn takes its place.
 */
function FocusIllustration() {
  const BLUE = "#3b82f6";
  const area = (
    n: number,
    box: { left: string; top: string; width: string; height: string },
  ) => (
    <div
      className="absolute"
      style={{
        ...box,
        border: `1.5px solid ${BLUE}`,
        background: "rgb(59 130 246 / 0.14)",
        borderRadius: 3,
      }}
    >
      <span
        className="absolute grid place-items-center"
        style={{
          left: -8,
          top: -8,
          width: 16,
          height: 16,
          borderRadius: 8,
          background: BLUE,
          color: "#fff",
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        {n}
      </span>
      <span
        className="absolute"
        style={{
          left: -4,
          bottom: -4,
          width: 7,
          height: 7,
          borderRadius: 2,
          background: "#fff",
          border: `1.5px solid ${BLUE}`,
        }}
      />
    </div>
  );
  return (
    <div
      aria-hidden
      className="relative w-full overflow-hidden"
      // No well behind it: the phone and its areas sit straight on the glass.
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* The phone: a dark face in a warm rim, as the default finish is. */}
      <div
        className="absolute"
        style={{
          left: "33%",
          top: "14%",
          width: "34%",
          height: "72%",
          borderRadius: "18% / 9%",
          background: "#0b0b0c",
          boxShadow: "0 0 0 2px #c2562a, 0 10px 24px rgb(0 0 0 / 0.18)",
        }}
      >
        <span
          className="absolute"
          style={{
            left: "36%",
            top: "3.5%",
            width: "28%",
            height: "3.5%",
            borderRadius: 999,
            background: "#1c1c1f",
          }}
        />
      </div>
      {area(1, { left: "22%", top: "10%", width: "28%", height: "28%" })}
      {area(2, { left: "54%", top: "60%", width: "24%", height: "30%" })}
    </div>
  );
}

function PresetTile({
  preset,
  label,
  selected,
  playing,
  onHover,
  onClick,
  glyph,
  width = "calc(50% - 8px)",
}: {
  preset: Preset;
  /** Half the panel in the Presets popup; a fixed size in the timeline. */
  width?: number | string;
  /** The current device's icon, drawn as the tile's subject. */
  glyph: string;
  label: string;
  selected: boolean;
  /** Hovered — play the move on the drawing. See `usePresetPreview`. */
  playing: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
}) {
  const art = usePresetPreview(preset.id, playing);
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => onHover(preset.id)}
      onPointerLeave={() => onHover(null)}
      // How the scroller finds the row boundary — see PresetScroller.
      data-preset-tile
      // A basis of "half the row minus the gap", so two per line — `flex-1`
      // in a wrapping container would put all eight on one line first.
      style={{ width }}
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
        style={{ borderRadius: "var(--mo-r-well)", perspective: 400 }}
      >
        {/* What the preview moves: the whole drawing, about the tile's
            centre, so the art's own centring transform stays untouched. */}
        <div ref={art} className="absolute inset-0 grid place-items-center">
          {/* The device being animated, not a fixed phone: a move shown
              on an iPhone reads wrong when the shot is a Studio Display. */}
          {/*
            The device glyph is a 20px symbol; at 80 its 1.1px outline turns
            into 4.4px of solid ink. The filter erodes it back to the ~1.8px
            line the preset artwork was drawn with, and the mask paints it in
            muted ink rather than the icon's full grey. Two spans because a
            filter runs BEFORE a mask on one element -- it would erode the
            unmasked square and thin nothing.
          */}
          <span
            aria-hidden
            className="pointer-events-none relative"
            style={{
              transform:
                "rotate" in preset ? `rotate(${preset.rotate}deg)` : undefined,
              filter:
                "url(#mo-glyph-thin) drop-shadow(0 0 30px rgb(0 0 0 / 0.12))",
              zIndex: 1,
            }}
          >
            <span
              className="block"
              style={{
                width: 80,
                height: 80,
                background: "var(--mo-ink-muted)",
                WebkitMaskImage: `url(${ICONS}/${glyph}.svg)`,
                maskImage: `url(${ICONS}/${glyph}.svg)`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            />
          </span>
        </div>
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
        {src && isVideoSource(src) ? (
          /* A video upload shows its first frame; as an `img` it was a broken
             picture icon. Still, not playing: the well only has to say which
             clip is on the screen. The seek makes Safari paint that frame --
             it leaves an unplayed video blank otherwise. */
          <video
            src={src}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(event) => {
              event.currentTarget.currentTime = 0.001;
            }}
            className="h-full w-full object-contain"
            style={{ pointerEvents: "none" }}
          />
        ) : src ? (
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
const GizmoCanvas = dynamic(
  () => import("./GizmoCanvas").then((m) => m.default),
  {
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
  },
);

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
 * The applied / neutral glyph: a plus whose upright retracts into a minus.
 *
 * For the two rows a checkbox would lie about. Transform and Camera cannot be
 * taken out of a shot — the phone is always somewhere at some angle, and the
 * lens always has a focal length — so a box that says "in the shot" would be
 * ticked forever and answer nothing.
 *
 * It follows the SELECTION: the row you have open offers the minus, because
 * that is the row whose values you are in a position to clear. Every other one
 * offers the plus, which opens it. Membership is already carried by ink — the
 * open row is the one at full strength — so the glyph is free to say what the
 * press will do rather than repeat what the ink has said.
 *
 * The mark interpolates because plus and minus ARE the same mark, one with its
 * upright and one without, so the change is a single stroke retracting into
 * the other. (An earlier version turned the plus 45 degrees into a cross,
 * which reads as "close this" — and the row is not a thing to be closed.)
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
 * Getting the shot out, at the foot of the stack.
 *
 * Below the rule and pushed to the bottom, because it is not a layer: the rows
 * above build the composition and these two take it away. Putting them in the
 * `RowGroup` would have let the travelling selection stop on them, which would
 * say they are something you can be inside.
 *
 * Both are always available. The clip exports five seconds of the shot as it
 * stands when no preset is loaded, rather than being disabled — a still shot
 * recorded is a legitimate thing to want, and a greyed-out button that cannot
 * say why is not.
 *
 * While either runs, both go inert and the one working says so. Video reports
 * a percentage because it takes seconds; the still does not, because it does
 * not.
 */
function ExportRow({
  studio,
  kind,
}: {
  studio: Studio;
  /** Crafting exports the still; Presets exports the clip. */
  kind: "image" | "video";
}) {
  const busy = studio.exporting;
  const pct = busy?.kind === "video" ? Math.round(busy.done * 100) : null;
  const working =
    busy?.kind === kind ? (kind === "video" ? `${pct}%` : "Saving") : null;

  return (
    <div
      className="mt-auto flex w-full shrink-0 flex-col"
      // Air between the rows and the export, now the panel is its rows'
      // height and nothing else separates them. Padding, not margin, so
      // `mt-auto` still pins it to the foot of a capped panel.
      style={{ gap: "var(--mo-space-2)", paddingTop: 80 }}
    >
      <Divider />
      {/* The same title treatment a popup's sections get — `ParamGroup`'s own
          class and inset, so a heading in the stack and a heading in a panel
          are one thing rather than two that resemble each other. */}
      <span
        className="mo-title"
        style={{
          padding: "0 var(--mo-space-2)",
          filter: "var(--mo-text-shadow)",
        }}
      >
        Export
      </span>
      {/* The export's size, beside the button it applies to. Shared by both
          exports -- it is one setting, shown wherever you export from. */}
      <Segmented
        width="100%"
        height={32}
        value={String(studio.exportScale)}
        onChange={(id) => studio.setExportScale(Number(id))}
        options={EXPORT_SCALES.map((n) => ({ id: String(n), label: `${n}x` }))}
      />
      {/* Full width, not `grow`: grow is flex-1, which in this column
          squeezed the button's HEIGHT instead of filling the width. */}
      <Button
        width="100%"
        onClick={
          busy
            ? undefined
            : kind === "image"
              ? studio.exportImage
              : studio.exportVideo
        }
        title={kind === "image" ? "Export a PNG" : "Export a video"}
      >
        <MorphText>
          {working ?? (kind === "image" ? "Export image" : "Export video")}
        </MorphText>
      </Button>
    </div>
  );
}

/** Export sizes, as the old editor offered them. */
const EXPORT_SCALES = [1, 2, 3, 4];
const EXPORT_RATES = [30, 60];

/**
 * The Motion tab's export: the clip, and what it is written at.
 * Frame rate lives here rather than in the timeline because it describes the
 * file, not the clip.
 */
function MotionExportRow({ studio }: { studio: Studio }) {
  const busy = studio.exporting;
  const pct = busy?.kind === "video" ? Math.round(busy.done * 100) : null;

  return (
    <div
      className="mt-auto flex w-full shrink-0 flex-col"
      // Air between the rows and the export, now the panel is its rows'
      // height and nothing else separates them. Padding, not margin, so
      // `mt-auto` still pins it to the foot of a capped panel.
      style={{ gap: "var(--mo-space-2)", paddingTop: 80 }}
    >
      <Divider />
      <span
        className="mo-title"
        style={{
          padding: "0 var(--mo-space-2)",
          filter: "var(--mo-text-shadow)",
        }}
      >
        Export
      </span>
      {/* Pills, the same control as Crafting's size: every option in
          view and one tap to change, where a dropdown hid them. */}
      <Segmented
        width="100%"
        height={32}
        value={String(studio.exportScale)}
        onChange={(id) => studio.setExportScale(Number(id))}
        options={EXPORT_SCALES.map((n) => ({ id: String(n), label: `${n}x` }))}
      />
      <Segmented
        width="100%"
        height={32}
        value={String(studio.exportFps)}
        onChange={(id) => studio.setExportFps(Number(id))}
        options={EXPORT_RATES.map((n) => ({
          id: String(n),
          label: `${n} fps`,
        }))}
      />
      {/*
        The button fills as the clip renders. A percentage alone read as a
        label that had changed, not as work happening; a bar sweeping across
        the thing you pressed says both that it is going and how far.
      */}
      <div className="relative w-full">
        <Button
          width="100%"
          onClick={busy ? undefined : studio.exportVideo}
          title="Export an MP4"
        >
          <MorphText>
            {pct !== null ? `Exporting ${pct}%` : "Export video"}
          </MorphText>
        </Button>
        {pct !== null ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ borderRadius: "var(--mo-r-selected)" }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background:
                  "color-mix(in srgb, var(--mo-ink) 14%, transparent)",
                transition: "width 160ms linear",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Play, pause and repeat, under the shot.
 *
 * Only once a preset is on. With no clip loaded there is nothing to play, and
 * a transport that is permanently there and permanently inert is a control
 * that has to be explained; appearing when it becomes true says the same thing
 * without a word. It is also the answer to a real question a preset raises the
 * moment it stops — "can I see that again?" — which until now had no control
 * to press.
 *
 * Under the canvas rather than over it: it belongs to the shot the way a
 * transport belongs to a film, and putting it on the composition would mean
 * exporting around it or hiding it every time.
 */
/**
 * The five tools, and their names on hover.
 *
 * The rail stays a rail: 56px of glyphs down the edge, because five labels
 * parked beside the composition are five words of chrome permanently in front
 * of the shot. The names live in a tip beside whichever item the pointer is on
 * — see `RailItem` — which costs the rail no width and the shot no room.
 *
 * An earlier version opened the whole rail into a panel on hover. It worked and
 * it was wrong: a surface that resizes under the cursor moves the other four
 * targets while you are reaching for one of them, and `useSpring` re-rendering
 * this subtree sixty times a second to do it made the rest of the chrome
 * stutter. A tip is the same information without moving anything.
 */
function ToolRail({
  tool,
  onPick,
  quiet,
}: {
  tool: Tool;
  onPick: (id: Tool) => void;
  /** A panel is open, and it is standing where the tips appear. */
  quiet?: boolean;
}) {
  return (
    <Glass shape="rail" className="pointer-events-auto">
      {/* The rail breathes: 8px between tools, where a list of labels reads
          fine packed. The lens measures real boxes, so it simply travels
          further. */}
      <RowGroup gap={8}>
        {TOOLS.map((item) => (
          <RailItem
            key={item.id}
            icon={<Icon name={item.icon} />}
            label={item.title}
            quiet={quiet}
            title={item.title}
            selected={item.id === tool}
            onClick={() => onPick(item.id)}
          />
        ))}
      </RowGroup>
    </Glass>
  );
}

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
            edit((prev) =>
              hasFields ? layer.toggle(prev, false) : resetLayer(layer, prev),
            );
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
 * One row's keyframe toggle.
 *
 * Two states, and they are the timeline's two: hollow when there is no key at
 * the playhead, solid when there is. Same pair of assets, same pair of inks,
 * so a key in a lane and a key in a panel are visibly the same object rather
 * than two conventions for one thing.
 */
function KeyframeDot({
  studio,
  channel,
  label,
}: {
  studio: Studio;
  channel: AnimatableKey;
  label: string;
}) {
  const track = studio.effective.animation.tracks[channel];
  const here = keyAt(track, studio.playheadRef.current);
  return (
    <button
      type="button"
      aria-pressed={!!here}
      aria-label={here ? `Remove ${label} keyframe` : `Add ${label} keyframe`}
      className="grid cursor-pointer place-items-center"
      onClick={() => studio.toggleKey(channel)}
      style={{ width: 16, height: 16 }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          /*
           * The timeline's two states, but not quite its inks.
           *
           * In the timeline a hollow key sits on a filled track and is 20px;
           * here it sits on bare panel at the end of a row, a third smaller,
           * and the same muted ink all but disappeared -- it read as disabled
           * rather than as something to press. So the hollow state is stronger
           * here and a notch larger. The solid state is unchanged: a key at
           * the playhead is the one thing that has to read the same in both.
           */
          background: here
            ? "var(--mo-ink)"
            : "color-mix(in srgb, var(--mo-ink) 62%, transparent)",
          WebkitMaskImage: `url(${TIMELINE_GLYPHS}/${here ? "keyframe-selected" : "keyframe"}.svg)`,
          maskImage: `url(${TIMELINE_GLYPHS}/${here ? "keyframe-selected" : "keyframe"}.svg)`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      />
    </button>
  );
}

/** Where the timeline keeps its own key glyphs; shared so the two agree. */
const TIMELINE_GLYPHS = "/figma-assets/mockup-studio/timeline";

/**
 * The gizmo's surface, and the canvas inside it.
 *
 * The canvas is three quarters of the surface — the ratio the 160 version had
 * — so the arms keep the same margin against the rim at any size. Derived, so
 * there is one number to change rather than two that have to agree.
 */
const GIZMO_SIZE = 112;
const GIZMO_CANVAS = Math.round(GIZMO_SIZE * 0.75);

/** Width of the live shot preview card's picture. */
const PREVIEW_W = 168;

/**
 * A small live copy of the whole shot, shown while the model is being moved.
 *
 * In Motion the timeline takes the bottom of the window, and moving the phone
 * low in the frame puts it where you cannot follow it. This shows the entire
 * frame -- background and all -- for as long as the pose is changing, by any
 * route: a drag on the canvas, the gizmo, the wheel or a slider. It fades
 * once the pose has been still for a moment.
 *
 * Always mounted, so the stage has a canvas to mirror into the instant it is
 * needed; only its opacity comes and goes.
 */
function ShotPreview({
  studio,
  stageCanvasRef,
  active,
}: {
  studio: Studio;
  /** The stage's canvas. Passed on its own: read off `studio` it would make
      every other read of `studio` here look like a ref access. */
  stageCanvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
}) {
  const { xAxis, yAxis, zAxis, zoom, panX, panY, panZ, fov } = studio.state;
  const pose = [xAxis, yAxis, zAxis, zoom, panX, panY, panZ, fov].join();
  // Compared during render, React's pattern for "state from a changing
  // prop" -- and never on mount: a preview that greets you is noise.
  const [seenPose, setSeenPose] = useState(pose);
  const [moving, setMoving] = useState(false);
  if (pose !== seenPose) {
    setSeenPose(pose);
    setMoving(true);
  }
  // Every change restarts the countdown, so it fades only once you stop.
  useEffect(() => {
    if (!moving) return;
    const t = window.setTimeout(() => setMoving(false), 1200);
    return () => window.clearTimeout(t);
  }, [moving, seenPose]);
  const visible = active && moving;

  /*
   * A live stream of the stage canvas, scaled by the compositor.
   *
   * It was a `drawImage` of every rendered frame, which makes the GPU finish
   * and hand the pixels over -- cheap for a small ratio, and a stall at Fill,
   * where the canvas is the whole window. `captureStream` keeps the frames on
   * the GPU and keeps the canvas's transparency, so the shot's background
   * still shows through. Open only while the card is showing, and held a
   * beat after, so the fade-out still has the phone in it.
   */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    const canvas = stageCanvasRef.current;
    if (!visible || !video || !canvas) return;
    const stream = canvas.captureStream();
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
      window.setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
        if (video.srcObject === stream) video.srcObject = null;
      }, 250);
    };
  }, [visible, stageCanvasRef]);

  return (
    <div
      aria-hidden
      className="pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(8px)",
        transition: "opacity 180ms ease-out, transform 180ms ease-out",
      }}
    >
      {/* The shot IS the card: no glass padding around it, so there is one
          rounded shape rather than a frame inside a frame. */}
      <Glass width={PREVIEW_W} style={{ padding: 0 }}>
        {/* Clipped here, not on the glass, which would clip its own shadow. */}
        <div
          className="overflow-hidden"
          style={{
            borderRadius: "inherit",
            ...backgroundCss(studio.state.background),
          }}
        >
          <video
            ref={videoRef}
            onContextMenu={(event) => event.preventDefault()}
            muted
            playsInline
            autoPlay
            style={{ display: "block", width: PREVIEW_W }}
          />
        </div>
      </Glass>
    </div>
  );
}

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
    /* Positioned by the bottom bar, not by itself — see StudioChrome. The
       wrapper is what keeps it hard against the left edge of a row that is now
       as wide as the window. */
    <div className="pointer-events-auto self-start">
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
        background: connected
          ? "var(--mo-accent-green)"
          : "var(--mo-accent-yellow)",
        boxShadow: "var(--mo-swatch-shadow)",
      }}
    />
  );
}

function Icon({ name, size = control.icon }: { name: string; size?: number }) {
  return (
    <Image
      src={`${ICONS}/${name}.svg`}
      alt=""
      width={size}
      height={size}
      unoptimized
    />
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
  /*
   * Connect a phone, hidden until it launches.
   *
   * Commented out rather than deleted, and the panel it opens is left
   * untouched below: the feature works, it is just not being offered yet.
   * Putting this line back is the whole of turning it on again -- the tool's
   * panel, its pairing effect and the phone's own routes at
   * `/mockup-studio/join` and `/remote` are all still here.
   */
  // { id: "remote", icon: "duplicate", title: "Connect a phone" },
  // The flat colour behind the shot, beside the frame's size: both are about
  // the canvas rather than the device, so they sit with the rail's tools.
  { id: "canvas", icon: "layout", title: "Canvas size" },
  { id: "background", icon: "canvas-color", title: "Canvas color" },
] as const;

/*
 * The rail's tools, plus the one that is built but not yet offered.
 *
 * `remote` is commented out of `TOOLS` above until Connect a phone
 * launches, which narrows this union and makes the three `tool === "remote"`
 * branches below unreachable -- and, to the compiler, a comparison that can
 * never be true. Naming it here keeps those branches compiling and the panel
 * intact, so launching the feature is uncommenting one line rather than
 * writing the panel again.
 */
type Tool = (typeof TOOLS)[number]["id"] | "remote";

/** The three history steps, in the order the frame draws them. */
const HISTORY = [
  { id: "undo", label: "Undo" },
  { id: "reset", label: "Reset" },
  { id: "redo", label: "Redo" },
] as const;

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
  "apple-iphone-17-pro-hand": "iphone",
  "apple-iphone-17-pro-max": "iphone",
  "apple-iphone-18-pro": "iphone",
  "apple-iphone-18-pro-max": "iphone",
  "apple-iphone-duo-web": "iphone",
  "apple-iphone-air": "iphone",
  "apple-ipad-pro": "ipad-pro",
  "apple-macbook-neo": "laptop",
  "apple-macbook-pro-14": "macbook",
  "apple-imac-24": "imac",
  "apple-studio-display": "display-xdr",
  "image-card": "image",
};

/**
 * The Devices panel's groups, in order. A device's group follows from the
 * glyph it wears -- phones, tablets, laptops, displays -- so a new model lands
 * in the right place without a second list to keep. The Image card is not a
 * product: it closes the list, under a rule instead of a heading.
 */
const DEVICE_GROUPS = [
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablets" },
  { id: "laptop", label: "Laptops" },
  { id: "display", label: "Displays" },
  { id: "other", label: null },
] as const;

function deviceGroupOf(id: string): (typeof DEVICE_GROUPS)[number]["id"] {
  switch (DEVICE_ICONS[id]) {
    case "iphone":
      return "mobile";
    case "ipad-pro":
      return "tablet";
    case "laptop":
    case "macbook":
      return "laptop";
    case "imac":
    case "display-xdr":
      return "display";
    default:
      return "other";
  }
}

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
];

/**
 * The Mocraft chrome.
 *
 * Who is signed in comes from Clerk's own hooks rather than a prop from the
 * page, so the account menu follows a sign-in or sign-out made anywhere --
 * another tab, the profile panel -- without the page being rendered again.
 */
export default function StudioChrome({
  modelToken = null,
}: {
  /** Signed link for the device models — see `lib/modelToken`. */
  modelToken?: string | null;
}) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  /** The profile photo failed to load; the initial takes its place. */
  const [avatarFailed, setAvatarFailed] = useState(false);
  /*
   * The composition, and everything that acts on it. See `useStudio`.
   *
   * Every list below now comes from a registry and every slider writes into
   * this — the chrome holds no copy of the shot, only of which parts of it are
   * on screen.
   */
  const studio = useStudio();
  /*
   * `state` is the shot; `effective` is the shot with the animation laid over
   * it. Rows READ the second and WRITE through `edit`, which is what keeps a
   * slider live once a preset is applied: it shows the value on screen, and
   * the edit becomes a keyframe rather than a change to a number the clip is
   * about to paint over. See `useStudio`.
   */
  const { state, effective, edit } = studio;

  /*
   * Which tab, and whether its panel is showing, are two different things.
   *
   * The rail is a tab bar: something is always selected, and dismissing the
   * panel does not un-choose it. Fold them into one nullable value and closing
   * the popup would also blank the rail, which reads as having lost your
   * place rather than having put a panel away.
   */
  /*
   * Nothing open on arrival.
   *
   * Both of these opened themselves — the device list on the left, an effect's
   * popup on the right — because they are useful to look at while the chrome
   * is being built. They are the wrong first impression of a studio: what
   * someone lands on should be the shot, on an empty desk, with the tools
   * plainly to hand and none of them mid-conversation. Two panels already
   * talking about a drop shadow nobody asked for is an interface interrupting
   * itself before anyone has touched it.
   *
   * The rail still remembers `devices` as the tool it will open, so the first
   * press lands where it always did.
   */
  const [tool, setTool] = useState<Tool>("devices");
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* It is only really there when there is a clip to show — which is the same
     condition `Timeline` renders on, hoisted so the layout can reserve its
     room. */
  const [tab, setTab] = useState<"crafting" | "motion">("crafting");
  /** The glass sliders -- development only; G shows them. */
  const [tunerOpen, setTunerOpen] = useState(false);
  /** The shortcuts sheet, opened from the button beside the account chip. */
  /** Which sheet is over the studio: the shortcuts (from the button beside
      the account chip) or the changelog (from the account menu). */
  const [sheet, setSheet] = useState<"shortcuts" | "changelog" | null>(null);
  const keysOpen = sheet !== null;
  const closeKeys = useCallback(() => setSheet(null), []);
  /** The Devices panel's open category, whose models show in a side menu. */
  const [deviceGroup, setDeviceGroup] = useState<string | null>(null);
  const closeDeviceGroup = useCallback(() => setDeviceGroup(null), []);
  const deviceRowsRef = useRef<HTMLDivElement | null>(null);
  const deviceAnchorRef = useRef<HTMLDivElement | null>(null);
  // And only in Motion: the timeline is how a move is edited, and Crafting
  // is about the pose, so it slides away there.
  const showTimeline = tab === "motion";
  /* Held for the length of the exit, so leaving Motion slides the timeline
     down instead of cutting it. */
  const [timelineMounted, setTimelineMounted] = useState(showTimeline);
  if (showTimeline && !timelineMounted) setTimelineMounted(true);
  useEffect(() => {
    if (showTimeline) return;
    const t = window.setTimeout(() => setTimelineMounted(false), TIMELINE_MS);
    return () => window.clearTimeout(t);
  }, [showTimeline]);

  /*
   * The keyboard, matching the old editor key for key.
   *
   *   Space   play / pause
   *   B / E   playhead to the beginning, to the end
   *   G       show or hide the glass sliders (development only)
   *   ⌘Z ⇧⌘Z  undo, redo
   *
   * Two guards run through all of them, and both are the old editor's
   * reasoning rather than mine. Nothing fires while a field has focus, because
   * undoing the whole shot when someone meant to undo their typing is worse
   * than having no shortcut at all. And Space additionally stands down for
   * buttons and selects, since Space is how those are pressed from the
   * keyboard and taking it would break the panel for anyone not on a mouse.
   *
   * The bare letters ignore every modifier: ⌘E and friends belong to the
   * browser, and quietly taking one is a nastier surprise than not having the
   * shortcut.
   */
  useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      const tag = node?.tagName;
      // A slider is an <input> too, but nobody types into one — counting it
      // took every shortcut away from the popup the moment a slider was used.
      const text =
        tag === "INPUT" && (node as HTMLInputElement).type !== "range";
      return !!node && (text || tag === "TEXTAREA" || node.isContentEditable);
    };

    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        if (typing(event.target)) return;
        event.preventDefault();
        // Shift+Cmd+Z is redo everywhere on this platform; Cmd+Y is the
        // Windows spelling and is not worth a second branch in a Mac-first
        // tool — the old editor's call, kept.
        if (event.shiftKey) studio.redo();
        else studio.undo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (typing(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        studio.seek(0);
      } else if (key === "e") {
        event.preventDefault();
        studio.seek(studio.duration);
      } else if (key === "g" && process.env.NODE_ENV === "development") {
        event.preventDefault();
        setTunerOpen((was) => !was);
      }
    };

    /*
     * Space is play/pause everywhere in the studio, whatever has focus.
     *
     * It used to stand down for any focused button -- and nearly everything
     * you click here is one, a tab, a row, a preset tile -- so it only worked
     * after clicking somewhere inert like the timeline. Taken in the CAPTURE
     * phase at the window, before a focused control sees it, and stopped
     * there, so a row does not also open and a tile does not also re-pick.
     * Keyup too: that is where a button would fire its click. Text fields
     * keep it, since there a space is a character.
     */
    // Motion only: Crafting has no clip running, and a Space there would
    // start one behind a panel that is about the pose.
    const isSpace = (event: KeyboardEvent) =>
      tab === "motion" &&
      (event.key === " " || event.code === "Space") &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !typing(event.target);
    const onSpace = (event: KeyboardEvent) => {
      if (!isSpace(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "keydown" && !event.repeat) studio.togglePlay();
    };

    window.addEventListener("keydown", onSpace, true);
    window.addEventListener("keyup", onSpace, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onSpace, true);
      window.removeEventListener("keyup", onSpace, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [studio, tab]);

  const closePanel = useCallback(() => setPanelOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toolRef = useDismiss<HTMLDivElement>(panelOpen, closePanel);
  const menuRef = useDismiss<HTMLDivElement>(menuOpen, closeMenu);
  // The button and the sheet share one boundary, so pressing the button
  // again closes the sheet rather than closing and reopening it.
  const keysRef = useDismiss<HTMLDivElement>(keysOpen, closeKeys);
  useEffect(() => {
    if (!keysOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysOpen]);

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
      // A category's menu belongs to the panel it opened from.
      setDeviceGroup(null);
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

  /**
   * Undo, reset, redo — three acts, run on the press.
   *
   * They used to set a selection first, because the control was a segmented
   * switch. Nothing here has a state to be in: undoing does not put the studio
   * into "undo", it steps the shot back once and is finished.
   */
  const runHistory = useCallback(
    (id: "undo" | "reset" | "redo") => {
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
  // Closed on arrival — see the note on `panelOpen`. The stack still opens on
  // Drop Shadow, so the first press on it is one press rather than two.
  const [popupOpen, setPopupOpen] = useState(false);

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

  /*
   * The effects list. An effect has a row while it is in the shot — and while
   * its popup is open, because Image is only "in" once something is uploaded,
   * and adding it would otherwise open a popup for a row that is not there.
   */
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const closeAddMenu = useCallback(() => setAddOpen(false), []);
  const addRef = useRef<HTMLDivElement>(null);
  const shownEffects = EFFECT_LAYERS.filter(
    (l) => l.isOn(state) || (popupOpen && l.id === selectedLayer),
  );
  const addable = EFFECT_LAYERS.filter((l) => !shownEffects.includes(l));

  const addEffect = useCallback(
    (layer: Layer) => {
      if (!layer.isOn(state)) edit((prev) => layer.toggle(prev, true));
      setSelectedLayer(layer.id);
      setPopupOpen(true);
      setAddOpen(false);
      // A stack short enough to scroll can take the new row below the fold,
      // half under the export row. Bring it into view once it has rendered.
      // After the stack has re-measured whether it scrolls, which is a
      // render of its own after this one.
      window.setTimeout(() => {
        const stack = addRef.current?.closest(".mo-glass");
        const row = Array.from(
          stack?.querySelectorAll<HTMLElement>("[role=button]") ?? [],
        ).find((el) => el.textContent === layer.name);
        row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 80);
    },
    [state, edit],
  );

  const removeEffect = useCallback(
    (layer: Layer) => {
      // Only if it is in: Image's `toggle(false)` resets the background kind,
      // and an Image row that was only open would take a gradient with it.
      if (layer.isOn(state)) edit((prev) => layer.toggle(prev, false));
      if (layer.id === selectedLayer) setPopupOpen(false);
    },
    [state, edit, selectedLayer],
  );

  const closePopup = useCallback(() => setPopupOpen(false), []);
  // The boundary is the popup AND the stack beside it: the stack is what opens
  // the popup, so a press there must not count as an outside press.
  // Armed only while the popup is actually on screen — otherwise a click in
  // Presets would close a popup nobody can see, and switching back would find
  // it shut.
  const popupRef = useDismiss<HTMLDivElement>(
    popupOpen &&
      (tab === "crafting" ||
        MOTION_POPUP_IDS.includes(selectedLayer) ||
        selectedLayer === PRESETS_ID),
    // (Focus points is left out on purpose: its areas are drawn on the shot,
    // which is outside the panel, and a dismiss there would close it mid-draw.)
    closePopup,
  );

  /**
   * Open a row's controls. It does not put the effect in the shot.
   *
   * It used to: clicking a row switched its effect on if it was off. That made
   * looking at something the same act as applying it, and the four background
   * rows share one `kind` — so opening Gradient to see what it offered
   * replaced whatever background was already there, and there was no way to
   * read the panel without changing the composition first.
   *
   * The checkbox is the switch and the row is the way in. Someone going down
   * the stack to see what each one does now leaves the shot exactly as they
   * found it, and turns on the ones they want.
   */
  const openLayer = useCallback(
    (layer: Layer) => {
      setPopupOpen(layer.id === selectedLayer ? !popupOpen : true);
      setSelectedLayer(layer.id);
    },
    [selectedLayer, popupOpen],
  );

  // Motion's depth of field is its own layer, not one of `LAYERS`.
  const selected =
    [...LAYERS, MOTION_DOF].find((l) => l.id === selectedLayer) ?? null;
  /*
   * The popup belongs to the crafting tab, and `popupOpen` outlives the switch.
   *
   * Gating it here rather than closing it on the way out is what makes coming
   * back feel like returning: Motion hides an effect popup, and Crafting brings back
   * the same effect still open. Closing it would have thrown that away, and
   * leaving it ungated showed a Drop Shadow panel next to a grid of camera
   * moves, which belongs to neither.
   */
  const presetsShown =
    popupOpen && tab === "motion" && selectedLayer === PRESETS_ID;
  const focusShown =
    popupOpen && tab === "motion" && selectedLayer === FOCUS_ID;
  // Motion shows only its own rows' popups: the three stage rows and depth
  // of field.
  const open =
    popupOpen &&
    selected &&
    (tab === "crafting" || MOTION_POPUP_IDS.includes(selected.id))
      ? selected
      : null;
  // The open popup's field when it has exactly one and it is a colour.
  const onlyField =
    open?.sections.length === 1 && open.sections[0].fields.length === 1
      ? open.sections[0].fields[0]
      : null;
  const soloColor = onlyField?.kind === "color" ? onlyField : null;

  /**
   * The preset tiles, shared by the Presets popup and the empty timeline.
   *
   * One group, not rows of two: the lens travels between whichever tile is
   * selected, and it can only do that if every tile is its sibling. Wrapping
   * turns the column into a grid, and the lens follows sideways as readily as
   * down.
   */
  const presetGrid = (tileWidth?: number) => (
    <RowGroup wrap gap={16} radius={radius.well}>
      {PRESETS.map((preset) => (
        <PresetTile
          key={preset.id}
          preset={preset}
          glyph={DEVICE_ICONS[state.deviceId] ?? "iphone"}
          width={tileWidth}
          label={getMotionPreset(preset.id)?.label ?? preset.id}
          selected={preset.id === studio.presetId}
          // Held here, not in the tile: the lens draws every tile twice, and
          // the copy under a selected tile has to play the same move as the
          // tile it covers.
          playing={preset.id === hoveredPreset}
          onHover={setHoveredPreset}
          // Applies the move AND plays it once.
          onClick={() => studio.pickPreset(preset.id)}
        />
      ))}
    </RowGroup>
  );

  /** One stage row: shared by the Crafting stack and the Motion tab. */
  const stageRow = (l: Layer) => {
    const on = l.isOn(state);
    return (
      <Row
        key={l.id}
        icon={<Icon name={l.icon} />}
        /*
        The box says whether the effect is IN the shot, and
        nothing else — not whether its popup happens to be
        open, which is what the old plus-and-minus tracked.
        Those were two different facts wearing one glyph:
        you could be editing a shadow that was switched off
        and the row would offer to remove it.

        `Checkbox` takes its own press, so opening the row
        and toggling it stay separate acts.
      */
        trailing={
          l.removable === false ? (
            /* Nothing to check: see `ToggleGlyph`. The press
             still has to stop here, or clearing a transform
             would also open its popup. */
            <button
              type="button"
              aria-label={`Reset ${l.name}`}
              className="grid cursor-pointer place-items-center"
              onClick={(event) => {
                event.stopPropagation();
                toggleLayer(l);
              }}
            >
              <ToggleGlyph on={l.id === selectedLayer} />
            </button>
          ) : (
            <Checkbox
              checked={on}
              label={`${l.name} in the shot`}
              icon={<Icon name="checkbox" />}
              checkedIcon={<Icon name="checkbox-checked" />}
              onChange={() => toggleLayer(l)}
            />
          )
        }
        selected={l.id === selectedLayer}
        onClick={() => openLayer(l)}
      >
        {l.name}
      </Row>
    );
  };

  return (
    <>
      <DesignSystem />
      {process.env.NODE_ENV === "development" ? (
        <GlassTuner open={tunerOpen} />
      ) : null}
      {/* Thins the enlarged device glyphs on the preset tiles. */}
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter id="mo-glyph-thin">
          <feMorphology operator="erode" radius="1.3" />
        </filter>
      </svg>
      <style>{`
        /* Slide only, no fade. Opacity below 1 makes the animated wrapper a
           backdrop root, so the glass inside had nothing to blur for the
           whole slide -- it came up clear and only frosted once it landed.
           A transform leaves the backdrop alone, and translating by its own
           height plus the gap takes it fully off the bottom edge anyway. */
        @keyframes mo-timeline-in {
          from { transform: translateY(calc(100% + 16px)); }
          to { transform: none; }
        }
        @keyframes mo-timeline-out {
          from { transform: none; }
          to { transform: translateY(calc(100% + 16px)); }
        }
      `}</style>
      <div
        className="relative h-dvh w-full overflow-hidden"
        style={
          {
            // The frame's ground: a flat base, a soft radial lift behind the
            // canvas, and the system's dot grid over both. The dots are what the
            // frost has to pick up — over flat colour the glass reads as a grey
            // rectangle and the whole material looks broken when it is fine.
            // The workspace is dragged too — the phone turns under the cursor —
            // and a drag there would otherwise select whatever the pointer
            // passed over. Surfaces handle their own; see `.mo-glass`.
            userSelect: "none",
            WebkitUserSelect: "none",
            backgroundColor: "#e4e4e4",
            backgroundImage:
              "var(--mo-dots), radial-gradient(120% 55% at 50% 50%, rgb(233 233 233 / 0) 0%, rgb(233 233 233) 100%)",
            backgroundSize: "var(--mo-dots-pitch), auto",
            // The panel plus the 16 it stands off the bottom edge. Zero when
            // there is no timeline, so an empty studio is the whole window.
            "--mo-reserve": showTimeline ? `calc(${TIMELINE_H} + 16px)` : "0px",
          } as CSSProperties
        }
      >
        {/*
          The shot itself, under everything, in whatever room the timeline has
          left it. See `Stage`.

          `--mo-reserve` is the one number that says how much of the window the
          timeline is holding, and three things read it: this wrapper, and the
          two side clusters below. Written as a variable rather than passed
          around because the alternative is the same expression typed three
          times, drifting the moment the panel's height changes.

          The stage SHRINKS rather than being covered. A timeline overlapping
          the composition means the bottom of the phone is behind a panel while
          you judge the framing — and framing is most of what this tool is for.
        */}
        {/* At Fill the shot IS the window, so its ground runs on under the
            timeline too -- otherwise the bar sits on a band of workspace grey
            instead of floating over the shot like every other panel. */}
        {studio.ratio === null ? (
          <div
            className="absolute inset-0"
            style={backgroundCss(studio.state.background)}
          />
        ) : null}
        <div
          className="absolute"
          // Eased with the timeline's slide, so the shot grows and shrinks
          // with it rather than jumping when the tab changes.
          //
          // Except at Fill, where the shot IS the window: it runs the full
          // height and the timeline floats over it, so the phone can travel
          // behind the timeline and still be in the shot -- which is what the
          // preview card then shows. Shrunk, Fill was cut off at the
          // timeline's edge, a frame that was not the one selected.
          style={{
            inset: 0,
            bottom: studio.ratio === null ? 0 : "var(--mo-reserve)",
            transition: RESERVE_EASE,
          }}
        >
          <Stage
            studio={studio}
            modelToken={modelToken}
            focusDrawing={focusShown}
          />
        </div>

        <div className="pointer-events-none absolute inset-0">
          {/*
            The bottom bar: the gizmo standing on the timeline.

            FIRST in this stack so every panel paints above it — the gizmo is
            pinned to the corner while the device list is vertically centred,
            so the two meet at about 890px of viewport height and overlap below
            it. Paint order does not stop them colliding, it decides which
            survives, and a list you are reading beats a readout you glance at.

            A column rather than two pinned corners. The timeline's height is
            the number of channels the preset animates — two lanes for Reward
            Pop, seven for a preset that moves everything — so a gizmo pinned
            at `bottom: 16 + something` would need that something to be a
            number that is only right for one preset. Stacked, the gizmo is
            simply the row above, and it drops back to the corner on its own
            when there is no preset and the timeline renders nothing.
          */}
          {/*
            Positioned off the reserve rather than stacked on the timeline:
            stacked, the gizmo could only move when the timeline mounted or
            unmounted, so it snapped while everything else eased. The timeline
            is a fixed height now, so the reserve is exactly the room it takes.
          */}
          <div
            className="absolute"
            style={{
              left: 16,
              bottom: "calc(var(--mo-reserve) + 16px)",
              transition: RESERVE_EASE,
            }}
          >
            <Gizmo studio={studio} />
          </div>
          {/* Beside the gizmo, the control that most often moves the phone. */}
          <div
            className="absolute"
            style={{
              left: 16 + GIZMO_SIZE + 16,
              bottom: "calc(var(--mo-reserve) + 16px)",
              transition: RESERVE_EASE,
            }}
          >
            <ShotPreview
              studio={studio}
              stageCanvasRef={studio.stageCanvasRef}
              active={tab === "motion"}
            />
          </div>
          {timelineMounted ? (
            <div
              className="absolute"
              style={{
                left: 16,
                right: 16,
                bottom: 16,
                /*
                  Above the side panels. The timeline's menus -- the global
                  curve, a key's settings -- open UPWARD, into the band the
                  panels occupy, and a menu can only rank inside its own
                  parent: at the page's level the panels came later and
                  painted over it. Lifted as a whole, everything it opens
                  comes with it. The two never overlap otherwise -- the panels
                  stop above the timeline -- and a z-index is not a backdrop
                  root, so the glass still frosts.
                */
                zIndex: 30,
                /*
                  Not `both`. An animation still in effect -- which `both`
                  keeps it, forever -- makes this wrapper a backdrop root in
                  Chrome, and the glass inside then blurs only what is in here:
                  nothing, so the timeline rendered as a flat white slab where
                  every other panel frosts the shot. The way in stops applying
                  once it lands; only the way out holds its end, and that lasts
                  just until the timeline unmounts.
                */
                animation: showTimeline
                  ? `mo-timeline-in ${TIMELINE_MS}ms ${TIMELINE_CURVE} backwards`
                  : `mo-timeline-out ${TIMELINE_MS}ms ${TIMELINE_CURVE} forwards`,
              }}
            >
              <Timeline
                studio={studio}
                suggestions={PRESETS.length ? presetGrid(88) : null}
              />
            </div>
          ) : null}

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
              {/* The mode switch, top and centre: which half of the studio
                  you are in is the first thing on the page. */}
              <Segmented
                value={tab}
                onChange={(next) => {
                  setTab(next);
                  // Crafting shows and edits the rest pose; Motion the clip.
                  studio.setMotionMode(next === "motion");
                  // Leaving Motion stops the clip where it is: Crafting edits
                  // the pose, and a moving phone is the wrong thing to edit.
                  if (next === "crafting" && studio.playing)
                    studio.togglePlay();
                }}
                options={[
                  { id: "crafting", label: "Crafting" },
                  { id: "motion", label: "Motion" },
                ]}
              />
            </div>
          </div>

          {/*
            Shortcuts: a button beside the account chip, and a sheet over the
            middle of the studio -- the corner is the account menu's, and a
            list this long reads better where there is room for two columns.
          */}
          <div
            ref={keysRef}
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 45 }}
          >
            {/* Stepping aside while the account menu is open: that menu
                opens over this spot. */}
            <div
              className="pointer-events-auto absolute"
              style={{
                right: 16 + 44 + 12,
                top: 16,
                visibility: menuOpen ? "hidden" : "visible",
                // Above the solid ground the sheet brings, so the button that
                // opened it is still there to close it.
                zIndex: 1,
              }}
            >
              <Tip label="Shortcuts" offset={8}>
                <button
                  type="button"
                  aria-label="Keyboard shortcuts"
                  aria-expanded={sheet === "shortcuts"}
                  onClick={() =>
                    setSheet((was) =>
                      was === "shortcuts" ? null : "shortcuts",
                    )
                  }
                  className="grid cursor-pointer place-items-center"
                >
                  <Glass
                    shape="pill"
                    width={44}
                    className="items-center justify-center"
                    style={{ height: 44, padding: 0 }}
                  >
                    <span className="mo-title">⌘</span>
                  </Glass>
                </button>
              </Tip>
            </div>
            {keysOpen ? (
              <>
                {/*
                  A solid ground under the sheet, feathered at its edges: a
                  rounded shape in the studio's own colour with a LAYER blur
                  on the shape itself -- not a backdrop blur -- so the middle
                  is solid and it fades out toward the sides, where the rail,
                  the panels and the gizmo stay sharp and in view. A clear
                  full-window layer under it takes the click that closes.
                */}
                <div
                  className="pointer-events-auto absolute inset-0"
                  onPointerDown={closeKeys}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute"
                  // Over every component: inset only as far as the blur
                  // feathers, so the soft edge falls at the window's border
                  // and the rail, switch, panels and gizmo all sit under it.
                  style={{
                    inset: 24,
                    borderRadius: 64,
                    background: "#e4e4e4",
                    filter: "blur(40px)",
                  }}
                />
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="pointer-events-auto">
                    {sheet === "changelog" ? (
                      <ChangelogSheet onClose={closeKeys} />
                    ) : (
                      <ShortcutsSheet onClose={closeKeys} />
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div
            ref={menuRef}
            className="pointer-events-auto absolute flex items-start"
            // Over everything: the menu opens down into the band the mode
            // switch and the panels sit in, and on a short window it reached
            // them -- which, coming later in the page, painted over it. Above
            // the timeline's 30 too. A z-index is not a backdrop root, so the
            // menu still frosts.
            style={{ right: 16, top: 16, gap: 16, zIndex: 40 }}
          >
            {menuOpen ? (
              <Glass
                // Beside the chip, and as wide as the panel's width leaves:
                // its left edge lines up with the stack underneath.
                // 250 panel - 44 chip - 16 gap.
                width={control.panelW - 44 - 16}
              >
                <RowGroup>
                  {/* Clerk's own profile panel: name, email, password, connected
                      accounts, sessions. This row was a mock that selected
                      itself; now it opens the real thing. */}
                  <Row
                    icon={<Icon name="settings" />}
                    onClick={() => {
                      setMenuOpen(false);
                      openUserProfile();
                    }}
                  >
                    Account
                  </Row>
                  {/* What has shipped, in the same sheet the shortcuts use. */}
                  <Row
                    icon={<Icon name="effects" />}
                    onClick={() => {
                      setMenuOpen(false);
                      setSheet("changelog");
                    }}
                  >
                    Changelog
                  </Row>
                  {/*
                    Clerk's sign-out: it ends the session with Clerk and
                    clears the cookie the server reads, so the next render of
                    a gated page agrees that nobody is signed in.
                  */}
                  {userEmail ? (
                    <Row
                      icon={<Icon name="sign-out" />}
                      onClick={() => void signOut({ redirectUrl: "/sign-in" })}
                    >
                      Sign out
                    </Row>
                  ) : null}
                </RowGroup>
              </Glass>
            ) : null}

            {/* The account chip. A round glass surface is `Glass shape="pill"`;
                its portrait is the one asset in this frame with no export. */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={userEmail ? `Signed in as ${userEmail}` : "Account"}
              title={userEmail ?? undefined}
              className="cursor-pointer"
            >
              <Glass
                shape="pill"
                width={44}
                className="items-center justify-center"
                style={{ height: 44, padding: 0 }}
              >
                {/* The account's own photo, as the sign-in screens show it --
                    only a real one: Clerk hands out a generated avatar when
                    none was uploaded, and the initial reads better than that.
                    The initial also stands in while it loads or if it fails. */}
                {user?.hasImage && !avatarFailed ? (
                  // Clerk's CDN, 44px: nothing for the optimiser to add.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt=""
                    width={36}
                    height={36}
                    onError={() => setAvatarFailed(true)}
                    className="relative rounded-full object-cover"
                    style={{ width: 36, height: 36, zIndex: 1 }}
                  />
                ) : userEmail?.trim() ? (
                  <span className="mo-title">
                    {userEmail.trim().charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Glyph>
                    <Icon name="duplicate" />
                  </Glyph>
                )}
              </Glass>
            </button>
          </div>

          {/* Left cluster: the tool rail and the device list. */}
          <div
            ref={toolRef}
            className="pointer-events-none absolute flex items-center"
            style={{
              left: 16,
              gap: 16,
              top: SIDE_TOP,
              // Clear of the gizmo standing on the timeline, rather than
              // painting over it once the window is too short for both.
              bottom: `calc(var(--mo-reserve) + ${GIZMO_SIZE + 32}px)`,
              transition: RESERVE_EASE,
            }}
          >
            {/* Quiet while a panel is open: the panel opens into the space the
                tip would occupy, and the two are the same fact twice. The tip
                goes on the click rather than fading behind what it named. */}
            <ToolRail tool={tool} onPick={pickTool} quiet={panelOpen} />

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
              <div
                className="pointer-events-auto flex min-h-0 flex-col items-center"
                style={{ gap: 8, maxHeight: "100%" }}
              >
                <Glass
                  width={control.panelW}
                  className="min-h-0"
                  style={{ maxHeight: "100%" }}
                >
                  <PanelScroll>
                    <AutoHeight token={tool}>
                      {tool === "devices" ? (
                        /*
                          Categories first, devices a step in: each category
                          opens its models in a menu beside the panel. The
                          wrapper notes which row was pressed so the menu can
                          hang level with it. The Image card is not a product
                          line, so it is one row that simply selects.
                        */
                        <div
                          ref={deviceRowsRef}
                          onClickCapture={(event) => {
                            deviceAnchorRef.current = (
                              event.target as HTMLElement
                            ).closest('[role="button"]');
                          }}
                        >
                          <RowGroup>
                            {DEVICE_GROUPS.flatMap((group) => {
                              const members = DEVICES.filter(
                                (d) => deviceGroupOf(d.id) === group.id,
                              );
                              if (!members.length) return [];
                              const current = deviceGroupOf(state.deviceId);
                              const single = members.length === 1;
                              return [
                                ...(group.label
                                  ? []
                                  : [
                                      <Divider
                                        key={`${group.id}-rule`}
                                        inset={8}
                                      />,
                                    ]),
                                <Row
                                  key={group.id}
                                  icon={
                                    <Icon
                                      name={
                                        DEVICE_ICONS[members[0].id] ?? "iphone"
                                      }
                                    />
                                  }
                                  trailing={
                                    single ? undefined : <Icon name="chevron" />
                                  }
                                  selected={current === group.id}
                                  onClick={() =>
                                    single
                                      ? studio.pickDevice(members[0].id)
                                      : setDeviceGroup((was) =>
                                          was === group.id ? null : group.id,
                                        )
                                  }
                                >
                                  {group.label ?? members[0].label}
                                </Row>,
                              ];
                            })}
                          </RowGroup>
                          {deviceGroup ? (
                            <MenuPopover
                              anchor={deviceAnchorRef}
                              label="Devices"
                              placement="side"
                              items={DEVICES.filter(
                                (d) => deviceGroupOf(d.id) === deviceGroup,
                              ).map((d) => ({
                                id: d.id,
                                label: d.label,
                                icon: DEVICE_ICONS[d.id] ?? "iphone",
                                selected: d.id === state.deviceId,
                              }))}
                              onPick={(id) => {
                                studio.pickDevice(id);
                                setDeviceGroup(null);
                              }}
                              onClose={closeDeviceGroup}
                            />
                          ) : null}
                        </div>
                      ) : null}

                      {tool === "background" ? (
                        <div className="flex flex-col">
                          <Header
                            icon={<Icon name="canvas-color" />}
                            closeIcon={<Icon name="close-rounded" />}
                            onClose={closePanel}
                          >
                            Canvas color
                          </Header>
                          {/* Picking a colour is choosing a solid canvas, so
                              it also turns Transparent off. */}
                          <ColorPickerPanel
                            value={state.background.color}
                            onChange={(hex) =>
                              edit((prev) => ({
                                ...prev,
                                background: {
                                  ...prev.background,
                                  kind: "solid",
                                  color: hex,
                                },
                              }))
                            }
                          />
                          <ToggleRow
                            label="Transparent"
                            value={state.background.kind === "transparent"}
                            onChange={(on) =>
                              edit((prev) => ({
                                ...prev,
                                background: {
                                  ...prev.background,
                                  kind: on ? "transparent" : "solid",
                                },
                              }))
                            }
                          />
                        </div>
                      ) : null}

                      {tool === "finish" && studio.device.kind === "image" ? (
                        /* The image card is not a product with a colourway,
                           so it gets the colour picker rather than every
                           device's finishes in one long list. */
                        <ColorPickerPanel
                          value={getFinish(state.finishId).color}
                          onChange={(hex) => studio.pickFinish(hex)}
                        />
                      ) : tool === "finish" ? (
                        <RowGroup>
                          {studio.finishes.map((f) => (
                            <Row
                              key={f.id}
                              icon={<Swatch color={f.color} />}
                              /*
                              No selection where there is nothing to choose
                              between. A device that ships in one colour lists
                              that one colour, and a highlighted row alone in
                              its list reads as a control that was pressed
                              rather than as a fact about the device.
                            */
                              selected={
                                studio.finishes.length > 1 &&
                                f.id === state.finishId
                              }
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
                            // No delete here: the well's own Delete, beside
                            // Upload, is the one place to remove the image.
                            closeIcon={<Icon name="close-rounded" />}
                            onClose={closePanel}
                          >
                            {/* The file's name once there is one: it is the only
                              thing that tells two screenshots apart. */}
                            <MorphText>
                              {studio.screenName ?? "Image"}
                            </MorphText>
                          </Header>
                          <ImageWell
                            src={studio.screenSrc}
                            empty="No screen yet"
                            onPick={studio.uploadScreen}
                            onClear={studio.clearScreen}
                          />
                          {/*
                            Which part of the image lands on the screen. The
                            fit already covers the screen; these zoom into it
                            and move the window around, so a tall capture can
                            show its top, its middle or a detail.
                          */}
                          {studio.screenSrc ? (
                            /* Air above the rule, so the Adjust group does
                               not sit tight under the Upload row. */
                            <div
                              className="flex flex-col"
                              style={{
                                paddingTop: "var(--mo-space-3)",
                                gap: "var(--mo-space-2)",
                              }}
                            >
                              <Divider />
                              {/* The section's own reset, in its header the
                                  way every popup keeps what it can do to
                                  itself: back to Fill, 1x, centred. */}
                              <Header
                                trailing={
                                  <HeaderButton
                                    label="Reset adjustments"
                                    disabled={
                                      (state.screenFitMode ?? "fill") ===
                                        "fill" &&
                                      state.screenScale === 1 &&
                                      state.screenOffsetX === 0 &&
                                      state.screenOffsetY === 0
                                    }
                                    onClick={() =>
                                      edit((prev) => ({
                                        ...prev,
                                        screenFitMode: "fill",
                                        screenScale: 1,
                                        screenOffsetX: 0,
                                        screenOffsetY: 0,
                                      }))
                                    }
                                  >
                                    <Icon name={HEADER_ICON.reset} />
                                  </HeaderButton>
                                }
                              >
                                Adjust
                              </Header>
                              <ParamGroup>
                                <ParamRow
                                  hideValue
                                  label="Zoom"
                                  value={state.screenScale}
                                  min={1}
                                  max={4}
                                  step={0.01}
                                  format={(n) => `${n.toFixed(2)}×`}
                                  onChange={(n) =>
                                    edit((prev) => ({
                                      ...prev,
                                      screenScale: n,
                                    }))
                                  }
                                />
                                <Segmented
                                  width="100%"
                                  height={32}
                                  value={state.screenFitMode ?? "fill"}
                                  onChange={(mode) =>
                                    edit((prev) => ({
                                      ...prev,
                                      screenFitMode: mode,
                                    }))
                                  }
                                  options={[
                                    { id: "fill", label: "Fill" },
                                    { id: "fit", label: "Fit" },
                                  ]}
                                />
                              </ParamGroup>
                            </div>
                          ) : null}
                          {/*
                          A second well, on a device with a second screen.

                          Its own upload rather than a share of the one above,
                          because the two panels show different things on any
                          real foldable — a lock screen on the outside, and
                          whatever you opened it for inside. Binding one image
                          to both would be a mockup of a phone mirroring
                          itself.

                          Below rather than beside: the inner panel is the
                          screen this device is FOR, and the one the camera
                          frames. The cover is the other one.
                        */}
                          {getDevice(state.deviceId).coverScreen ? (
                            <>
                              <Divider />
                              <ParamGroup title="Front screen">
                                <ImageWell
                                  src={studio.coverSrc}
                                  empty="No front screen yet"
                                  onPick={studio.uploadCover}
                                  onClear={studio.clearCover}
                                />
                              </ParamGroup>
                            </>
                          ) : null}
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
                                dangerouslySetInnerHTML={{
                                  __html: studio.broadcast.qr,
                                }}
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
                            trailing={
                              <StatusDot
                                connected={studio.broadcast.state === "live"}
                              />
                            }
                          >
                            {/* The frame says "Status", which is a heading rather
                              than an answer. The link knows which of six things
                              is true, and morphing between them is the same
                              move the popup title makes. */}
                            <MorphText>
                              {PAIRING_LABEL[studio.broadcast.state]}
                            </MorphText>
                          </Header>
                        </div>
                      ) : null}

                      {tool === "canvas" ? (
                        <div className="flex flex-col">
                          <RowGroup>
                            {CANVAS_SIZES.map((c) => (
                              <Row
                                key={c.id}
                                icon={<Icon name={c.icon} />}
                                value={c.value}
                                selected={c.id === studio.ratioId}
                                onClick={() => studio.setRatioId(c.id)}
                              >
                                {c.name}
                              </Row>
                            ))}
                          </RowGroup>
                          {/* With the frame's size, since it is about what the
                              exported frame carries: every image and video. */}
                          <Divider inset={8} />
                          <ToggleRow
                            label="Watermark"
                            value={studio.watermark}
                            onChange={studio.setWatermark}
                          />
                        </div>
                      ) : null}
                    </AutoHeight>
                  </PanelScroll>
                </Glass>

                {/* Outside the panel in the frame, so a sibling rather than a
                    last row — and it belongs to one tool, not to the surface. */}
                {tool === "remote" ? (
                  <span
                    className="mo-code"
                    style={{ color: "var(--mo-ink-muted)" }}
                  >
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

          {/*
            Undo, reset and redo at the foot of the studio, centred. Above the
            timeline when it is up -- positioned off its reserve with the same
            ease, so the pill rides up and down with it.
          */}
          <div
            className="pointer-events-none absolute inset-x-0 flex justify-center"
            style={
              studio.ratio === null
                ? {
                    // Fill: the shot is the window, so there is no edge to
                    // sit under -- 40 clear of the bottom (or the timeline).
                    bottom: "calc(var(--mo-reserve) + 40px)",
                    transition: RESERVE_EASE,
                  }
                : {
                    /*
                      Just under the shot, 24 below its bottom edge -- the
                      frame's own geometry from `Stage`: centred in the area
                      above the timeline, INSET in from each side, fitted to
                      the ratio, at FRAME of what fits.
                    */
                    top: `calc((100dvh - var(--mo-reserve)) / 2 + min((100vw - ${2 * INSET}px) / ${studio.ratio}, 100dvh - var(--mo-reserve) - ${2 * INSET}px) * ${FRAME / 2} + 24px)`,
                    transition: `top ${TIMELINE_MS}ms ${TIMELINE_CURVE}`,
                  }
            }
          >
            <div className="pointer-events-auto">
              {/*
                THREE BUTTONS, not a switch.

                It was a `Segmented`, on the reasoning that three glyphs in one
                pill are one control. They are — but a segmented switch is for
                choosing a state, and these do not have one: pressing undo
                does not put the studio into "undo", it steps the shot back
                once. What that cost was a beat of travel before anything
                happened, and a pill left sitting on the last thing pressed,
                announcing a mode that does not exist.

                So: the pill, the geometry and the glyphs the frame draws, with
                nothing selected and nothing to travel. 102x40 with 4 of padding
                leaves 94x32 — three 31/32/31 cells, no gaps.
              */}
              <Glass shape="pill" width={102} style={{ height: 40 }}>
                <div className="flex h-full w-full items-center">
                  {HISTORY.map((step) => {
                    // Undo and redo go quiet with nothing to reach for; reset
                    // is always available, since there is always a default to
                    // return to.
                    const live =
                      step.id === "undo"
                        ? studio.canUndo
                        : step.id === "redo"
                          ? studio.canRedo
                          : true;
                    return (
                      <Tip
                        key={step.id}
                        label={step.label}
                        // The cell ends 4px inside the pill; this clears the
                        // pill itself by 10. Above: the pill sits at the foot.
                        placement="above"
                        offset={14}
                        className="flex h-full flex-1"
                      >
                        <button
                          type="button"
                          aria-label={step.label}
                          disabled={!live}
                          onClick={() => runHistory(step.id)}
                          className="grid h-full flex-1 place-items-center"
                          style={{ cursor: live ? "pointer" : "default" }}
                        >
                          {/* 16, not the system's 20: the frame draws 15-16px
                              symbols in 31px cells, and at icon size the
                              middle glyph overruns the pill it sits in. */}
                          <Glyph muted={!live}>
                            <Icon name={step.id} size={16} />
                          </Glyph>
                        </button>
                      </Tip>
                    );
                  })}
                </div>
              </Glass>
            </div>
          </div>

          {/* Right cluster: the open popup beside the stack. */}
          {/*
            A band, not the full height: below the account chip and above the
            timeline, with the stack capped to whatever is left. Centred in a
            window that fits 600 of stack, and on a shorter one the stack gives
            up height and scrolls — it used to spill out of both ends, under
            the chip and over the timeline.

            A grid rather than the column it was: `minmax(0, max-content)` is
            a track that is the content's height until the band runs out, and
            a grid track is a definite height the panels' `maxHeight: 100%`
            can resolve against. A flex item that had shrunk is not.
          */}
          <div
            className="pointer-events-none absolute grid content-center justify-items-end [&>*]:pointer-events-auto"
            style={{
              right: 16,
              top: SIDE_TOP,
              // The left rail's band exactly, so the two sides centre on the
              // same line: the panel sits level with the rail rather than
              // being centred in a taller column of its own.
              bottom: `calc(var(--mo-reserve) + ${GIZMO_SIZE + 32}px)`,
              transition: RESERVE_EASE,
              gridTemplateRows: "minmax(0, max-content)",
            }}
          >
            <div ref={popupRef} className="relative flex min-h-0 items-start">
              {/*
                One popup, belonging to whichever effect is open. It is not a
                fixed panel with a changing title: close it and there is no
                popup, which is why `openLayer` can be null.
              */}
              {/*
                The popup, beside the panel, at its full size -- no scroll --
                and centred on it.

                Out of flow and spanning the panel's height, as a column that
                centres its content and never shrinks it: a short popup sits
                level with the panel's middle, and a tall one -- Lighting, a
                colour picker -- reaches evenly above and below it rather than
                hanging off the top or the bottom.
              */}
              <div
                className="absolute flex flex-col justify-center [&>*]:shrink-0"
                style={{ top: 0, bottom: 0, right: "calc(100% + 16px)" }}
              >
                {focusShown ? (
                  <Glass width={control.panelW}>
                    <div
                      className="flex min-h-0 flex-col"
                      style={{ gap: "var(--mo-space-2)" }}
                    >
                      <Header
                        icon={<Icon name="focus-point" />}
                        closeIcon={<Icon name="close-rounded" />}
                        onClose={closePopup}
                      >
                        Focus points
                      </Header>
                      {studio.focusPoints.length ||
                      studio.focusDrafting ? null : (
                        <FocusIllustration />
                      )}
                      {studio.focusPoints.length ? (
                        <RowGroup>
                          {studio.focusPoints.map((_, i) => (
                            <Row
                              key={i}
                              trailing={
                                <button
                                  type="button"
                                  aria-label={`Remove area ${i + 1}`}
                                  className="grid cursor-pointer place-items-center"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    studio.setFocusPoints(
                                      studio.focusPoints.filter(
                                        (__, j) => j !== i,
                                      ),
                                    );
                                  }}
                                >
                                  <Icon name="trash" />
                                </button>
                              }
                            >
                              {`Area ${i + 1}`}
                            </Row>
                          ))}
                        </RowGroup>
                      ) : null}
                      {/* How hard the phone turns toward each area as the
                        camera arrives. 0 is a flat zoom and pan. */}
                      {/* How far in: 100% fills the frame with each area. */}
                      <ParamRow
                        label="Zoom"
                        value={studio.focusZoom}
                        min={0.25}
                        max={1.5}
                        step={0.01}
                        format={(n) => `${Math.round(n * 100)}%`}
                        onChange={studio.setFocusZoom}
                      />
                      {/* Sharp where the camera is looking, soft around it. */}
                      <ParamRow
                        label="Depth"
                        value={studio.focusDof}
                        min={0}
                        max={1}
                        step={0.01}
                        format={(n) => `${Math.round(n * 100)}%`}
                        onChange={studio.setFocusDof}
                      />
                      <ParamRow
                        label="Tilt"
                        value={studio.focusTilt}
                        min={0}
                        max={1}
                        step={0.01}
                        format={(n) => `${Math.round(n * 100)}%`}
                        onChange={studio.setFocusTilt}
                      />
                      <div
                        className="flex w-full items-center"
                        style={{ gap: 6 }}
                      >
                        <Button
                          grow
                          onClick={
                            studio.focusPoints.length
                              ? () => {
                                  const canvas = studio.stageCanvasRef.current;
                                  studio.composeFocus(
                                    canvas && canvas.clientHeight
                                      ? canvas.clientWidth / canvas.clientHeight
                                      : 1,
                                  );
                                  // The boxes were the brief; the move is the
                                  // result. Closing the panel takes them off the
                                  // shot so the move plays clean.
                                  closePopup();
                                }
                              : undefined
                          }
                          title="Write a camera move through the areas onto the timeline"
                        >
                          Compose
                        </Button>
                        <Button
                          onClick={() => studio.setFocusPoints([])}
                          title="Remove every area"
                        >
                          <span style={{ padding: "0 14px" }}>Clear</span>
                        </Button>
                      </div>
                    </div>
                  </Glass>
                ) : presetsShown ? (
                  <Glass width={control.panelW}>
                    <div
                      className="flex min-h-0 flex-col"
                      style={{ gap: "var(--mo-space-4)" }}
                    >
                      <Header
                        icon={<Icon name="styles" />}
                        closeIcon={<Icon name="close-rounded" />}
                        onClose={closePopup}
                      >
                        Presets
                      </Header>
                      {/*
                      One group, not rows of two: the lens travels between
                      whichever tile is selected, and it can only do that if
                      every tile is its sibling. Wrapping turns the column into
                      a grid, and the lens follows sideways as readily as down.
                    */}
                      {PRESETS.length === 0 ? (
                        <div
                          className="mo-title grid w-full place-items-center"
                          style={{ color: "var(--mo-ink-muted)", height: 120 }}
                        >
                          No presets yet
                        </div>
                      ) : null}
                      <PresetScroller gap={16}>{presetGrid()}</PresetScroller>
                    </div>
                  </Glass>
                ) : open ? (
                  /* 250 stated, not inherited: every popup on this side is the
                   panel width whatever it holds, so a one-colour Background
                   and a three-group Transform are the same object resizing
                   vertically rather than two panels of different shapes. */
                  <Glass width={control.panelW}>
                    <PanelScroll>
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
                          style={{
                            gap: open.id === "image" ? 0 : "var(--mo-space-4)",
                          }}
                        >
                          <Header
                            icon={<Icon name={open.icon} />}
                            trailing={
                              <>
                                <LayerActions
                                  layer={open}
                                  studio={studio}
                                  onDone={closePopup}
                                />
                              </>
                            }
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
                          ) : soloColor ? (
                            /* One colour and nothing else: the picker IS the
                             popup, under its header, rather than a row with a
                             chip that opens a second panel below this one. */
                            <ColorPickerPanel
                              value={soloColor.get(effective)}
                              onChange={(hex) =>
                                edit((prev) => soloColor.set(prev, hex))
                              }
                            />
                          ) : (
                            <div
                              className="flex flex-col"
                              style={{
                                gap: "var(--mo-space-2)",
                                paddingBottom: 10,
                              }}
                            >
                              {open.sections
                                // A section whose every row is out — the Lid on a
                                // device with no hinge — takes its title and its rule
                                // with it, rather than leaving a heading over nothing.
                                .map((section) => ({
                                  ...section,
                                  fields: section.fields.filter(
                                    (f) => f.when?.(state) ?? true,
                                  ),
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
                                            value={f.get(effective)}
                                            onChange={(hex) =>
                                              edit((prev) => f.set(prev, hex))
                                            }
                                          />
                                        ) : f.kind === "select" ? (
                                          <SelectRow
                                            key={f.key}
                                            label={f.label}
                                            value={f.get(effective)}
                                            options={f.options}
                                            onChange={(id) =>
                                              edit((prev) => f.set(prev, id))
                                            }
                                          />
                                        ) : f.kind === "toggle" ? (
                                          <ToggleRow
                                            key={f.key}
                                            label={f.label}
                                            value={f.get(effective)}
                                            onChange={(on) =>
                                              edit((prev) => f.set(prev, on))
                                            }
                                          />
                                        ) : f.kind === "point" ? (
                                          <FocusPad
                                            key={f.key}
                                            label={f.label}
                                            value={f.get(effective)}
                                            onChange={(point) =>
                                              edit((prev) => f.set(prev, point))
                                            }
                                          />
                                        ) : f.kind === "choice" ? (
                                          /*
                                        A list, not a dropdown. There are six
                                        of these and the popup has room, so
                                        showing them costs one scroll and saves
                                        a click on every change — and choosing
                                        a light is a thing you do by comparing,
                                        which a closed menu will not let you do.
                                      */
                                          /* Chips that wrap, not a column of
                                           full-width rows: the pill hugs the
                                           name it selects. */
                                          <RowGroup key={f.key} wrap gap={4}>
                                            {f.options.map((option) => (
                                              <Row
                                                hug
                                                key={option.id}
                                                selected={
                                                  option.id === f.get(effective)
                                                }
                                                onClick={() =>
                                                  edit((prev) =>
                                                    f.set(prev, option.id),
                                                  )
                                                }
                                              >
                                                {option.label}
                                              </Row>
                                            ))}
                                          </RowGroup>
                                        ) : (
                                          <ParamRow
                                            key={f.key}
                                            label={f.label}
                                            icon={
                                              f.axis ? (
                                                <span className="mo-label">
                                                  {f.axis}
                                                </span>
                                              ) : undefined
                                            }
                                            /* The frame's reset glyph, and it resets:
                                     back to whatever `DEFAULT_EDITOR_STATE`
                                     says this field is, which is the only
                                     definition of neutral there is. */
                                            trailing={
                                              /*
                                            The diamond keys the row.

                                            It always looked like a keyframe —
                                            it is the same glyph the timeline
                                            draws its keys with — and it used
                                            to reset the field, which is why
                                            nothing in this interface could
                                            START a track: `edit` only keys
                                            channels that already have one, by
                                            design, so a shot with no preset
                                            had no way in at all.

                                            Reset did not need it. Every popup
                                            already carries one in its header,
                                            over the whole panel, and that is
                                            the gesture people reach for.
                                          */
                                              // Keyframes are Motion's: Crafting
                                              // sets the pose, Motion animates it.
                                              // Nothing trails a row there -- the
                                              // reset glyph is a diamond too, and
                                              // read as the keyframe still there.
                                              tab !==
                                              "motion" ? undefined : f.channel ? (
                                                <KeyframeDot
                                                  studio={studio}
                                                  channel={f.channel}
                                                  label={f.label}
                                                />
                                              ) : f.reset ? (
                                                <button
                                                  type="button"
                                                  aria-label={`Reset ${f.label}`}
                                                  className="grid cursor-pointer place-items-center"
                                                  onClick={() =>
                                                    edit((prev) =>
                                                      f.set(
                                                        prev,
                                                        f.get(
                                                          DEFAULT_EDITOR_STATE,
                                                        ),
                                                      ),
                                                    )
                                                  }
                                                >
                                                  <Icon
                                                    name="reset-value"
                                                    size={12}
                                                  />
                                                </button>
                                              ) : undefined
                                            }
                                            value={f.get(effective)}
                                            min={f.min}
                                            max={f.max}
                                            step={f.step}
                                            bare={f.bare}
                                            format={f.format}
                                            snap={
                                              isSnapKey(f.key)
                                                ? (n) =>
                                                    studio.snapField(
                                                      f.key as SnapKey,
                                                      n,
                                                    )
                                                : undefined
                                            }
                                            onChange={(n) =>
                                              edit((prev) => f.set(prev, n))
                                            }
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
                    </PanelScroll>
                  </Glass>
                ) : null}
              </div>

              {tab === "crafting" ? (
                /*
                  `key` is what makes the tab switch a switch. Both tabs render
                  a `Glass` holding a `RowGroup` at the same position, so React
                  reuses the instance rather than replacing it — and the lens
                  arrives still holding the spring state of the preset tile it
                  was on, then travels across the panel to find its row. Keyed
                  by tab, each tab gets its own group, and a group that has just
                  been born puts its lens where it belongs.
                */
                <Glass
                  key="crafting"
                  // Sized to its rows, so it grows only as effects are added; the
                  // band caps it, and the rows scroll past that.
                  style={{ maxHeight: "100%" }}
                >
                  <PanelScroll>
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
                      {BASE_LAYERS.map(stageRow)}
                      {/*
                      Effects, the way Figma lists them: a heading with a plus,
                      and a row only for what is actually in the shot. Eight
                      rows of unticked boxes read as a checklist to get through;
                      a short list of what you added reads as the shot.

                      8 either side of the rule: a selected row's pill runs to
                      the edge of its box, so a rule with no air reads as
                      touching whichever row is lit next to it.
                    */}
                      <Divider key="effects-rule" inset={8} />
                      <div key="effects-head" ref={addRef}>
                        <Header
                          trailing={
                            <HeaderButton
                              label="Add effect"
                              disabled={addable.length === 0}
                              onClick={() => {
                                // The menu opens in the popup's place, so the
                                // popup steps aside rather than sitting under it.
                                if (!addOpen) setPopupOpen(false);
                                setAddOpen(!addOpen);
                              }}
                            >
                              <ToggleGlyph on={false} />
                            </HeaderButton>
                          }
                        >
                          Effects
                        </Header>
                      </div>
                      {shownEffects.map((l) => (
                        <Row
                          key={l.id}
                          icon={<Icon name={l.icon} />}
                          trailing={
                            <button
                              type="button"
                              aria-label={`Remove ${l.name}`}
                              title={`Remove ${l.name}`}
                              className="grid cursor-pointer place-items-center"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeEffect(l);
                              }}
                            >
                              <ToggleGlyph on />
                            </button>
                          }
                          selected={l.id === selectedLayer}
                          onClick={() => openLayer(l)}
                        >
                          {l.name}
                        </Row>
                      ))}
                    </RowGroup>
                    {addOpen ? (
                      <MenuPopover
                        anchor={addRef}
                        label="Add effect"
                        placement="side"
                        items={addable.map((l) => ({
                          id: l.id,
                          label: l.name,
                          icon: l.icon,
                        }))}
                        onPick={(id) => {
                          const layer = addable.find((l) => l.id === id);
                          if (layer) addEffect(layer);
                        }}
                        onClose={closeAddMenu}
                      />
                    ) : null}
                  </PanelScroll>
                  <ExportRow studio={studio} kind="image" />
                </Glass>
              ) : (
                /* Motion replaces the stack, not the column — the switch and
                   any open popup stay put. The three stage rows on top, so a
                   picked move is tuned from here; the tiles share what is
                   left. */
                <Glass
                  key="motion"
                  // Sized to its rows, so it grows only as effects are added; the
                  // band caps it, and the rows scroll past that.
                  style={{ maxHeight: "100%" }}
                >
                  <RowGroup>
                    {[
                      <Row
                        key={PRESETS_ID}
                        icon={<Icon name="styles" />}
                        trailing={
                          <ToggleGlyph on={selectedLayer === PRESETS_ID} />
                        }
                        selected={selectedLayer === PRESETS_ID}
                        onClick={() => {
                          setPopupOpen(
                            selectedLayer === PRESETS_ID ? !popupOpen : true,
                          );
                          setSelectedLayer(PRESETS_ID);
                        }}
                      >
                        Presets
                      </Row>,
                      <Row
                        key={FOCUS_ID}
                        icon={<Icon name="focus-point" />}
                        trailing={
                          <ToggleGlyph on={selectedLayer === FOCUS_ID} />
                        }
                        selected={selectedLayer === FOCUS_ID}
                        onClick={() => {
                          setPopupOpen(
                            selectedLayer === FOCUS_ID ? !popupOpen : true,
                          );
                          setSelectedLayer(FOCUS_ID);
                        }}
                      >
                        Focus points
                      </Row>,
                      ...MOTION_LAYERS.map(stageRow),
                      stageRow(MOTION_DOF),
                    ]}
                  </RowGroup>
                  <MotionExportRow studio={studio} />
                </Glass>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
