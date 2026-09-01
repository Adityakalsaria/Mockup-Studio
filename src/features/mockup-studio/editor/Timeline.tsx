"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ANIMATABLE,
  formatTime,
  type AnimatableKey,
  type Animation,
  formatClock,
  parseClock,
} from "../animation";
import { type Easing } from "../animation";
import { Icon } from "./icons";
import { EasingPicker } from "./EasingPicker";

/**
 * The keyframe timeline.
 *
 * Keys are added from the diamond on each parameter row, not from here —
 * that is the only place where "this property, at this value" is already on
 * screen. This panel is for the other half: seeing when things happen, and
 * moving around in time.
 */

/* Wide enough for a property name to sit on one line at 13px, which is what
   lets the gutter read as a column rather than as a cramped margin. */
/** Half a second is the shortest clip worth keying; an hour is well past what
    anyone will export frame by frame, and it is what makes the HH field mean
    something. */
const DURATION_MIN = 0.5;
const DURATION_MAX = 3600;

const LABEL_WIDTH = 132;
/* Figma's track rows. Tall enough to hold a bar with a label inside it. */
const LANE_H = 26;
/** Breathing room at each end of the time axis, so the playhead at 0 and at the
    duration is fully inside the lane rather than half over its edge. */
const LEAD = 10;

/** Between toolbar groups. A gap alone says "these are apart"; a rule says
    "and they are about different things". */
function Divider() {
  return (
    <span
      aria-hidden
      className="h-[18px] w-px shrink-0"
      style={{ background: "var(--ks-line)" }}
    />
  );
}

export function Timeline({
  animation,
  playhead,
  playing,
  onSeek,
  onTogglePlay,
  onDurationChange,
  onMoveKey,
  onRemoveKey,
  onSetKeyEasing,
  onClose,
  onClear,
  onScrubbingChange,
  onEasingChange,
  exportFps,
  onExportFpsChange,
  exportScale,
  onExportScaleChange,
  sourceLength,
  sourceStart,
  onSourceStartChange,
  onSourceLengthChange,
  clipName,
}: {
  animation: Animation;
  playhead: number;
  playing: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onDurationChange: (seconds: number) => void;
  onMoveKey: (property: AnimatableKey, from: number, to: number) => void;
  onRemoveKey: (property: AnimatableKey, time: number) => void;
  onSetKeyEasing: (property: AnimatableKey, time: number, easing: Easing) => void;
  onClose: () => void;
  onClear: () => void;
  /** True for the duration of a playhead drag, so the stage can stop easing. */
  onScrubbingChange: (active: boolean) => void;
  onEasingChange: (easing: Easing) => void;
  exportFps: number;
  onExportFpsChange: (fps: number) => void;
  /** Export resolution as a multiple of the on-screen canvas. */
  exportScale: number;
  onExportScaleChange: (scale: number) => void;
  /** Seconds the source occupies: a video's own duration, or one second for a
      still, which is a length you can see and later drag rather than a zero
      that draws nothing. */
  sourceLength: number;
  /** Where the source layer begins, in seconds. */
  sourceStart: number;
  onSourceStartChange: (start: number) => void;
  onSourceLengthChange: (length: number) => void;
  clipName: string;
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<number | null>(null);
  /* 1 is fit-to-width. Above that the lane grows past its container and the
     wrapper scrolls, which is why nothing else here needs to know about zoom:
     `pct` is a fraction of the LANE, and the lane is what changes size. */
  const [zoom, setZoom] = useState(1);

  // One seek per animation frame, latest position wins. A pointermove can
  // fire several times between paints, and each one previously became its own
  // React update — re-rendering every row in the panel to show a playhead
  // position that was about to be replaced before anything drew.
  const seekRaf = useRef(0);
  const seekTo = useRef(0);
  const queueSeek = (time: number) => {
    seekTo.current = time;
    if (seekRaf.current) return;
    seekRaf.current = requestAnimationFrame(() => {
      seekRaf.current = 0;
      onSeek(seekTo.current);
    });
  };
  const [layerDrag, setLayerDrag] = useState<{ mode: "move" | "resize"; grab: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState<{ property: AnimatableKey; from: number } | null>(
    null,
  );

  /** The keyframe the delete key acts on. */
  /** Held while typing, so a half-entered time is not parsed on every keystroke. */
  const [durationDraft, setDurationDraft] = useState<string | null>(null);
  const [pickedKey, setSelectedKey] = useState<{ property: AnimatableKey; time: number } | null>(
    null,
  );

  // Derived, not mirrored. A selected keyframe stops existing the moment it is
  // deleted or dragged to a new time, and clearing that from an effect would
  // mean a setState in the effect body and a second render every time. Reading
  // it through the track instead means a stale pick simply resolves to null.
  const selectedKey = useMemo(() => {
    if (!pickedKey) return null;
    const exists = (animation.tracks[pickedKey.property] ?? []).some(
      (k) => k.time === pickedKey.time,
    );
    return exists ? pickedKey : null;
  }, [pickedKey, animation.tracks]);

  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const el = event.target as HTMLElement | null;
      // Backspace is destructive in a field and means something else there.
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      event.preventDefault();
      onRemoveKey(selectedKey.property, selectedKey.time);
      setSelectedKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedKey, onRemoveKey]);

  const { durationSec } = animation;
  const timeFromClientX = (clientX: number) => {
    const rect = laneRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    // The axis is inset, so the usable width is the element minus both leads.
    const axis = Math.max(1, rect.width - LEAD * 2);
    const fraction = (clientX - rect.left - LEAD) / axis;
    return Math.max(0, Math.min(durationSec, fraction * durationSec));
  };
  /**
   * Change zoom while keeping the playhead where it is on screen.
   *
   * Zooming about the left edge is the obvious implementation and the wrong
   * one: the moment you zoom in, whatever you were looking at slides off to
   * the right and you have to go and find it again.
   */
  const zoomAround = (next: number) => {
    const clamped = Math.max(1, Math.min(12, next));
    // Recorded here, applied after the lane has actually resized. Setting
    // scrollLeft in this handler looks right and is not: the lane is still at
    // its old width, so the browser clamps the value to the old maximum and
    // the view lands short.
    pendingScroll.current = clamped;
    setZoom(clamped);
  };

  useLayoutEffect(() => {
    const target = pendingScroll.current;
    const scroller = scrollRef.current;
    if (target === null || !scroller) return;
    pendingScroll.current = null;
    const laneWidth = scroller.clientWidth * target;
    const playheadX = (playhead / Math.max(0.001, durationSec)) * laneWidth;
    scroller.scrollLeft = playheadX - scroller.clientWidth / 2;
  }, [zoom, playhead, durationSec]);

  /**
   * A moment, as a position in the lane.
   *
   * The axis is inset by LEAD on both sides rather than running edge to edge.
   * At zero the playhead sat exactly on the lane's left boundary, so its tab
   * and the 0s label were half outside the element and clipped — the first
   * frame of every animation was the one you could not see. The same at the
   * far end for the last.
   *
   * `span` is the width of a DURATION rather than the position of a moment,
   * so it scales by the axis length without the lead offset. Using `at` for a
   * width would push every bar right by 10px.
   */
  const at = (time: number) =>
    `calc(${LEAD}px + (100% - ${LEAD * 2}px) * ${
      Math.max(0, Math.min(1, time / Math.max(0.001, durationSec)))
    })`;
  const span = (seconds: number) =>
    `calc((100% - ${LEAD * 2}px) * ${
      Math.max(0, Math.min(1, seconds / Math.max(0.001, durationSec)))
    })`;

  // A tick roughly every 60px, rounded to something a person would count in.
  // The span the ruler has to label is the duration divided by the zoom: at 4x
  // only a quarter of the timeline is on screen, so quarter-second ticks are
  // readable where whole seconds would leave the ruler nearly empty.
  const visible = durationSec / zoom;
  const step = visible <= 1 ? 0.1 : visible <= 2 ? 0.25 : visible <= 6 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= durationSec + 1e-6; t += step) ticks.push(Number(t.toFixed(3)));

  const tracks = ANIMATABLE.filter(({ key }) => (animation.tracks[key]?.length ?? 0) > 0);

  return (
    <div
      // Fixed height, whatever is in it.
      //
      // The timeline grew a row per animated property, so keying a sixth
      // pushed it past the bottom of the window and took the last lane with
      // it. A tool's chrome should not change size because of what you are
      // working on: the lanes scroll inside it now, and the transport stays
      // where you left it.
      className="ks-material relative z-30 flex h-[156px] shrink-0 flex-col gap-[8px] rounded-[var(--ks-r-panel)] px-[12px] py-[8px] laptop:h-[var(--ks-timeline-h)]"
      style={{
        background: "var(--ks-surface)",
      }}
    >
      {/* The toolbar, in groups.
          It was nine controls in one flat row at a single gap, so nothing
          said which of them belonged together and the whole strip read as
          small print. Now: transport, then motion, then output, then view —
          tight inside a group, wide between them, with a hairline where the
          subject changes. */}
      {/* Pinned rather than placed in the toolbar row: the toolbar is centred,
          and adding a control to one end of it would push everything off
          centre by half a button. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close timeline"
        title="Close timeline (T)"
        className="ks-press absolute right-[10px] top-[8px] z-10 grid h-[24px] w-[24px] place-items-center rounded-full"
        style={{ color: "var(--ks-text-dim)" }}
      >
        <Icon name="dismiss" />
      </button>

      {/* Centred as one group.
          It used to run from the left edge with the easing and zoom controls
          pushed to the right by `ml-auto`, which read as two unrelated
          toolbars with a gulf between them rather than one set of transport
          controls. */}
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-y-[var(--ks-space-2)] gap-x-[var(--ks-space-4)]">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-[24px] w-[24px] place-items-center rounded-[var(--ks-r-sm)]"
          style={{ background: "var(--ks-accent)", color: "var(--ks-accent-text)" }}
        >
          {playing ? (
            <Icon name="pause" />
          ) : (
            <Icon name="play" />
          )}
        </button>

        <span
          className="ks-value tabular-nums"
          style={{ color: "var(--ks-text)", fontVariantNumeric: "tabular-nums" }}
        >
          {formatTime(playhead)} / {formatTime(durationSec)}
        </span>

        <Divider />

        <label className="ks-micro flex items-center gap-[var(--ks-space-2)]" style={{ color: "var(--ks-text-muted)" }}>
          Res
          <select
            value={exportScale}
            onChange={(event) => onExportScaleChange(Number(event.currentTarget.value))}
            className="ks-label rounded-[var(--ks-r)] px-[var(--ks-space-3)] py-[var(--ks-space-1)] focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
          </select>
        </label>

        <label className="ks-micro flex items-center gap-[var(--ks-space-2)]" style={{ color: "var(--ks-text-muted)" }}>
          FPS
          <select
            value={exportFps}
            onChange={(event) => onExportFpsChange(Number(event.currentTarget.value))}
            className="ks-label rounded-[var(--ks-r)] px-[var(--ks-space-3)] py-[var(--ks-space-1)] focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>

        <Divider />

        {/* Duration as HH:MM:SS.
            It was `type="number"`, which is where the little stepper arrows
            came from: they are drawn by the browser inside the field, so they
            sat on top of the value in a pill this narrow. A text field with a
            forgiving parser does the same job without them -- "90", "1:30" and
            "00:01:30" all mean ninety seconds. */}
        <label className="ks-micro flex items-center gap-[var(--ks-space-2)]" style={{ color: "var(--ks-text-muted)" }}>
          Duration
          <input
            type="text"
            inputMode="numeric"
            spellCheck={false}
            aria-label="Duration"
            value={durationDraft ?? formatClock(durationSec)}
            onChange={(event) => setDurationDraft(event.currentTarget.value)}
            onBlur={(event) => {
              const parsed = parseClock(event.currentTarget.value);
              // Unparseable or out of range leaves the clip alone rather than
              // snapping it somewhere the typing did not ask for.
              if (parsed !== null) {
                onDurationChange(Math.min(DURATION_MAX, Math.max(DURATION_MIN, parsed)));
              }
              setDurationDraft(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDurationDraft(null);
                event.currentTarget.blur();
              }
            }}
            className="ks-label w-[74px] rounded-[var(--ks-r)] px-[var(--ks-space-3)] py-[var(--ks-space-1)] text-center focus:outline-none"
            style={{
              background: "var(--ks-ctl)",
              color: "var(--ks-ctl-text)",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </label>

        {/* Zoom, as Figma puts it: a slider at the toolbar's end, with the
            keyboard's usual pair beside it. Zooming keeps the PLAYHEAD
            centred rather than the left edge, because the playhead is where
            you are working — anchoring to zero would push the thing you were
            looking at off screen every time you zoomed in. */}

        {/* The clip's default, for spans nobody has set individually. The
            markers on the segments themselves override it. */}
        <div className="flex items-center gap-[var(--ks-space-2)]">
          <EasingPicker value={animation.easing} onChange={onEasingChange} />
        </div>

        <Divider />

        <label className="ks-micro flex items-center gap-[var(--ks-space-2)]" style={{ color: "var(--ks-text-muted)" }}>
          Zoom
          <input
            type="range"
            min={1}
            max={12}
            step={0.1}
            value={zoom}
            aria-label="Timeline zoom"
            onChange={(event) => zoomAround(Number(event.currentTarget.value))}
            className="h-[4px] w-[72px] cursor-ew-resize appearance-none rounded-full"
            style={{ background: "var(--ks-ctl-fill)", accentColor: "var(--ks-accent)" }}
          />
        </label>

        <button
          type="button"
          onClick={() => zoomAround(1)}
          disabled={zoom === 1}
          title="Fit the whole timeline"
          className="ks-press ks-label rounded-[var(--ks-r)] px-[var(--ks-space-3)] py-[var(--ks-space-1)] disabled:opacity-40"
          style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
        >
          Fit
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!tracks.length}
          className="ks-press ks-label rounded-[var(--ks-r)] px-[var(--ks-space-3)] py-[var(--ks-space-1)] disabled:opacity-40"
          style={{ background: "var(--ks-badge)", color: "var(--ks-text-dim)" }}
        >
          Clear
        </button>
      </div>

      {/* Ruler + lanes. One scrub surface: pointer anywhere in here seeks, so
          the playhead follows the cursor rather than only the thin line. */}
      <div
        data-lenis-prevent
        className="ks-scroll-hidden flex min-h-0 flex-1 items-stretch overflow-y-auto"
      >
        {/* The name gutter is its own column with a divider, rather than
            labels hung off the left edge of the lane. That divider is what
            makes a timeline read as two synchronised halves — names here,
            time there — instead of as a chart with captions. */}
        <div
          style={{ width: LABEL_WIDTH, borderColor: "var(--ks-line)" }}
          className="shrink-0 border-r"
        >
          <div
            className="sticky top-0 z-20 h-[16px]"
            style={{ background: "var(--ks-surface)" }}
          />
          {sourceLength > 0 ? <div className="mb-[4px] h-[26px]" /> : null}
          {tracks.map(({ key, label }) => (
            <div
              key={key}
              className="ks-label flex items-center truncate pr-[12px]"
              style={{ height: LANE_H, color: "var(--ks-text-dim)" }}
            >
              {label}
            </div>
          ))}
        </div>
        {/* The lane scrolls horizontally; the gutter does not, so the names
            stay put while time moves under them. Lenis has to be told to keep
            its hands off, as it does with the panels. */}
        <div
          ref={scrollRef}
          data-lenis-prevent
          className="ks-scroll-hidden min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
        >
        <div
          ref={laneRef}
          // min-h-full so the lane fills the scroller rather than stopping at
          // its last track. The playhead is `h-full` of this element, so with
          // three properties keyed the line ended three rows down and left the
          // rest of the timeline unmarked — and the scrub surface stopped
          // there too, which is the part that actually mattered.
          className="relative min-h-full select-none"
          style={{ width: `${zoom * 100}%` }}
          onPointerDown={(event) => {
            if (dragging || layerDrag) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            onScrubbingChange(true);
            queueSeek(timeFromClientX(event.clientX));
          }}
          onPointerMove={(event) => {
            if (layerDrag) {
              const at = timeFromClientX(event.clientX);
              if (layerDrag.mode === "move") {
                // Clamped so a layer cannot be dragged off the front of the
                // timeline, where it would be unreachable.
                onSourceStartChange(
                  Math.max(0, Math.min(durationSec - 0.1, at - layerDrag.grab)),
                );
              } else {
                onSourceLengthChange(Math.max(0.1, at - sourceStart));
              }
              return;
            }
            if (dragging) {
              onMoveKey(dragging.property, dragging.from, timeFromClientX(event.clientX));
              setDragging({ property: dragging.property, from: timeFromClientX(event.clientX) });
              return;
            }
            if (event.buttons === 1) queueSeek(timeFromClientX(event.clientX));
          }}
          onPointerUp={() => {
            setDragging(null);
            setLayerDrag(null);
            onScrubbingChange(false);
          }}
          onPointerCancel={() => {
            setDragging(null);
            setLayerDrag(null);
            onScrubbingChange(false);
          }}
        >
          {/* Ruler.
              Sticky, because it lives inside the vertical scroller with the
              lanes — without this it scrolls away the moment there are more
              tracks than fit, and the times go with it. */}
          <div
            className="sticky top-0 z-20 h-[16px]"
            style={{ background: "var(--ks-surface)" }}
          >
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 flex h-full flex-col items-start"
                style={{ left: at(t) }}
              >
                <span className="h-[5px] w-px" style={{ background: "var(--ks-line-strong)" }} />
                <span
                  className="ks-micro -translate-x-1/2 pl-[4px]"
                  style={{ color: "var(--ks-text-faint)" }}
                >
                  {t}s
                </span>
              </span>
            ))}
          </div>

          {/* The source, as a bar the length of the thing it is.
              It used to be a filmstrip — ten decoded thumbnails stretched
              across the lane. They looked like information and were not: at
              this height a frame is forty pixels of mush, and reading them
              meant looking at a strip of colour smears rather than at the one
              fact the row carries, which is how long the clip runs and where
              it sits against the keys.
              Now it is drawn like a track bar, because it IS one — a span of
              time with a name on it. */}
          {sourceLength > 0 ? (
            <div className="relative mb-[4px] h-[26px]">
              <span
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  // The grab offset is kept so the bar does not jump its own
                  // left edge to the cursor the moment you touch it.
                  setLayerDrag({
                    mode: "move",
                    grab: timeFromClientX(event.clientX) - sourceStart,
                  });
                }}
                className="absolute inset-y-[3px] flex cursor-grab items-center overflow-hidden rounded-[var(--ks-r-menu-item)] px-[8px]"
                style={{
                  left: at(sourceStart),
                  width: span(Math.min(sourceLength, Math.max(0, durationSec - sourceStart))),
                  background: "var(--ks-row-strong)",
                  boxShadow: "inset 0 0 0 1px var(--ks-line-strong)",
                }}
              >
                <span className="ks-micro truncate" style={{ color: "var(--ks-text-dim)" }}>
                  {clipName} · {formatTime(sourceLength)}
                </span>
              </span>
              {/* The right edge, for length. Its own handle rather than a hot
                  zone on the bar: a bar you can both move and resize needs the
                  two to be visibly different things, or every drag is a guess
                  about which one you asked for. */}
              <span
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setLayerDrag({ mode: "resize", grab: 0 });
                }}
                className="absolute inset-y-[3px] w-[10px] cursor-ew-resize rounded-r-[var(--ks-r-menu-item)]"
                style={{
                  left: `calc(${at(
                    sourceStart + Math.min(sourceLength, Math.max(0, durationSec - sourceStart)),
                  )} - 10px)`,
                  background: "var(--ks-line-strong)",
                  opacity: 0.5,
                }}
              />
            </div>
          ) : null}

          {/* Lanes.
              A track is drawn as a BAR spanning its first key to its last,
              the way Figma draws one, rather than as loose diamonds on a
              hairline. The bar is the useful object: it says at a glance how
              long a property is animated for and where it sits against the
              others, which a row of dots on a rule does not. The diamonds
              still sit on top of it, because they are what you grab. */}
          {tracks.length ? (
            tracks.map(({ key, label }) => {
              const keys = animation.tracks[key] ?? [];
              const first = keys.length ? keys[0].time : 0;
              const last = keys.length ? keys[keys.length - 1].time : 0;
              const spans = keys.length > 1 && last > first;
              return (
              <div
                key={key}
                className="relative"
                style={{ height: LANE_H }}
              >
                <span
                  className="absolute inset-x-0 inset-y-[3px] rounded-[var(--ks-r-menu-item)]"
                  style={{ background: "var(--ks-row)" }}
                />
                {spans ? (
                  <span
                    className="absolute inset-y-[3px] flex items-center overflow-hidden rounded-[var(--ks-r-menu-item)] px-[8px]"
                    style={{
                      left: at(first),
                      width: span(last - first),
                      background: "var(--ks-accent-wash)",
                      boxShadow: "inset 0 0 0 1px var(--ks-accent-line)",
                    }}
                  >
                    <span
                      className="ks-micro truncate"
                      style={{ color: "var(--ks-accent)" }}
                    >
                      {label}
                    </span>
                  </span>
                ) : null}
                {/* One marker per span, on the line between its two keys.
                    The curve it shows IS the curve that span runs on, so the
                    interpolation is readable without selecting anything, and
                    clicking it edits that span and only that span. */}
                {(animation.tracks[key] ?? []).slice(0, -1).map((k, index) => {
                  const next = (animation.tracks[key] ?? [])[index + 1];
                  const mid = (k.time + next.time) / 2;
                  return (
                    <span key={`seg-${k.time}`}>
                      <span
                        aria-hidden
                        className="absolute top-1/2 h-[1.5px] -translate-y-1/2 rounded-full"
                        style={{
                          left: at(k.time),
                          width: span(next.time - k.time),
                          background: "var(--ks-accent)",
                          opacity: 0.45,
                        }}
                      />
                      <span
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: at(mid) }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <EasingPicker
                          variant="marker"
                          value={k.easing ?? animation.easing}
                          onChange={(easing) => onSetKeyEasing(key, k.time, easing)}
                        />
                      </span>
                    </span>
                  );
                })}
                {(animation.tracks[key] ?? []).map((k) => (
                  <button
                    key={k.time}
                    type="button"
                    title={`${label} @ ${formatTime(k.time)} — drag to move, delete key or double-click to remove`}
                    aria-label={`${label} keyframe at ${formatTime(k.time)}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedKey({ property: key, time: k.time });
                      setDragging({ property: key, from: k.time });
                      onSeek(k.time);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      onRemoveKey(key, k.time);
                    }}
                    className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1.5px]"
                    style={{
                      left: at(k.time),
                      background: "var(--ks-accent)",
                      // Selected reads as a ring rather than a colour change:
                      // the diamond is 9px, and at that size a second accent
                      // is a smudge where an outline is still a shape.
                      boxShadow:
                        selectedKey?.property === key && selectedKey.time === k.time
                          ? "0 0 0 1.5px var(--ks-surface), 0 0 0 3.5px var(--ks-accent)"
                          : "0 0 0 1.5px var(--ks-surface)",
                    }}
                  />
                ))}
              </div>
              );
            })
          ) : (
            <div className="ks-micro py-[8px]" style={{ color: "var(--ks-text-faint)" }}>
              Press the ◆ beside any camera value to key it at the playhead.
            </div>
          )}

          {/* Playhead, drawn over everything and ignoring pointers so it never
              gets in the way of grabbing a keyframe underneath it.
              Above the sticky ruler's z-20, not below it: at z-10 the ruler
              and anything else that had earned a stacking context painted
              over the line, so it disappeared behind the track bars. */}
          <span
            className="pointer-events-none absolute top-0 z-30 h-full w-px"
            style={{ left: at(playhead), background: "var(--ks-accent)" }}
          >
            {/* A tab on the ruler, not a floating time pill.
                The pill restated a number the toolbar already shows, and it
                sat over the first lane, covering the keys nearest the
                playhead — the ones you are most likely to be reaching for.
                The tab marks the position and stays out of the track area. */}
            <span
              className="absolute -top-[2px] left-0 h-[12px] w-[11px] -translate-x-1/2 rounded-[3px] rounded-b-[5px]"
              style={{ background: "var(--ks-accent)" }}
            />
          </span>
        </div>
        </div>
      </div>
    </div>
  );
}
