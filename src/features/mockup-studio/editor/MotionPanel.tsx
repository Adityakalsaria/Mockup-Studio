"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { sampleAnimation, type Animation, type Easing } from "../animation";
import { MOTION_PRESETS, PRESET_GROUPS, presetLoops, type MotionPreset } from "./motionPresets";
import { DEFAULT_EDITOR_STATE } from "./editorState";

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
const NEUTRAL = { xAxis: 0, yAxis: 0, zAxis: 0, zoom: 1, panX: 0, panY: 0,
  fold: 0,
  // The lens the stage opens on, so a preset that moves the lens is previewed
  // against the same starting point it will be applied to.
  fov: DEFAULT_EDITOR_STATE.fov,
};

/** Pan is a fraction of the stage; in a 76px-tall card it needs a scale to
    read at all. Tuned so a full-width preset move stays inside its card. */
const PAN_PX = 26;

/**
 * The largest scale a card can show without the phone leaving its box, given a
 * 46px phone in a 76px frame. Pull back peaks at 1.85, which would burst it.
 */
const CARD_FIT_LIMIT = 1.5;

/**
 * The perspective the cards were tuned at, and the anchor for every lens move.
 *
 * Deliberately NOT the geometrically exact projection of the stage camera into
 * a 76px well, which works out near 110px and turns every existing card into a
 * much harder 3D than the grid was designed around. The cards are a legend for
 * the presets, not a second renderer; what they owe is the right CHANGE, and
 * the ratio below delivers that from a resting point that still looks like
 * itself.
 */
const CARD_PERSPECTIVE = 420;

const halfTan = (fovDeg: number): number => Math.tan((fovDeg * Math.PI) / 360);

/**
 * How big the phone reads on a given lens, relative to the neutral one.
 *
 * The cinema presets pin the phone's size by moving `zoom` against `fov`, and
 * a preview that plotted `zoom` alone would show those cards ballooning to
 * twice the size and back -- advertising the exact artefact the preset exists
 * to avoid. On the stage apparent size is `zoom / halfTan(fov)`; this is that
 * same ratio, so the card stays honest about a move it cannot otherwise see.
 */
function lensScale(fovDeg: number): number {
  return halfTan(NEUTRAL.fov) / halfTan(fovDeg);
}

/**
 * CSS perspective for a lens, in px.
 *
 * Perspective distance is inversely proportional to `halfTan(fov)` -- a wider
 * lens is a nearer viewpoint -- so scaling the resting 420px by that ratio
 * moves the card the way the stage moves. Without it a lens move would change
 * only the phone's size in the card and never how much its body recedes,
 * which is the half of the effect actually worth previewing.
 */
function perspectiveFor(fovDeg: number): string {
  return `${(CARD_PERSPECTIVE * (halfTan(NEUTRAL.fov) / halfTan(fovDeg))).toFixed(1)}px`;
}

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
    const pose = sampleAnimation(animation, (i / 40) * animation.durationSec);
    // The EFFECTIVE size, not the raw zoom. A dolly zoom's zoom track peaks
    // around 2x while the phone it describes never changes size at all, so
    // measuring zoom alone would shrink those previews to 75% for a burst
    // that does not happen.
    const size = (pose.zoom ?? 1) * lensScale(pose.fov ?? NEUTRAL.fov);
    peak = Math.max(peak, size);
  }
  return peak > CARD_FIT_LIMIT ? CARD_FIT_LIMIT / peak : 1;
}

function poseToTransform(pose: Partial<typeof NEUTRAL>, fit = 1): string {
  const x = pose.xAxis ?? 0;
  const y = pose.yAxis ?? 0;
  const z = pose.zAxis ?? 0;
  const zoom = (pose.zoom ?? 1) * lensScale(pose.fov ?? NEUTRAL.fov);
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
  // The well, not the phone: `perspective` is a property of the container a
  // 3D child is projected into, so a lens move has to be written here.
  const wellRef = useRef<HTMLDivElement>(null);

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
    const well = wellRef.current;
    const paint = (pose: Partial<typeof NEUTRAL>) => {
      node.style.transform = poseToTransform(pose, fit);
      if (well) well.style.perspective = perspectiveFor(pose.fov ?? NEUTRAL.fov);
    };

    if (!playing || reducedMotion) {
      paint(
        reducedMotion
          ? { ...NEUTRAL, ...sampleAnimation(animation, animation.durationSec * 0.35) }
          : NEUTRAL,
      );
      return;
    }

    // A one-way preset ends and holds; without a tail you would never see the
    // pose it settles on before it snapped back to the start. A seamless one
    // must not get the tail, or the loop it is advertising visibly pauses.
    const TAIL = presetLoops(preset) ? 0 : 0.55;
    const span = animation.durationSec + TAIL;

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = ((now - start) / 1000) % span;
      paint({ ...NEUTRAL, ...sampleAnimation(animation, Math.min(t, animation.durationSec)) });
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
      className="ks-press ks-press-lg group flex flex-col gap-[4px] rounded-[var(--ks-r-card)] p-[8px] text-left"
      style={{ background: "var(--ks-row)" }}
    >
      <div
        // Concentric with the card: 8px radius, 6px of padding, so the well
        // is 2px. Matching the parent's radius instead makes the gap between
        // the two curves widen around the corner, which is the thing that
        // reads as "not quite right" without anyone being able to name it.
        ref={wellRef}
        className="relative grid h-[76px] w-full place-items-center overflow-hidden rounded-[calc(var(--ks-r-card)-6px)]"
        /* Still 420px at rest -- `perspectiveFor(NEUTRAL.fov)` is exactly that
           -- and written through the helper so a card whose preset moves the
           lens has something to move away from. */
        style={{ background: "var(--ks-ctl)", perspective: perspectiveFor(NEUTRAL.fov) }}
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
  hasFold = false,
}: {
  /** Whether the current device has a hinge. Hides the fold presets when not:
      they would animate in the preview and do nothing on the stage. */
  hasFold?: boolean;
  /** Previews use the easing you have chosen, so what you watch is what the
      timeline will play. */
  easing: Easing;
  onApplyPreset: (id: string) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex flex-col gap-[16px] pb-[16px]">
      <p className="ks-micro" style={{ color: "var(--ks-text-faint)", lineHeight: 1.5 }}>
        {reducedMotion
          ? "Click to apply. Cards show a still from each move."
          : "Hover to preview, click to apply."}{" "}
        Every move is built relative to your current framing.
      </p>

      {PRESET_GROUPS.map((group) => {
        const presets = MOTION_PRESETS.filter(
          (preset) => preset.kind === group.kind && (hasFold || !preset.needsFold),
        );
        if (!presets.length) return null;
        return (
          <div key={group.kind} className="flex flex-col gap-[8px]">
            <span className="ks-section-label" style={{ color: "var(--ks-text-muted)" }}>
              {/* The picker's labels carry an explanation after an em dash,
                  which is useful in a dropdown and too long for a column
                  this narrow. */}
              {group.label.split(" — ")[0]}
            </span>
            <div className="grid grid-cols-2 gap-[8px]">
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
