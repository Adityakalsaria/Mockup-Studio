"use client";

/**
 * The Mocraft primitives.
 *
 * Twenty-two components are named in the Figma file — Devices, Transform,
 * Overlay, Drop shadow, Gradient, Dots, Craft Size, Source, Mirroring, Gyro,
 * Presets, Profile, and so on. They are not twenty-two designs. Every one is a
 * glass shell holding some arrangement of five rows, and the whole file is
 * built from what is in this module.
 *
 * That is the reason to build these before any screen: get the five right and
 * the popups become data. Get them wrong and the same mistake ships twenty-two
 * times.
 *
 * Values come from `./system`, never from here. If a number appears inline in
 * this file it is a bug.
 */

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { TextMorph } from "torph/react";
import { control, material, motion, radius, SYSTEM_CSS, type ButtonTone } from "./system";
import { AaveGlass } from "./useContentLens";

/**
 * Text that becomes different text, rather than being replaced by it.
 *
 * The rule is about WHICH text, not where. A label that changes while staying
 * put — a popup's title as its subject changes, a readout as its value does —
 * should transform, because cutting says something arrived when nothing did. A
 * label that appears or leaves is not this: it has no previous state to come
 * from, and every fixed name in a list is in that second category.
 *
 * The duration matches what `motion.selection` settles in, so text resolving
 * and the panel around it moving finish together. Torph runs its own engine, so
 * this is as close as the two can be brought without one driving the other —
 * text still resolving after its panel had arrived would read as lag.
 */
const MORPH_MS = 240;

export function MorphText({
  children,
  as = "span",
}: {
  children: string;
  as?: "span" | "p" | "h1" | "h2";
}) {
  return (
    <TextMorph as={as} duration={MORPH_MS}>
      {children}
    </TextMorph>
  );
}

/** Injects the generated stylesheet. Mount once, above anything using it. */
export function DesignSystem() {
  return <style>{SYSTEM_CSS}</style>;
}

/* ===========================================================================
   Surface
   =========================================================================== */

/**
 * The cursor bloom, tracked.
 *
 * Writes straight to the node's inline style rather than through state. A
 * pointermove fires at the display's refresh rate, and putting that through
 * React would re-render every row in the panel to move one gradient — the
 * whole effect is two custom properties, so it belongs on the DOM.
 *
 * Read on enter as well as move, because a pointer that arrives without moving
 * (a click landing from a menu, a scroll bringing the surface under a still
 * cursor) would otherwise bloom at the last place it happened to be.
 */
function useGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const track = useCallback((event: ReactPointerEvent<T>) => {
    const node = ref.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    node.style.setProperty("--mo-mx", `${event.clientX - box.left}px`);
    node.style.setProperty("--mo-my", `${event.clientY - box.top}px`);
  }, []);

  return {
    ref,
    onPointerMove: track,
    onPointerEnter: (event: ReactPointerEvent<T>) => {
      track(event);
      ref.current?.style.setProperty("--mo-glow", "1");
    },
    onPointerLeave: () => ref.current?.style.setProperty("--mo-glow", "0"),
  };
}

export type GlassProps = {
  children: ReactNode;
  /**
   * `panel` for anything holding rows; `rail` for the vertical icon strip,
   * which is a capsule at its own width rather than a rounded rectangle;
   * `pill` for a surface whose ends are fully round at whatever height it
   * happens to be — the segmented switch, whose indicator is already a capsule
   * and looked wrong inside an 18px corner.
   */
  shape?: "panel" | "rail" | "pill";
  width?: number | string;
  className?: string;
  style?: CSSProperties;
};

/**
 * The material: two layers, seven flat elements, one set of `--mo-mat-*`.
 *
 * Written once and configured by whatever encloses it — `.mo-glass` maps the
 * panel's values onto it, `.mo-mat-selection` the travelling pill's. The
 * selection used to be a flat plate with a shadow while the panel had the full
 * stack, which is exactly the drift that comes of building the same thing
 * twice.
 *
 * Flat siblings, never nested: `backdrop-filter` isolates, so a blended layer
 * placed inside the frost has nothing beneath it to blend against and its
 * blend mode silently does nothing. See the long note in `system.ts`.
 */
export function Material() {
  return (
    <>
      <div aria-hidden className="mo-mat-layer mo-mat-base" />
      <div aria-hidden className="mo-mat-layer mo-mat-rim" />
      <div aria-hidden className="mo-mat-layer mo-mat-frost" />
      <div aria-hidden className="mo-mat-layer mo-mat-pane" />
      <div aria-hidden className="mo-mat-layer mo-mat-depth mo-mat-depth-1" />
      <div aria-hidden className="mo-mat-layer mo-mat-depth mo-mat-depth-2" />
      <div aria-hidden className="mo-mat-layer mo-mat-depth mo-mat-depth-3" />
    </>
  );
}

/** The corner each surface shape carries. */
const SURFACE_RADIUS = {
  panel: "var(--mo-r-panel)",
  rail: "var(--mo-r-rail)",
  // Its own variable, falling back to the pill: the switch track and a slider
  // track are both capsules, but only one of them is a surface worth tuning.
  pill: "var(--mo-r-switch, var(--mo-r-pill))",
} as const;

/**
 * The floating surface every popup and panel is made of.
 *
 * 8px of padding is part of the surface, not the caller's business: rows run
 * full-bleed inside it and the inset is what keeps a selected row's pill from
 * touching the glass edge.
 */
export function Glass({ children, shape = "panel", width, className = "", style }: GlassProps) {
  const glow = useGlow<HTMLDivElement>();
  return (
    <div
      {...glow}
      className={`mo-glass flex flex-col ${className}`}
      style={{
        width: width ?? (shape === "rail" ? control.railW : control.panelW),
        padding: "var(--mo-space-2)",
        borderRadius: SURFACE_RADIUS[shape],
        ...style,
      }}
    >
      <Material />
      {children}
    </div>
  );
}

/* ===========================================================================
   Travel
   =========================================================================== */

/**
 * Spring a scalar toward a target.
 *
 * Every travelling lens in the system runs on this — the segmented indicator,
 * a row list, the icon rail — so they all settle at one rate. The constants
 * live in `motion.selection`; nothing here should pass its own.
 *
 * Exported because motion belongs to the system as much as material does. A
 * control that eased on a CSS transition instead would be a second timing
 * model in the same interface, and the two would drift.
 *
 * Returns live `{ value, velocity }` rather than just the position, because
 * the velocity is what `travellingBend` needs to deepen the glass while the
 * lens is actually moving.
 */
type Spring = { stiffness: number; damping: number; mass: number };

export function useSpring(
  target: number,
  { stiffness, damping, mass }: Spring = motion.selection,
) {
  const [snap, setSnap] = useState({ value: target, velocity: 0 });
  const state = useRef({ value: target, velocity: 0 });
  const lastTick = useRef(0);

  useEffect(() => {
    let raf = 0;

    const tick = (now: number) => {
      // Measured from the previous TICK, not from when this effect last ran.
      // A slider drag moves the target on every input event, which re-runs the
      // effect — restarting the clock there would shorten every dt and make
      // the spring integrate slower than real time, so the knob would fall
      // further behind the faster you dragged. Clamped at the top end because
      // a backgrounded tab comes back with one enormous dt and the integrator
      // would throw the lens clean off the control.
      const dt = Math.min(0.032, (now - lastTick.current) / 1000);
      lastTick.current = now;
      const { value: x, velocity: v } = state.current;
      const force = -stiffness * (x - target) - damping * v;
      const accel = force / mass;
      const nextV = v + accel * dt;
      const nextX = x + nextV * dt;
      state.current = { value: nextX, velocity: nextV };
      setSnap({ value: nextX, velocity: nextV });

      if (Math.abs(nextV) > 0.0005 || Math.abs(nextX - target) > 0.0005) {
        raf = requestAnimationFrame(tick);
      } else {
        state.current = { value: target, velocity: 0 };
        setSnap({ value: target, velocity: 0 });
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, stiffness, damping, mass]);

  return snap;
}

/**
 * Displacement multiplier for a lens that is on the move.
 *
 * The bend deepens while the lens travels and relaxes to `base` once the
 * spring settles, so the selection reads as glass forming around what it
 * slides over instead of a shape being teleported onto it.
 */
function travellingBend(base: number, velocity: number) {
  const { perUnit, max } = motion.boost;
  return base * (1 + Math.min(max, Math.abs(velocity) * perUnit));
}

/**
 * A child's box, in the group's own coordinates.
 *
 * All four sides, not just the vertical pair. A column only ever needs `top`
 * and `height` — every row starts at zero and runs the full width — but a grid
 * needs the lens to travel sideways and to change width as it goes, and the
 * measurement is the same either way.
 */
type Span = { top: number; left: number; width: number; height: number };

/**
 * Measure each child of a column, relative to the column.
 *
 * Rows are a uniform 40px today, so this could be arithmetic — but a label
 * that wraps, or a rail that mixes sizes, would make it wrong silently. The
 * observer watches the children as well as the column because a row can change
 * height without the column doing so.
 */
function useColumnSpans(count: number) {
  /*
   * A callback ref, not a ref object.
   *
   * The group swaps its wrapper once it has measured — a bare div before the
   * lens exists, the lens itself after — and that remounts the column onto a
   * fresh DOM node. A `useRef` gives no signal when that happens, so the
   * observer stays pointed at the detached node, which measures zero, and the
   * lens collapses to nothing the instant it appears. Ref-as-state re-runs the
   * effect on the node itself.
   */
  const [node, ref] = useState<HTMLDivElement | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  // The group's own size, for the refraction copy: its containing block is the
  // LENS, so `100%` there means the lens rather than the group the moment the
  // lens stops spanning the full width.
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!node) return;

    const measure = () => {
      const base = node.getBoundingClientRect();
      setSize({ width: base.width, height: base.height });
      setSpans(
        Array.from(node.children).map((child) => {
          // `[data-lens]` lets a child say which part of itself the selection
          // covers — a preset tile is a square of artwork with a caption under
          // it, and the selection belongs to the square.
          const covered = child.querySelector("[data-lens]") ?? child;
          const box = covered.getBoundingClientRect();
          return {
            top: box.top - base.top,
            left: box.left - base.left,
            width: box.width,
            height: box.height,
          };
        }),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [node, count]);

  return [ref, spans, size] as const;
}

/* ===========================================================================
   Row
   =========================================================================== */

export type RowProps = {
  icon?: ReactNode;
  children?: ReactNode;
  /** Chevron, close, plus — whatever sits at the right edge. */
  trailing?: ReactNode;
  /**
   * A readout between the label and the trailing glyph — "1920 X 1080" beside
   * a ratio. Not a `Field`: that is a tinted plate for a number you edit, and
   * this is text you read. It takes muted ink either way, since a value that
   * competed with its own label would be the wrong way round.
   */
  value?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
};

/**
 * Set by `RowGroup` on the rows it owns.
 *
 * Two things hang off it. A row inside a group must not draw its own lens —
 * the group draws one for the whole column and springs it between rows, which
 * is the only way a selection can travel. And `copy` marks the second, hidden
 * pass the group renders as that lens's refraction target, where every row is
 * drawn at full ink so whichever one the lens happens to be over reads as the
 * selected one.
 */
type RowGroupState = { copy: boolean };
const RowGroupCtx = createContext<RowGroupState | null>(null);

/** Shared by `Row` and `RailItem`: ink strength, and whether to wire clicks. */
function useRowState(selected?: boolean, onClick?: () => void) {
  const group = useContext(RowGroupCtx);
  const copy = group?.copy ?? false;
  return {
    grouped: group !== null,
    // In the refraction copy every row is drawn selected — see RowGroupCtx.
    strong: copy || Boolean(selected),
    // The copy is inert: it is `aria-hidden`, so leaving it focusable would
    // put a tab stop on a row a screen reader has been told does not exist.
    interactive: Boolean(onClick) && !copy,
  };
}

/** Enter and Space on a div that has been given `role="button"`. */
function pressKeys(onClick?: () => void) {
  return (event: { key: string; preventDefault: () => void }) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };
}

/**
 * The 40px list row: icon, label, trailing control.
 *
 * The row paints no selected fill of its own. Selection is a lens owned by the
 * enclosing `RowGroup`, and all the row contributes to the state is ink
 * strength — the fill, the radius and the shadow travel with the lens. A row
 * used on its own wraps itself in a one-item group so there is exactly one
 * implementation of the selected look rather than two that can drift.
 */
export function Row({ icon, children, trailing, value, selected, onClick, title }: RowProps) {
  const { grouped, strong, interactive } = useRowState(selected, onClick);

  if (!grouped) {
    return (
      <RowGroup>
        <Row
          icon={icon}
          trailing={trailing}
          value={value}
          selected={selected}
          onClick={onClick}
          title={title}
        >
          {children}
        </Row>
      </RowGroup>
    );
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? pressKeys(onClick) : undefined}
      className={`relative flex w-full items-center ${interactive ? "cursor-pointer" : ""}`}
      style={{
        gap: "var(--mo-space-2)",
        padding: "10px var(--mo-space-3)",
        borderRadius: "var(--mo-r-row)",
      }}
    >
      {icon ? (
        <span className="relative" style={{ zIndex: 1 }}>
          <Glyph muted={!strong}>{icon}</Glyph>
        </span>
      ) : null}
      <span
        className="mo-title relative min-w-0 flex-1 truncate"
        style={{
          zIndex: 1,
          color: strong ? "var(--mo-ink)" : "var(--mo-ink-muted)",
          filter: "var(--mo-text-shadow)",
        }}
      >
        {children}
      </span>
      {value ? (
        <span
          className="mo-code relative shrink-0 tabular-nums"
          style={{
            zIndex: 1,
            color: "var(--mo-ink-muted)",
            filter: "var(--mo-text-shadow)",
          }}
        >
          {value}
        </span>
      ) : null}
      {trailing ? (
        <span className="relative" style={{ zIndex: 1 }}>
          <Glyph muted={!strong}>{trailing}</Glyph>
        </span>
      ) : null}
    </div>
  );
}

/**
 * A colour chip, at icon size, for a row that names a finish.
 *
 * Its edge is `material.swatch`'s — the same hairline `ColorRow` uses, rather
 * than the frame's own 1px, which is that value scaled up by a quarter. Two
 * swatches at two sizes is how a system stops being one.
 *
 * The CAST is where the two part company, and deliberately. A colour picker's
 * chip is a control you press, and the shadow says so; this one is a row's
 * icon, sitting in a list beside a label, and the same 21.6px cast under it
 * reads as the row lifting off the panel rather than as a chip with depth.
 * Nine of them down a device list is nine rows apparently floating.
 */
export function Swatch({ color }: { color: string }) {
  return (
    <span
      className="block shrink-0"
      style={{
        width: control.icon,
        height: control.icon,
        borderRadius: "var(--mo-r-swatch)",
        background: color,
        border: "var(--mo-swatch-edge)",
      }}
    />
  );
}

/**
 * A pressable wearing the selected pill's material.
 *
 * The frame builds Upload and the delete key out of `Liquid Glass - Small` —
 * the same component a selected row is — so this is that material on something
 * you press, rather than a new surface invented for buttons. The rim and cast
 * ride on the element itself, where a lens has to hand them to its chrome
 * because it clips; nothing clips here, so they stay put.
 */
export function Button({
  children,
  onClick,
  width,
  height = control.rowH,
  grow,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  width?: number | string;
  height?: number;
  /**
   * Take the remaining width of a flex row.
   *
   * Not `width: 100%`: in a row that also holds a fixed key, 100% is the whole
   * row and the key is pushed out past the panel. This is the pair the frame
   * draws — a button that fills what is left, beside one that does not move.
   */
  grow?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`mo-mat-selection mo-title relative grid cursor-pointer place-items-center ${
        grow ? "min-w-0 flex-1" : "shrink-0"
      }`}
      style={{
        width,
        height,
        borderRadius: "var(--mo-r-selected)",
        background: "var(--mo-selected)",
        boxShadow: "var(--mo-selected-shadow)",
        color: "var(--mo-ink)",
        filter: "var(--mo-text-shadow)",
      }}
    >
      <Material />
      <span className="relative grid place-items-center" style={{ zIndex: 1 }}>
        {children}
      </span>
    </button>
  );
}

/**
 * A rail's icon-only row.
 *
 * The same 40px box as `Row` with the label column taken out, so it drops into
 * the same `RowGroup` and is picked up by the same travelling lens. At the
 * rail's width the box is square and `radius.selected` clamps to a circle,
 * which is where the rail's round selection comes from — it is not a separate
 * shape.
 */
export function RailItem({
  icon,
  selected,
  onClick,
  title,
}: {
  icon: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const { grouped, strong, interactive } = useRowState(selected, onClick);

  if (!grouped) {
    return (
      <RowGroup>
        <RailItem icon={icon} selected={selected} onClick={onClick} title={title} />
      </RowGroup>
    );
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? pressKeys(onClick) : undefined}
      className={`relative grid w-full place-items-center ${interactive ? "cursor-pointer" : ""}`}
      style={{ padding: "10px var(--mo-space-3)", borderRadius: "var(--mo-r-row)" }}
    >
      <span className="relative" style={{ zIndex: 1 }}>
        <Glyph muted={!strong}>{icon}</Glyph>
      </span>
    </div>
  );
}

export type RowGroupProps = {
  children: ReactNode;
  /**
   * Space between rows.
   *
   * The lens measures each row's real box, so a gap needs no separate telling:
   * it travels the extra distance and settles on the right one either way.
   */
  gap?: number;
  /** Overrides `motion.selection` — the tuning seam the system page drives. */
  spring?: Spring;
  /** Overrides `material.lens.row.bend`. */
  bend?: number;
  /**
   * Lay the children out as a wrapping grid instead of a column.
   *
   * The lens does not care: it travels to whatever box the selected child
   * occupies, and in a grid that means sideways and to a different width as
   * well as up and down.
   */
  wrap?: boolean;
  /** The lens's corner. A row is a capsule; a tile is not. */
  radius?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * A column of rows with ONE travelling selection lens.
 *
 * The lens cannot live on the row. An unselected row renders nothing to move,
 * so a per-row lens can only appear and disappear — the selection jumps. Hoist
 * it here and it springs from row to row exactly the way `Segmented`'s does
 * between segments, off the same spring.
 *
 * Rows are rendered twice. The first pass is the real, interactive column and
 * stays sharp. The second is the `refractionTarget`: the same rows at full ink
 * on one selected-fill plate, counter-translated by `-top` so it stays
 * registered with the first while the lens window slides over it. Mid-travel
 * the label under the lens bends, which is the whole effect — and it is why
 * the copy has to be the full column rather than a single plate.
 *
 * The index is what springs, not the pixel offset. That keeps the units the
 * same as `Segmented`'s so both share one set of spring constants and one
 * velocity-to-bend curve; pixels would need a different `boost.perUnit` per
 * control and they would drift apart the first time a row changed height.
 */
export function RowGroup({
  children,
  gap,
  spring,
  bend,
  wrap,
  radius: corner = radius.selected,
  className = "",
  style,
}: RowGroupProps) {
  const items = Children.toArray(children);
  const found = items.findIndex(
    (child) => isValidElement<{ selected?: boolean }>(child) && child.props.selected === true,
  );

  // Park on the last selection rather than snapping home: a group that
  // momentarily has nothing selected should fade out where it was standing,
  // not travel to row 0 on its way to becoming invisible.
  const [parked, setParked] = useState(0);
  if (found >= 0 && found !== parked) setParked(found);
  const index = found >= 0 ? found : parked;

  const [columnRef, spans, size] = useColumnSpans(items.length);

  const column = (
    <div
      ref={columnRef}
      className={`flex w-full ${wrap ? "flex-wrap" : "flex-col"}`}
      style={{ gap }}
    >
      <RowGroupCtx.Provider value={{ copy: false }}>{children}</RowGroupCtx.Provider>
    </div>
  );

  /*
   * No lens until there is a box to put it on.
   *
   * A spring takes its opening value from its target on the render it is first
   * called, and on the very first render nothing has been measured — so a lens
   * mounted then starts at zero and travels out of the corner to reach the
   * selection. Nobody notices on a page that loads once; it is glaring when a
   * tab switch unmounts one group and mounts another, because then the morph
   * happens every time you look at it.
   *
   * Deferring the lens by one measurement means it is born where it belongs.
   */
  if (spans.length === 0) {
    return (
      <div className={`w-full ${className}`.trim()} style={style}>
        {column}
      </div>
    );
  }

  return (
    <SelectionLens
      spans={spans}
      size={size}
      index={index}
      visible={found >= 0}
      gap={gap}
      wrap={wrap}
      corner={corner}
      spring={spring}
      bend={bend}
      className={className}
      style={style}
      copy={<RowGroupCtx.Provider value={{ copy: true }}>{children}</RowGroupCtx.Provider>}
    >
      {column}
    </SelectionLens>
  );
}

/**
 * The travelling lens itself, mounted once its geometry is known.
 *
 * Four springs on the box rather than one on an index: springing the index
 * walks the lens along the chain — 0, 1, 2, 3 — which in a column is the
 * straight line you want anyway, since every row shares a left edge. In a grid
 * it is a zigzag: across the row, back to the left, down and across again.
 * Springing the box's own numbers sends it straight there.
 */
function SelectionLens({
  spans,
  size,
  index,
  visible,
  gap,
  wrap,
  corner,
  spring,
  bend,
  className,
  style,
  copy,
  children,
}: {
  spans: Span[];
  size: { width: number; height: number };
  index: number;
  visible: boolean;
  gap?: number;
  wrap?: boolean;
  corner: number;
  spring?: Spring;
  bend?: number;
  className: string;
  style?: CSSProperties;
  copy: ReactNode;
  children: ReactNode;
}) {
  const target = spans[index] ?? spans[0];
  const top = useSpring(target.top, spring);
  const left = useSpring(target.left, spring);
  const width = useSpring(target.width, spring);
  const height = useSpring(target.height, spring);

  // Back into boxes-per-second, which is the unit `boost.perUnit` was tuned in
  // when this sprang an index — pixels per second would pin the bend at `max`
  // the instant anything moved.
  const speed = Math.hypot(top.velocity, left.velocity) / Math.max(1, target.height);

  return (
    <AaveGlass
      lens={{ width: width.value, height: height.value, borderRadius: corner }}
      x={left.value}
      y={top.value}
      scale={travellingBend(bend ?? material.lens.row.bend, speed)}
      bevel={material.lens.row.bevel}
      // The pill's own two plates: rim hairlines and a short drop below the
      // refraction, depth bands above it. Above matters — run the bands
      // through the displacement and the lens bends its own edge treatment.
      lensShadow="var(--mo-selected-shadow)"
      specular="var(--mo-selected-inset)"
      specularBlend="var(--mo-selected-depth-blend)"
      lensStyle={{ opacity: visible ? 1 : 0 }}
      className={`w-full ${className}`.trim()}
      style={style}
      refractionTarget={
        <div
          aria-hidden
          className={`flex ${wrap ? "flex-wrap" : "flex-col"}`}
          style={{
            gap,
            position: "absolute",
            left: 0,
            top: 0,
            // Counter-translated on the compositor rather than through
            // `left`/`top`, which would relayout the whole copy every frame.
            transform: `translate(${-left.value}px, ${-top.value}px)`,
            // The group's measured size, not `100%`: this sits inside the lens,
            // so a percentage would resolve against the lens instead.
            width: size.width || "100%",
            height: size.height || undefined,
            background: "var(--mo-selected)",
          }}
        >
          {copy}
        </div>
      }
    >
      {children}
    </AaveGlass>
  );
}

/**
 * A 20px icon box. Every glyph in the interface is this size.
 *
 * Muted is OPACITY, not a second colour. The file draws one glyph per device
 * and dims it with `fill-opacity: 0.5` on the same `#595959`, so the exported
 * assets carry no muted variant to switch to — and half-strength ink is
 * exactly half-opacity ink, which makes the two states agree whether the glyph
 * arrives as an `<Image>` with a baked fill or as inline `currentColor`.
 * Colouring one and fading the other would have compounded to a quarter.
 */
export function Glyph({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: control.icon,
        height: control.icon,
        color: "var(--mo-ink)",
        opacity: muted ? 0.5 : 1,
      }}
    >
      {children}
    </span>
  );
}

/**
 * A popup's title bar. Same geometry as `Row`, but never selectable and its
 * label is always at full strength — it names the thing you already opened.
 */
export function Header({
  icon,
  children,
  trailing,
  onClose,
  closeIcon,
}: {
  icon?: ReactNode;
  children: ReactNode;
  /**
   * Anything at the right edge that is not the close — a status light, or the
   * popup's own actions as `HeaderButton`s.
   *
   * One slot rather than a named prop per act. Reset and delete arrived a week
   * apart and a third would arrive the same way; three props each is a header
   * that grows a pair of glyph props every time a popup learns a verb, and
   * none of them are the system's business. What IS its business is that they
   * are drawn and spaced like the close beside them, which is `HeaderButton`.
   *
   * A row whose label stays at full strength and never takes a selection is
   * this component, not `Row`: there, ink strength IS the selection, so a
   * full-ink label would have to be drawn as selected and would arrive with a
   * pill behind it.
   */
  trailing?: ReactNode;
  onClose?: () => void;
  /**
   * The glyph for the close button. The system draws its own by default; a
   * caller with the real exported asset should pass it, because an
   * approximated glyph is a different glyph.
   */
  closeIcon?: ReactNode;
}) {
  return (
    <div
      className="flex w-full items-center"
      style={{
        gap: "var(--mo-space-1_5)",
        padding: "10px var(--mo-space-2)",
        borderRadius: "var(--mo-r-row)",
        filter: "var(--mo-text-shadow)",
      }}
    >
      {icon ? <Glyph>{icon}</Glyph> : null}
      <span className="mo-title min-w-0 flex-1 truncate">{children}</span>
      {trailing}
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Close" className="grid place-items-center">
          <Glyph>{closeIcon ?? <CloseIcon />}</Glyph>
        </button>
      ) : null}
    </div>
  );
}

/**
 * One act in a popup's header — reset, delete, whatever the panel can do to
 * itself. Goes in `Header`'s `trailing`, where it lands on the row's own gap
 * and needs no spacing of its own.
 *
 * `disabled` draws it muted and inert rather than removing it. A control that
 * vanishes when it has no work leaves a gap that everything to its right
 * slides across — the close button moving under the cursor because the last
 * value came back to neutral — and a header that reflows while you drag a
 * slider is worse than a glyph that goes quiet.
 */
export function HeaderButton({
  label,
  onClick,
  disabled,
  children,
}: {
  /** Spoken name. The button is a glyph, so this is the only name it has. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid place-items-center"
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      <Glyph muted={disabled}>{children}</Glyph>
    </button>
  );
}

/**
 * Koshmoney's glass button, rebuilt from the site this repo was copied from.
 *
 * Not a variant of `Button` above, which is the studio's in-panel control and
 * wears `mo-mat-selection`. This is the marketing site's material, and it is
 * here to be COMPARED with the panel glass: same page, same ground, one of
 * them holding up over a dark backdrop and one of them not.
 *
 * What it does differently is the whole lesson — see `material.button`. The
 * body is `surface`, an ordinary translucent fill on normal blend, and the
 * blur behind it is 7.5px. Paint first, blur second.
 *
 * The glow is written to the overlay's `style` from the pointer handler rather
 * than kept in state: it changes on every pointermove, and a re-render per
 * move to reposition a gradient is a re-render of whatever the button is
 * inside. The original did the same thing through a `querySelector`; a ref is
 * the same technique with the lookup done once.
 */
export function GlassButton({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  variant?: ButtonTone;
  size?: "md" | "icon";
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const tone = material.button.tones[variant];
  const glow = useRef<HTMLSpanElement>(null);

  const lightGlow = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const node = glow.current;
    if (!node || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    const spread =
      Math.max(rect.width, rect.height) *
      (e.pointerType === "touch" ? material.button.glow.sizeTouch : material.button.glow.sizeMouse);
    node.style.background = `radial-gradient(circle ${Math.round(spread)}px at ${x}% ${y}%, var(--mo-btn-glow-core) 0%, var(--mo-btn-glow-edge) 34%, rgb(255 255 255 / 0) 72%)`;
    node.style.opacity = String(tone.glow);
  };

  const dimGlow = () => {
    if (glow.current) glow.current.style.opacity = "0";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`mo-btn type-action ${size === "icon" ? "mo-btn-icon" : ""}`}
      onPointerEnter={lightGlow}
      onPointerMove={lightGlow}
      onPointerLeave={dimGlow}
      onPointerCancel={dimGlow}
      style={{
        background: tone.surface,
        color: tone.ink,
        ...(size === "icon"
          ? { width: 48, height: 48, padding: 0 }
          : { minHeight: 44, padding: "8px 16px" }),
      }}
    >
      <span aria-hidden className="mo-btn-rim" style={{ opacity: tone.rim }} />
      <span aria-hidden ref={glow} className="mo-btn-glow" />
      <span className="relative z-10 inline-flex items-center gap-[6px]">{children}</span>
    </button>
  );
}

/* ===========================================================================
   Slider
   =========================================================================== */

/**
 * The 6px track with a 24x16 knob.
 *
 * Figma maps Track and Fill to Apple's iOS 27 kit through Code Connect. Those
 * components are not in this codebase and cannot be imported, so the geometry
 * is rebuilt here from the exported measurements rather than approximated from
 * the screenshot.
 *
 * Aave glass: children = sharp track; refractionTarget = track-fill copy under
 * the moving knob lens (counter-translated with the same live `lensX` so the
 * portion under the lens matches the real fill continuously while dragging).
 * Softer bend (~0.35) than Segmented. Native range input stays for a11y.
 * Map rebuilds only when knob shape changes, never while dragging.
 */
export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  label,
  glass,
  spring,
  press,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  label: string;
  /**
   * Overrides `material.lens.knob`, `material.knob.blur` and the knob's
   * corner. The knob is the one lens small enough that a pixel of bevel or
   * radius visibly changes the material, so it is the one worth tuning against
   * real content.
   */
  glass?: {
    bend?: number;
    bevel?: number;
    blur?: number;
    radius?: number;
    film?: number;
  };
  /** Overrides `motion.selection` — the knob travels on the same spring. */
  spring?: Spring;
  /** Overrides `motion.press.scale` — how far the knob swells while held. */
  press?: number;
}) {
  const pct = max === min ? 0 : (value - min) / (max - min);
  const knobW = control.slider.knobW;
  const knobH = control.slider.knobH;
  // A full pill by default: half the short side is as round as the box goes.
  const knobR = Math.min(glass?.radius ?? knobH / 2, knobW / 2, knobH / 2);

  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const measure = () => setTrackW(Math.round(node.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // The knob travels on the same spring as every other lens in the system, so
  // it carries the same weight: a click on the far end of the track throws it
  // there rather than teleporting it, and a drag arrives a beat behind the
  // pointer. The FILL is driven from the sprung position too — drive it from
  // the raw value and the knob visibly detaches from the end of its own fill.
  const { value: travelled, velocity } = useSpring(pct, spring);

  // Knob left edge: inset so the knob stays flush with the track ends.
  const travel = Math.max(0, trackW - knobW);
  const lensX = travelled * travel;
  const fill = `${Math.min(100, Math.max(0, travelled * 100))}%`;

  const bend = glass?.bend ?? material.lens.knob.bend;
  const blur = glass?.blur ?? material.knob.blur;
  const film = glass?.film ?? material.knob.film;
  // Held inside the corner. The bevel band is where the glass curves, and a
  // band as deep as the radius displaces the corner itself — which is what
  // makes a pill-shaped knob read as a squared-off box the moment it is
  // pressed. Leaving 2px of undisplaced corner keeps the pill a pill.
  const bevel = Math.min(glass?.bevel ?? material.lens.knob.bevel, knobR - 2);

  // The knob is glass only while it is being dragged. At rest it is a solid
  // fill: a lens sitting still over a 6px track has almost nothing to bend, so
  // the refraction reads as a smudge on the knob rather than as material, and
  // the backdrop blur costs a compositor layer per slider on a panel that can
  // hold five of them.
  const [pressed, setPressed] = useState(false);

  // Press is a RAMP, not a switch. Going straight from an opaque knob to a
  // clear one in a single frame reads as the knob being swapped for a
  // different object; ramped, the same change reads as it turning to glass.
  // It rides the same spring as the travel, so the two arrive together — and
  // it is clamped because that spring overshoots by design and an opacity of
  // 1.04 is not a thing.
  const { value: held } = useSpring(pressed ? 1 : 0, spring);
  const glassiness = Math.min(1, Math.max(0, held));

  // The knob swells while it is held, off the same ramp as the glass, so the
  // grab lands as one gesture rather than as two effects that happen to fire
  // together. Scaling the LENS rather than anything inside it is what keeps
  // the shadow and the rim growing with it — they belong to the knob, not to
  // its contents.
  const swell = 1 + ((press ?? motion.press.scale) - 1) * glassiness;

  useEffect(() => {
    if (!pressed) return;
    // On the window, not the input: a drag that leaves the control still ends
    // there, and without this the knob would stay glass until the next click.
    const release = () => setPressed(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [pressed]);

  return (
    <div ref={trackRef} className="relative min-w-0 flex-1" style={{ height: control.paramH }}>
      <AaveGlass
        lens={{ width: knobW, height: knobH, borderRadius: knobR }}
        x={lensX}
        // Zero is an off switch in `AaveGlass`, not a weak bend — see there,
        // so the displacement grows in with the press instead of appearing.
        scale={travellingBend(bend, velocity) * glassiness}
        bevel={bevel}
        lensShadow="var(--mo-knob-shadow)"
        lensStyle={{
          top: "50%",
          marginTop: -knobH / 2,
          // Composed after the lens's own translate by `AaveGlass`, so it
          // scales about the knob's centre wherever it happens to be sitting.
          transform: `scale(${swell})`,
        }}
        style={{ height: "100%", width: "100%" }}
        refractionTarget={
          // Both states are always mounted and cross-faded against each other.
          // Swapping them would mean the solid fill unmounting on the same
          // frame the track copy appears, which is the hard cut being avoided.
          <>
            {/* Track-fill copy, counter-translated so the lens windows the real
                fill: the portion under the knob stays continuous while dragging. */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                // Counter-translated on the compositor rather than through
                // `left`, which would relayout the copy every frame of a drag.
                transform: `translate(${-lensX}px, -50%)`,
                width: trackW || "100%",
                height: control.slider.trackH,
                borderRadius: "var(--mo-r-pill)",
                background: "var(--mo-field)",
                overflow: "hidden",
                opacity: glassiness,
                // Frost, and deliberately NOT `backdrop-filter`. The knob
                // lives inside `.mo-glass`, which has a backdrop-filter of its
                // own and is therefore a backdrop root — a backdrop-filter on
                // the knob can only sample what was painted inside the panel
                // behind it, which is this 6px track and nothing else. Blurring
                // that by a couple of pixels is invisible, which is exactly how
                // the measured 1.9 read. Blurring the content the knob shows is
                // subject to no such rule, and it is the thing you look at.
                ...(blur > 0 ? { filter: `blur(${blur * glassiness}px)` } : null),
              }}
            >
              <div
                style={{
                  width: fill,
                  height: "100%",
                  borderRadius: "var(--mo-r-pill)",
                  background: "var(--mo-ink-muted)",
                }}
              />
            </div>
            {/* The knob's own white. Uniform colour, so the displacement has
                nothing to bend in it on the way through.

                It thins to `film` under a press rather than to nothing. That
                residual is the whole trick: glass is a translucent object, so
                a knob that clears completely stops being glass and becomes a
                hole with the track showing through it. Thinned, the track
                underneath reads as something SEEN THROUGH the knob, which is
                also what finally gives the blur below something to soften. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: "var(--mo-knob)",
                opacity: 1 - glassiness * (1 - film),
              }}
            />
          </>
        }
      >
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 overflow-hidden"
          style={{
            height: control.slider.trackH,
            borderRadius: "var(--mo-r-pill)",
            background: "var(--mo-field)",
          }}
        >
          <div
            className="h-full"
            style={{
              width: fill,
              // Rounded in its own right, not just by the track's overflow
              // clip: the clip only caps the end the fill starts at, so the
              // leading edge — the one that travels with the knob — came out
              // as a hard cut against the empty track behind it.
              borderRadius: "var(--mo-r-pill)",
              background: "var(--mo-ink-muted)",
            }}
          />
        </div>
      </AaveGlass>
      <input
        type="range"
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => setPressed(true)}
      />
    </div>
  );
}

/** The tinted numeric readout at the end of a slider row. */
export function Field({ children }: { children: ReactNode }) {
  return (
    <span
      className="mo-value grid shrink-0 place-items-center tabular-nums whitespace-nowrap"
      style={{
        width: control.fieldW,
        borderRadius: "var(--mo-r-field)",
        background: "var(--mo-field)",
        // Centred, not padded. 8px either side of a 40px plate leaves 24 for
        // the text, and "55 mm" does not fit in 24 — it wrapped onto two lines
        // and pushed the row out of shape. The frame centres its readouts and
        // lets the wider ones use the whole plate.
      }}
    >
      {typeof children === "string" ? <MorphText>{children}</MorphText> : children}
    </span>
  );
}

/**
 * Label, slider, readout — the row that most of this interface is made of.
 *
 * The label column is a fixed 48px rather than sized to its text, which is what
 * keeps every slider in a panel starting at the same x. "Opacity" and "X" are
 * very different widths and an intrinsic column would stagger them.
 */
export function ParamRow({
  label,
  icon,
  trailing,
  bare,
  value,
  min,
  max,
  step,
  onChange,
  format = (n: number) => n.toFixed(1),
  glass,
  spring,
  press,
}: {
  label: string;
  /**
   * Replaces the label column with a glyph box.
   *
   * An axis row names its slider with a letter in a 20px box rather than a
   * 48px word — the slider gets the difference. `label` is still required and
   * still reaches the control's accessible name, because "X" as an image is
   * not something a screen reader can announce.
   */
  icon?: ReactNode;
  /** A glyph after the readout — the frame puts a reset there. */
  trailing?: ReactNode;
  /**
   * Drop the label column entirely, giving its width to the slider.
   *
   * For a group of one, the section title already names the control — the
   * Camera popup's focal length is titled "Focal length" and then labelled
   * "Focal length", which is the same word twice and wraps onto two lines in
   * a 48px column. The label still reaches the slider's accessible name.
   */
  bare?: boolean;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  format?: (n: number) => string;
  /** Passed through to the row's `Slider` — see its `glass` prop. */
  glass?: { bend?: number; bevel?: number; blur?: number; radius?: number };
  /** Passed through to the row's `Slider` — see its `spring` prop. */
  spring?: Spring;
  /** Passed through to the row's `Slider` — see its `press` prop. */
  press?: number;
}) {
  return (
    <div
      className="flex w-full items-center"
      style={{ height: control.paramH, gap: "var(--mo-space-2_5)", padding: "0 var(--mo-space-2)" }}
    >
      {bare ? null : icon ? (
        <Glyph>{icon}</Glyph>
      ) : (
        <span
          className="mo-label shrink-0"
          style={{ width: control.labelW, filter: "var(--mo-text-shadow)" }}
        >
          {label}
        </span>
      )}
      <Slider
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        glass={glass}
        spring={spring}
        press={press}
      />
      <Field>{format(value)}</Field>
      {trailing ? <Glyph muted>{trailing}</Glyph> : null}
    </div>
  );
}

/**
 * Springs its own height to whatever it is holding.
 *
 * A popup that swaps a five-slider effect for a one-colour one changes height
 * by a hundred and sixty pixels, and doing that in a single frame reads as one
 * panel being replaced by another rather than as the same panel changing its
 * mind. Sprung, it is the same surface throughout.
 *
 * On `useSpring`, like every other motion in the system, so a popup resizes at
 * the rate a selection travels. A CSS transition here would be a second timing
 * model and the two would drift.
 *
 * The height is only measured, never set: the inner element is left at its
 * natural size and the outer one follows. That way the content never has to
 * know it is being animated, and nothing has to be told a number in advance.
 */
export function AutoHeight({
  children,
  token,
}: {
  children: ReactNode;
  /**
   * What the contents ARE. When it changes, the new contents fade in.
   *
   * The fade used to key off how far the height had left to travel, which is
   * the wrong signal twice over: two panels of similar height crossfaded not
   * at all and simply cut, while a large change dropped to nothing and flashed
   * back. Neither had anything to do with whether the contents had changed —
   * which is the only thing that decides whether a fade belongs.
   */
  token?: string | number;
}) {
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState(0);

  useEffect(() => {
    if (!inner) return;
    // Only the observer measures. A synchronous read here would be a setState
    // in an effect body, and the first callback lands on the next frame
    // anyway — which is why `height` stays `auto` until there is a number.
    const observer = new ResizeObserver(() => setNatural(inner.offsetHeight));
    observer.observe(inner);
    return () => observer.disconnect();
  }, [inner]);

  const { value } = useSpring(natural);

  /*
   * Clipped while moving, and faded by how far it has to go.
   *
   * The clip is unavoidable: mid-grow the content is already at full size and
   * would spill past the panel. A previous attempt pushed the clip outward on
   * negative margins so shadows had room — that gave the panel a layout height
   * of `animated minus the margins`, so it was shorter than what it held and
   * the content hung out of the bottom of it. Worse than the problem.
   *
   * The fix is not to hide the cut but to make it not worth seeing: the content
   * dips in opacity in proportion to the distance still to travel, so it is at
   * its faintest exactly when it is most cut, and back to full the moment the
   * height agrees with it. `48` is roughly one row — a change smaller than that
   * barely fades at all, which is right, because it barely clips either.
   *
   * At rest the height returns to `auto` and the clip goes entirely, so a
   * sub-pixel spring value can never shave a hairline off the last row.
   */
  const measured = natural > 0;
  const moving = measured && Math.abs(value - natural) > 0.5;

  /*
   * The height is ALWAYS the sprung value — never `auto`, at rest or otherwise.
   *
   * `auto` looks harmless when nothing is moving, and it is the reason a fast
   * switch snapped: the content changes, `auto` reflows to the new size on
   * that same frame, and only then does the observer fire and the spring —
   * still holding the old value — drag it back to animate. The panel jumped to
   * its destination, returned, and then travelled there. Pinned to the spring,
   * a content change moves nothing until the spring moves it.
   *
   * Settled, the spring sits exactly on the measured integer, so pinning costs
   * no accuracy — it cannot shave a hairline off the last row.
   *
   * Starting at zero rather than `auto` matters for the same reason at the
   * other end: the first measurement becomes the first frame of the opening
   * instead of a flash at full size followed by a grow.
   */
  return (
    <div
      style={{
        height: measured ? value : 0,
        overflow: moving || !measured ? "hidden" : undefined,
      }}
    >
      <div ref={setInner}>
        {/* Keyed, so a change in `token` genuinely replaces the contents and
            the animation runs from the start rather than being skipped as an
            update to what was already there. */}
        <div key={token} className={token === undefined ? undefined : "mo-appear"}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * A titled block of parameter rows.
 *
 * The popups that carry more than a handful of controls group them — location,
 * rotation, scale — and the title is what makes three identical X/Y/Z triplets
 * legible as three different things rather than nine sliders.
 */
export function ParamGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col" style={{ gap: "var(--mo-space-2)" }}>
      {title ? (
        <span
          className="mo-title"
          style={{ padding: "0 var(--mo-space-2)", filter: "var(--mo-text-shadow)" }}
        >
          {title}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/**
 * The hairline between groups.
 *
 * Ink at a tenth, not a named grey: a rule on glass has to sit at the same
 * strength whatever the panel happens to be over, and `--mo-field` is already
 * that colour doing the same job behind a readout.
 */
export function Divider({ inset }: { inset?: number }) {
  return (
    <span
      aria-hidden
      className="block w-full shrink-0"
      // Margin rather than a taller box: in a `RowGroup` the rule is a
      // measured child like any other, and giving it height would hand the
      // travelling pill a box to stop at. Margin keeps the line 1px and puts
      // the air outside it.
      style={{ height: 1, background: "var(--mo-field)", margin: inset ? `${inset}px 0` : undefined }}
    />
  );
}

/** Label, hex, swatch. */
export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (hex: string) => void;
}) {
  return (
    <div
      className="flex w-full items-center"
      style={{ gap: "var(--mo-space-2)", padding: "0 var(--mo-space-2)", filter: "var(--mo-text-shadow)" }}
    >
      <span className="mo-title min-w-0 flex-1">{label}</span>
      <span className="mo-code shrink-0 tabular-nums">
        <MorphText>{value.toUpperCase()}</MorphText>
      </span>
      <label
        className="relative shrink-0 cursor-pointer overflow-hidden"
        style={{
          width: 16,
          height: 16,
          borderRadius: "var(--mo-r-swatch)",
          border: "0.8px solid rgb(0 0 0 / 0.1)",
          boxShadow: "var(--mo-swatch-shadow)",
          background: value,
        }}
      >
        <input
          type="color"
          aria-label={label}
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </label>
    </div>
  );
}

/* ===========================================================================
   Switch
   =========================================================================== */

/**
 * The two-up segmented control (Crafting / Presets).
 *
 * Aave glass: children = option buttons (sharp, z-index 1). refractionTarget =
 * a FULL-WIDTH `HighlightedOptions` row (selected wash + strong ink labels),
 * counter-translated by `-x` so glyphs stay registered while the lens springs.
 * Mid-travel you see warped label text through the glass — “glass forming.”
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  spring,
  bend,
  width,
  height = 36,
}: {
  /** `label` takes a node, not just a string: the history control is glyphs. */
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  /** Overrides `motion.selection` — the tuning seam the system page drives. */
  spring?: Spring;
  /** Overrides `material.lens.segmented.bend`. */
  bend?: number;
  /** Overrides the panel width — a three-glyph switch is not 250px wide. */
  width?: number | string;
  /**
   * Overrides the indicator's height, and with it the whole control's.
   *
   * The default is the labelled switch. A glyph switch is shorter — and the
   * inset around its symbol is not set anywhere, it is what is left over: a
   * 16px glyph centred in a 32px cell leaves the 8 the frame annotates.
   */
  height?: number;
}) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const { value: sprung, velocity } = useSpring(index, spring);
  const n = Math.max(1, options.length);
  const bendScale = travellingBend(bend ?? material.lens.segmented.bend, velocity);

  return (
    // A pill, not a panel: the indicator inside is a capsule, and a capsule
    // sitting in an 18px corner reads as two different radii arguing.
    // `mo-switch` is the corner scope — the track and the indicator take one
    // shape between them, rather than the indicator taking the pill's.
    <Glass shape="pill" className="mo-switch" width={width} style={{ padding: "var(--mo-space-1)" }}>
      <AaveGlass
        lens={{
          width: `${100 / n}%`,
          height: "100%",
          borderRadius: radius.selected,
        }}
        // %-translate is relative to the lens box itself → one segment per unit.
        x={`${sprung * 100}%`}
        scale={bendScale}
        bevel={material.lens.segmented.bevel}
        lensShadow="var(--mo-selected-shadow)"
        chrome={<Material />}
        chromeClassName="mo-mat-selection"
        specular={null}
        className="flex"
        style={{ height }}
        refractionTarget={
          // Full-width highlighted labels, counter-translated so they stay
          // registered with the sharp buttons while the lens window moves.
          //
          // The labels are ONLY here to be bent. Without a bend the copy lands
          // exactly on the sharp original and is pure duplication — invisible
          // under text, and a second symbol under a glyph. So when the bend is
          // off the copy carries the fill and nothing else, and the fill is
          // all the pill needed from it anyway.
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: `${-sprung * 100}%`,
              top: 0,
              width: `${n * 100}%`,
              height: "100%",
              display: "flex",
              alignItems: "stretch",
              background: "var(--mo-selected)",
            }}
          >
            {bendScale > 0
              ? options.map((o) => (
                  <span
                    key={o.id}
                    className="mo-title flex flex-1 items-center justify-center"
                    style={{ color: "var(--mo-ink)" }}
                  >
                    {o.label}
                  </span>
                ))
              : null}
          </div>
        }
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            // A centring box, matching the refraction copy below exactly.
            // As a plain `flex-1` this laid its child out inline, so a glyph
            // sat on the BASELINE while its copy sat centred — a few pixels
            // apart, which is why a selected symbol appeared twice. Text hid
            // it: the line box put both in the same place regardless.
            className="mo-title relative flex flex-1 items-center justify-center"
            style={{
              zIndex: 1,
              color: o.id === value ? "var(--mo-ink)" : "var(--mo-ink-muted)",
              filter: "var(--mo-text-shadow)",
            }}
          >
            {o.label}
          </button>
        ))}
      </AaveGlass>
    </Glass>
  );
}

/* ===========================================================================
   Icons
   =========================================================================== */

/*
 * Drawn rather than exported.
 *
 * The Figma assets are served from URLs that expire in about seven days, so
 * committing a reference to one ships a link that dies. These three are
 * geometric enough to state exactly — a chevron, a cross, a plus — and match
 * the file's `material-symbols` glyphs at the same 20px box and 1.5 stroke.
 *
 * Anything with real shape to it (the device glyphs, the SF Symbols) must be
 * downloaded and committed instead. Redrawing those by hand is how a set stops
 * looking like a set.
 */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden {...stroke}>
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden {...stroke}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

/**
 * The system's own reset mark: an arrow that comes back round to where it
 * started. Same 20-unit box and the same stroke as the rest, so a popup that
 * has no exported asset to pass still gets a glyph that belongs here.
 */
export function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden {...stroke}>
      {/*
        Drawn to the same extents as `CloseIcon`: its X spans 5.5 to 14.5
        inside the same 20 box, and a glyph that filled more of its box would
        sit beside the close reading as the louder of the two — which is
        backwards, since closing is the commoner act.

        Open at the top right, which is where the head goes — a closed ring
        reads as a circle rather than as a return. The head's corner is the
        arc's own end point, so the mark is continuous.
      */}
      <path d="M14.5 10a4.5 4.5 0 1 1-1.32-3.18" />
      <path d="M13.18 4.2v2.62h-2.62" />
    </svg>
  );
}

/** The system's own delete mark, in the same stroke family as the rest. */
export function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden {...stroke}>
      <path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden {...stroke}>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}
