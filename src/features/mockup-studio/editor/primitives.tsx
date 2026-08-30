"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";

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
          className="ks-section-label flex min-w-0 flex-1 items-center text-left"
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
            className="grid h-[24px] w-[24px] place-items-center opacity-55 hover:opacity-100"
            style={{ color: "var(--ks-text-dim)" }}
          >
            <Icon name="reset" />
          </button>
        ) : null}

        {action ?? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
            className="grid h-[24px] w-[24px] place-items-center opacity-55 hover:opacity-100"
            style={{ color: "var(--ks-text-dim)" }}
          >
            <Icon name={expanded ? "collapse" : "expand"} />
          </button>
        )}
      </div>

      {expanded ? (
        <div className="flex flex-col gap-[var(--ks-row-gap)] pb-[16px]">{children}</div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Param row
 * ------------------------------------------------------------------ */

/** The small key-cap beside a label: DRAG, SCROLL, SPACE DRAG. */

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
      // No pill behind it. The diamond already reads as a control, and a
      // filled capsule around it made a second object competing with the track
      // beside it — two pills per row, one of which is 30px of chrome around a
      // 14px glyph. Colour carries the state instead.
      className="ks-press grid h-[var(--ks-row-h)] w-[var(--ks-kf-w)] shrink-0 place-items-center rounded-[var(--ks-r)]"
      style={{
        background: "transparent",
        color: active ? "var(--ks-accent)" : "var(--ks-text-faint)",
      }}
    >
      <Icon name="keyframe" />
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
/** Just under the row height, so the knob nearly fills the track the way
    Apple's slider handle does rather than floating in the middle of it. */
const KNOB = 26;

export function ParamRow({
  label,
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
    <div className="flex w-full items-stretch gap-[var(--ks-col-gap)]">
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
        className="ks-scrub relative h-[var(--ks-row-h)] min-w-0 flex-1 overflow-hidden rounded-[var(--ks-r)] focus:outline-none focus-visible:ring-1"
        style={{ background: "var(--ks-ctl)" }}
      >
        {/* The filled portion is accent-tinted rather than grey, which is the
            one thing worth taking from Apple's slider here. Theirs fills with
            accents/blue at full strength against a neutral track; a wash is
            used instead because this panel stacks fifteen of these rows and
            fifteen saturated bars would read as an alert rather than a value.

            The rest of their slider does not transfer: it is a 6px track with
            a 38x24 knob in a 52px row, with no room for the label or the
            number. Ours carries all three in 36px, and swapping it would cost
            the readout to gain a knob. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{ width: `${fillPct}%`, background: "var(--ks-ctl-fill)" }}
        />
        {/* The knob, at the end of the fill.
            A filled bar says how far along the value is; a knob says the bar
            is a thing you can take hold of. Without it the row reads as a
            progress indicator that happens to respond to dragging.

            It travels inside a track inset by half its own width, so its
            centre runs from half-in to half-out and it never hangs over
            either end — which is what happens if you position it at the fill
            percentage directly. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0"
          style={{ left: KNOB / 2 + 3, right: KNOB / 2 + 3 }}
        >
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${fillPct}%`,
              width: KNOB,
              height: KNOB,
              background: "var(--ks-surface-solid)",
              // The ring reads as the edge of a physical cap; the drop is what
              // puts it ON the track rather than in it.
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)",
            }}
          />
        </span>
        {/* Label and value in one control, rather than a slider and a
            separate readout beside it.
            The pill held a number the row is already about, and it cost 62px
            of a 282px panel — a quarter of the width, on every row, to repeat
            what the fill behind it was showing. Inside, the number sits at the
            end of the thing it belongs to and the track gets the space back. */}
        <span className="relative flex h-full items-center gap-[8px] pl-[var(--ks-ctl-pad)] pr-[var(--ks-ctl-pad)]">
          <span className="ks-label min-w-0 flex-1 truncate" style={{ color: "var(--ks-ctl-text)" }}>
            {label}
          </span>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onBlur={commitDraft}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitDraft();
                if (event.key === "Escape") setEditing(false);
              }}
              className="ks-value w-[56px] shrink-0 bg-transparent text-right focus:outline-none"
              style={{ color: "var(--ks-text)" }}
            />
          ) : (
            <span
              // The scrub owns the pointer, so the double-click that opens the
              // field has to be caught here and kept from starting a drag.
              onDoubleClick={(event) => {
                event.stopPropagation();
                setDraft(shown);
                setEditing(true);
              }}
              className="ks-value shrink-0 tabular-nums"
              style={{ color: "var(--ks-text)" }}
            >
              {shown}
              {suffix ?? ""}
            </span>
          )}
        </span>
      </div>

      {animatable ? (
        <KeyframeButton active={Boolean(keyframed)} onClick={onKeyframe} label={label} />
      ) : null}

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
    </div>
  );
}

function formatValue(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

/**
 * Per-row reset, at the end of the row.
 *
 * It is always there and always visible, dimming rather than disappearing
 * when the row is at its default. Hiding it had two costs: a control you
 * cannot see until you have already changed something cannot be found before
 * you need it, and its appearance was a second thing moving in the row at the
 * exact moment you were watching a value change.
 *
 * It sits after the keyframe because that is the order the two are reached
 * for — key a pose, then undo it if it was wrong.
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
      // Present whether or not there is anything to undo, dimmed rather than
      // hidden. A control that appears only once you have already changed
      // something cannot be found before you need it, and its arrival is a
      // second thing moving in the row at the exact moment you are watching a
      // value change. `disabled` already stops the click; nothing else has to.
      className="ks-press grid h-[var(--ks-row-h)] w-[var(--ks-reset-w)] shrink-0 place-items-center rounded-[var(--ks-r)]"
      style={{
        background: "transparent",
        color: dirty ? "var(--ks-text-muted)" : "var(--ks-text-faint)",
      }}
    >
      <Icon name="reset" />
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
    <div className="flex w-full items-stretch gap-[var(--ks-col-gap)]">
      <div
        className="flex h-[var(--ks-row-h)] min-w-0 flex-1 items-center justify-between rounded-[var(--ks-r)] pl-[var(--ks-ctl-pad)] pr-[12px]"
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
    <div className="flex w-full items-stretch gap-[var(--ks-col-gap)]">
      <div
        className="flex h-[var(--ks-row-h)] min-w-0 flex-1 items-center justify-between rounded-[var(--ks-r)] pl-[var(--ks-ctl-pad)] pr-[12px]"
        style={{ background: "var(--ks-ctl)" }}
      >
        <span className="ks-label" style={{ color: "var(--ks-ctl-text)" }}>
          {label}
        </span>
        <span className="flex items-center gap-[8px]">
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
            // The one place uppercase survives: a hex value is a code, not a
            // word, and lowercasing it makes it harder to read back.
            className="w-[62px] bg-transparent text-right text-[12px] uppercase focus:outline-none"
            style={{ color: "var(--ks-ctl-text)", fontVariantNumeric: "tabular-nums" }}
          />
          <span className="relative grid h-[24px] w-[24px] shrink-0 place-items-center">
            <span
              aria-hidden
              // Round, like the preset swatches under it. A square chip and a
              // row of circles for the same thing said they were two things.
              className="h-full w-full rounded-full"
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
    <div className="flex flex-wrap gap-[4px] pt-[4px]">
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
            className="h-[20px] w-[20px] rounded-full transition-transform hover:scale-110"
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
      // Apple's switch, at Apple's size: 64x28 track, 38x24 knob, inset 2,
      // travel 22. Not scaled down this time — a 44px row has the height for
      // it, and every earlier attempt to fit it into 20px is what made it read
      // as a different control that happened to be a similar shape.
      className="relative h-[28px] w-[64px] shrink-0 rounded-full"
      style={{
        background: checked ? "var(--ks-accent)" : "var(--ks-switch-off)",
        transition: "background-color 160ms var(--ks-ease-out)",
      }}
    >
      <span
        className="absolute left-[2px] top-[2px] h-[24px] w-[38px] rounded-full"
        style={{
          transform: checked ? "translateX(22px)" : "translateX(0)",
          background: "#FFFFFF",
          transition: "transform 180ms var(--ks-ease-out)",
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
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  // Apple's large segmented control is 50 tall with 2px padding and a 4px gap
  // between segments. Ours is 36, so the gap scales to 3.
  // The kit's panel-sized segmented control is 32 tall with 28px segments,
  // 2px padding and a 4px gap. That is the variant Apple uses inside the iPad
  // colour picker panel — the same context as ours — so it is used verbatim
  // rather than scaled.
  const GAP = 4;

  return (
    <div
      // Measured from the kit: the track is a full pill (radius 100), not a
      // rounded rectangle, and its fill is fills/tertiary. An earlier pass
      // here used the 8px control radius and reasoned carefully about keeping
      // the inner corner concentric with it -- correct thinking applied to the
      // wrong shape, because Apple simply uses capsules for this control.
      className="relative flex h-[32px] w-full rounded-full p-[2px]"
      style={{ background: "var(--ks-seg-track)", gap: `${GAP}px` }}
    >
      {/* One indicator that travels, instead of a background appearing on one
          segment and vanishing from the other. Two segments swapping colour
          is a cut; a single thing moving is a continuous state, and the eye
          reads the second as the same object it was already looking at. */}
      <span
        aria-hidden
        className="ks-tab-indicator absolute inset-y-[2px] left-[2px] rounded-full"
        style={{
          // Each segment is an equal share of what is left after the padding
          // and the gaps between them.
          width: `calc((100% - 4px - ${(options.length - 1) * GAP}px) / ${options.length})`,
          transform: `translateX(calc(${index} * (100% + ${GAP}px)))`,
          background: "var(--ks-seg-selected)",
          // Their shadow, measured: wide and very faint. Much softer than a
          // general-purpose control lift -- the selection is meant to sit
          // barely above the track, not hover over it.
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
          transition: "transform 260ms var(--ks-ease-out)",
        }}
      />
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className="ks-label relative z-[1] h-[28px] min-w-0 flex-1 truncate rounded-full"
            style={{
              color: active ? "var(--ks-tab-active-text)" : "var(--ks-tab-text)",
              // The kit shifts the label from Medium to Semibold on selection.
              // Weight is doing work colour alone cannot: it says "this one"
              // even where the two colours are close, and it survives being
              // looked at out of the corner of your eye.
              fontWeight: active ? 650 : 500,
              transition: "color 200ms var(--ks-ease-out)",
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
        className="ks-label cursor-pointer appearance-none bg-transparent pr-[16px] text-right focus:outline-none"
        style={{ color: "var(--ks-text)" }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" />
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
