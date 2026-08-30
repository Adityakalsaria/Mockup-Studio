"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ *
 * Section
 * ------------------------------------------------------------------ */

/**
 * A collapsible group in the right panel. The reset arrow only renders when
 * the section can actually be reset — a permanently dead control beside a
 * live one teaches people to stop reading the row.
 */
export function PanelSection({
  title,
  trailing,
  expanded,
  onToggle,
  onReset,
  action,
  children,
}: {
  title: string;
  /** Small right-aligned text on the header, e.g. SOURCE's "SHOT 1". */
  trailing?: string;
  expanded: boolean;
  onToggle: () => void;
  onReset?: () => void;
  /** EFFECTS uses a "+" here instead of a chevron. */
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-t" style={{ borderColor: "var(--ks-line)" }}>
      <div className="flex h-[38px] w-full items-center gap-[8px]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="ks-section-label flex flex-1 items-center text-left"
          style={{ color: "var(--ks-text-muted)" }}
        >
          {title}
        </button>

        {trailing ? (
          <span className="ks-section-label" style={{ color: "var(--ks-text-faint)" }}>
            {trailing}
          </span>
        ) : null}

        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Reset ${title}`}
            className="grid h-[16px] w-[16px] place-items-center opacity-55 hover:opacity-100"
            style={{ color: "var(--ks-text-dim)" }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2.5 4.5h4a3 3 0 1 1-3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.4 2.4 2.4 4.5l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        {action ?? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
            className="grid h-[16px] w-[16px] place-items-center opacity-55 hover:opacity-100"
            style={{ color: "var(--ks-text-dim)" }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
              style={{
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 140ms ease",
              }}
            >
              <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {expanded ? (
        <div className="flex flex-col gap-[var(--ks-row-gap)] pb-[14px]">{children}</div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Param row
 * ------------------------------------------------------------------ */

/** The small key-cap beside a label: DRAG, SCROLL, SPACE DRAG. */
function HintBadge({ text }: { text: string }) {
  return (
    <span
      className="ml-[6px] shrink-0 rounded-[4px] px-[4px] py-[2px]"
      style={{
        background: "var(--ks-badge)",
        color: "var(--ks-badge-text)",
        fontSize: 9,
        lineHeight: "13.5px",
        letterSpacing: "0.09px",
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      {text}
    </span>
  );
}

/**
 * The diamond that ends every animatable row. Filled and orange means the
 * parameter has a keyframe at the playhead; clicking then removes it. This
 * is the only bridge between the panel and the timeline, which is why it
 * sits on every row rather than hiding behind a mode.
 */
function KeyframeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={
        active ? `Remove keyframe for ${label}` : `Add keyframe for ${label}`
      }
      className="grid h-[var(--ks-row-h)] w-[var(--ks-kf-w)] shrink-0 place-items-center rounded-[var(--ks-r)] border transition-colors"
      style={{
        background: active ? "var(--ks-accent-wash)" : "var(--ks-ctl)",
        borderColor: active ? "var(--ks-accent-line)" : "transparent",
        color: active ? "var(--ks-accent)" : "var(--ks-badge-text)",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path
          d="M5 0.7 9.3 5 5 9.3 0.7 5Z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * A numeric parameter. The label pill is both the drag target and a gauge:
 * a fill runs across it in proportion to where the value sits in its range.
 *
 * That pairing is why there is no slider. A slider would spend most of a
 * 258px row expressing a range, and the camera section alone stacks nine of
 * them; folding the gauge into the label costs nothing and buys back the
 * width for the readout. Dragging is the interaction, the fill is the
 * feedback, and double-click types an exact value for the cases scrubbing
 * cannot hit on purpose.
 */
export function ParamRow({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  decimals = 0,
  suffix,
  onChange,
  keyframed,
  onKeyframe,
  animatable = true,
  defaultValue,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  suffix?: string;
  onChange: (next: number) => void;
  keyframed?: boolean;
  onKeyframe?: () => void;
  animatable?: boolean;
  /**
   * The value this row started life at. Supplying it turns on a per-row
   * reset; leaving it off keeps the row as it was.
   */
  defaultValue?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const dragRef = useRef<{ x: number; start: number; moved: boolean } | null>(null);

  const clamp = useCallback((n: number) => Math.max(min, Math.min(max, n)), [min, max]);

  const quantise = useCallback(
    (n: number) => {
      // Step arithmetic drifts in binary floating point (0.1 * 3 gives
      // 0.30000000000000004) and that would land straight in the readout.
      return Number((Math.round(n / step) * step).toFixed(6));
    },
    [step],
  );

  const span = max - min;
  const fillPct = span > 0 ? ((clamp(value) - min) / span) * 100 : 0;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (editing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, start: value, moved: false };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 2) return;
    drag.moved = true;
    // A pixel is a step; shift slows it to a tenth so a 0..1 parameter can
    // still be placed exactly.
    onChange(clamp(quantise(drag.start + dx * step * (event.shiftKey ? 0.1 : 1))));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const commitDraft = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) onChange(clamp(quantise(parsed)));
    setEditing(false);
  };

  const shown = formatValue(value, decimals);

  return (
    <div className="flex w-full items-stretch gap-[2px]">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!dir) return;
          event.preventDefault();
          onChange(clamp(quantise(value + dir * step * (event.shiftKey ? 10 : 1))));
        }}
        className="ks-scrub relative h-[var(--ks-row-h)] flex-1 overflow-hidden rounded-[var(--ks-r)] focus:outline-none focus-visible:ring-1"
        style={{ background: "var(--ks-ctl)" }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{ width: `${fillPct}%`, background: "var(--ks-ctl-fill)" }}
        />
        <span className="relative flex h-full items-center pl-[10px] pr-[6px]">
          <span className="ks-label truncate" style={{ color: "var(--ks-ctl-text)" }}>
            {label}
          </span>
          {hint ? <HintBadge text={hint} /> : null}
        </span>
      </div>

      <div
        onDoubleClick={() => {
          setDraft(shown);
          setEditing(true);
        }}
        className="flex h-[var(--ks-row-h)] w-[var(--ks-val-w)] shrink-0 items-center justify-end rounded-[var(--ks-r)] px-[6px]"
        style={{ background: "var(--ks-ctl)" }}
      >
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitDraft();
              if (event.key === "Escape") setEditing(false);
            }}
            className="w-full bg-transparent text-right text-[10px] focus:outline-none"
            style={{ color: "var(--ks-text)", fontVariantNumeric: "tabular-nums" }}
          />
        ) : (
          <span
            className="truncate text-[10px]"
            style={{ color: "var(--ks-ctl-text)", fontVariantNumeric: "tabular-nums" }}
          >
            {shown}
            {suffix ?? ""}
          </span>
        )}
      </div>

      {defaultValue !== undefined ? (
        <ResetButton
          label={label}
          // Compared with a tolerance, not `!==`. These values arrive from
          // drag arithmetic and from interpolated keyframes, so a row sitting
          // visually at its default is routinely a float hair away from it,
          // and an exact test would leave the button lit with nothing to do.
          dirty={Math.abs(value - defaultValue) > 1e-6}
          shown={formatValue(defaultValue, decimals)}
          onClick={() => onChange(defaultValue)}
        />
      ) : null}

      {animatable ? (
        <KeyframeButton active={Boolean(keyframed)} onClick={onKeyframe} label={label} />
      ) : null}
    </div>
  );
}

function formatValue(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

/**
 * Per-row reset.
 *
 * The space is held whether or not the row has drifted, and only the glyph
 * comes and goes. A hover-only button would be invisible until you already
 * suspected it was there, and one that took up space only when dirty would
 * shuffle every other control sideways the moment a value changed — down a
 * column of eleven rows that reads as the panel twitching.
 */
function ResetButton({
  label,
  dirty,
  shown,
  onClick,
}: {
  label: string;
  dirty: boolean;
  shown: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!dirty}
      title={dirty ? `Reset ${label} to ${shown}` : `${label} is at its default`}
      aria-label={`Reset ${label} to ${shown}`}
      aria-hidden={!dirty}
      tabIndex={dirty ? 0 : -1}
      className="grid h-[var(--ks-row-h)] w-[var(--ks-reset-w)] shrink-0 place-items-center rounded-[var(--ks-r)] transition-opacity"
      style={{
        background: "var(--ks-ctl)",
        color: "var(--ks-badge-text)",
        opacity: dirty ? 1 : 0,
        pointerEvents: dirty ? "auto" : "none",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2.5 4.5h4a3 3 0 1 1-3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.4 2.4 2.4 4.5l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Non-numeric rows
 * ------------------------------------------------------------------ */

/** A labelled row holding an arbitrary control rather than a number. */
export function ControlRow({
  label,
  children,
  animatable = false,
  keyframed,
  onKeyframe,
}: {
  label: string;
  children: React.ReactNode;
  animatable?: boolean;
  keyframed?: boolean;
  onKeyframe?: () => void;
}) {
  return (
    <div className="flex w-full items-stretch gap-[2px]">
      <div
        className="flex h-[var(--ks-row-h)] flex-1 items-center justify-between rounded-[var(--ks-r)] pl-[10px] pr-[8px]"
        style={{ background: "var(--ks-ctl)" }}
      >
        <span className="ks-label" style={{ color: "var(--ks-ctl-text)" }}>
          {label}
        </span>
        {children}
      </div>
      {animatable ? (
        <KeyframeButton active={Boolean(keyframed)} onClick={onKeyframe} label={label} />
      ) : null}
    </div>
  );
}

/**
 * A colour, as a swatch you click plus the hex you can type.
 *
 * Both halves are needed and neither is optional: picking a backdrop is a
 * looking-at-it decision, but matching one to a brand is a typing-it-in
 * decision, and a control with only the swatch makes the second impossible.
 * The native picker is hidden behind the swatch rather than restyled —
 * browsers do not let you restyle it, and a hand-built one would be a worse
 * eyedropper than the operating system's.
 */
export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const next = raw.trim().replace(/^#?/, "#");
    // Only a complete six-digit hex is a colour; anything else leaves the
    // committed value alone so a half-typed entry cannot blank the canvas.
    if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toLowerCase());
    setDraft(null);
  };

  return (
    <div className="flex w-full items-stretch gap-[2px]">
      <div
        className="flex h-[var(--ks-row-h)] flex-1 items-center justify-between rounded-[var(--ks-r)] pl-[10px] pr-[6px]"
        style={{ background: "var(--ks-ctl)" }}
      >
        <span className="ks-label" style={{ color: "var(--ks-ctl-text)" }}>
          {label}
        </span>
        <span className="flex items-center gap-[6px]">
          <input
            value={draft ?? value}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={(event) => commit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setDraft(null);
            }}
            spellCheck={false}
            aria-label={`${label} hex`}
            className="w-[62px] bg-transparent text-right text-[10px] uppercase focus:outline-none"
            style={{ color: "var(--ks-ctl-text)", fontVariantNumeric: "tabular-nums" }}
          />
          <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center">
            <span
              aria-hidden
              className="h-full w-full rounded-[4px]"
              style={{ background: value, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }}
            />
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.currentTarget.value)}
              aria-label={label}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
        </span>
      </div>
    </div>
  );
}

/** A grid of one-click colours, for starting somewhere other than white. */
export function SwatchGrid({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-[5px] pt-[2px]">
      {options.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={`${label} ${color}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className="h-[18px] w-[18px] rounded-[4px] transition-transform hover:scale-110"
            style={{
              background: color,
              boxShadow: selected
                ? "0 0 0 1.5px var(--ks-accent), 0 0 0 3px var(--ks-surface)"
                : "inset 0 0 0 1px rgba(0,0,0,0.25)",
            }}
          />
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-[20px] w-[36px] shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--ks-text)" : "var(--ks-badge)" }}
    >
      <span
        className="absolute top-[3px] h-[14px] w-[14px] rounded-full transition-all"
        style={{
          left: checked ? 19 : 3,
          background: checked ? "var(--ks-surface-solid)" : "var(--ks-text-faint)",
        }}
      />
    </button>
  );
}

/** MANUAL | PRESETS — a raised active segment on a recessed strip. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      className="flex w-full rounded-[var(--ks-r)] p-[3px]"
      style={{ background: "var(--ks-ctl)" }}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className="ks-label h-[30px] flex-1 rounded-[var(--ks-r)] transition-colors"
            style={{
              background: active ? "var(--ks-tab-active)" : "transparent",
              color: active ? "var(--ks-tab-active-text)" : "var(--ks-tab-text)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function PillButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="ks-press ks-label h-[var(--ks-row-h)] w-full rounded-[var(--ks-r)]"
      style={{
        background: active ? "var(--ks-accent-wash)" : "var(--ks-ctl)",
        color: active ? "var(--ks-accent)" : "var(--ks-ctl-text)",
        boxShadow: active ? "inset 0 0 0 1px var(--ks-accent-line)" : "none",
      }}
    >
      {children}
    </button>
  );
}

/**
 * The value side of a row when the value is a choice rather than a number
 * (FINISH, MODE). A native select is deliberate: one short list, no icons or
 * search, and the platform menu is keyboard- and screen-reader-correct free.
 */
export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <span className="relative flex items-center">
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        className="ks-label cursor-pointer appearance-none bg-transparent pr-[14px] text-right focus:outline-none"
        style={{ color: "var(--ks-text)" }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        width="9"
        height="9"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute right-0"
        style={{ color: "var(--ks-text-muted)" }}
      >
        <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * Persisted so the tool reopens the way it was left.
 *
 * Read through useSyncExternalStore rather than an effect: localStorage is
 * external state, the server has no view of it, and setting it from an
 * effect would either flash the wrong theme or trip a cascading render.
 * The server snapshot is "light", which is how the frame is drawn.
 */
const THEME_EVENT = "ks-theme-change";

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): "light" | "dark" {
  return window.localStorage.getItem("ks-theme") === "dark" ? "dark" : "light";
}

export function useEditorTheme(): ["light" | "dark", () => void] {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  const toggle = useCallback(() => {
    window.localStorage.setItem("ks-theme", theme === "light" ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
  }, [theme]);

  return [theme, toggle];
}
