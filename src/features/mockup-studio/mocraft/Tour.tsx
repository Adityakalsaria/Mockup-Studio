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

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Button, Glass, Header } from "@/design/ui";

/**
 * One selector, or several lit as one box around them all.
 *
 * `shape` is the lit box's corner: "round" is a circle or a pill, whichever the
 * box is, for round and pill-shaped controls; "match" is the element's own
 * corner grown by the margin, so the lit box sits concentric with it and its
 * corner is not cut. Left out, the corner is a plain 16.
 *
 * `cardAt: "below"` puts the card under the lit box -- for a tall popup, where
 * beside it the card sits far from where the eye ends up. If there is no room
 * below, it goes beside, level with the box's bottom edge.
 *
 * `open` names a feature the step needs open while it is lit. The tour does not
 * know how to open one -- it hands the step to `onStep`, and the box waits for
 * the feature to arrive before it goes to it.
 */
export type Step = {
  target: string | string[];
  title: string;
  body: string;
  shape?: "round" | "match";
  cardAt?: "below";
  open?: "focus" | "lighting";
};

/**
 * What a first-time user needs, in the order they will reach for it. Each
 * target is an element already on the page -- a rail item by its label, the
 * rest by a `data-tour` mark -- so the tour lights the real thing.
 */
const CRAFTING_STEPS: Step[] = [
  {
    target: '[aria-label="Devices"]',
    shape: "round",
    title: "Pick a device",
    body: "Phones, tablets, laptops and displays, grouped by kind. Choose the one your shot is about.",
  },
  {
    target: '[aria-label="Screen image"]',
    shape: "round",
    title: "Drop in your screen",
    body: "Upload a screenshot or a video and it lands on the device's screen. Zoom and Fill or Fit decide what shows.",
  },
  {
    target: ".mo-shot",
    shape: "match",
    title: "This is your shot",
    body: "Drag to turn the device, scroll to zoom, and ⌘⇧-drag to move it. What you see here is what you export.",
  },
  {
    target: '[data-tour="gizmo"]',
    shape: "round",
    title: "Fine rotation",
    body: "Drag the gizmo, or use the arrow keys on it, to turn by a step. Double-click to put the pose back.",
  },
  {
    target: '[data-tour="panel"]',
    shape: "match",
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
    shape: "round",
    title: "Then bring it to life",
    body: "Switch to Motion for presets, focus points that move the camera for you, a timeline to fine-tune it, and video export.",
  },
  {
    target: '[data-tour="history"]',
    shape: "round",
    title: "Undo, reset, redo",
    body: "Every change can be stepped back. Reset returns the shot to where it started.",
  },
  {
    target: ['[data-tour="shortcuts"]', '[data-tour="account"]'],
    shape: "round",
    title: "Shortcuts and what's new",
    body: "⌘ lists every shortcut. Your profile holds the changelog — and a way to tell us what to build next.",
  },
];

/**
 * The Motion half, run the first time an account switches to it. Presets and
 * focus points share one step because they share one panel.
 */
export const MOTION_STEPS: Step[] = [
  {
    target: '[data-tour="panel"]',
    shape: "match",
    title: "Your clip, in rows",
    body: "Pick a preset for a ready-made move, or set up the pose, camera, light and depth of field yourself.",
  },
  {
    target: '[data-tour="popup"] .mo-glass',
    shape: "match",
    open: "focus",
    cardAt: "below",
    title: "Focus points",
    body: "Mark spots on the shot and the camera moves to them for you.",
  },
  {
    target: '[data-tour="popup"] .mo-glass',
    shape: "match",
    open: "lighting",
    cardAt: "below",
    title: "Lighting",
    body: "Turn the light's angle and height over the clip. Both can be keyed on the timeline.",
  },
  {
    target: '[data-tour="timeline"]',
    shape: "match",
    title: "Fine-tune on the timeline",
    body: "Every key is on it. Drag a key to move it, double-click to delete it, and set the easing between two keys.",
  },
  {
    target: ['[data-tour="export"]', '[title="Export an MP4"]'],
    title: "Export a video",
    body: "Pick a size and a frame rate, then save the clip as an MP4.",
  },
];

/** The tour's way in and out: the dim and the card fade rather than cut. */
const FADE = "mo-tour-in 320ms cubic-bezier(0.32,0.72,0,1)";
const LEAVE_MS = 220;
const LEAVE = `mo-tour-out ${LEAVE_MS}ms ease-in forwards`;

/** How long a step that opens something waits for it to open and settle. */
const OPEN_MS = 420;
/** The lit box's glide, after which the card may follow it in. */
const GLIDE_MS = 280;

/** The lit box's margin around its element, and the card's gap from it. */
const PAD = 8;
const GAP = 16;
const CARD_W = 300;

/**
 * An element's corner radius. The wrapper a step marks is often square and the
 * glass inside it is what has the corner, so look there when it has none.
 */
const cornerOf = (el: Element) =>
  parseFloat(getComputedStyle(el).borderTopLeftRadius) ||
  parseFloat(
    getComputedStyle(el.querySelector(".mo-glass") ?? el).borderTopLeftRadius,
  ) ||
  0;

export function Tour({
  steps = CRAFTING_STEPS,
  onStep,
  onDone,
}: {
  steps?: Step[];
  /** Called as each step arrives, to open what it lights. Keep it stable. */
  onStep?: (step: Step) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(0);
  const [matchR, setMatchR] = useState(0);
  /*
   * The card is not shown until it has been measured and put where it goes.
   * Placed from a height of zero it starts in the wrong spot and glides to the
   * right one, which read as the tour jumping in. Transitions come on a frame
   * after, so the first placement is a placement, not a move.
   */
  const [placed, setPlaced] = useState(false);
  // Finishing fades out first, then hands back to the caller, who tidies up.
  const [leaving, setLeaving] = useState(false);
  /*
   * What the card says, and whether it is showing. On a step that opens
   * something the card was arriving with the lit box still on the last step's
   * element -- text about a popup, beside nothing. So it steps aside while the
   * feature opens and the box travels, and comes back, with the new words, once
   * the box has landed.
   */
  const [shown, setShown] = useState(steps[0]);
  const [ready, setReady] = useState(true);
  const finish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, LEAVE_MS);
  }, [leaving, onDone]);
  const step = steps[index];
  const last = index === steps.length - 1;

  // Measured on every step and whenever the window changes shape.
  useLayoutEffect(() => {
    const measure = () => {
      // Several targets light as one: the box around all of them.
      const els = [step.target]
        .flat()
        .map((sel) => document.querySelector(sel))
        .filter((e): e is Element => !!e);
      const boxes = els.map((e) => e.getBoundingClientRect());
      if (!boxes.length) return setRect(null);
      const r = cornerOf(els[0]);
      setMatchR(r ? r + PAD : 0);
      const left = Math.min(...boxes.map((b) => b.left));
      const top = Math.min(...boxes.map((b) => b.top));
      const right = Math.max(...boxes.map((b) => b.right));
      const bottom = Math.max(...boxes.map((b) => b.bottom));
      setRect(new DOMRect(left, top, right - left, bottom - top));
    };
    onStep?.(step);
    // A step that opens something is measured once it has opened; until then
    // the box stays on the last step's element and glides over when it lands.
    let reveal: ReturnType<typeof setTimeout> | undefined;
    let wait: ReturnType<typeof setTimeout> | undefined;
    // Light the element, put this step's words on the card, and say whether it shows.
    const arrive = (showCard: boolean) => {
      measure();
      setShown(step);
      setReady(showCard);
    };
    if (step.open) {
      // Steps aside now; back once the feature has opened and the box has landed.
      const hold = () => setReady(false);
      hold();
      wait = setTimeout(() => {
        arrive(false);
        reveal = setTimeout(() => setReady(true), GLIDE_MS);
      }, OPEN_MS);
    } else {
      arrive(true);
    }
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(wait);
      clearTimeout(reveal);
      window.removeEventListener("resize", measure);
    };
  }, [step, onStep]);

  useEffect(() => {
    if (!cardH) return;
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, [cardH]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      else if (event.key === "ArrowRight")
        setIndex((i) => Math.min(steps.length - 1, i + 1));
      else if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [finish, steps.length]);

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

  const radius = !hole
    ? 0
    : step.shape === "round"
      ? Math.min(hole.width, hole.height) / 2
      : step.shape === "match"
        ? matchR
        : 16;

  /*
   * The card goes beside the element on whichever side has room -- right of
   * something on the left, left of something on the right, below something at
   * the top, above something at the bottom -- then is kept on screen.
   */
  let card = { left: W / 2 - CARD_W / 2, top: H / 2 - cardH / 2 };
  if (hole) {
    const cx = hole.left + hole.width / 2;
    const cy = hole.top + hole.height / 2;
    // From `shown`, not `step`: the card is placed for the words it is showing,
    // beside the box it is showing them for.
    const sideTop =
      shown.cardAt === "below" ? hole.top + hole.height - cardH : cy - cardH / 2;
    const roomBelow = H - (hole.top + hole.height) - GAP - 16 >= cardH;
    const tall = hole.height > H * 0.5;
    const wide = hole.width > W * 0.5;
    if (shown.cardAt === "below" && roomBelow) {
      card = { left: cx - CARD_W / 2, top: hole.top + hole.height + GAP };
    } else if (wide && tall) {
      // The shot itself: over its middle.
      card = { left: cx - CARD_W / 2, top: cy - cardH / 2 };
    } else if (cx < W * 0.35) {
      card = { left: hole.left + hole.width + GAP, top: sideTop };
    } else if (cx > W * 0.65) {
      card = { left: hole.left - GAP - CARD_W, top: sideTop };
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
      <style>{`@keyframes mo-tour-in { from { opacity: 0 } } @keyframes mo-tour-out { to { opacity: 0 } }`}</style>
      {/* Keyed apart: as the same slot React reuses one node for both, and the
          lit box then "moves" from the dim's corner to its element -- its
          transition runs on `left` and `top` from the top-left of the page. */}
      {hole ? (
        <div
          key="lit"
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            ...hole,
            animation: leaving ? LEAVE : `${FADE} backwards`,
            borderRadius: radius,
            boxShadow: "0 0 0 9999px rgb(20 20 22 / 0.42)",
            outline: "1.5px solid rgb(255 255 255 / 0.9)",
            transition:
              "left 280ms cubic-bezier(0.32,0.72,0,1), top 280ms cubic-bezier(0.32,0.72,0,1), width 280ms cubic-bezier(0.32,0.72,0,1), height 280ms cubic-bezier(0.32,0.72,0,1), border-radius 280ms cubic-bezier(0.32,0.72,0,1)",
          }}
        />
      ) : (
        <div
          key="dim"
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "rgb(20 20 22 / 0.42)",
            animation: leaving ? LEAVE : `${FADE} backwards`,
          }}
        />
      )}
      <div
        ref={(node) => {
          if (node && node.offsetHeight !== cardH) setCardH(node.offsetHeight);
        }}
        role="dialog"
        aria-label={shown.title}
        className="absolute"
        style={{
          left: card.left,
          top: card.top,
          width: CARD_W,
          visibility: placed ? "visible" : "hidden",
          pointerEvents: ready ? undefined : "none",
          transition: placed && ready
            ? "left 280ms cubic-bezier(0.32,0.72,0,1), top 280ms cubic-bezier(0.32,0.72,0,1)"
            : "none",
        }}
      >
        {/* The fade is on the glass itself, not the wrapper: an ancestor
            that is not yet opaque would leave the glass with nothing to frost. */}
        <Glass
          width={CARD_W}
          style={{
            animation: leaving ? LEAVE : placed ? `${FADE} backwards` : undefined,
            opacity: ready ? 1 : 0,
            transition: "opacity 160ms ease",
          }}
        >
          <Header>{shown.title}</Header>
          <div
            className="flex flex-col"
            style={{ gap: 14, padding: "0 12px 8px" }}
          >
            <p className="mo-label" style={{ color: "var(--mo-ink-muted)" }}>
              {shown.body}
            </p>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span
                className="mo-code"
                style={{ color: "var(--mo-ink-muted)", flex: 1 }}
              >
                {steps.indexOf(shown) + 1} of {steps.length}
              </span>
              <button
                type="button"
                onClick={finish}
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
                onClick={() => (last ? finish() : setIndex(index + 1))}
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
