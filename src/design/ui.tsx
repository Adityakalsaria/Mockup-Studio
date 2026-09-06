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
import { control, material, motion, radius, SYSTEM_CSS } from "./system";
import { AaveGlass } from "./useContentLens";

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
 * Returns live `{ value, velocity }` rather than just the position, because
 * the velocity is what `travellingBend` needs to deepen the glass while the
 * lens is actually moving.
 */
type Spring = { stiffness: number; damping: number; mass: number };

function useSpring(
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
 * The geometry of an item at a fractional index.
 *
 * `at` runs past both ends while the spring overshoots, so the SEGMENT is
 * clamped and the fraction deliberately is not: the lens keeps going the way
 * it was going and eases back, instead of sticking flat against the last row.
 */
function interpolate(spans: Span[], at: number): Span | null {
  if (spans.length === 0) return null;
  if (spans.length === 1) return spans[0];
  const i = Math.min(spans.length - 2, Math.max(0, Math.floor(at)));
  const f = at - i;
  const a = spans[i];
  const b = spans[i + 1];
  return {
    top: a.top + (b.top - a.top) * f,
    height: a.height + (b.height - a.height) * f,
  };
}

type Span = { top: number; height: number };

/**
 * Measure each child of a column, relative to the column.
 *
 * Rows are a uniform 40px today, so this could be arithmetic — but a label
 * that wraps, or a rail that mixes sizes, would make it wrong silently. The
 * observer watches the children as well as the column because a row can change
 * height without the column doing so.
 */
function useColumnSpans(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [spans, setSpans] = useState<Span[]>([]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const base = node.getBoundingClientRect().top;
      setSpans(
        Array.from(node.children).map((child) => {
          const box = child.getBoundingClientRect();
          return { top: box.top - base, height: box.height };
        }),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [count]);

  return [ref, spans] as const;
}

/* ===========================================================================
   Row
   =========================================================================== */

export type RowProps = {
  icon?: ReactNode;
  children?: ReactNode;
  /** Chevron, close, plus — whatever sits at the right edge. */
  trailing?: ReactNode;
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
export function Row({ icon, children, trailing, selected, onClick, title }: RowProps) {
  const { grouped, strong, interactive } = useRowState(selected, onClick);

  if (!grouped) {
    return (
      <RowGroup>
        <Row icon={icon} trailing={trailing} selected={selected} onClick={onClick} title={title}>
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
      {trailing ? (
        <span className="relative" style={{ zIndex: 1 }}>
          <Glyph muted={!strong}>{trailing}</Glyph>
        </span>
      ) : null}
    </div>
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
  /** Overrides `motion.selection` — the tuning seam the system page drives. */
  spring?: Spring;
  /** Overrides `material.lens.row.bend`. */
  bend?: number;
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
export function RowGroup({ children, spring, bend, className = "", style }: RowGroupProps) {
  const items = Children.toArray(children);
  const found = items.findIndex(
    (child) => isValidElement<{ selected?: boolean }>(child) && child.props.selected === true,
  );

  // Park on the last selection rather than snapping home: a group that
  // momentarily has nothing selected should fade out where it was standing,
  // not travel to row 0 on its way to becoming invisible. Adjusting state
  // during render is the supported way to derive this — React re-runs the
  // component before committing, so the lens never paints at the stale index.
  const [parked, setParked] = useState(0);
  if (found >= 0 && found !== parked) setParked(found);
  const index = found >= 0 ? found : parked;

  const [columnRef, spans] = useColumnSpans(items.length);
  const { value: sprung, velocity } = useSpring(index, spring);
  const lens = interpolate(spans, sprung);

  return (
    <AaveGlass
      lens={{
        width: "100%",
        height: lens?.height ?? 0,
        borderRadius: radius.selected,
      }}
      x={0}
      y={lens?.top ?? 0}
      scale={travellingBend(bend ?? material.lens.row.bend, velocity)}
      bevel={material.lens.row.bevel}
      // The pill's own two plates: rim hairlines and a short drop below the
      // refraction, depth bands above it. Above matters — run the bands
      // through the displacement and the lens bends its own edge treatment.
      lensShadow="var(--mo-selected-shadow)"
      // The panel's material, at the pill's scale — same seven layers, same
      // blends, its own rim and bands. `specular` is off because the bands
      // that used to live there are part of the material now.
      chrome={<Material />}
      chromeClassName="mo-mat-selection"
      specular={null}
      lensStyle={{ opacity: found >= 0 && lens ? 1 : 0 }}
      className={`w-full ${className}`.trim()}
      style={style}
      refractionTarget={
        <div
          aria-hidden
          className="flex flex-col"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            // Counter-translated on the compositor rather than through `top`,
            // which would relayout the whole copy on every frame of the travel.
            transform: `translateY(${-(lens?.top ?? 0)}px)`,
            width: "100%",
            background: "var(--mo-selected)",
          }}
        >
          <RowGroupCtx.Provider value={{ copy: true }}>{children}</RowGroupCtx.Provider>
        </div>
      }
    >
      <div ref={columnRef} className="flex w-full flex-col">
        <RowGroupCtx.Provider value={{ copy: false }}>{children}</RowGroupCtx.Provider>
      </div>
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
  onClose,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
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
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Close" className="grid place-items-center">
          <Glyph>
            <CloseIcon />
          </Glyph>
        </button>
      ) : null}
    </div>
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
      className="mo-value grid shrink-0 place-items-center tabular-nums"
      style={{
        width: control.fieldW,
        borderRadius: "var(--mo-r-field)",
        background: "var(--mo-field)",
        padding: "0 var(--mo-space-2)",
      }}
    >
      {children}
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
      <span
        className="mo-label shrink-0"
        style={{ width: control.labelW, filter: "var(--mo-text-shadow)" }}
      >
        {label}
      </span>
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
    </div>
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
      <span className="mo-code shrink-0 tabular-nums">{value.toUpperCase()}</span>
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
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Overrides `motion.selection` — the tuning seam the system page drives. */
  spring?: Spring;
  /** Overrides `material.lens.segmented.bend`. */
  bend?: number;
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
    <Glass shape="pill" className="mo-switch" style={{ padding: "var(--mo-space-1)" }}>
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
        style={{ height: 36 }}
        refractionTarget={
          // Full-width highlighted labels, counter-translated so they stay
          // registered with the sharp buttons while the lens window moves.
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
            {options.map((o) => (
              <span
                key={o.id}
                className="mo-title flex flex-1 items-center justify-center"
                style={{ color: "var(--mo-ink)" }}
              >
                {o.label}
              </span>
            ))}
          </div>
        }
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="mo-title relative flex-1"
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

export function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden {...stroke}>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}
