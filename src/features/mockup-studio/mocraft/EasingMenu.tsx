"use client";

/**
 * The easing menu: a list of presets, a curve you can bend, and a spring.
 *
 * The old editor's picker, rebuilt on this chrome's components. What is NOT
 * rebuilt is the geometry — `curvePath` and `curveArea` are imported from it
 * rather than reimplemented, because every curve in here is sampled from
 * `easingCurve`, the same function the animation itself runs through. A curve
 * drawn by hand would be a picture of what the easing is supposed to do; this
 * is a plot of what it actually does, and the two drift the moment either side
 * is edited.
 *
 * Three tabs, because there are genuinely three ways to say what a curve is
 * and none of them subsumes the others. A preset is a name. A bezier is four
 * numbers you can drag. A spring is not a bezier at all — it overshoots and
 * settles on physics, and no cubic reproduces it.
 */

import { useMemo, useRef, useState } from "react";
import { Glass, ParamRow, Row, RowGroup, Segmented } from "@/design/ui";
import { EASING_PRESETS, easingPresetId, type Easing } from "../animation";
import {
  PLOT,
  PLOT_PAD,
  Y_MAX,
  Y_MIN,
  curveArea,
  curvePath,
} from "../editor/EasingPicker";

const THUMB = 22;
const THUMB_PAD = 3;

/** The default a Curve tab opens on when the value is not already a bezier. */
const CUBIC_FALLBACK: [number, number, number, number] = [0.42, 0, 0.58, 1];
const SPRING_FALLBACK = {
  kind: "spring",
  damping: 0.8,
  frequency: 1.1,
} as const;

/**
 * The curve, at list size.
 *
 * Drawn on its own auto-range rather than the editors' fixed axis: a thumbnail
 * is showing you the SHAPE, and an overshooting curve squashed onto a shared
 * axis to be comparable stops reading as a shape at all.
 */
export function CurveThumb({
  easing,
  active,
  color,
}: {
  easing: Easing;
  active?: boolean;
  /** Stroke override for a coloured chip; drops the dotted box with it. */
  color?: string;
}) {
  const d = useMemo(() => curvePath(easing, THUMB, THUMB_PAD), [easing]);
  return (
    <svg
      width={THUMB}
      height={THUMB}
      viewBox={`0 0 ${THUMB} ${THUMB}`}
      aria-hidden
      className="shrink-0"
    >
      {color ? null : <rect
        x={THUMB_PAD}
        y={THUMB_PAD}
        width={THUMB - THUMB_PAD * 2}
        height={THUMB - THUMB_PAD * 2}
        fill="none"
        stroke="var(--mo-field)"
        strokeDasharray="1 2"
      />}
      <path
        d={d}
        fill="none"
        stroke={color ?? (active ? "var(--mo-ink)" : "var(--mo-ink-muted)")}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Two handles on the square the curve is drawn in.
 *
 * The vertical axis runs past 0..1 on both sides, and that is deliberate: a
 * handle that could not be dragged above the top of the box could not express
 * an overshoot, so "ease out back" would be unreachable by hand while sitting
 * in the preset list one tab away.
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
  const toY = (y: number) =>
    PLOT_PAD + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * span;

  const onMove = (event: React.PointerEvent) => {
    if (dragging === null) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = PLOT / rect.width;
    const px = (event.clientX - rect.left) * scale;
    const py = (event.clientY - rect.top) * scale;
    const next: [number, number, number, number] = [...points];
    // x is clamped because a bezier whose control points run backwards in x is
    // not a timing function, it is a loop; y is clamped to the axis it is drawn
    // on, or a handle dragged past the top leaves the view with no way back.
    next[dragging * 2] = Number(
      Math.max(0, Math.min(1, (px - PLOT_PAD) / span)).toFixed(3),
    );
    next[dragging * 2 + 1] = Number(
      Math.max(
        Y_MIN,
        Math.min(Y_MAX, Y_MAX - ((py - PLOT_PAD) / span) * (Y_MAX - Y_MIN)),
      ).toFixed(3),
    );
    onChange(next);
  };

  const easing: Easing = { kind: "cubic", p: points };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${PLOT} ${PLOT}`}
      className="block w-full touch-none select-none"
      onPointerMove={onMove}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      {/* The 0..1 region, filled, so it reads as the plot rather than as four
          dashed lines around nothing. */}
      <rect
        x={PLOT_PAD}
        y={toY(1)}
        width={span}
        height={toY(0) - toY(1)}
        fill="var(--mo-field)"
        stroke="var(--mo-ink-muted)"
        strokeDasharray="2 3"
      />
      <path
        d={curveArea(easing, PLOT, PLOT_PAD, { lo: Y_MIN, hi: Y_MAX })}
        fill="color-mix(in srgb, var(--mo-ink) 8%, transparent)"
        stroke="none"
      />
      {/* The handle arms: a control point only means anything in relation to
          the endpoint it pulls from, which is why Figma draws these too. */}
      <line
        x1={toX(0)}
        y1={toY(0)}
        x2={toX(points[0])}
        y2={toY(points[1])}
        stroke="var(--mo-ink-muted)"
      />
      <line
        x1={toX(1)}
        y1={toY(1)}
        x2={toX(points[2])}
        y2={toY(points[3])}
        stroke="var(--mo-ink-muted)"
      />
      <path
        d={curvePath(easing, PLOT, PLOT_PAD, { lo: Y_MIN, hi: Y_MAX })}
        fill="none"
        stroke="var(--mo-ink)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {([0, 1] as const).map((i) => (
        <circle
          key={i}
          cx={toX(points[i * 2])}
          cy={toY(points[i * 2 + 1])}
          r={6}
          fill="var(--mo-knob)"
          stroke="var(--mo-ink)"
          strokeWidth={2}
          className="cursor-grab"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(i);
          }}
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
  // The same fixed axis as the bezier editor, so switching tabs does not
  // silently rescale the picture and make two curves look more alike than
  // they are.
  const span = PLOT - PLOT_PAD * 2;
  const boxTop = PLOT_PAD + ((Y_MAX - 1) / (Y_MAX - Y_MIN)) * span;

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div
        style={{
          borderRadius: "var(--mo-r-well)",
          background: "var(--mo-field)",
          padding: 8,
        }}
      >
        <svg viewBox={`0 0 ${PLOT} ${PLOT}`} className="block w-full">
          <rect
            x={PLOT_PAD}
            y={boxTop}
            width={span}
            height={(1 / (Y_MAX - Y_MIN)) * span}
            fill="var(--mo-field)"
            stroke="var(--mo-ink-muted)"
            strokeDasharray="2 3"
          />
          <path
            d={curveArea(easing, PLOT, PLOT_PAD, { lo: Y_MIN, hi: Y_MAX })}
            fill="color-mix(in srgb, var(--mo-ink) 8%, transparent)"
            stroke="none"
          />
          <path
            d={curvePath(easing, PLOT, PLOT_PAD, { lo: Y_MIN, hi: Y_MAX })}
            fill="none"
            stroke="var(--mo-ink)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </div>
      {/*
        Bounce and Speed, not mass, stiffness and damping. Apple made the same
        swap for the same reason: the physics triplet is three numbers that
        interact, and nobody can predict what changing one of them will do.
      */}
      <ParamRow
        label="Bounce"
        value={easing.damping}
        min={0.2}
        max={0.99}
        step={0.01}
        format={(n) => n.toFixed(2)}
        onChange={(damping) => onChange({ ...easing, damping })}
      />
      <ParamRow
        label="Speed"
        value={easing.frequency}
        min={0.5}
        max={3}
        step={0.1}
        format={(n) => n.toFixed(1)}
        onChange={(frequency) => onChange({ ...easing, frequency })}
      />
    </div>
  );
}

export function EasingMenu({
  value,
  onChange,
}: {
  value: Easing;
  onChange: (next: Easing) => void;
}) {
  /*
   * The tab opens on what the value already IS.
   *
   * Landing on Presets while holding a hand-dragged curve would show a list
   * with nothing selected in it, which reads as having lost the setting.
   */
  const [tab, setTab] = useState<"presets" | "curve" | "spring">(() =>
    value.kind === "spring"
      ? "spring"
      : easingPresetId(value)
        ? "presets"
        : "curve",
  );

  const selected = easingPresetId(value);
  const points = value.kind === "cubic" ? value.p : CUBIC_FALLBACK;
  const spring = value.kind === "spring" ? value : SPRING_FALLBACK;

  return (
    <Glass>
      <Segmented
        width="100%"
        height={30}
        value={tab}
        onChange={setTab}
        options={[
          { id: "presets", label: "Presets" },
          { id: "curve", label: "Curve" },
          { id: "spring", label: "Spring" },
        ]}
      />

      {tab === "presets" ? (
        /* Scrolls at eleven presets rather than making the menu taller than
           the panel it hangs off. */
        <div
          className="mo-noscroll"
          /*
            The padding and the matching negative margin are one gesture: they
            push the clip edge outward without moving the rows. A scroller
            clips horizontally as well as vertically whatever you asked it for,
            and the travelling selection is drawn slightly wider than the row
            it is on — so at the edge of the box its ends were being sliced off.
            The same goes for the top and bottom: the first row's selection had
            its upper edge cut flat. The 6 of gap above the rows now lives in
            the padding, so the layout is where it was.
          */
          style={{
            maxHeight: 272,
            overflowY: "auto",
            paddingBlock: 6,
            marginBottom: -6,
            paddingInline: 6,
            marginInline: -6,
          }}
        >
          <RowGroup>
            {EASING_PRESETS.map((preset) => (
              <Row
                key={preset.id}
                icon={
                  <CurveThumb
                    easing={preset.easing}
                    active={preset.id === selected}
                  />
                }
                selected={preset.id === selected}
                onClick={() => onChange(preset.easing)}
              >
                {preset.label}
              </Row>
            ))}
          </RowGroup>
        </div>
      ) : null}

      {tab === "curve" ? (
        <div style={{ marginTop: 6 }}>
          <BezierEditor
            points={points}
            onChange={(p) => onChange({ kind: "cubic", p })}
          />
          {/* The numbers, because a curve someone else specified arrives as
              four of them and dragging to match is a poor way to type. */}
          <div
            className="mo-code text-center"
            style={{ fontVariantNumeric: "tabular-nums", paddingTop: 4 }}
          >
            {points.map((n) => n.toFixed(2)).join(", ")}
          </div>
        </div>
      ) : null}

      {tab === "spring" ? (
        <div style={{ marginTop: 6 }}>
          <SpringEditor easing={spring} onChange={onChange} />
        </div>
      ) : null}
    </Glass>
  );
}
