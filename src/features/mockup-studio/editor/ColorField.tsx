"use client";

import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorThemeContext } from "./theme";
import { Icon } from "./icons";
import { hexToHsv, hsvToHex, isLight, parseHex, type Hsv } from "@/design/color";

/**
 * The colour picker.
 *
 * It replaces `<input type="color">`, which on macOS opens the OS colour
 * window: a separate surface, in its own chrome, that ignores the editor's
 * theme entirely and cannot be styled in any way. It also puts R/G/B fields
 * under a saturation/value square -- two different colour models in one panel,
 * where the numbers are in the model you are not using. Nobody reaching for a
 * background thinks "244, 244, 245".
 *
 * So: hue and the square, which are the two things you actually drag, hex,
 * which is the one form people paste, and an eyedropper, which in a mockup
 * tool is the fastest way to match a colour already on the screen.
 */

const SQUARE_H = 132;
const KNOB = 18;
const KNOB_INSET = 3;
const RECENTS_KEY = "ks-recent-colors";
const RECENTS_MAX = 8;

/** Chromium only, and absent under any insecure origin. */
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

export function ColorField({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="ks-press relative grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full"
        style={{
          background: value,
          boxShadow: open
            ? "0 0 0 1.5px var(--ks-accent), 0 0 0 3px var(--ks-surface)"
            : "inset 0 0 0 1px rgba(0,0,0,0.25)",
        }}
      />
      {open ? (
        <ColorPopover
          anchor={triggerRef}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ColorPopover({
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
  const squareRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // Same reason as the easing menu: portalled outside the themed root.
  const popTheme = useContext(EditorThemeContext);
  const [recents, setRecents] = useState<string[]>([]);

  /**
   * Hue lives here rather than being derived from `value` on every render.
   * Black has no hue and grey has no hue, so a derived hue would snap the
   * square's gradient back to red the instant you dragged into a dark or
   * desaturated corner, and the colour you were mixing would be gone.
   */
  const [hue, setHue] = useState(() => hexToHsv(value)?.h ?? 0);
  const [draft, setDraft] = useState<string | null>(null);

  const hsv = useMemo<Hsv>(() => {
    const parsed = hexToHsv(value) ?? { h: hue, s: 0, v: 0 };
    // Same reason as above: trust the stored hue, not the one read back out of
    // a colour that may not carry one.
    return { h: parsed.s === 0 || parsed.v === 0 ? hue : parsed.h, s: parsed.s, v: parsed.v };
  }, [value, hue]);

  useEffect(() => setMounted(true), []);
  useEffect(() => setRecents(readRecents()), []);

  // Commit to recents on close rather than on every change, or dragging across
  // the square would fill the row with the fifty colours you passed through.
  useEffect(() => {
    return () => {
      if (parseHex(value)) pushRecent(value);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Positioned fixed, in a portal on the body.
   *
   * The panel that holds this row scrolls, and a scroll container clips
   * absolutely positioned children -- the popover would be cut off at the
   * panel edge exactly the way the easing menu was. Escaping to the body is
   * the only way to be sure it is never clipped by an ancestor.
   */
  const place = useCallback(() => {
    const trigger = anchor.current;
    const node = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const w = node?.offsetWidth ?? 232;
    const h = node?.offsetHeight ?? 260;
    const M = 8;

    // Prefer below; flip above when there is not room, and only then.
    const below = rect.bottom + M;
    const top = below + h > window.innerHeight - M ? Math.max(M, rect.top - M - h) : below;
    // Right-aligned to the swatch, then pulled back inside the viewport.
    const left = Math.min(Math.max(M, rect.right - w), window.innerWidth - w - M);
    setPos({ left, top });
  }, [anchor]);

  useEffect(() => {
    place();
    // `true` catches scrolls in the panel, which does not bubble scroll events.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [place]);

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

  /** Shared by both drags: capture the pointer so it keeps tracking outside. */
  const drag = (
    ref: React.RefObject<HTMLDivElement | null>,
    read: (x: number, y: number, rect: DOMRect) => void,
  ) => (event: React.PointerEvent) => {
    const node = ref.current;
    if (!node) return;
    node.setPointerCapture(event.pointerId);
    const apply = (clientX: number, clientY: number) => {
      const rect = node.getBoundingClientRect();
      read(clientX, clientY, rect);
    };
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

  const onSquare = drag(squareRef, (x, y, rect) => {
    set({
      s: Math.max(0, Math.min(1, (x - rect.left) / rect.width)),
      v: Math.max(0, Math.min(1, 1 - (y - rect.top) / rect.height)),
    });
  });

  const onHue = drag(hueRef, (x, _y, rect) => {
    const usable = rect.width - KNOB_INSET * 2 - KNOB;
    const t = Math.max(0, Math.min(1, (x - rect.left - KNOB_INSET - KNOB / 2) / usable));
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

  const supportsDropper = mounted && typeof window !== "undefined" && !!window.EyeDropper;
  const markerDark = isLight(value);
  const hueT = hsv.h / 360;

  if (!mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal={false}
      aria-labelledby={titleId}
      className="ks ks-menu fixed z-[60] flex w-[232px] flex-col gap-[10px] rounded-[var(--ks-r-menu)] border p-[10px]"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        background: "var(--ks-surface-solid)",
        borderColor: "var(--ks-line-strong)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
        // Hidden until placed, so it never flashes at the top-left corner.
        visibility: pos ? "visible" : "hidden",
      }}
      data-ks-theme={popTheme}
    >
      <span id={titleId} className="sr-only">
        Colour picker
      </span>

      {/* Saturation across, value down, over the current hue. Two CSS
          gradients do what a canvas would, and stay sharp at any zoom. */}
      <div
        ref={squareRef}
        onPointerDown={onSquare}
        className="ks-scrub ks-scrub-2d relative w-full cursor-crosshair overflow-hidden rounded-[8px]"
        style={{
          height: SQUARE_H,
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
        }}
      >
        <span
          aria-hidden
          className="absolute h-[14px] w-[14px] rounded-full"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            transform: "translate(-50%, -50%)",
            background: value,
            // The ring flips with the backdrop, so it stays visible on white
            // and on black rather than vanishing into one of them.
            boxShadow: markerDark
              ? "0 0 0 2px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.3)"
              : "0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,0.45)",
          }}
        />
      </div>

      {/* The same capsule the panel's sliders use, so hue reads as a control
          of the same family rather than a rainbow bar borrowed from elsewhere. */}
      <div
        ref={hueRef}
        onPointerDown={onHue}
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 1;
          if (event.key === "ArrowLeft") set({ h: (hsv.h - step + 360) % 360 });
          if (event.key === "ArrowRight") set({ h: (hsv.h + step) % 360 });
        }}
        className="ks-scrub relative w-full cursor-pointer rounded-full focus:outline-none"
        style={{
          height: KNOB + KNOB_INSET * 2,
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
        }}
      >
        <span
          aria-hidden
          className="absolute top-1/2 rounded-full"
          style={{
            width: KNOB,
            height: KNOB,
            // Positioned by the knob's own travel, so its edges land flush
            // with the ends of the track instead of overhanging them.
            left: `calc(${KNOB_INSET}px + ${hueT} * (100% - ${KNOB_INSET * 2 + KNOB}px))`,
            transform: "translateY(-50%)",
            background: `hsl(${hsv.h} 100% 50%)`,
            boxShadow: "0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,0.35)",
          }}
        />
      </div>

      <div className="flex items-center gap-[6px]">
        {supportsDropper ? (
          <button
            type="button"
            onClick={pickFromScreen}
            title="Pick a colour from the screen"
            aria-label="Pick a colour from the screen"
            className="ks-press grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            <Icon name="eyedropper" />
          </button>
        ) : null}
        <input
          value={draft ?? value.toUpperCase()}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={(event) => commitHex(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
          spellCheck={false}
          aria-label="Hex value"
          className="ks-label h-[28px] min-w-0 flex-1 rounded-full px-[10px] text-center uppercase focus:outline-none"
          style={{
            background: "var(--ks-ctl)",
            color: "var(--ks-ctl-text)",
            fontVariantNumeric: "tabular-nums",
          }}
        />
      </div>

      {recents.length ? (
        <div className="flex flex-col gap-[6px]">
          <span className="ks-micro" style={{ color: "var(--ks-text-dim)" }}>
            Recent
          </span>
          <div className="flex flex-wrap gap-[4px]">
            {recents.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={color}
                onClick={() => commitHex(color)}
                className="h-[18px] w-[18px] rounded-full transition-transform hover:scale-110"
                style={{ background: color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
