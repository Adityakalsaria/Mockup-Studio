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

import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { control, SYSTEM_CSS } from "./system";

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
   * which is a capsule at its own width rather than a rounded rectangle.
   */
  shape?: "panel" | "rail";
  width?: number | string;
  className?: string;
  style?: CSSProperties;
};

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
        borderRadius: shape === "rail" ? "var(--mo-r-rail)" : "var(--mo-r-panel)",
        ...style,
      }}
    >
      {children}
    </div>
  );
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
 * The 40px list row: icon, label, trailing control.
 *
 * Selection is a white pill lifted off the glass rather than a colour, and it
 * changes three things at once — background, radius (24 to 41.217) and ink
 * strength. All three are the selected state; the radius change is what makes
 * it read as a raised object instead of a highlight, so it is not optional.
 */
export function Row({ icon, children, trailing, selected, onClick, title }: RowProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`flex w-full items-center ${interactive ? "cursor-pointer" : ""}`}
      style={{
        gap: "var(--mo-space-2)",
        padding: "10px var(--mo-space-3)",
        borderRadius: selected ? "var(--mo-r-selected)" : "var(--mo-r-row)",
        background: selected ? "var(--mo-selected)" : undefined,
        boxShadow: selected ? "var(--mo-selected-shadow)" : undefined,
        overflow: selected ? "clip" : undefined,
      }}
    >
      {icon ? <Glyph muted={!selected}>{icon}</Glyph> : null}
      <span
        className="mo-title min-w-0 flex-1 truncate"
        style={{
          color: selected ? "var(--mo-ink)" : "var(--mo-ink-muted)",
          filter: "var(--mo-text-shadow)",
        }}
      >
        {children}
      </span>
      {trailing ? <Glyph muted={!selected}>{trailing}</Glyph> : null}
    </div>
  );
}

/** A 20px icon box. Every glyph in the interface is this size. */
export function Glyph({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: control.icon,
        height: control.icon,
        color: muted ? "var(--mo-ink-muted)" : "var(--mo-ink)",
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
 * The knob is inset by half its width at each end so it stops flush with the
 * track instead of hanging over it — the track is 6px and the knob is 24, so
 * without that a slider at 0 sits 9px outside its own control.
 */
export function Slider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const pct = max === min ? 0 : (value - min) / (max - min);
  const knob = control.slider.knobW;
  return (
    <div className="relative min-w-0 flex-1" style={{ height: control.paramH }}>
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 overflow-hidden"
        style={{ height: control.slider.trackH, borderRadius: "var(--mo-r-pill)", background: "var(--mo-field)" }}
      >
        <div
          className="h-full"
          style={{ width: `${pct * 100}%`, background: "var(--mo-ink-muted)" }}
        />
      </div>
      <div
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `calc(${knob / 2}px + ${pct} * (100% - ${knob}px))` }}
      >
        <div
          style={{
            width: knob,
            height: control.slider.knobH,
            borderRadius: "var(--mo-r-pill)",
            background: "var(--mo-knob)",
            boxShadow: "var(--mo-knob-shadow)",
            backdropFilter: "blur(1.9px)",
          }}
        />
      </div>
      <input
        type="range"
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
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
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
  format?: (n: number) => string;
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
      <Slider label={label} value={value} min={min} max={max} step={step} onChange={onChange} />
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
 * The indicator is one element that slides, not a background swapped between
 * two — a swap cannot animate, and at this size a hard cut between segments
 * reads as a flicker.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <Glass style={{ padding: "var(--mo-space-1)" }}>
      <div className="relative flex" style={{ height: 36 }}>
        <div
          className="absolute top-0 transition-transform duration-300"
          style={{
            width: `${100 / options.length}%`,
            height: "100%",
            transform: `translateX(${index * 100}%)`,
            borderRadius: "var(--mo-r-selected)",
            background: "var(--mo-selected)",
            boxShadow: "var(--mo-selected-shadow)",
          }}
        />
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="mo-title relative flex-1"
            style={{
              color: o.id === value ? "var(--mo-ink)" : "var(--mo-ink-muted)",
              filter: "var(--mo-text-shadow)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
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
