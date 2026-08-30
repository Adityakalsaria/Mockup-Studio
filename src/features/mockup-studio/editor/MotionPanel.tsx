"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { sampleAnimation, type Animation, type Easing } from "../animation";
import { MOTION_PRESETS, PRESET_GROUPS, type MotionPreset } from "./motionPresets";

/**
 * The motion tab: every preset as a card you can watch before you commit.
 *
 * The previews are driven by the presets' own keyframes, sampled through the
 * same `sampleAnimation` the stage uses. That is the whole point of building
 * it this way rather than drawing little arrows: a hand-made thumbnail is a
 * claim about what a preset does, and it starts lying the moment anyone edits
 * the numbers. This cannot — if the preset changes, the preview changes with
 * it, because they are the same data.
 *
 * The mini phone is a CSS 3D box rather than a second three.js canvas. Twenty
 * three live WebGL contexts would be absurd, and at this size a rectangle that
 * moves correctly reads as a phone perfectly well.
 */

/** The pose the previews animate around: square on, unrotated, unzoomed.
    Presets are built relative to whatever pose is on screen, so feeding them a
    neutral one shows the MOVE rather than your current framing. */
const NEUTRAL = { xAxis: 0, yAxis: 0, zAxis: 0, zoom: 1, panX: 0, panY: 0 };

/** Pan is a fraction of the stage; in a 76px-tall card it needs a scale to
    read at all. Tuned so a full-width preset move stays inside its card. */
const PAN_PX = 26;

/**
 * The largest scale a card can show without the phone leaving its box, given a
 * 46px phone in a 76px frame. Pull back peaks at 1.85, which would burst it.
 */
const CARD_FIT_LIMIT = 1.5;

/**
 * How far to shrink one preset's preview so its widest moment still fits.
 *
 * Per preset rather than one global shrink: scaling everything down to suit
 * the single most extreme move would leave the other twenty two previews
 * smaller than they need to be, for the sake of one.
 */
function fitScaleFor(animation: Animation): number {
  let peak = 1;
  for (let i = 0; i <= 40; i++) {
    const zoom = sampleAnimation(animation, (i / 40) * animation.durationSec).zoom;
    if (zoom !== undefined) peak = Math.max(peak, zoom);
  }
  return peak > CARD_FIT_LIMIT ? CARD_FIT_LIMIT / peak : 1;
}

function poseToTransform(pose: Partial<typeof NEUTRAL>, fit = 1): string {
  const x = pose.xAxis ?? 0;
  const y = pose.yAxis ?? 0;
  const z = pose.zAxis ?? 0;
  const zoom = pose.zoom ?? 1;
  const panX = pose.panX ?? 0;
  const panY = pose.panY ?? 0;
  // translate before rotate, and panY inverted, so the preview agrees with the
  // stage — there, a positive pan Y moves the phone up the frame.
  return [
    `translate3d(${panX * PAN_PX}px, ${-panY * PAN_PX}px, 0)`,
    `rotateX(${x}deg)`,
    `rotateY(${y}deg)`,
    `rotateZ(${z}deg)`,
    `scale(${zoom * fit})`,
  ].join(" ");
}

/**
 * Whether the viewer has asked for less motion.
 *
 * Read live rather than once, because the setting can change while the app is
 * open, and a grid of cards that keeps animating after someone turns it on is
 * the exact failure the preference exists to prevent.
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  // useSyncExternalStore rather than an effect: matchMedia IS an external
  // store, and this is the API for reading one without a render pass that
  // shows the wrong answer first. The server snapshot is false because the
  // server cannot know, and false is what the markup is built for.
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function PresetCard({
  preset,
  easing,
  reducedMotion,
  onApply,
}: {
  preset: MotionPreset;
  easing: Easing;
  reducedMotion: boolean;
  onApply: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  const { animation, fit } = useMemo(() => {
    const built: Animation = { ...preset.build(NEUTRAL), easing };
    return { animation: built, fit: fitScaleFor(built) };
  }, [preset, easing]);

  useEffect(() => {
    const node = phoneRef.current;
    if (!node) return;

    // At rest every card shows the same neutral pose. Showing each preset's
    // FIRST frame instead was the first attempt, and it made the grid look
    // broken: half the cards sat tiny, or edge-on, or off the side of their
    // box, which reads as a rendering fault rather than as a starting point.
    // Under reduced motion the card holds the preset's most extreme pose
    // instead of playing it. That still answers "what does this one do" —
    // which is the card's whole job — without moving anything.
    if (!playing || reducedMotion) {
      node.style.transform = poseToTransform(
        reducedMotion
          ? { ...NEUTRAL, ...sampleAnimation(animation, animation.durationSec * 0.35) }
          : NEUTRAL,
        fit,
      );
      return;
    }

    // A one-way preset ends and holds; without a tail you would never see the
    // pose it settles on before it snapped back to the start.
    const TAIL = preset.kind === "loop" ? 0 : 0.55;
    const span = animation.durationSec + TAIL;

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = ((now - start) / 1000) % span;
      node.style.transform = poseToTransform(
        { ...NEUTRAL, ...sampleAnimation(animation, Math.min(t, animation.durationSec)) },
        fit,
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, preset, animation, fit, reducedMotion]);

  return (
    <button
      type="button"
      onClick={onApply}
      onMouseEnter={() => setPlaying(true)}
      onMouseLeave={() => setPlaying(false)}
      // Keyboard users get the preview too — focus is the same intent as
      // hover here, and without this the card is a button that silently does
      // less for anyone not using a mouse.
      onFocus={() => setPlaying(true)}
      onBlur={() => setPlaying(false)}
      title={preset.hint}
      className="ks-press ks-press-lg group flex flex-col gap-[5px] rounded-[var(--ks-r)] p-[6px] text-left"
      style={{ background: "var(--ks-row)" }}
    >
      <div
        // Concentric with the card: 8px radius, 6px of padding, so the well
        // is 2px. Matching the parent's radius instead makes the gap between
        // the two curves widen around the corner, which is the thing that
        // reads as "not quite right" without anyone being able to name it.
        className="relative grid h-[76px] w-full place-items-center overflow-hidden rounded-[calc(var(--ks-r)-6px)]"
        style={{ background: "var(--ks-ctl)", perspective: "420px" }}
      >
        <div
          ref={phoneRef}
          className="h-[46px] w-[23px] rounded-[4px]"
          style={{
            background: "linear-gradient(150deg, var(--ks-text-dim), var(--ks-text-faint))",
            // The screen-side highlight is what tells you which way the phone
            // is facing once a preset rolls or flips it past edge-on.
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
            transform: poseToTransform(NEUTRAL, 1),
            transformStyle: "preserve-3d",
          }}
        />
      </div>
      <span className="ks-label truncate" style={{ color: "var(--ks-ctl-text)" }}>
        {preset.label}
      </span>
    </button>
  );
}

export function MotionPanel({
  easing,
  onApplyPreset,
}: {
  /** Previews use the easing you have chosen, so what you watch is what the
      timeline will play. */
  easing: Easing;
  onApplyPreset: (id: string) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex flex-col gap-[14px] pb-[14px]">
      <p className="ks-micro" style={{ color: "var(--ks-text-faint)", lineHeight: 1.5 }}>
        {reducedMotion
          ? "Click to apply. Cards show a still from each move."
          : "Hover to preview, click to apply."}{" "}
        Every move is built relative to your current framing.
      </p>

      {PRESET_GROUPS.map((group) => {
        const presets = MOTION_PRESETS.filter((preset) => preset.kind === group.kind);
        if (!presets.length) return null;
        return (
          <div key={group.kind} className="flex flex-col gap-[7px]">
            <span className="ks-micro uppercase" style={{ color: "var(--ks-text-faint)" }}>
              {/* The picker's labels carry an explanation after an em dash,
                  which is useful in a dropdown and too long for a column
                  this narrow. */}
              {group.label.split(" — ")[0]}
            </span>
            <div className="grid grid-cols-2 gap-[7px]">
              {presets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  easing={easing}
                  reducedMotion={reducedMotion}
                  onApply={() => onApplyPreset(preset.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
