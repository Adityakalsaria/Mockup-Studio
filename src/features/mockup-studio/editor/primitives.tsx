"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { ACCENTS, DEFAULT_ACCENT, accentCss, type AccentId } from "./accents";
import { ColorField } from "./ColorField";

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
/** The knob sits INSIDE the fill with clearance, not flush against its edges.
    Track 30, fill inset 3 so 24 tall, knob 20 — 2px of capsule visible above
    and below it. Flush, the knob was exactly the fill's height and its shadow
    spilled past, which read as the cap being too big for the bar it caps. */
/*
 * Slider geometry, to the spec's numbers.
 *
 *   28  track height
 *    4  the fill is inset from the track on every side
 *   28  knob width, and 16 its height -- a horizontal capsule, not a circle
 *    2  the knob's gap inside the fill
 *
 * Which makes the fill 20 tall and the knob a capsule sitting in it with 2 to
 * spare, top, bottom and trailing edge.
 */
const FILL_INSET = 4;
const KNOB_W = 28;
const KNOB_H = 16;
const KNOB_INSET = 2;
/**
 * The fill's floor: one knob plus its gaps. At zero there still has to be a
 * capsule for the knob to sit in, or the cap floats on nothing.
 */
const FILL_MIN = KNOB_W + KNOB_INSET * 2;
/**
 * The part of the track the knob's centre cannot reach: the fill's own insets
 * either side, plus the minimum fill it can never shrink past. Subtracting it
 * gives the distance the knob's centre actually travels, which is what a drag
 * has to be measured against for the two to stay together.
 */
const KNOB_TRAVEL_INSET = FILL_INSET * 2 + FILL_MIN;

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
  const dragRef = useRef<{ x: number; start: number; moved: boolean; travel: number } | null>(null);

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
    dragRef.current = {
      x: event.clientX,
      start: value,
      moved: false,
      // Measured on grab rather than read from a constant: the panel is a
      // fraction of the window and the track is whatever is left over.
      travel: Math.max(1, event.currentTarget.getBoundingClientRect().width - KNOB_TRAVEL_INSET),
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 2) return;
    drag.moved = true;
    /**
     * The drag is mapped across the knob's travel, so the knob sits under the
     * pointer the whole way down every slider.
     *
     * It used to be one pixel per step, which made the gearing an accident of
     * whatever range a parameter happened to have. Spacing is 4..40 in steps
     * of 1, so its entire range fitted in 36px of a 230px track and the knob
     * ran at over six times the speed of the cursor -- the slider it was
     * attached to was, in effect, six times shorter than it looked. X axis has
     * the opposite problem at 360 steps: two thirds cursor speed, and it feels
     * stuck. Neither is a setting anyone chose.
     *
     * Shift still divides by ten, which is now genuinely fine adjustment
     * rather than the only usable speed.
     */
    const perPixel = span / drag.travel;
    onChange(clamp(quantise(drag.start + dx * perPixel * (event.shiftKey ? 0.1 : 1))));
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
    <div className="flex w-full flex-col">
      {/* The name sits above the track. It used to be inside the control,
          which was fine while the control was a bar and stopped being fine the
          moment it grew a knob: at a low value the knob parks on the word.
          Above, the track is free to be nothing but a track. */}
      <span
        className="ks-label truncate px-[var(--ks-space-1)]"
        style={{ color: "var(--ks-text-dim)" }}
      >
        {label}
      </span>

      <div className="flex w-full items-center">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        // The number is not drawn any more, so the row has to say it somewhere
        // for anyone who needs it exactly. Double-click still opens the field.
        title={`${label}: ${shown}${suffix ?? ""} — drag to change, double-click to type`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => {
          setDraft(shown);
          setEditing(true);
        }}
        onKeyDown={(event) => {
          const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!dir) return;
          event.preventDefault();
          onChange(clamp(quantise(value + dir * step * (event.shiftKey ? 10 : 1))));
        }}
        className="ks-scrub relative h-[var(--ks-track-h)] min-w-0 flex-1 overflow-hidden rounded-full focus:outline-none focus-visible:ring-1"
        style={{ background: "var(--ks-ctl)" }}
      >
        {/* The fill is a CAPSULE and the knob is its end cap.
            Not a square bar with a knob floating on the boundary: in the
            control this is taken from, the knob is where the fill stops — the
            two are one object, and the rounded end you can see is the knob
            itself. Drawing them apart is what made the first attempt read as a
            progress bar with a dot sitting on it.

            The knob lives INSIDE the fill, pinned to its right edge, so it can
            never drift off the end or overhang the track. That is also why the
            fill has a floor of one knob width: at zero there would otherwise
            be no capsule for the cap to sit in.

            The floor is built into the interpolation rather than applied as a
            `min-width` afterwards. Clamping the width flattens the bottom of
            the range -- the fill stayed at its minimum until the value was
            past about 13% and the knob sat still while you dragged, which read
            as the control being broken at the low end. Interpolating from the
            floor instead spreads the same travel evenly across the range. */}
        <span
          aria-hidden
          className="absolute rounded-full"
          // Inset by style rather than by class: the numbers come from the
          // constants above, and Tailwind only sees class names it can read in
          // the source, so a built-up `inset-y-[4px]` compiles to nothing.
          style={{
            top: FILL_INSET,
            bottom: FILL_INSET,
            left: FILL_INSET,
            width: `calc(${FILL_MIN}px + ${fillPct / 100} * (100% - ${KNOB_TRAVEL_INSET}px))`,
            background: "var(--ks-ctl-fill)",
          }}
        >
          <span
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              right: KNOB_INSET,
              width: KNOB_W,
              // Centred rather than inset top and bottom, so the capsule stays
              // in the middle of the fill even where the track is taller --
              // touch sizing raises it, and a fixed inset would sit it high.
              height: KNOB_H,
              background: "var(--ks-knob)",
              // Tighter than before. A drop big enough to spread past the
              // capsule made the knob look oversized for it; this one only has
              // to lift the cap off the fill by a hair.
              boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
            }}
          />
        </span>

        {/* Only while typing. The rest of the time the track carries no text,
            which is the whole point of moving the name out of it. */}
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
            className="ks-value absolute inset-0 w-full bg-transparent px-[var(--ks-ctl-pad)] text-right focus:outline-none"
            style={{ color: "var(--ks-text)", background: "var(--ks-ctl)" }}
          />
        ) : null}
      </div>

      {/* Beside the track, not above it: they act on the value the track
          holds, and a control sitting next to what it affects needs no label
          to explain the relationship. */}
      {animatable ? (
        <KeyframeButton active={Boolean(keyframed)} onClick={onKeyframe} label={label} />
      ) : null}

      {defaultValue !== undefined ? (
        <ResetButton
          label={label}
          // Compared with a tolerance, not `!==`. These values arrive from drag
          // arithmetic and from interpolated keyframes, so a row sitting
          // visually at its default is routinely a float hair away from it,
          // and an exact test would leave the button lit with nothing to do.
          dirty={Math.abs(value - defaultValue) > 1e-6}
          shown={formatValue(defaultValue, decimals)}
          onClick={() => onChange(defaultValue)}
        />
      ) : null}
      </div>
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
          {/* Round, like the preset swatches under it. A square chip and a
              row of circles for the same thing said they were two things. */}
          <ColorField value={value} label={label} onChange={onChange} />
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
      /*
       * Sized to match the slider, so the two read as one family.
       *
       * The track stays 64x28. The knob takes the slider's exact capsule --
       * 28 by 16 -- and its exact clearance: 6 from the track edge, which is
       * the slider's 4 of fill inset plus its 2 of knob gap. That leaves 24 of
       * travel across a 64 track.
       *
       * It was Apple's own 38x24 at inset 2 before, which is correct for a
       * switch on its own and wrong next to these sliders: a fatter knob with
       * a tighter margin, sitting in a row of thinner ones with more.
       */
      className="relative h-[28px] w-[64px] shrink-0 rounded-full"
      style={{
        background: checked ? "var(--ks-accent)" : "var(--ks-switch-off)",
        transition: "background-color 160ms var(--ks-ease-out)",
      }}
    >
      <span
        // Centred vertically rather than inset, for the same reason as the
        // slider's: touch sizing can raise the row, and a fixed top would sit
        // the capsule high.
        className="absolute left-[6px] top-1/2 h-[16px] w-[28px] rounded-full"
        style={{
          transform: checked
            ? "translateY(-50%) translateX(24px)"
            : "translateY(-50%) translateX(0)",
          background: "var(--ks-knob)",
          transition: "transform 180ms var(--ks-ease-out)",
        }}
      />
    </button>
  );
}

/**
 * The accent picker.
 *
 * A dot of the current colour that opens a grid of the rest. It sits beside
 * the light/dark toggle because it is the same kind of setting -- how the
 * chrome looks, not what the shot looks like -- and neither belongs in a
 * section with the controls that change the render.
 */
export function AccentPicker({
  accent,
  theme,
  onChange,
}: {
  accent: AccentId;
  theme: "light" | "dark";
  onChange: (next: AccentId) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Accent colour: ${current.label}`}
        title={`Accent colour: ${current.label}`}
        className="ks-press grid h-[24px] w-[24px] place-items-center rounded-full"
      >
        <span
          className="h-[14px] w-[14px] rounded-full"
          style={{
            background: accentCss(current, theme),
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.22)",
          }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          // Below and right-aligned: this lives in the panel's top right, so
          // there is nothing above it and everything below.
          className="ks-menu absolute right-0 top-[calc(100%+8px)] z-40 grid w-[152px] grid-cols-5 gap-[6px] rounded-[var(--ks-r-menu)] border p-[8px]"
          style={{
            background: "var(--ks-surface-solid)",
            borderColor: "var(--ks-line-strong)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
            transformOrigin: "top right",
          }}
        >
          {ACCENTS.map((option) => {
            const selected = option.id === accent;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                aria-label={option.label}
                title={option.label}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className="grid h-[20px] w-[20px] place-items-center rounded-full transition-transform hover:scale-110"
                style={{
                  background: accentCss(option, theme),
                  boxShadow: selected
                    ? "0 0 0 1.5px var(--ks-surface-solid), 0 0 0 3px var(--ks-text)"
                    : "inset 0 0 0 1px rgba(0,0,0,0.22)",
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
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

function readAccent(): AccentId {
  const stored = window.localStorage.getItem("ks-accent");
  return ACCENTS.some((a) => a.id === stored) ? (stored as AccentId) : DEFAULT_ACCENT;
}

/**
 * The accent, alongside the theme and stored the same way.
 *
 * Shares THEME_EVENT rather than having its own: both are the same kind of
 * change -- a chrome preference written to localStorage that every mounted
 * editor should pick up at once -- and one event means one subscription.
 */
export function useEditorAccent(): [AccentId, (next: AccentId) => void] {
  const accent = useSyncExternalStore(subscribeTheme, readAccent, () => DEFAULT_ACCENT);
  const set = useCallback((next: AccentId) => {
    window.localStorage.setItem("ks-accent", next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);
  return [accent, set];
}

export function useEditorTheme(): ["light" | "dark", () => void] {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  const toggle = useCallback(() => {
    window.localStorage.setItem("ks-theme", theme === "light" ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
  }, [theme]);

  return [theme, toggle];
}
