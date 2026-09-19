"use client";

/**
 * The first-run walkthrough: one part of the studio at a time, lit, with a
 * card saying what it is for.
 *
 * No library. A tour is a rectangle to light and a card to place beside it:
 * each step names its element by a selector, the element is measured on
 * every step and on resize, and a box the element's size throws a shadow the
 * size of the window -- the dim everywhere else -- with its own inside left
 * clear. The overlay takes the pointer, so nothing underneath fires while
 * the tour runs.
 */

import { useEffect, useLayoutEffect, useState } from "react";
import { Button, Glass, Header } from "@/design/ui";

/** One selector, or several lit as one box around them all. */
type Step = { target: string | string[]; title: string; body: string };

/**
 * What a first-time user needs, in the order they will reach for it. Each
 * target is an element already on the page -- a rail item by its label, the
 * rest by a `data-tour` mark -- so the tour lights the real thing.
 */
const STEPS: Step[] = [
  {
    target: '[aria-label="Devices"]',
    title: "Pick a device",
    body: "Phones, tablets, laptops and displays, grouped by kind. Choose the one your shot is about.",
  },
  {
    target: '[aria-label="Screen image"]',
    title: "Drop in your screen",
    body: "Upload a screenshot or a video and it lands on the device's screen. Zoom and Fill or Fit decide what shows.",
  },
  {
    target: ".mo-shot",
    title: "This is your shot",
    body: "Drag to turn the device, scroll to zoom, and ⌘⇧-drag to move it. What you see here is what you export.",
  },
  {
    target: '[data-tour="gizmo"]',
    title: "Fine rotation",
    body: "Drag the gizmo, or use the arrow keys on it, to turn by a step. Double-click to put the pose back.",
  },
  {
    target: '[data-tour="panel"]',
    title: "Craft the pose",
    body: "Transform, camera and lighting, plus effects like shadow and depth of field.",
  },
  {
    target: ['[data-tour="export"]', '[title="Export a PNG"]'],
    title: "Export your shot",
    body: "Pick a size — 1x to 4x — and save the shot as a PNG. In Motion, the same spot exports a video.",
  },
  {
    target: '[data-tour="mode"]',
    title: "Then bring it to life",
    body: "Switch to Motion for presets, focus points that move the camera for you, a timeline to fine-tune it, and video export.",
  },
  {
    target: '[data-tour="history"]',
    title: "Undo, reset, redo",
    body: "Every change can be stepped back. Reset returns the shot to where it started.",
  },
  {
    target: ['[data-tour="shortcuts"]', '[data-tour="account"]'],
    title: "Shortcuts and what's new",
    body: "⌘ lists every shortcut. Your profile holds the changelog — and a way to tell us what to build next.",
  },
];

/** The lit box's margin around its element, and the card's gap from it. */
const PAD = 8;
const GAP = 16;
const CARD_W = 300;

export function Tour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(0);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  // Measured on every step and whenever the window changes shape.
  useLayoutEffect(() => {
    const measure = () => {
      // Several targets light as one: the box around all of them.
      const boxes = [step.target]
        .flat()
        .map((sel) => document.querySelector(sel)?.getBoundingClientRect())
        .filter((b): b is DOMRect => !!b);
      if (!boxes.length) return setRect(null);
      const left = Math.min(...boxes.map((b) => b.left));
      const top = Math.min(...boxes.map((b) => b.top));
      const right = Math.max(...boxes.map((b) => b.right));
      const bottom = Math.max(...boxes.map((b) => b.bottom));
      setRect(new DOMRect(left, top, right - left, bottom - top));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
      else if (event.key === "ArrowRight")
        setIndex((i) => Math.min(STEPS.length - 1, i + 1));
      else if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);

  const W = typeof window === "undefined" ? 1280 : window.innerWidth;
  const H = typeof window === "undefined" ? 800 : window.innerHeight;

  // The lit box, a little larger than the element it lights.
  const hole = rect
    ? {
        left: rect.left - PAD,
        top: rect.top - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  /*
   * The card goes beside the element on whichever side has room -- right of
   * something on the left, left of something on the right, below something at
   * the top, above something at the bottom -- then is kept on screen.
   */
  let card = { left: W / 2 - CARD_W / 2, top: H / 2 - cardH / 2 };
  if (hole) {
    const cx = hole.left + hole.width / 2;
    const cy = hole.top + hole.height / 2;
    const tall = hole.height > H * 0.5;
    const wide = hole.width > W * 0.5;
    if (wide && tall) {
      // The shot itself: over its middle.
      card = { left: cx - CARD_W / 2, top: cy - cardH / 2 };
    } else if (cx < W * 0.35) {
      card = { left: hole.left + hole.width + GAP, top: cy - cardH / 2 };
    } else if (cx > W * 0.65) {
      card = { left: hole.left - GAP - CARD_W, top: cy - cardH / 2 };
    } else if (cy < H / 2) {
      card = { left: cx - CARD_W / 2, top: hole.top + hole.height + GAP };
    } else {
      card = { left: cx - CARD_W / 2, top: hole.top - GAP - cardH };
    }
  }
  const M = 16;
  card.left = Math.max(M, Math.min(W - M - CARD_W, card.left));
  card.top = Math.max(M, Math.min(H - M - cardH, card.top));

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 60 }}
      // The tour holds the pointer: nothing under it fires mid-walkthrough.
      onPointerDown={(event) => event.stopPropagation()}
    >
      {hole ? (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            ...hole,
            borderRadius: 16,
            boxShadow: "0 0 0 9999px rgb(20 20 22 / 0.42)",
            outline: "1.5px solid rgb(255 255 255 / 0.9)",
            transition:
              "left 280ms cubic-bezier(0.32,0.72,0,1), top 280ms cubic-bezier(0.32,0.72,0,1), width 280ms cubic-bezier(0.32,0.72,0,1), height 280ms cubic-bezier(0.32,0.72,0,1)",
          }}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "rgb(20 20 22 / 0.42)" }}
        />
      )}
      <div
        ref={(node) => {
          if (node && node.offsetHeight !== cardH) setCardH(node.offsetHeight);
        }}
        role="dialog"
        aria-label={step.title}
        className="absolute"
        style={{
          left: card.left,
          top: card.top,
          width: CARD_W,
          transition:
            "left 280ms cubic-bezier(0.32,0.72,0,1), top 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <Glass width={CARD_W}>
          <Header>{step.title}</Header>
          <div
            className="flex flex-col"
            style={{ gap: 14, padding: "0 12px 8px" }}
          >
            <p className="mo-label" style={{ color: "var(--mo-ink-muted)" }}>
              {step.body}
            </p>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span
                className="mo-code"
                style={{ color: "var(--mo-ink-muted)", flex: 1 }}
              >
                {index + 1} of {STEPS.length}
              </span>
              <button
                type="button"
                onClick={onDone}
                className="mo-label cursor-pointer"
                style={{ color: "var(--mo-ink-muted)", padding: "0 6px" }}
              >
                Skip
              </button>
              {index > 0 ? (
                <Button height={32} onClick={() => setIndex(index - 1)}>
                  <span style={{ padding: "0 12px" }}>Back</span>
                </Button>
              ) : null}
              <Button
                height={32}
                onClick={() => (last ? onDone() : setIndex(index + 1))}
              >
                <span style={{ padding: "0 14px" }}>
                  {last ? "Done" : "Next"}
                </span>
              </Button>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}
