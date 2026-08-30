"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EASING_PRESETS,
  easingCurve,
  easingPresetId,
  type Easing,
} from "../animation";
import { Icon } from "./icons";
import { Tabs } from "./primitives";

/**
 * The easing menu, with each curve drawn from the function it names, and an
 * editor for the two that have no name.
 *
 * Every curve here is sampled from `easingCurve` rather than drawn by hand,
 * for the same reason the motion previews are: a hand-drawn curve is a claim
 * about what an easing does, and it starts lying the moment anyone touches the
 * numbers. Sampled, "Ease out back" cannot show a curve that fails to
 * overshoot, because the overshoot in the picture IS the overshoot in the
 * animation.
 */

const THUMB = 22;
const PAD = 3;

/**
 * `range` fixes the vertical axis; omitting it scales to whatever the curve
 * covers.
 *
 * The thumbnails autoscale, because at 22px the point is to recognise the
 * SHAPE and an overshoot squeezed into a 0..1 box is invisible. The editor
 * must not: its handles are placed on a fixed axis, and a curve drawn on a
 * different one does not pass through them. That mismatch is what made the
 * curve leave the box while the handles sat somewhere else entirely.
 */
function curvePath(
  easing: Easing,
  box: number,
  pad: number,
  range?: { lo: number; hi: number },
) {
  const f = easingCurve(easing);
  const span = box - pad * 2;
  let lo = range?.lo ?? 0;
  let hi = range?.hi ?? 1;
  if (!range) {
    for (let i = 0; i <= 64; i++) {
      const v = f(i / 64);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  const extent = hi - lo || 1;
  const points: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    points.push(
      `${i === 0 ? "M" : "L"}${(pad + t * span).toFixed(2)} ${(
        box -
        pad -
        ((f(t) - lo) / extent) * span
      ).toFixed(2)}`,
    );
  }
  return points.join(" ");
}

function CurveThumb({ easing, active }: { easing: Easing; active: boolean }) {
  const d = useMemo(() => curvePath(easing, THUMB, PAD), [easing]);
  return (
    <svg width={THUMB} height={THUMB} viewBox={`0 0 ${THUMB} ${THUMB}`} aria-hidden className="shrink-0">
      <rect
        x={PAD}
        y={PAD}
        width={THUMB - PAD * 2}
        height={THUMB - PAD * 2}
        fill="none"
        stroke="var(--ks-line)"
        strokeDasharray="1 2"
      />
      <path
        d={d}
        fill="none"
        stroke={active ? "var(--ks-accent)" : "var(--ks-text-dim)"}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PLOT = 168;
const PLOT_PAD = 26;
/* The editor's vertical axis. It runs past 0..1 on both sides because the
   useful curves do — a handle that could not go above the top of the box could
   not express an overshoot, and "ease out back" would be unreachable by hand
   while sitting in the preset list right above it. */
const Y_MIN = -0.5;
const Y_MAX = 1.5;

/**
 * The bezier editor: two handles you drag, on the square the curve is drawn in.
 *
 * The vertical axis deliberately extends past the 0..1 box, because the useful
 * curves do. A handle that could not be dragged above the top of the square
 * could not express an overshoot at all, and "ease out back" would be
 * unreachable by hand while sitting right there in the preset list.
 */
function BezierEditor({
  points,
  onChange,
}: {
  points: [number, number, number, number];
  onChange: (next: [number, number, number, number]) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<0 | 1 | null>(null);

  const span = PLOT - PLOT_PAD * 2;
  const toX = (x: number) => PLOT_PAD + x * span;
  const toY = (y: number) => PLOT_PAD + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * span;

  const fromEvent = (event: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return null;
    const scale = PLOT / rect.width;
    const px = (event.clientX - rect.left) * scale;
    const py = (event.clientY - rect.top) * scale;
    return {
      // x is clamped: a bezier whose control points run backwards in x is not
      // a timing function, it is a loop.
      x: Math.max(0, Math.min(1, (px - PLOT_PAD) / span)),
      // Clamped to the axis it is drawn on: a handle dragged past the top of
      // the plot leaves the view, and there is no way to get it back.
      y: Math.max(
        Y_MIN,
        Math.min(Y_MAX, Y_MAX - ((py - PLOT_PAD) / span) * (Y_MAX - Y_MIN)),
      ),
    };
  };

  const handle = (index: 0 | 1) => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(index);
    },
  });

  const onMove = (event: React.PointerEvent) => {
    if (dragging === null) return;
    const at = fromEvent(event);
    if (!at) return;
    const next: [number, number, number, number] = [...points];
    next[dragging * 2] = Number(at.x.toFixed(3));
    next[dragging * 2 + 1] = Number(at.y.toFixed(3));
    onChange(next);
  };

  const d = useMemo(
    () => curvePath({ kind: "cubic", p: points }, PLOT, PLOT_PAD, { lo: Y_MIN, hi: Y_MAX }),
    [points],
  );

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${PLOT} ${PLOT}`}
      className="w-full touch-none select-none"
      onPointerMove={onMove}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      <rect
        x={PLOT_PAD}
        y={toY(1)}
        width={span}
        height={toY(0) - toY(1)}
        fill="none"
        stroke="var(--ks-line)"
        strokeDasharray="2 3"
      />
      {/* The handle arms. Figma draws these because a bezier's control points
          only make sense in relation to the endpoint they pull from. */}
      <line x1={toX(0)} y1={toY(0)} x2={toX(points[0])} y2={toY(points[1])} stroke="var(--ks-line-strong)" />
      <line x1={toX(1)} y1={toY(1)} x2={toX(points[2])} y2={toY(points[3])} stroke="var(--ks-line-strong)" />
      <path d={d} fill="none" stroke="var(--ks-text)" strokeWidth={2} strokeLinecap="round" />
      {([0, 1] as const).map((i) => (
        <circle
          key={i}
          cx={toX(points[i * 2])}
          cy={toY(points[i * 2 + 1])}
          r={6}
          fill="var(--ks-surface-solid)"
          stroke="var(--ks-accent)"
          strokeWidth={2}
          className="cursor-grab"
          {...handle(i)}
        />
      ))}
    </svg>
  );
}

function SpringEditor({
  easing,
  onChange,
}: {
  easing: { kind: "spring"; damping: number; frequency: number };
  onChange: (next: Easing) => void;
}) {
  // Same fixed axis as the bezier editor, so switching tabs does not silently
  // rescale the picture and make two curves look more alike than they are.
  const d = useMemo(
    () => curvePath(easing, PLOT, PLOT_PAD, { lo: Y_MIN, hi: Y_MAX }),
    [easing],
  );
  // Where 0..1 lands on that axis, so the dashed box marks the same thing it
  // does in the bezier editor.
  const plotSpan = PLOT - PLOT_PAD * 2;
  const boxTop = PLOT_PAD + ((Y_MAX - 1) / (Y_MAX - Y_MIN)) * plotSpan;
  const boxHeight = (1 / (Y_MAX - Y_MIN)) * plotSpan;
  return (
    <div className="flex flex-col gap-[8px]">
      <svg viewBox={`0 0 ${PLOT} ${PLOT}`} className="w-full">
        <rect
          x={PLOT_PAD}
          y={boxTop}
          width={PLOT - PLOT_PAD * 2}
          height={boxHeight}
          fill="none"
          stroke="var(--ks-line)"
          strokeDasharray="2 3"
        />
        <path d={d} fill="none" stroke="var(--ks-text)" strokeWidth={2} strokeLinecap="round" />
      </svg>
      {/* Damping and frequency rather than mass, stiffness and damping.
          Apple made the same swap for the same reason: the physics triplet is
          three numbers that interact, and nobody can predict what changing one
          will do. Bounce and speed are the two things anyone actually wants. */}
      <Row
        label="Bounce"
        value={easing.damping}
        min={0.2}
        max={0.99}
        step={0.01}
        onChange={(damping) => onChange({ ...easing, damping })}
      />
      <Row
        label="Speed"
        value={easing.frequency}
        min={0.5}
        max={3}
        step={0.1}
        onChange={(frequency) => onChange({ ...easing, frequency })}
      />
    </div>
  );
}

function Row({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="ks-micro flex items-center gap-[8px]" style={{ color: "var(--ks-text-muted)" }}>
      <span className="w-[52px] shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="h-[4px] min-w-0 flex-1 appearance-none rounded-full"
        style={{ background: "var(--ks-ctl-fill)", accentColor: "var(--ks-accent)" }}
      />
      <span className="w-[32px] shrink-0 text-right tabular-nums">{value.toFixed(2)}</span>
    </label>
  );
}

export function EasingPicker({
  value,
  onChange,
}: {
  value: Easing;
  onChange: (next: Easing) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"presets" | "curve" | "spring">("presets");
  const rootRef = useRef<HTMLDivElement>(null);

  const presetId = easingPresetId(value);
  const label = EASING_PRESETS.find((p) => p.id === presetId)?.label ?? "Custom";

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

  const cubic = value.kind === "cubic" ? value.p : ([0, 0, 0.58, 1] as [number, number, number, number]);
  const springValue =
    value.kind === "spring" ? value : ({ kind: "spring", damping: 0.7, frequency: 1.4 } as const);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="ks-press ks-label flex items-center gap-[8px] rounded-[var(--ks-r)] px-[12px] py-[4px]"
        style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
      >
        <CurveThumb easing={value} active={false} />
        {label}
        <Icon name="chevronUp" />
      </button>

      {open ? (
        <div
          role="menu"
          // Opens upward: the timeline sits at the foot of the window, so
          // there is nothing below it to open into.
          className="ks-menu absolute bottom-[calc(100%+8px)] right-0 z-40 flex w-[248px] flex-col gap-[8px] rounded-[var(--ks-r-menu)] border p-[8px]"
          style={{
            background: "var(--ks-surface-solid)",
            borderColor: "var(--ks-line-strong)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
            transformOrigin: "bottom right",
          }}
        >
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { id: "presets", label: "Presets" },
              { id: "curve", label: "Curve" },
              { id: "spring", label: "Spring" },
            ]}
          />

          {tab === "presets" ? (
            <div className="flex max-h-[240px] flex-col gap-[4px] overflow-y-auto">
              {EASING_PRESETS.map((preset) => {
                const active = preset.id === presetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onChange(preset.easing);
                      setOpen(false);
                    }}
                    className="ks-press flex w-full items-center gap-[12px] rounded-[var(--ks-r-menu-item)] px-[8px] py-[4px] text-left hover:bg-[var(--ks-row)]"
                    style={{ background: active ? "var(--ks-accent-wash)" : "transparent" }}
                  >
                    <CurveThumb easing={preset.easing} active={active} />
                    <span
                      className="ks-label truncate"
                      style={{ color: active ? "var(--ks-accent)" : "var(--ks-text)" }}
                    >
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {tab === "curve" ? (
            <div className="flex flex-col gap-[8px]">
              <BezierEditor
                points={cubic}
                onChange={(p) => onChange({ kind: "cubic", p })}
              />
              {/* The four numbers, in the order CSS writes them, so a curve
                  found here can be pasted straight into a stylesheet. */}
              <input
                value={cubic.map((n) => Number(n.toFixed(3))).join(", ")}
                onChange={(event) => {
                  const parts = event.currentTarget.value
                    .split(",")
                    .map((n) => Number(n.trim()));
                  if (parts.length === 4 && parts.every(Number.isFinite)) {
                    onChange({
                      kind: "cubic",
                      p: [parts[0], parts[1], parts[2], parts[3]],
                    });
                  }
                }}
                spellCheck={false}
                aria-label="Cubic bezier values"
                className="ks-label w-full rounded-[var(--ks-r)] px-[12px] py-[4px] tabular-nums focus:outline-none"
                style={{ background: "var(--ks-ctl)", color: "var(--ks-ctl-text)" }}
              />
            </div>
          ) : null}

          {tab === "spring" ? (
            <SpringEditor easing={springValue} onChange={onChange} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
