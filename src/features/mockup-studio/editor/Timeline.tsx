"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  ANIMATABLE,
  formatTime,
  type AnimatableKey,
  type Animation,
} from "../animation";
import { MOTION_PRESETS, PRESET_GROUPS } from "./motionPresets";
import type { Filmstrip } from "./useFilmstrip";
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
const LABEL_WIDTH = 132;
/* Figma's track rows. Tall enough to hold a bar with a label inside it. */
const LANE_H = 26;

export function Timeline({
  animation,
  playhead,
  playing,
  onSeek,
  onTogglePlay,
  onDurationChange,
  onMoveKey,
  onRemoveKey,
  onClear,
  onApplyPreset,
  onScrubbingChange,
  onEasingChange,
  exportFps,
  onExportFpsChange,
  exportScale,
  onExportScaleChange,
  clip,
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
  onClear: () => void;
  onApplyPreset: (id: string) => void;
  /** True for the duration of a playhead drag, so the stage can stop easing. */
  onScrubbingChange: (active: boolean) => void;
  onEasingChange: (easing: Easing) => void;
  exportFps: number;
  onExportFpsChange: (fps: number) => void;
  /** Export resolution as a multiple of the on-screen canvas. */
  exportScale: number;
  onExportScaleChange: (scale: number) => void;
  /** Drawn as a clip bar so keys can be placed against what is on screen. */
  clip: Filmstrip;
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
  const [dragging, setDragging] = useState<{ property: AnimatableKey; from: number } | null>(
    null,
  );

  const { durationSec } = animation;
  const timeFromClientX = (clientX: number) => {
    const rect = laneRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    const fraction = (clientX - rect.left) / rect.width;
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

  const pct = (time: number) => `${(time / Math.max(0.001, durationSec)) * 100}%`;

  // A tick roughly every 60px, rounded to something a person would count in.
  // The span the ruler has to label is the duration divided by the zoom: at 4x
  // only a quarter of the timeline is on screen, so quarter-second ticks are
  // readable where whole seconds would leave the ruler nearly empty.
  const visible = durationSec / zoom;
  const step = visible <= 1 ? 0.1 : visible <= 2 ? 0.25 : visible <= 6 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= durationSec + 1e-6; t += step) ticks.push(Number(t.toFixed(3)));

  const tracks = ANIMATABLE.filter(({ key }) => (animation.tracks[key]?.length ?? 0) > 0);
  // How many times the clip repeats before the timeline runs out. A clip
  // longer than the timeline gets one bar, cropped by the lane's overflow.
  const clipRepeats =
    clip.duration > 0 ? Math.max(1, Math.ceil(durationSec / clip.duration)) : 0;

  return (
    <div
      // Fixed height, whatever is in it.
      //
      // The timeline grew a row per animated property, so keying a sixth
      // pushed it past the bottom of the window and took the last lane with
      // it. A tool's chrome should not change size because of what you are
      // working on: the lanes scroll inside it now, and the transport stays
      // where you left it.
      className="ks-material flex h-[var(--ks-timeline-h)] shrink-0 flex-col gap-[8px] overflow-hidden rounded-[var(--ks-r-panel)] border px-[12px] py-[8px]"
      style={{
        background: "var(--ks-surface)",
        borderColor: "var(--ks-line-strong)",
      }}
    >
      {/* Transport */}
      <div className="flex shrink-0 items-center gap-[12px]">
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
          className="ks-label tabular-nums"
          style={{ color: "var(--ks-text-dim)", fontVariantNumeric: "tabular-nums" }}
        >
          {formatTime(playhead)} / {formatTime(durationSec)}
        </span>

        {/* An action list, not a setting: the select never holds a value, it
            fires and resets. A preset REPLACES the tracks, which is the right
            default for a starting point and the reason each option says what
            it will do rather than just naming itself. */}
        <label className="relative ml-auto flex items-center">
          <span className="sr-only">Motion preset</span>
          <span
            className="ks-label flex h-[24px] items-center gap-[4px] rounded-[var(--ks-r-pill)] border px-[8px]"
            style={{ borderColor: "var(--ks-hairline)", color: "var(--ks-text-dim)" }}
          >
            Motion
            <Icon name="chevronDown" />
          </span>
          <select
            value=""
            aria-label="Motion preset"
            onChange={(event) => {
              const id = event.currentTarget.value;
              event.currentTarget.value = "";
              if (id) onApplyPreset(id);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">Choose a motion…</option>
            {/* Grouped because the three kinds behave differently: an
                entrance lands on your framing, a move travels through it, a
                loop returns to where it began. Flat, the list read as a pile. */}
            {PRESET_GROUPS.map((group) => (
              <optgroup key={group.kind} label={group.label}>
                {MOTION_PRESETS.filter((preset) => preset.kind === group.kind).map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} — {preset.hint}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <EasingPicker value={animation.easing} onChange={onEasingChange} />

        <label className="ks-micro flex items-center gap-[4px]" style={{ color: "var(--ks-text-faint)" }}>
          Res
          <select
            value={exportScale}
            onChange={(event) => onExportScaleChange(Number(event.currentTarget.value))}
            className="ks-label rounded-[var(--ks-r-sm)] px-[4px] py-[4px] focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
          </select>
        </label>

        <label className="ks-micro flex items-center gap-[4px]" style={{ color: "var(--ks-text-faint)" }}>
          FPS
          <select
            value={exportFps}
            onChange={(event) => onExportFpsChange(Number(event.currentTarget.value))}
            className="ks-label rounded-[var(--ks-r-sm)] px-[4px] py-[4px] focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>

        <label className="ks-micro flex items-center gap-[8px]" style={{ color: "var(--ks-text-faint)" }}>
          Duration
          <input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={durationSec}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              if (Number.isFinite(next)) onDurationChange(Math.min(30, Math.max(0.5, next)));
            }}
            className="ks-label w-[46px] rounded-[var(--ks-r-sm)] px-[4px] py-[4px] text-right focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          />
          s
        </label>

        {/* Zoom, as Figma puts it: a slider at the toolbar's end, with the
            keyboard's usual pair beside it. Zooming keeps the PLAYHEAD
            centred rather than the left edge, because the playhead is where
            you are working — anchoring to zero would push the thing you were
            looking at off screen every time you zoomed in. */}
        <label className="ks-micro flex items-center gap-[8px]" style={{ color: "var(--ks-text-faint)" }}>
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
          className="ks-micro rounded-[var(--ks-r-sm)] px-[8px] py-[4px] disabled:opacity-40"
          style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
        >
          Fit
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!tracks.length}
          className="ks-micro rounded-[var(--ks-r-sm)] px-[8px] py-[4px] disabled:opacity-40"
          style={{ background: "var(--ks-badge)", color: "var(--ks-text-dim)" }}
        >
          Clear
        </button>
      </div>

      {/* Ruler + lanes. One scrub surface: pointer anywhere in here seeks, so
          the playhead follows the cursor rather than only the thin line. */}
      <div
        data-lenis-prevent
        className="ks-scroll flex min-h-0 flex-1 items-stretch overflow-y-auto"
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
          {clipRepeats ? <div className="mb-[4px] h-[36px]" /> : null}
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
          className="ks-scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
        >
        <div
          ref={laneRef}
          className="relative select-none"
          style={{ width: `${zoom * 100}%` }}
          onPointerDown={(event) => {
            if (dragging) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            onScrubbingChange(true);
            queueSeek(timeFromClientX(event.clientX));
          }}
          onPointerMove={(event) => {
            if (dragging) {
              onMoveKey(dragging.property, dragging.from, timeFromClientX(event.clientX));
              setDragging({ property: dragging.property, from: timeFromClientX(event.clientX) });
              return;
            }
            if (event.buttons === 1) queueSeek(timeFromClientX(event.clientX));
          }}
          onPointerUp={() => {
            setDragging(null);
            onScrubbingChange(false);
          }}
          onPointerCancel={() => {
            setDragging(null);
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
                style={{ left: pct(t) }}
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

          {/* The clip, as a bar the width of its actual duration.
              Thumbnails run inside the bar rather than edge to edge across
              the lane, because the length of the bar is the thing being
              communicated: a 12-second clip on a 3-second timeline should
              look like it overruns, and a 2-second clip that repeats should
              visibly repeat. Stretched thumbnails said neither. */}
          {clipRepeats ? (
            <div className="relative mb-[4px] h-[36px] w-full overflow-hidden">
              {Array.from({ length: clipRepeats }, (_, repeat) => (
                <div
                  key={repeat}
                  className="absolute top-0 flex h-full overflow-hidden rounded-[var(--ks-r-sm)]"
                  style={{
                    left: pct(repeat * clip.duration),
                    width: pct(clip.duration),
                    background: "var(--ks-ctl)",
                    // Repeats after the first are the same footage coming
                    // round again, so they read as echoes of the original.
                    opacity: repeat === 0 ? 1 : 0.55,
                    boxShadow: "inset 0 0 0 1px var(--ks-line-strong)",
                  }}
                >
                  {clip.frames.map((frame, index) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={index}
                      src={frame}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="h-full min-w-0 flex-1 object-cover opacity-70"
                    />
                  ))}
                  {repeat === 0 ? (
                    <span
                      className="ks-micro pointer-events-none absolute left-[6px] top-1/2 -translate-y-1/2 rounded-[3px] px-[4px] py-[4px]"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      {clipName} · {formatTime(clip.duration)}
                    </span>
                  ) : null}
                </div>
              ))}
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
                      left: pct(first),
                      width: pct(last - first),
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
                {(animation.tracks[key] ?? []).map((k) => (
                  <button
                    key={k.time}
                    type="button"
                    title={`${label} @ ${formatTime(k.time)} — drag to move, double-click to delete`}
                    aria-label={`${label} keyframe at ${formatTime(k.time)}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDragging({ property: key, from: k.time });
                      onSeek(k.time);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      onRemoveKey(key, k.time);
                    }}
                    className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1.5px]"
                    style={{
                      left: pct(k.time),
                      background: "var(--ks-accent)",
                      boxShadow: "0 0 0 1.5px var(--ks-surface)",
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
              gets in the way of grabbing a keyframe underneath it. */}
          <span
            className="pointer-events-none absolute top-0 z-10 h-full w-px"
            style={{ left: pct(playhead), background: "var(--ks-accent)" }}
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
