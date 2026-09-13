"use client";

/**
 * The timeline, for when a preset is applied.
 *
 * The old editor's version is the reference — play button, `0:03.8 / 0:06.0`,
 * a ruler, a lane per animated channel with its keyframes on it, and a
 * playhead you can drag. This is the same instrument in this chrome's clothes:
 * one `Glass` panel, monochrome, the transport controls that used to live in a
 * separate pill folded into its header.
 *
 * What it deliberately does NOT carry over is the authoring half — Res, FPS,
 * the easing picker, the zoom slider, Fit. Those exist to BUILD a clip, and
 * nothing in this shell builds one: presets arrive whole. Bringing the
 * controls across would put eight widgets on a panel where only two of them
 * do anything.
 *
 * The playhead is the interesting part of the implementation. It moves sixty
 * times a second and it is not allowed to re-render anything, because this
 * chrome is full of springs that would each re-run. So the marker's transform
 * and the readout's text are written straight to the DOM from one rAF loop —
 * no state, no reconciliation, and the ref that drives it is the same clock
 * the 3D scene reads in its own frame loop.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Button,
  Divider,
  Glass,
  Glyph,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  Segmented,
  Slider,
  useDismiss,
} from "@/design/ui";
import { control, radius } from "@/design/system";
import {
  ANIMATABLE,
  KEY_EPSILON,
  EASING_PRESETS,
  easingPresetId,
  formatClock,
  formatTime,
  parseClock,
  type AnimatableKey,
} from "../animation";
import { CurveThumb, EasingMenu } from "./EasingMenu";
import { KeyframeMenu } from "./KeyframeMenu";
import { getMotionPreset } from "../editor/motionPresets";
import type { Studio } from "./useStudio";

/** Fixed, so the composition above does not jump every time a preset with a
    different number of channels is picked. */
export const PANEL_H = 250;
/**
 * The floor on every gap in the panel, and the clearance from its edge.
 *
 * `Glass` already pads itself by 8, so a control in a row exactly its own
 * height sits 8 from the panel edge and 8 from its neighbour — but only if the
 * row does not squeeze it. The row is therefore sized as the control plus that
 * clearance top and bottom rather than to a number that happened to look right,
 * which is what "36" was.
 */
const SAFE = 8;

/**
 * Where the timeline's popups paint: above everything else in the chrome.
 *
 * The whole bottom bar is placed FIRST in the chrome on purpose, so the side
 * panels paint over the gizmo where the two meet. The popups inherited that:
 * the easing curve and a keyframe's settings opened UNDER the Export panel,
 * the pose dock and the gizmo, with the thing being edited half-covered by
 * things that were not. A popup is where your attention is while it is open,
 * so it is lifted clear of the order its parent was deliberately given.
 *
 * Nothing between here and the page starts a stacking context -- the
 * timeline root, the column and the overlay are all positioned with no
 * z-index of their own -- which is why a number here is enough.
 */
const POPUP_Z = 40;
/** The frame's keyframe and span marks are both 20 square. */
const MARK = 20;

/**
 * The closest two keys on one lane may be dragged, on screen.
 *
 * Two diamonds and the easing marker between them, each MARK wide, plus the
 * SAFE breathing room this chrome keeps between any two controls: the least
 * that lets all three be seen and pressed.
 */
const KEY_GAP_PX = MARK * 2 + SAFE;
const KEYFRAMES = "/figma-assets/mockup-studio/timeline";
/** Every control in the toolbar is this tall, so one of them can set the row. */
const CONTROL_H = 28;
/** Wide enough for "Pan X", which is the longest label a lane can carry. */
const LABEL_W = 52;
/* One lane per channel, exactly as tall as the mark it carries. Flush rows are
   the frame's own rhythm — the marks are what you read down a lane, and space
   between them was space spent on nothing. */
const LANE_H = MARK;
const RULER_H = 20;
/**
 * Breathing room at each end of the time axis.
 *
 * A mark at 0 is centred on the very first pixel of the lane, so half of it is
 * outside the box that scrolls — and a scroller clips. The key at the start of
 * every track was rendering as a chevron, which is the right half of a diamond.
 * Padding the viewport insets the whole axis, and everything inside is placed
 * as a percentage of it, so the ruler, the marks and the playhead all move
 * together and nothing else has to know.
 */
const LEAD = 10;

/**
 * Ruler spacing that lands on round numbers at any clip length.
 *
 * Ten or so ticks now that the panel is the width of the window — the old six
 * left half-second gaps of empty rule between labels at any sensible duration.
 */
const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30];
function tickStep(duration: number): number {
  return STEPS.find((step) => step >= duration / 10) ?? STEPS[STEPS.length - 1];
}

/** Export sizes and frame rates, as the old editor offered them. */
const SCALES = [1, 2, 3, 4];
const RATES = [30, 60];

/** Between toolbar groups. A gap alone says "these are apart"; a rule says
    "and they are about different things". */
function Rule() {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        height: 18,
        background: "var(--mo-field)",
        flex: "none",
      }}
    />
  );
}

/** A control with its name beside it, which is how the whole toolbar reads —
    the labels are the only thing saying what a bare "2x" or "60" means. */
function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label
      className="mo-label flex items-center"
      style={{ gap: SAFE, color: "var(--mo-ink-muted)" }}
    >
      {label}
      {children}
    </label>
  );
}

export function Timeline({ studio }: { studio: Studio }) {
  const { playing, playheadRef, duration, seek, parkedAt, presetId } = studio;
  const animation = studio.state.animation;

  /* Held while it is being typed rather than parsed on every keystroke: "1:"
     is not a duration, and reformatting mid-word fights the typing. */
  const [durationDraft, setDurationDraft] = useState<string | null>(null);
  const [easingOpen, setEasingOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const easingRef = useDismiss<HTMLDivElement>(easingOpen, () =>
    setEasingOpen(false),
  );

  /**
   * Every key that is selected, and separately the one the menu is about.
   *
   * Two pieces of state rather than one, because they answer different
   * questions. `selection` is what a drag MOVES and what Delete removes, and
   * it can hold keys on several lanes at once. `selected` is where the
   * keyframe menu hangs and which key it edits -- and that menu retypes one
   * value, one time and one easing, so it is only meaningful when exactly one
   * key is selected. Folding the two together would mean either a menu
   * claiming to edit a group it cannot, or a group drag that can only ever
   * hold one key.
   *
   * A key is identified by its TIME, which the drag then changes -- so both of
   * these are re-based on every move, the same way `dragRef` already was.
   */
  const [selection, setSelection] = useState<
    Array<{ key: AnimatableKey; time: number }>
  >([]);
  const [selected, setSelected] = useState<{
    key: AnimatableKey;
    time: number;
    x: number;
    panelW: number;
  } | null>(null);
  const isSelected = (channel: AnimatableKey, time: number) =>
    selection.some(
      (s) => s.key === channel && Math.abs(s.time - time) < 1e-6,
    );
  /** Which span's easing menu is open, and where to hang it. `x` is measured
      from the panel's left edge at the moment of the click, so the menu is not
      trapped inside the lanes' horizontal scroller. */
  const [segment, setSegment] = useState<{
    key: AnimatableKey;
    time: number;
    x: number;
    panelW: number;
  } | null>(null);
  /* Stable, or `useDismiss` tears its listener down and builds a new one on
     every render — and this panel renders on every frame of a spring. */
  const closeMenus = useCallback(() => {
    setSegment(null);
    setSelected(null);
    setSelection([]);
  }, []);

  /* One ref, two jobs: the box the span menu is positioned against, and the
     boundary a press has to land outside of to dismiss it. They are the same
     element — the menu hangs off the panel and the tile that opened it is
     inside the panel — so two refs would be the same node twice. */
  const panelRef = useDismiss<HTMLDivElement>(
    // Armed on the SELECTION too, not just the menu: a multi-key selection
    // shows no menu, and a press outside still has to clear it.
    segment !== null || selected !== null || selection.length > 0,
    closeMenus,
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  /* Which key a pointer is carrying, and where in the clip it has got to. */
  /**
   * The gesture in flight: what was grabbed, and everything travelling with it.
   *
   * `items` is a snapshot taken at pointer-down rather than a read of
   * `selection` during the move, because the move re-times the very keys it is
   * reading and state has not landed yet when the next pointer event arrives.
   */
  const dragRef = useRef<{
    key: AnimatableKey;
    time: number;
    items: Array<{ key: AnimatableKey; time: number }>;
  } | null>(null);
  /**
   * A drag across empty lane, which selects rather than scrubs.
   *
   * The playhead used to follow every press in here. That is the right
   * behaviour for a ruler and the wrong one for the lanes: the lanes are where
   * the keys are, so a drag across them is a selection and moving the playhead
   * was destroying the shot's frame every time you reached for a key.
   *
   * `base` is the selection the gesture started from, so a Shift-drag ADDS a
   * second box to what was already held instead of replacing it.
   */
  const marqueeRef = useRef<{
    x: number;
    y: number;
    base: Array<{ key: AnimatableKey; time: number }>;
  } | null>(null);
  /** Only for drawing it. The selection itself is computed live. */
  const [marquee, setMarquee] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  /** Set only when the press landed on the ruler, which is the one strip that
      still moves the playhead. */
  const scrubRef = useRef(false);

  /*
   * One loop, painting two nodes, running only while something moves.
   *
   * `parkedAt` is in the deps rather than the body: a scrub changes it, which
   * re-runs this effect, which paints once at the new time. That is the whole
   * mechanism for keeping a paused marker in the right place, and it costs no
   * frames at all when nothing is playing.
   */
  useEffect(() => {
    const lane = laneRef.current;
    const marker = markerRef.current;
    const readout = readoutRef.current;
    if (!lane || !marker || !readout) return;

    const paint = () => {
      const time = playheadRef.current;
      marker.style.transform = `translateX(${(time / Math.max(0.001, duration)) * lane.clientWidth}px)`;
      readout.textContent = formatTime(time);
    };

    paint();
    if (!playing) return;

    let raf = 0;
    const tick = () => {
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, playheadRef, parkedAt]);

  /*
   * Zoom around the playhead, not the left edge.
   *
   * Anchoring to zero pushes whatever you were looking at off screen every
   * time you zoom in, which makes the control useless at the moment it is
   * wanted. Runs after the width has changed, since the scroll position it
   * computes is a fraction of the new width.
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    const lane = laneRef.current;
    if (!viewport || !lane) return;
    const x =
      (playheadRef.current / Math.max(0.001, duration)) * lane.clientWidth;
    viewport.scrollLeft = x - viewport.clientWidth / 2;
  }, [zoom, duration, playheadRef]);

  /*
   * Delete removes the selected key — the shortcut the old editor's own
   * tooltip advertised ("delete key or double-click to remove") and the reason
   * selection is worth having at all. Scoped to this component rather than the
   * chrome's keyboard effect, because it is only meaningful while something in
   * here is selected.
   */
  useEffect(() => {
    if (!selection.length) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const node = event.target as HTMLElement | null;
      const tag = node?.tagName;
      // Not while the Duration field has focus: Backspace is how you edit it.
      if (
        node &&
        (tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable)
      )
        return;
      event.preventDefault();
      // Every selected key, not just the menu's one. Removal does not re-time
      // anything, so the order these go in does not matter.
      for (const item of selection) studio.deleteKey(item.key, item.time);
      setSelected(null);
      setSelection([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, studio]);

  const tracks = studio.state.animation.tracks;
  // Ordered by `ANIMATABLE` rather than by whatever order the preset happened
  // to write its tracks in, so the same channel is always on the same row.
  const lanes = ANIMATABLE.filter(({ key }) => (tracks[key]?.length ?? 0) > 0);

  if (!presetId) return null;

  /** Where in the clip a screen x lands. The lane box is the one that grows
      with zoom, and its rect already accounts for the scroll. */
  const timeAt = (clientX: number): number | null => {
    const lane = laneRef.current;
    if (!lane) return null;
    const box = lane.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(duration, ((clientX - box.left) / box.width) * duration),
    );
  };

  /*
   * Where a key can actually go, which is not always where you dragged it.
   *
   * `moveKey` clamps a key between its neighbours so a drag cannot destroy the
   * ones it passes. That means the time the drag ASKED for and the time the key
   * ENDED at differ the moment you push against a neighbour — and a drag that
   * keeps tracking the asked-for time then goes looking for a key that is not
   * there and stops dead. So the clamp is computed here as well, and everything
   * downstream follows the real time.
   */
  /** `KEY_GAP_PX` in seconds at the current zoom. Shared, because a group drag
      has to keep exactly the spacing a single drag keeps. */
  const gapSeconds = () => {
    const laneW = laneRef.current?.getBoundingClientRect().width ?? 0;
    return laneW > 0 && duration > 0
      ? Math.max(KEY_EPSILON, (KEY_GAP_PX / laneW) * duration)
      : KEY_EPSILON;
  };

  /*
   * One delta for the whole selection, limited by whichever member runs out
   * of room first.
   *
   * Clamping each key on its own is the obvious thing and it is wrong: the
   * moment one member reaches a neighbour it stops while the rest keep going,
   * and the shape the selection had -- which is the thing being dragged -- is
   * destroyed. So the group moves rigidly or not at all.
   *
   * What a selected key is actually blocked by is the nearest UNSELECTED key,
   * because anything selected between the two is moving with it. That makes
   * the unit a contiguous RUN of selected keys on one lane: only the run's
   * first key can be stopped on the left and only its last on the right, and
   * everything between them is carried.
   *
   * A key already closer than the gap is not thrown clear -- the bound is
   * pinned to where it already sits -- which is the rule `settleTime` follows
   * for a single key, kept here so a dense preset behaves the same either way.
   */
  const clampGroupDelta = (
    items: Array<{ key: AnimatableKey; time: number }>,
    delta: number,
  ) => {
    const gap = gapSeconds();
    const byLane = new Map<AnimatableKey, number[]>();
    for (const item of items) {
      const keys = tracks[item.key] ?? [];
      const i = keys.findIndex((k) => Math.abs(k.time - item.time) < 1e-6);
      if (i < 0) continue;
      const list = byLane.get(item.key);
      if (list) list.push(i);
      else byLane.set(item.key, [i]);
    }
    let lo = -Infinity;
    let hi = Infinity;
    for (const [channel, indices] of byLane) {
      const keys = tracks[channel] ?? [];
      const sorted = [...indices].sort((a, b) => a - b);
      let r = 0;
      while (r < sorted.length) {
        const start = sorted[r];
        while (r + 1 < sorted.length && sorted[r + 1] === sorted[r] + 1) r += 1;
        const end = sorted[r];
        const first = keys[start].time;
        const last = keys[end].time;
        const floor =
          start > 0 ? Math.min(keys[start - 1].time + gap, first) : 0;
        const ceiling =
          end < keys.length - 1
            ? Math.max(keys[end + 1].time - gap, last)
            : duration;
        lo = Math.max(lo, floor - first);
        hi = Math.min(hi, ceiling - last);
        r += 1;
      }
    }
    if (lo === -Infinity || hi === Infinity) return delta;
    return Math.max(lo, Math.min(hi, delta));
  };

  /*
   * Every key the box touches.
   *
   * Lanes are stacked in `lanes` order directly under the ruler with no gaps,
   * so lane i owns the band RULER_H + i*LANE_H down. Intersection rather than
   * centre containment: a flat drag along a row would otherwise touch nothing,
   * and a box you can see covering a diamond has to select it.
   */
  const keysInBox = (
    t0: number,
    t1: number,
    y0: number,
    y1: number,
  ): Array<{ key: AnimatableKey; time: number }> => {
    const lo = Math.min(t0, t1);
    const hi = Math.max(t0, t1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);
    const found: Array<{ key: AnimatableKey; time: number }> = [];
    lanes.forEach(({ key }, i) => {
      const bandTop = RULER_H + i * LANE_H;
      const bandBottom = bandTop + LANE_H;
      if (bandBottom < top || bandTop > bottom) return;
      for (const frame of tracks[key] ?? [])
        if (frame.time >= lo && frame.time <= hi)
          found.push({ key, time: frame.time });
    });
    return found;
  };

  const settleTime = (channel: AnimatableKey, time: number, to: number) => {
    const keys = tracks[channel] ?? [];
    const i = keys.findIndex((k) => Math.abs(k.time - time) < 1e-6);
    if (i < 0) return null;
    /*
     * And a safe distance from each neighbour, measured in PIXELS.
     *
     * The clamp used to stop a hair short of the next key, which kept the
     * data intact and let the drawing collapse: two diamonds stacked on one
     * another, with the easing marker for the span between them buried
     * underneath both. `KEY_GAP_PX` is what the three need to sit side by
     * side, converted to seconds at the current zoom -- so zooming in lets
     * keys go closer, which is exactly what zooming in is for.
     *
     * A key already closer than the gap is not thrown clear of its neighbour
     * when grabbed; it simply cannot be pushed any closer. Otherwise touching
     * a key on a dense preset would make it jump.
     */
    const gap = gapSeconds();
    const floor = i > 0 ? Math.min(keys[i - 1].time + gap, time) : 0;
    const ceiling =
      i < keys.length - 1 ? Math.max(keys[i + 1].time - gap, time) : duration;
    return Math.max(floor, Math.min(ceiling, to));
  };

  const scrubTo = (clientX: number) => {
    const at = timeAt(clientX);
    if (at !== null) seek(at);
  };

  const step = tickStep(duration);
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-6; t += step)
    ticks.push(Number(t.toFixed(3)));

  return (
    /*
       Full width, and positioned by the bottom bar rather than by itself.

       The lanes are the reason it earns the room: a lane is a time axis, and
       every pixel of width is resolution on it. At the old 660 a preset with
       keys 40ms apart drew them on top of each other; across the window they
       separate, and the ruler can carry a label per half second without the
       numbers touching.
    */
    <div ref={panelRef} className="pointer-events-auto relative w-full">
      <Glass width="100%" style={{ height: PANEL_H }}>
        {/* ---------------------------------------------------- header
            One row that wraps rather than one row that scrolls. Ten controls
            do not fit a narrow window, and the old editor's answer — let them
            flow onto a second line — keeps every one of them reachable
            without a scroll gesture inside a toolbar.

            Grouped by subject with a rule between groups, which is the old
            editor's rule too: transport, then what an export is written at,
            then what the clip IS, then how it is being looked at. A gap alone
            says "these are apart"; a rule says "and they are about different
            things".
        */}
        {/*
          Centred as one group, not run from the left with the last two pushed
          right. The old editor learned this the same way: with the tail on
          `ml-auto` it read as two unrelated toolbars with a gulf between them
          rather than one set of controls for one clip.
        */}
        <div
          className="flex flex-wrap items-center justify-center"
          style={{
            minHeight: CONTROL_H + SAFE * 2,
            columnGap: SAFE,
            rowGap: SAFE,
          }}
        >
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            title={playing ? "Pause (Space)" : "Play (Space)"}
            onClick={studio.togglePlay}
            className="grid cursor-pointer place-items-center"
            style={{ width: CONTROL_H, height: CONTROL_H }}
          >
            <Glyph>{playing ? <PauseIcon /> : <PlayIcon />}</Glyph>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={studio.looping}
            aria-label="Repeat"
            title={studio.looping ? "Repeat is on" : "Repeat is off"}
            onClick={studio.toggleLoop}
            className="grid cursor-pointer place-items-center"
            style={{ width: CONTROL_H, height: CONTROL_H }}
          >
            {/* Muted when off, which is the same way every other glyph in this
                interface says "not in effect". */}
            <Glyph muted={!studio.looping}>
              <RepeatIcon />
            </Glyph>
          </button>

          {/*
            Tabular figures, because this is a clock. With proportional ones the
            string changes width as the digits change and the whole readout
            jitters sixty times a second.
          */}
          <span
            className="mo-value"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <span ref={readoutRef}>0:00.0</span>
            <span style={{ color: "var(--mo-ink-muted)" }}>
              {" "}
              / {formatTime(duration)}
            </span>
          </span>

          <Rule />

          <Labelled label="Res">
            <Segmented
              width={140}
              height={CONTROL_H}
              value={String(studio.exportScale)}
              onChange={(id) => studio.setExportScale(Number(id))}
              options={SCALES.map((n) => ({ id: String(n), label: `${n}x` }))}
            />
          </Labelled>
          <Labelled label="FPS">
            <Segmented
              width={78}
              height={CONTROL_H}
              value={String(studio.exportFps)}
              onChange={(id) => studio.setExportFps(Number(id))}
              options={RATES.map((n) => ({ id: String(n), label: String(n) }))}
            />
          </Labelled>

          <Rule />

          {/*
            A text field with a forgiving parser, not `type="number"` — that is
            where the browser's little stepper arrows come from, and in a plate
            this narrow they sit on top of the value. "90", "1:30" and
            "00:01:30" all mean ninety seconds.
          */}
          <Labelled label="Duration">
            <input
              type="text"
              inputMode="numeric"
              spellCheck={false}
              aria-label="Duration"
              value={durationDraft ?? formatClock(duration)}
              onChange={(event) => setDurationDraft(event.currentTarget.value)}
              onBlur={(event) => {
                const parsed = parseClock(event.currentTarget.value);
                // Unparseable leaves the clip alone rather than snapping it
                // somewhere the typing did not ask for.
                if (parsed !== null) studio.setDuration(parsed);
                setDurationDraft(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setDurationDraft(null);
                  event.currentTarget.blur();
                }
              }}
              /* The readout plate from the system, in its editable form: same
                 token, same corner, same figures — it just takes typing. */
              className="mo-value text-center focus:outline-none"
              style={{
                width: 82,
                height: CONTROL_H,
                borderRadius: "var(--mo-r-field)",
                background: "var(--mo-field)",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </Labelled>

          {/* The clip's default, for every span nobody has set individually.
              A key's own easing beats it — that is what the preset curves are —
              so this is the floor rather than an override. */}
          <div ref={easingRef} className="relative">
            <Button
              height={CONTROL_H}
              width={132}
              onClick={() => setEasingOpen((was) => !was)}
              title="Default easing for spans with no easing of their own"
            >
              {EASING_PRESETS.find(
                (p) => p.id === easingPresetId(animation.easing),
              )?.label ?? "Custom"}
            </Button>
            {easingOpen ? (
              /* Upwards. The panel lives at the bottom of the window, so a
                 menu opening downwards opens off the screen. */
              <div
                style={{
                  position: "absolute",
                  bottom: 34,
                  left: 0,
                  zIndex: POPUP_Z,
                }}
              >
                <EasingMenu
                  value={animation.easing}
                  onChange={studio.setEasing}
                />
              </div>
            ) : null}
          </div>

          <Rule />

          {/* Zoom, as Figma puts it: a slider at the toolbar's end. Zooming
              keeps the PLAYHEAD centred rather than the left edge, because the
              playhead is where you are working — anchoring to zero would push
              the thing you were looking at off screen every time. */}
          <Labelled label="Zoom">
            <div style={{ width: 96 }}>
              <Slider
                label="Timeline zoom"
                value={zoom}
                min={1}
                max={12}
                step={0.1}
                onChange={setZoom}
              />
            </div>
          </Labelled>
          <Button
            height={CONTROL_H}
            width={54}
            onClick={() => setZoom(1)}
            title="Fit the whole clip"
          >
            Fit
          </Button>

          <Rule />

          <span className="mo-label" style={{ color: "var(--mo-ink-muted)" }}>
            {getMotionPreset(presetId)?.label ?? presetId}
          </span>
          <Button
            height={CONTROL_H}
            width={62}
            onClick={studio.clearPreset}
            title="Remove the preset and give the pose back to the panels"
          >
            Clear
          </Button>
        </div>

        <Divider />

        {/* ------------------------------------------------ ruler + lanes */}
        {/* `min-h-0`, or the flex child refuses to shrink below its content
            and the panel grows past its 250 instead of scrolling inside it. */}
        <div
          className="mo-noscroll flex min-h-0 flex-1 overflow-y-auto"
          style={{ paddingTop: SAFE }}
        >
          <div style={{ width: LABEL_W, flex: "none" }}>
            <div style={{ height: RULER_H }} />
            {/*
              The lane's name selects the lane.

              "Drag two or three properties as one" is the whole ask, and
              picking every key on a channel by hand is the slow way to say it.
              Shift adds a second channel to what is already held, which is the
              gesture that assembles a cross-lane group in two clicks.
            */}
            {lanes.map(({ key, label }) => {
              const all = (tracks[key] ?? []).map((frame) => ({
                key,
                time: frame.time,
              }));
              const whole =
                all.length > 0 && all.every((k) => isSelected(k.key, k.time));
              return (
                <button
                  key={key}
                  type="button"
                  title={`Select every key on ${label}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    const additive = event.shiftKey || event.metaKey;
                    setSelection((was) => {
                      const rest = additive
                        ? was.filter((sel) => sel.key !== key)
                        : [];
                      return whole && additive ? rest : [...rest, ...all];
                    });
                    // A whole lane is never one key, so no menu.
                    setSelected(null);
                    setSegment(null);
                  }}
                  className="mo-label flex cursor-pointer items-center text-left"
                  style={{
                    height: LANE_H,
                    color: whole ? "var(--mo-ink)" : "var(--mo-ink-muted)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div
            ref={viewportRef}
            // Not `cursor-ew-resize` any more: that cursor promised a scrub on
            // a surface that now selects. The ruler keeps it.
            className="mo-noscroll relative flex-1 cursor-default overflow-x-auto"
            style={{ paddingInline: LEAD }}
            /*
              EVERY pointer gesture in the lanes is handled here, on the
              viewport, and not on the thing being dragged.

              It was on the diamonds, and that is where the bug came from — the
              playhead stuck to the cursor and the key would not follow it. A
              key is keyed by its own time, so the first pixel of a drag
              re-times it, React throws that element away and mounts a new one,
              and the element holding the pointer capture no longer exists. The
              rest of the gesture then lands on whatever is underneath, which is
              this box, which scrubs. The element under the pointer was never
              the right place to hold a drag that MOVES that element. This box
              outlives the whole gesture.
            */
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const hit = (event.target as HTMLElement).closest?.(
                "[data-keyframe]",
              ) as HTMLElement | null;
              if (hit) {
                const at = {
                  key: hit.dataset.channel as AnimatableKey,
                  time: Number(hit.dataset.time),
                };
                /*
                 * Three cases, and the middle one is what makes a group
                 * draggable at all.
                 *
                 * Shift or Cmd toggles a key in or out, which is how the
                 * selection gets built. A plain press on a key ALREADY in the
                 * selection keeps the selection and starts dragging it --
                 * without that, grabbing one of three selected keys would
                 * discard the other two and you could never move the group you
                 * just made. A plain press anywhere else starts over.
                 */
                const additive = event.shiftKey || event.metaKey;
                const already = isSelected(at.key, at.time);
                const next = additive
                  ? already
                    ? selection.filter(
                        (sel) =>
                          !(
                            sel.key === at.key &&
                            Math.abs(sel.time - at.time) < 1e-6
                          ),
                      )
                    : [...selection, at]
                  : already
                    ? selection
                    : [at];
                setSelection(next);
                dragRef.current = { ...at, items: next };
                // Measured here rather than read off a ref during render: the
                // menu hangs off the panel and has to know where the mark it
                // belongs to sits along it.
                const panel =
                  event.currentTarget.closest(".mo-glass")?.parentElement;
                const box = panel?.getBoundingClientRect();
                const mark = hit.getBoundingClientRect();
                // The menu is about ONE key, so it only opens when one is
                // selected -- and never for the key a Shift-press just removed.
                setSelected(
                  next.length === 1 && (!additive || !already)
                    ? {
                        ...at,
                        x: box ? mark.left + mark.width / 2 - box.left : 0,
                        panelW: box?.width ?? 0,
                      }
                    : null,
                );
                // Never both at once — see `KeyframeMenu`.
                setSegment(null);
                return;
              }
              /*
               * Off a key: the ruler scrubs, the lanes select.
               *
               * This split is the whole of it. The playhead is still draggable
               * -- from the strip that is ABOUT time -- and pressing among the
               * keys no longer moves it.
               */
              const laneBox = laneRef.current?.getBoundingClientRect();
              const localY = laneBox ? event.clientY - laneBox.top : 0;
              if (laneBox && localY > RULER_H) {
                const additive = event.shiftKey || event.metaKey;
                marqueeRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  base: additive ? selection : [],
                };
                if (!additive) setSelection([]);
                setSelected(null);
                setSegment(null);
                setMarquee({
                  left: event.clientX - laneBox.left,
                  top: localY,
                  width: 0,
                  height: 0,
                });
                return;
              }
              setSelected(null);
              setSelection([]);
              scrubRef.current = true;
              scrubTo(event.clientX);
            }}
            onPointerMove={(event) => {
              if (!event.buttons) return;
              const lasso = marqueeRef.current;
              if (lasso) {
                const laneBox = laneRef.current?.getBoundingClientRect();
                if (!laneBox) return;
                const t0 = timeAt(lasso.x);
                const t1 = timeAt(event.clientX);
                if (t0 === null || t1 === null) return;
                setMarquee({
                  left: Math.min(lasso.x, event.clientX) - laneBox.left,
                  top: Math.min(lasso.y, event.clientY) - laneBox.top,
                  width: Math.abs(event.clientX - lasso.x),
                  height: Math.abs(event.clientY - lasso.y),
                });
                // Recomputed from the box every move rather than accumulated,
                // so shrinking it takes keys back out again.
                const inside = keysInBox(
                  t0,
                  t1,
                  lasso.y - laneBox.top,
                  event.clientY - laneBox.top,
                );
                const merged = [...lasso.base];
                for (const found of inside)
                  if (
                    !merged.some(
                      (sel) =>
                        sel.key === found.key &&
                        Math.abs(sel.time - found.time) < 1e-6,
                    )
                  )
                    merged.push(found);
                setSelection(merged);
                return;
              }
              const drag = dragRef.current;
              if (!drag) {
                // Only ever after a press that landed on the ruler.
                if (scrubRef.current) scrubTo(event.clientX);
                return;
              }
              const asked = timeAt(event.clientX);
              if (asked === null) return;
              const delta = clampGroupDelta(drag.items, asked - drag.time);
              if (Math.abs(delta) < 1e-6) return;
              /*
               * Order matters, per lane, and getting it wrong eats keys.
               *
               * `moveKey` clamps a key against its neighbours, so moving a key
               * RIGHT into a slot its selected neighbour has not vacated yet
               * would be blocked by that neighbour and the group would bunch
               * up. Moving the rightmost first means every key always lands in
               * space that is already clear. Leftwards is the mirror of it.
               */
              const lanesMoved = new Map<
                AnimatableKey,
                Array<{ key: AnimatableKey; time: number }>
              >();
              for (const item of drag.items) {
                const list = lanesMoved.get(item.key);
                if (list) list.push(item);
                else lanesMoved.set(item.key, [item]);
              }
              for (const [, group] of lanesMoved) {
                const ordered = [...group].sort((a, b) =>
                  delta > 0 ? b.time - a.time : a.time - b.time,
                );
                for (const item of ordered)
                  studio.moveKey(item.key, item.time, item.time + delta);
              }
              // Everything that tracks a key by its time is re-based, so the
              // next move of the same gesture finds them where they now are.
              const moved = drag.items.map((item) => ({
                key: item.key,
                time: item.time + delta,
              }));
              dragRef.current = {
                key: drag.key,
                time: drag.time + delta,
                items: moved,
              };
              setSelection(moved);
              const lane = laneRef.current?.getBoundingClientRect();
              const box = event.currentTarget
                .closest(".mo-glass")
                ?.parentElement?.getBoundingClientRect();
              setSelected((was) =>
                was && lane && box
                  ? {
                      key: was.key,
                      time: was.time + delta,
                      // Follows the mark, so the menu travels with the key it
                      // is about rather than staying where the drag started.
                      x:
                        lane.left +
                        ((was.time + delta) / Math.max(0.001, duration)) *
                          lane.width -
                        box.left,
                      panelW: box.width,
                    }
                  : was,
              );
            }}
            onPointerUp={() => {
              dragRef.current = null;
              marqueeRef.current = null;
              scrubRef.current = false;
              setMarquee(null);
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              marqueeRef.current = null;
              scrubRef.current = false;
              setMarquee(null);
            }}
          >
            {/*
              Zoom is width, and nothing else has to know about it. Everything
              inside is placed as a PERCENTAGE of this box — ticks, keys, the
              playhead — so making it twelve times as wide spreads them all out
              and the maths is untouched. Only `scrubTo` reads a pixel, and it
              reads THIS box's rect, which moves with the scroll on its own.

              `minHeight: 100%` so the playhead can run the full height of the
              panel rather than stopping at the last lane.
            */}
            <div
              ref={laneRef}
              className="relative"
              style={{ width: `${zoom * 100}%`, minHeight: "100%" }}
            >
              <div
                className="relative cursor-ew-resize"
                style={{ height: RULER_H }}
              >
                {ticks.map((t) => (
                  <span
                    key={t}
                    className="mo-code absolute select-none"
                    style={{
                      left: `${(t / Math.max(0.001, duration)) * 100}%`,
                      // Nudged in rather than centred: the first and last tick
                      // would hang off the ends of the panel otherwise.
                      transform:
                        t === 0
                          ? "none"
                          : t >= duration - 1e-6
                            ? "translateX(-100%)"
                            : "translateX(-50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {Number(t.toFixed(2))}s
                  </span>
                ))}
              </div>

              {lanes.map(({ key }) => {
                const keys = tracks[key] ?? [];
                return (
                  <div
                    key={key}
                    className="relative flex items-center"
                    style={{ height: LANE_H }}
                  >
                    <div
                      className="w-full"
                      style={{
                        height: 6,
                        borderRadius: radius.field,
                        background: "var(--mo-field)",
                      }}
                    />

                    {/*
                      The easing marker for each SPAN, sitting between the two
                      keys it belongs to.

                      This is the in-between editor. A span is where easing
                      actually lives — a key is a pose, the curve is how you
                      leave it — so the control for it belongs between the two
                      marks rather than in one menu that says "everything".
                      The glyph is plotted from `easingCurve`, so it shows what
                      the span does rather than what it was meant to do.
                    */}
                    {keys.slice(0, -1).map((from, i) => {
                      const to = keys[i + 1];
                      const mid = (from.time + to.time) / 2;
                      const open =
                        segment?.key === key &&
                        Math.abs(segment.time - from.time) < 1e-6;
                      return (
                        <button
                          key={`${from.time}-span`}
                          type="button"
                          title={`Easing from ${formatTime(from.time)} to ${formatTime(to.time)}`}
                          // The lane below must not take this as a scrub.
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            const panel =
                              panelRef.current?.getBoundingClientRect();
                            const tile =
                              event.currentTarget.getBoundingClientRect();
                            setSegment(
                              open || !panel
                                ? null
                                : {
                                    key,
                                    time: from.time,
                                    // Both measured at the click, so the clamp
                                    // below needs no ref during render.
                                    x: tile.left + tile.width / 2 - panel.left,
                                    panelW: panel.width,
                                  },
                            );
                          }}
                          className="absolute grid cursor-pointer place-items-center"
                          style={{
                            left: `${(mid / Math.max(0.001, duration)) * 100}%`,
                            top: "50%",
                            width: MARK,
                            height: MARK,
                            marginLeft: -MARK / 2,
                            marginTop: -MARK / 2,
                            borderRadius: 6,
                            background: "var(--mo-field)",
                            // The selection ring, in this chrome's ink rather
                            // than the old editor's blue.
                            boxShadow: open
                              ? "0 0 0 1.5px var(--mo-ink)"
                              : "none",
                          }}
                        >
                          <CurveThumb
                            easing={from.easing ?? animation.easing}
                            active={open}
                          />
                        </button>
                      );
                    })}

                    {keys.map((frame) => {
                      const on = isSelected(key, frame.time);
                      return (
                        <span
                          key={frame.time}
                          data-keyframe
                          data-channel={key}
                          data-time={frame.time}
                          role="button"
                          tabIndex={-1}
                          title={`${formatTime(frame.time)} — ${frame.value}\nDrag to move, double-click to delete`}
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            studio.deleteKey(key, frame.time);
                          }}
                          className="absolute cursor-ew-resize"
                          style={{
                            left: `${(frame.time / Math.max(0.001, duration)) * 100}%`,
                            top: "50%",
                            width: MARK,
                            height: MARK,
                            marginLeft: -MARK / 2,
                            marginTop: -MARK / 2,
                            /*
                              The frame's own diamond, as a MASK rather than an
                              image: the asset ships `fill="white"` because it
                              is a shape and not artwork, so tinting it with the
                              ink token is what makes it the same mark as every
                              other glyph on the page. Hollow at rest, solid
                              when selected — the pair the frame draws.
                            */
                            background: on
                              ? "var(--mo-ink)"
                              : "var(--mo-ink-muted)",
                            WebkitMaskImage: `url(${KEYFRAMES}/${on ? "keyframe-selected" : "keyframe"}.svg)`,
                            maskImage: `url(${KEYFRAMES}/${on ? "keyframe-selected" : "keyframe"}.svg)`,
                            WebkitMaskSize: "contain",
                            maskSize: "contain",
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {marquee && (marquee.width > 1 || marquee.height > 1) ? (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: marquee.left,
                    top: marquee.top,
                    width: marquee.width,
                    height: marquee.height,
                    border: "1px solid var(--mo-ink)",
                    background: "color-mix(in srgb, var(--mo-ink) 10%, transparent)",
                    borderRadius: 2,
                    zIndex: 2,
                  }}
                />
              ) : null}

              {/*
                Runs the FULL height of the panel, not as far as the last lane.
                A playhead that stops where the tracks happen to end reads as
                cropped — and it is a statement about the whole clip, not about
                the rows that have keys in them.

                Painted by the rAF loop above rather than by React: `left: 0`
                plus a transform means the loop writes one property and touches
                no layout.
              */}
              <div
                ref={markerRef}
                className="pointer-events-none absolute"
                style={{ left: 0, top: 0, bottom: 0 }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "var(--mo-ink)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 7,
                    height: 7,
                    marginLeft: -3,
                    borderRadius: 2,
                    background: "var(--mo-ink)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Glass>

      {/*
        The menus hang OFF the panel, so they live outside it.

        They were inside the `Glass`, and that is what was eating the lanes.
        A `Glass` is a flex column; the lanes row takes what is left of its 250
        with `flex-1`; and an absolutely positioned child should take nothing at
        all — but any slip that leaves one in flow hands it a share of that 250
        and squeezes the lanes to a sliver. Which is exactly what the symptom
        was: the taller menu left fewer lanes, and the tallest left none.

        Out here they are positioned against the panel wrapper instead, land in
        the same place on screen, and cannot cost the panel its layout however
        they are styled.
      */}
      {selected && selection.length === 1 && !segment ? (
        /* Same shelf as the span menu, same clamp, and never both at once —
           they are two views of the same mark and stacking them would put
           one over the lane the other is about. */
        <div
          style={{
            // Stated, not classed. This is the property whose absence squeezed
            // the lanes, so it does not get to depend on a utility class being
            // generated.
            position: "absolute",
            left: Math.max(
              0,
              Math.min(
                selected.panelW - control.panelW,
                selected.x - control.panelW / 2,
              ),
            ),
            bottom: PANEL_H + SAFE,
            zIndex: POPUP_Z,
          }}
        >
          {(() => {
            const keys = tracks[selected.key] ?? [];
            const frame = keys.find(
              (k) => Math.abs(k.time - selected.time) < 1e-6,
            );
            // The key can go while its menu is open — a Delete, an undo, a
            // preset swap — and the menu goes with it rather than rendering
            // the last thing it saw.
            if (!frame) return null;
            return (
              <KeyframeMenu
                channel={selected.key}
                label={
                  ANIMATABLE.find((a) => a.key === selected.key)?.label ??
                  selected.key
                }
                frame={frame}
                duration={duration}
                easing={frame.easing ?? animation.easing}
                onValue={(value) =>
                  studio.setKeyValue(selected.key, frame.time, value)
                }
                onTime={(asked) => {
                  const time = settleTime(selected.key, frame.time, asked);
                  if (time === null) return;
                  studio.moveKey(selected.key, frame.time, time);
                  setSelected({ ...selected, time });
                  setSelection([{ key: selected.key, time }]);
                }}
                onEasing={() =>
                  setSegment({
                    key: selected.key,
                    time: frame.time,
                    x: selected.x,
                    panelW: selected.panelW,
                  })
                }
                onDelete={() => {
                  studio.deleteKey(selected.key, frame.time);
                  setSelected(null);
                  setSelection([]);
                }}
              />
            );
          })()}
        </div>
      ) : null}

      {segment ? (
        /*
          Above the panel, not inside the lane it belongs to: the lanes live
          in a horizontal scroller, and a menu opened in there is clipped by
          it the moment it is wider than the span. Clamped to the panel so a
          span near either end still opens a whole menu.
        */
        <div
          style={{
            // Stated, not classed. This is the property whose absence squeezed
            // the lanes, so it does not get to depend on a utility class being
            // generated.
            position: "absolute",
            left: Math.max(
              0,
              Math.min(
                segment.panelW - control.panelW,
                segment.x - control.panelW / 2,
              ),
            ),
            bottom: PANEL_H + SAFE,
            zIndex: POPUP_Z,
          }}
        >
          <EasingMenu
            value={
              (tracks[segment.key] ?? []).find(
                (k) => Math.abs(k.time - segment.time) < 1e-6,
              )?.easing ?? animation.easing
            }
            onChange={(easing) =>
              studio.setKeyEasing(segment.key, segment.time, easing)
            }
          />
        </div>
      ) : null}
    </div>
  );
}
