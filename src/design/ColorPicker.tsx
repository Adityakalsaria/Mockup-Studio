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

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { hexToHsv, hsvToHex, isLight, parseHex, type Hsv } from "./color";
import { control, radius } from "./system";
import { Glass, Slider } from "./ui";

/* The saturation area is square at the panel's width (see its `aspectRatio`),
   6 between the rows; the hue's own height is `control.paramH`, the frame's
   24. */
/**
 * Concentric with THIS panel, which is not the frame's panel.
 *
 * The frame draws the square at 16 inside a popup cornered at 24, with 8
 * between them — 24 less 8 is 16, so the frame is concentric with itself. Ours
 * is `--mo-r-panel`, which is 20, so the same rule gives 12. Taking the 16
 * across literally imported the frame's outer corner without it, and the
 * square read as a second panel rattling inside the first.
 */
const SQUARE_R = radius.panel - 8;

/** The marker's radius, including its ring. */
const MARK_R = 7;

/**
 * The two rows under the square are PILLS, as the frame draws them: a 12px
 * inset, a capsule corner, a fifth of white, and a hairline ring under a very
 * wide soft drop. One shape, twice — the hex and the recents are the same kind
 * of thing, a strip of colour you can act on.
 */
const PILL = {
  padding: 12,
  borderRadius: "var(--mo-r-selected)",
  background: "rgb(255 255 255 / 0.2)",
  boxShadow: "0 0 0 1px rgb(0 0 0 / 0.05), 0 0 137.391px 0 rgb(0 0 0 / 0.2)",
} as const;
/** Every hue, in the order a wheel runs through them. */
const SPECTRUM =
  "linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)";
const RECENTS_KEY = "mo-recent-colors";
const RECENTS_MAX = 10;
/*
 * The frame's spacings, read off its redline.
 *
 * The 10s in it are measured to the KNOB, not to the slider's box — and the
 * knob is 16 tall, centred in a 24 row, so it starts 4 in. Square to knob 10
 * is therefore square to row 6, and knob to hex 10 is row to hex 6. `GAP` is
 * that 6.
 *
 * The recents are set apart: 18 below the hex rather than 6, and 20 from the
 * panel's own edges on both sides and underneath. They are not another row of
 * the control — they are what you used before, kept nearby.
 */
const GAP = 6;
const RECENTS_GAP = 18;
/** 20 from the panel edge, of which the surface already gives 8. */
const RECENTS_INSET = 20 - 8;

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

/**
 * The eyedropper, as the file draws it.
 *
 * It replaces a pipette I drew while the frame had none — a stroked
 * approximation in the system's own hand, which is the right stopgap and the
 * wrong answer once there is an export. This one is filled, spans 2.57 to
 * 17.64 of its 20 box, and is #5A5A5A like the rest of the set.
 *
 * Referenced by URL rather than imported, because the design system has no
 * asset pipeline of its own and this is the one glyph in it that comes from
 * the file. `unoptimized` for the same reason every other icon here is: Next's
 * optimiser refuses SVGs unless the whole app opts into `dangerouslyAllowSVG`.
 */
function DropperIcon() {
  return (
    <Image
      src="/figma-assets/mockup-studio/icons/eyedropper.svg"
      alt=""
      width={16}
      height={16}
      unoptimized
    />
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

/**
 * The picker drawn straight into a surface, rather than hung off a swatch —
 * for a popup whose only field IS the colour, where a row with a chip and a
 * second panel under it would be the same control twice.
 */
export function ColorPickerPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return <Popover value={value} onChange={onChange} />;
}

function Popover({
  anchor,
  value,
  onChange,
  onClose,
}: {
  /** Absent: drawn in place, with no positioning and nothing to dismiss. */
  anchor?: React.RefObject<HTMLButtonElement | null>;
  value: string;
  onChange: (next: string) => void;
  onClose?: () => void;
}) {
  const inline = !anchor;
  const rootRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // Read once, on the render that follows the click that opened this. The
  // reader answers [] without a window, so it is safe wherever it runs.
  const [recents] = useState<string[]>(readRecents);
  const [draft, setDraft] = useState<string | null>(null);

  /**
   * The WHOLE colour lives here, not just its hue.
   *
   * A hex cannot hold where you are in this square. Drag to the bottom and the
   * colour is black — and black has no saturation — so a marker read back out
   * of the hex snaps to the left edge however far right you had gone. Hue was
   * already held for exactly this reason; saturation and value needed it too,
   * and only the third of the three had been fixed.
   *
   * Eight bits a channel cannot round-trip the square either: neighbouring
   * positions land on one hex, so even in the middle the marker crept against
   * the drag.
   *
   * What arrives from OUTSIDE still wins — a pasted hex or a recent swatch goes
   * through `commitHex`, which sets all three.
   */
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 0, s: 0, v: 0 });

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
    if (!anchor) return;
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
    if (!anchor || !onClose) return;
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
    setHsv(merged);
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

  const commitHex = (raw: string) => {
    const parsed = parseHex(raw);
    if (parsed) {
      const next = hexToHsv(raw);
      if (next) {
        // A pasted colour brings its own hue, unless it is a grey or a black
        // and has none to bring — then the square keeps the hue it was on.
        setHsv({ h: next.s > 0 && next.v > 0 ? next.h : hsv.h, s: next.s, v: next.v });
      }
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

  const body = (
    <>
        {/* Saturation across, value down, over the current hue. Two CSS
            gradients do what a canvas would and stay sharp at any zoom. */}
        <div
          onPointerDown={onSquare}
          className="relative w-full cursor-crosshair touch-none overflow-hidden"
          style={{
            // Square, as the name always said: as tall as the panel is wide,
            // so saturation and value get the same room. It was a fixed 132
            // across a 234-wide panel -- a rectangle.
            aspectRatio: "1 / 1",
            borderRadius: SQUARE_R,
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
          }}
        >
          {/*
            Kept inside its own square.
            
            The marker sits ON the value, so at full white or pure black it is
            centred on a corner with half of it outside — and the square clips,
            so half a ring is what you see. Clamped by its own radius, the whole
            ring stays visible and the reading is off by at most seven pixels
            at the very extremes, which is a better trade than a mark that
            disappears exactly when you have driven the colour somewhere
            deliberate.
          */}
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `calc(${hsv.s * 100}% + ${(0.5 - hsv.s) * MARK_R * 2}px)`,
              top: `calc(${(1 - hsv.v) * 100}% + ${(hsv.v - 0.5) * MARK_R * 2}px)`,
              width: MARK_R * 2,
              height: MARK_R * 2,
              marginLeft: -MARK_R,
              marginTop: -MARK_R,
              borderRadius: 999,
              border: `2px solid ${markerDark ? "#000" : "#fff"}`,
              boxShadow: "var(--mo-knob-shadow)",
            }}
          />
        </div>

        {/*
          The hue is the system's `Slider`, with the spectrum as its track.
          
          It was a hand-built row with a knob that copied the real one's
          numbers. Copying is how two knobs drift: this one gets the actual
          component, so it refracts the spectrum underneath it, swells under a
          press and travels on the same spring as every other knob in the
          interface, because it IS every other knob.
          
          `fill` goes transparent because a hue has no "so far" — the track is
          the scale, not a quantity. `paramH` is 24, which is the frame's Stack
          height exactly.
        */}
        {/*
          In a ROW, because `Slider` is built to be one.
          
          Its root carries `flex-1`, which is how it takes the space a
          `ParamRow` has left after the label and the readout. Dropped straight
          into this column, `flex-1` resolves against the column's main axis
          instead — basis 0, nothing to grow into — so the row collapsed to no
          height at all, and a knob centred on a zero-height line sat straddling
          the square's bottom edge with the track welded to it.
          
          The wrapper gives it a horizontal axis to be `flex-1` in, and the
          height the frame asks for.
        */}
        <div className="flex w-full items-center" style={{ height: control.paramH }}>
          <Slider
            label="Hue"
            value={hsv.h}
            min={0}
            max={360}
            step={1}
            onChange={(h) => set({ h })}
            track={{ background: SPECTRUM, fill: "transparent" }}
          />
        </div>

        {/*
          The hex, in a pill with the colour beside it.
          
          A swatch and its value read as one statement — this IS that red — in
          a way a bare field does not, and it gives the row something to be
          when the field is empty mid-edit. The eyedropper rides the far end of
          the same pill: the frame does not draw one, but it is the fastest way
          to match a colour already on the screen and it costs the layout
          nothing, sitting in the room the pill already has.
        */}
        <div className="flex w-full items-center" style={{ ...PILL, gap: 4 }}>
          <span
            aria-hidden
            className="shrink-0"
            style={{
              width: 16,
              height: 16,
              borderRadius: "var(--mo-r-swatch)",
              border: "var(--mo-swatch-edge)",
              boxShadow: "var(--mo-swatch-shadow)",
              background: value,
            }}
          />
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
            className="mo-code min-w-0 flex-1 bg-transparent tabular-nums outline-none"
          />
          {supportsDropper ? (
            <button
              type="button"
              aria-label="Pick a colour from the screen"
              onClick={pickFromScreen}
              className="grid shrink-0 cursor-pointer place-items-center"
              style={{ width: 16, height: 16, color: "var(--mo-ink)" }}
            >
              <DropperIcon />
            </button>
          ) : null}
        </div>

        {/*
          No pill around these — just the colours.
          
          The hex row is a pill because it is a control you act on: a field, a
          swatch, a dropper, held together as one thing. The recents are not a
          control, they are a row of marks, and a surface drawn around them made
          them look like one more button rather than the eight or ten small ones
          they are. They keep the pill's 12px inset so the first swatch lines up
          with the one above it.
        */}
        {recents.length ? (
          <div
            // Slots for a FULL row, filled from the left. Spread with
            // justify-between, four recents flew to the corners of a row
            // spaced for ten.
            className="grid w-full items-center"
            style={{
              gridTemplateColumns: `repeat(${RECENTS_MAX}, 16px)`,
              justifyContent: "space-between",
              marginTop: RECENTS_GAP - GAP,
              marginBottom: RECENTS_INSET,
              padding: `0 ${RECENTS_INSET}px`,
            }}
          >
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
                  boxShadow: "var(--mo-swatch-shadow)",
                  background: hex,
                }}
              />
            ))}
          </div>
        ) : null}
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-col" style={{ gap: GAP }}>
        {body}
      </div>
    );
  }

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal={false}
      aria-label="Colour picker"
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
        {body}
      </Glass>
    </div>,
    document.body,
  );
}
