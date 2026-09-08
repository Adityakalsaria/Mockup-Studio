"use client";

/**
 * The colour picker, in the system's own material.
 *
 * `ColorRow` opened `<input type="color">`, which on macOS is the OS colour
 * window: a separate surface in its own chrome that ignores everything this
 * system says, and puts R/G/B fields under a saturation square — two colour
 * models in one panel, with the numbers in the model you are not using. Nobody
 * reaching for a background thinks "244, 244, 245".
 *
 * The old editor replaced it once already, in `editor/ColorField`, and this is
 * that picker's design brought across: hue and the square, which are the two
 * things you actually drag; hex, which is the one form people paste; an
 * eyedropper, which in a mockup tool is the fastest way to match a colour
 * already on screen; and the last few colours you used.
 *
 * Brought across rather than imported. That one is dressed in `--ks-*`, which
 * exist only inside the old editor's themed root — dropped into this chrome
 * every variable in it would resolve to nothing. What carries over is the
 * behaviour and the reasoning; the surface is `Glass` and the tokens are the
 * system's.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hexToHsv, hsvToHex, isLight, parseHex, type Hsv } from "./color";
import { control, radius } from "./system";
import { Glass } from "./ui";

const SQUARE_H = 132;
/**
 * The square's corner, and the recents' — the panel's own, less the padding
 * between them.
 *
 * Concentric: two curves separated by a constant gap are only parallel if the
 * inner one is tighter by exactly that gap. At the panel's 20 the square read
 * as a second panel rattling inside the first.
 */
const SQUARE_R = radius.panel - 8;
/** The hue knob, which is the slider's own knob at the system's size. */
const KNOB_W = control.slider.knobW;
const KNOB_H = control.slider.knobH;
const RECENTS_KEY = "mo-recent-colors";
const RECENTS_MAX = 8;
const GAP = 10;

/** Chromium only, and absent on any insecure origin. */
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
declare global {
  interface Window {
    EyeDropper?: EyeDropperCtor;
  }
}

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((c): c is string => typeof c === "string" && parseHex(c) !== null)
      : [];
  } catch {
    // A corrupt or blocked localStorage is not worth a broken picker.
    return [];
  }
}

function pushRecent(hex: string) {
  try {
    const next = [hex, ...readRecents().filter((c) => c !== hex)].slice(0, RECENTS_MAX);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** A pipette, drawn: the system has no exported one, and this is the only
    place that wants it. Same stroke family as its other glyphs. */
function DropperIcon() {
  return (
    <svg viewBox="0 0 20 20" width={16} height={16} aria-hidden fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.2 3.6a2 2 0 0 1 2.8 2.8l-1.1 1.1 1 1-1.4 1.4-1-1-5.3 5.3-2.8.6.6-2.8 5.3-5.3-1-1 1.4-1.4 1 1z" />
    </svg>
  );
}

export function ColorPicker({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (next: string) => void;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((was) => !was);
        }}
        className="relative shrink-0 cursor-pointer"
        style={{
          width: 16,
          height: 16,
          borderRadius: "var(--mo-r-swatch)",
          border: "var(--mo-swatch-edge)",
          background: value,
        }}
      />
      {open ? (
        <Popover
          anchor={anchor}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Popover({
  anchor,
  value,
  onChange,
  onClose,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // Read once, on the render that follows the click that opened this. The
  // reader answers [] without a window, so it is safe wherever it runs.
  const [recents] = useState<string[]>(readRecents);
  const [draft, setDraft] = useState<string | null>(null);

  /**
   * Hue lives here rather than being derived from `value` on every render.
   *
   * Black has no hue and grey has no hue, so a derived one would snap the
   * square's gradient back to red the instant you dragged into a dark or
   * washed-out corner, and the colour you were mixing would be gone.
   */
  const [hue, setHue] = useState(() => hexToHsv(value)?.h ?? 0);

  const hsv = useMemo<Hsv>(() => {
    const parsed = hexToHsv(value) ?? { h: hue, s: 0, v: 0 };
    return { h: parsed.s === 0 || parsed.v === 0 ? hue : parsed.h, s: parsed.s, v: parsed.v };
  }, [value, hue]);

  // Recorded on close, not on every change: dragging across the square would
  // otherwise fill the row with the fifty colours you passed through.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  useEffect(() => {
    return () => {
      if (parseHex(latest.current)) pushRecent(latest.current);
    };
  }, []);

  /**
   * Fixed, in a portal on the body.
   *
   * The panel this row sits in clips its children and springs its own height;
   * a popover inside it would be cut off at the panel's edge and dragged
   * around by the spring. On the body it is clipped by nothing.
   */
  useEffect(() => {
    const place = () => {
      const trigger = anchor.current;
      const node = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const w = node?.offsetWidth ?? control.panelW;
      const h = node?.offsetHeight ?? 300;
      const M = 8;
      /*
       * Under the PANEL, not under the swatch.
       *
       * The swatch is a 16px chip on a row halfway down a popup, so opening from
       * it put the picker across the rows you are choosing a colour for — the
       * one place it must not be. The panel is what the row belongs to, and its
       * bottom edge is the first place below it that is clear of everything.
       *
       * Found by walking up from the trigger rather than passed in, so any
       * `ColorRow` in any surface gets this without being told where it is.
       */
      const panel = trigger.closest(".mo-glass")?.getBoundingClientRect() ?? rect;
      const below = panel.bottom + GAP;
      const top = below + h > window.innerHeight - M ? Math.max(M, panel.top - GAP - h) : below;
      // Its own edges, since it is the same width as the panel it hangs from.
      const left = Math.min(Math.max(M, panel.left), window.innerWidth - w - M);
      // Page coordinates, because this is positioned absolutely — see below.
      const x = left + window.scrollX;
      const y = top + window.scrollY;
      // The same numbers give back the same object. `place` runs on every scroll
      // and resize and is a dependency of the effect that calls it — a new object
      // each time would be a state change each time, and a state change would run
      // it again.
      setPos((prev) => (prev && prev.left === x && prev.top === y ? prev : { left: x, top: y }));
    };


    /*
     * Measure, then place. The position cannot be known before the panel is in
     * the document, so this is the one state write that has to follow a
     * layout — the same shape as `useContentLens`, which measures its rows the
     * same way and for the same reason.
     *
     * `place` lives INSIDE the effect: defined outside, it took a new identity
     * on every render, so this effect tore down and re-attached a scroll and a
     * resize listener on every frame of anything else that moved.
     */
    place();
    // `true` catches scrolls inside the panel, which do not bubble.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor]);

  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  const set = (next: Partial<Hsv>) => {
    const merged = { ...hsv, ...next };
    if (next.h !== undefined) setHue(next.h);
    onChange(hsvToHex(merged));
  };

  /**
   * Shared by both drags: capture the pointer so it keeps tracking outside.
   *
   * The surface comes from the event rather than a ref — it is the element the
   * handler is on, by definition. Two refs went before this, and handing one to
   * a function during render is a ref read, which the React Compiler rejects.
   */
  const drag =
    (read: (x: number, y: number, rect: DOMRect) => void) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      const node = event.currentTarget;
      node.setPointerCapture(event.pointerId);
      const apply = (clientX: number, clientY: number) =>
        read(clientX, clientY, node.getBoundingClientRect());
      apply(event.clientX, event.clientY);
      const onMove = (e: PointerEvent) => apply(e.clientX, e.clientY);
      const stop = () => {
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerup", stop);
        node.removeEventListener("pointercancel", stop);
      };
      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerup", stop);
      node.addEventListener("pointercancel", stop);
    };

  const onSquare = drag((x, y, rect) => {
    set({
      s: Math.max(0, Math.min(1, (x - rect.left) / rect.width)),
      v: Math.max(0, Math.min(1, 1 - (y - rect.top) / rect.height)),
    });
  });

  const onHue = drag((x, _y, rect) => {
    const usable = rect.width - KNOB_W;
    const t = Math.max(0, Math.min(1, (x - rect.left - KNOB_W / 2) / usable));
    set({ h: t * 360 });
  });

  const commitHex = (raw: string) => {
    const parsed = parseHex(raw);
    if (parsed) {
      const next = hexToHsv(raw);
      // A pasted colour brings its own hue, unless it is a grey and has none.
      if (next && next.s > 0 && next.v > 0) setHue(next.h);
      onChange(hsvToHex(next ?? hsv));
    }
    setDraft(null);
  };

  const pickFromScreen = async () => {
    const Dropper = window.EyeDropper;
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      commitHex(sRGBHex);
    } catch {
      // Cancelling the eyedropper rejects; that is not an error.
    }
  };

  const supportsDropper = typeof window !== "undefined" && !!window.EyeDropper;
  const markerDark = isLight(value);

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal={false}
      aria-labelledby={titleId}
      /*
       * ABSOLUTE, in page coordinates — not fixed, and with no z-index.
       *
       * Both of those group the backdrop away from the `backdrop-filter`
       * inside: a fixed element is composited on its own, a z-index opens a
       * stacking context, and either one leaves the frost sampling nothing.
       * The picker rendered as a pane of clear glass with the blueprint's grid
       * lines crossing it dead sharp.
       *
       * Neither is needed. This portals to the end of the body, so paint order
       * puts it on top without a layer number, and page coordinates put it
       * where fixed would — `place` runs again on scroll and resize, which is
       * the one thing fixed was doing for free.
       */
      style={{
        position: "absolute",
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        // Hidden until placed, so it never flashes in the corner first.
        visibility: pos ? "visible" : "hidden",
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Glass style={{ gap: GAP }}>
        <span id={titleId} className="sr-only">
          {`Colour picker`}
        </span>

        {/* Saturation across, value down, over the current hue. Two CSS
            gradients do what a canvas would and stay sharp at any zoom. */}
        <div
          onPointerDown={onSquare}
          className="relative w-full cursor-crosshair touch-none overflow-hidden"
          style={{
            height: SQUARE_H,
            borderRadius: SQUARE_R,
            border: "var(--mo-swatch-edge)",
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              width: 14,
              height: 14,
              marginLeft: -7,
              marginTop: -7,
              borderRadius: 999,
              border: `2px solid ${markerDark ? "#000" : "#fff"}`,
              boxShadow: "var(--mo-knob-shadow)",
            }}
          />
        </div>

        <div className="flex w-full items-center" style={{ gap: GAP }}>
          {supportsDropper ? (
            <button
              type="button"
              aria-label="Pick a colour from the screen"
              onClick={pickFromScreen}
              className="grid shrink-0 cursor-pointer place-items-center"
              style={{ width: control.icon, height: control.icon, color: "var(--mo-ink)" }}
            >
              <DropperIcon />
            </button>
          ) : null}

          {/* The hue track carries the spectrum, and the knob is the slider's
              own — one knob shape in the system, whatever it is riding. */}
          <div
            onPointerDown={onHue}
            className="relative min-w-0 flex-1 cursor-pointer touch-none"
            style={{ height: KNOB_H }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0"
              style={{
                top: (KNOB_H - control.slider.trackH) / 2,
                height: control.slider.trackH,
                borderRadius: 999,
                background:
                  "linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)",
              }}
            />
            <span
              role="slider"
              aria-label="Hue"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsv.h)}
              tabIndex={0}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 10 : 1;
                if (event.key === "ArrowLeft") set({ h: (hsv.h - step + 360) % 360 });
                if (event.key === "ArrowRight") set({ h: (hsv.h + step) % 360 });
              }}
              className="absolute block"
              style={{
                left: `calc(${(hsv.h / 360) * 100}% - ${(hsv.h / 360) * KNOB_W}px)`,
                width: KNOB_W,
                height: KNOB_H,
                borderRadius: 999,
                background: "var(--mo-knob)",
                boxShadow: "var(--mo-knob-shadow)",
              }}
            />
          </div>
        </div>

        <input
          value={(draft ?? value).toUpperCase()}
          aria-label="Hex"
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commitHex(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitHex((event.target as HTMLInputElement).value);
            if (event.key === "Escape") setDraft(null);
          }}
          className="mo-code w-full tabular-nums outline-none"
          style={{
            height: 32,
            padding: "0 var(--mo-space-2)",
            borderRadius: "var(--mo-r-field)",
            background: "var(--mo-field)",
            color: "var(--mo-ink)",
          }}
        />

        {recents.length ? (
          <div className="flex w-full flex-wrap items-center" style={{ gap: 6 }}>
            {recents.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={hex}
                title={hex}
                onClick={() => commitHex(hex)}
                className="shrink-0 cursor-pointer"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "var(--mo-r-swatch)",
                  border: "var(--mo-swatch-edge)",
                  background: hex,
                }}
              />
            ))}
          </div>
        ) : null}
      </Glass>
    </div>,
    document.body,
  );
}
