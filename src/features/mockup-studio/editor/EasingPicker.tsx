"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EASINGS, easingCurve, type Easing } from "../animation";
import { Icon } from "./icons";

/**
 * The easing menu, with each curve drawn from the function it names.
 *
 * The thumbnails are sampled from `easingCurve` rather than drawn by hand, for
 * the same reason the motion previews are: a hand-drawn curve is a claim about
 * what an easing does, and it starts lying the moment anyone touches the
 * numbers. Sampling means "Ease out back" cannot show a curve that does not
 * overshoot, because the overshoot in the picture IS the overshoot in the
 * animation.
 */

const BOX = 22;
const PAD = 3;

function CurveThumb({ easing, active }: { easing: Easing; active: boolean }) {
  const path = useMemo(() => {
    const f = easingCurve(easing);
    const span = BOX - PAD * 2;
    // The back curves and the springs leave 0..1, so the drawing is scaled to
    // whatever range the function actually covers. Clipping them to the box
    // instead would flatten the overshoot — the one feature that distinguishes
    // them from their plain counterparts.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i <= 48; i++) {
      const v = f(i / 48);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const range = hi - lo || 1;
    const points: string[] = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const x = PAD + t * span;
      const y = BOX - PAD - ((f(t) - lo) / range) * span;
      points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(" ");
  }, [easing]);

  return (
    <svg
      width={BOX}
      height={BOX}
      viewBox={`0 0 ${BOX} ${BOX}`}
      aria-hidden
      className="shrink-0"
    >
      <rect
        x={PAD}
        y={PAD}
        width={BOX - PAD * 2}
        height={BOX - PAD * 2}
        fill="none"
        stroke="var(--ks-line)"
        strokeDasharray="1 2"
      />
      <path
        d={path}
        fill="none"
        stroke={active ? "var(--ks-accent)" : "var(--ks-text-dim)"}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  const rootRef = useRef<HTMLDivElement>(null);
  const current = EASINGS.find((e) => e.id === value);

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
        {current?.label ?? "Easing"}
        <Icon name="chevronUp" />
      </button>

      {open ? (
        <div
          role="menu"
          // Opens upward: the timeline sits at the foot of the window, so
          // there is nothing below it to open into.
          className="ks-menu absolute bottom-[calc(100%+6px)] right-0 z-30 flex w-[220px] flex-col gap-[4px] rounded-[var(--ks-r-menu)] border p-[4px]"
          style={{
            background: "var(--ks-surface-solid)",
            borderColor: "var(--ks-line-strong)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
            transformOrigin: "bottom right",
          }}
        >
          {EASINGS.map((easing) => {
            const active = easing.id === value;
            return (
              <button
                key={easing.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(easing.id);
                  setOpen(false);
                }}
                className="ks-press flex w-full items-center gap-[12px] rounded-[var(--ks-r-menu-item)] px-[8px] py-[4px] text-left hover:bg-[var(--ks-row)]"
                style={{ background: active ? "var(--ks-accent-wash)" : "transparent" }}
              >
                <CurveThumb easing={easing.id} active={active} />
                <span
                  className="ks-label truncate"
                  style={{ color: active ? "var(--ks-accent)" : "var(--ks-text)" }}
                >
                  {easing.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
