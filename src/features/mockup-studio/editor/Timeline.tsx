"use client";

import { useRef, useState } from "react";
import {
  ANIMATABLE,
  formatTime,
  type AnimatableKey,
  type Animation,
} from "../animation";
import { MOTION_PRESETS, PRESET_GROUPS } from "./motionPresets";
import type { Filmstrip } from "./useFilmstrip";
import { EASINGS, type Easing } from "../animation";

/**
 * The keyframe timeline.
 *
 * Keys are added from the diamond on each parameter row, not from here —
 * that is the only place where "this property, at this value" is already on
 * screen. This panel is for the other half: seeing when things happen, and
 * moving around in time.
 */

const LABEL_WIDTH = 78;

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
  const pct = (time: number) => `${(time / Math.max(0.001, durationSec)) * 100}%`;

  // A tick roughly every 60px, rounded to something a person would count in.
  const step = durationSec <= 2 ? 0.25 : durationSec <= 6 ? 0.5 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= durationSec + 1e-6; t += step) ticks.push(Number(t.toFixed(3)));

  const tracks = ANIMATABLE.filter(({ key }) => (animation.tracks[key]?.length ?? 0) > 0);
  // How many times the clip repeats before the timeline runs out. A clip
  // longer than the timeline gets one bar, cropped by the lane's overflow.
  const clipRepeats =
    clip.duration > 0 ? Math.max(1, Math.ceil(durationSec / clip.duration)) : 0;

  return (
    <div
      className="flex shrink-0 flex-col gap-[6px] rounded-[var(--ks-r-panel)] border px-[10px] py-[8px]"
      style={{
        background: "var(--ks-surface)",
        borderColor: "var(--ks-line-strong)",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Transport */}
      <div className="flex items-center gap-[10px]">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-[24px] w-[24px] place-items-center rounded-[var(--ks-r-sm)]"
          style={{ background: "var(--ks-accent)", color: "var(--ks-accent-text)" }}
        >
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect x="1.5" y="1" width="2.5" height="8" fill="currentColor" />
              <rect x="6" y="1" width="2.5" height="8" fill="currentColor" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 1l7 4-7 4z" fill="currentColor" />
            </svg>
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
            className="ks-label flex h-[24px] items-center gap-[5px] rounded-[var(--ks-r-pill)] border px-[9px]"
            style={{ borderColor: "var(--ks-hairline)", color: "var(--ks-text-dim)" }}
          >
            Motion
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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

        <label className="ks-micro flex items-center gap-[5px]" style={{ color: "var(--ks-text-faint)" }}>
          Easing
          <select
            value={animation.easing}
            onChange={(event) => onEasingChange(event.currentTarget.value as Easing)}
            className="ks-label rounded-[var(--ks-r-sm)] px-[5px] py-[2px] focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            {EASINGS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ks-micro flex items-center gap-[5px]" style={{ color: "var(--ks-text-faint)" }}>
          Res
          <select
            value={exportScale}
            onChange={(event) => onExportScaleChange(Number(event.currentTarget.value))}
            className="ks-label rounded-[var(--ks-r-sm)] px-[5px] py-[2px] focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={4}>4x</option>
          </select>
        </label>

        <label className="ks-micro flex items-center gap-[5px]" style={{ color: "var(--ks-text-faint)" }}>
          FPS
          <select
            value={exportFps}
            onChange={(event) => onExportFpsChange(Number(event.currentTarget.value))}
            className="ks-label rounded-[var(--ks-r-sm)] px-[5px] py-[2px] focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          >
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>

        <label className="ks-micro flex items-center gap-[6px]" style={{ color: "var(--ks-text-faint)" }}>
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
            className="ks-label w-[46px] rounded-[var(--ks-r-sm)] px-[5px] py-[2px] text-right focus:outline-none"
            style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
          />
          s
        </label>

        <button
          type="button"
          onClick={onClear}
          disabled={!tracks.length}
          className="ks-micro rounded-[var(--ks-r-sm)] px-[6px] py-[3px] disabled:opacity-40"
          style={{ background: "var(--ks-badge)", color: "var(--ks-text-dim)" }}
        >
          Clear
        </button>
      </div>

      {/* Ruler + lanes. One scrub surface: pointer anywhere in here seeks, so
          the playhead follows the cursor rather than only the thin line. */}
      <div className="flex items-stretch">
        <div style={{ width: LABEL_WIDTH }} className="shrink-0" />
        <div
          ref={laneRef}
          className="relative min-w-0 flex-1 select-none"
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
          {/* Ruler */}
          <div className="relative h-[16px]">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 flex h-full flex-col items-start"
                style={{ left: pct(t) }}
              >
                <span className="h-[5px] w-px" style={{ background: "var(--ks-line-strong)" }} />
                <span
                  className="ks-micro -translate-x-1/2 pl-[1px]"
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
            <div className="relative mb-[5px] h-[36px] w-full overflow-hidden">
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
                      className="ks-micro pointer-events-none absolute left-[6px] top-1/2 -translate-y-1/2 rounded-[3px] px-[4px] py-[1px]"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      {clipName} · {formatTime(clip.duration)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Lanes */}
          {tracks.length ? (
            tracks.map(({ key, label }) => (
              <div key={key} className="relative h-[18px]">
                <span
                  className="absolute inset-y-1/2 left-0 h-px w-full"
                  style={{ background: "var(--ks-line)" }}
                />
                <span
                  className="ks-micro absolute right-full top-1/2 w-[74px] -translate-y-1/2 truncate pr-[8px] text-right"
                  style={{ color: "var(--ks-text-muted)" }}
                >
                  {label}
                </span>
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
            ))
          ) : (
            <div className="ks-micro py-[6px]" style={{ color: "var(--ks-text-faint)" }}>
              Press the ◆ beside any camera value to key it at the playhead.
            </div>
          )}

          {/* Playhead, drawn over everything and ignoring pointers so it never
              gets in the way of grabbing a keyframe underneath it. */}
          <span
            className="pointer-events-none absolute top-0 z-10 h-full w-px"
            style={{ left: pct(playhead), background: "var(--ks-accent)" }}
          >
            <span
              className="ks-micro absolute -top-[1px] left-0 -translate-x-1/2 rounded-[3px] px-[4px] py-[1px] tabular-nums"
              style={{
                background: "var(--ks-accent)",
                color: "var(--ks-accent-text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTime(playhead)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
