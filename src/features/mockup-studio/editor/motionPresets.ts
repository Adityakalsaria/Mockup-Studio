import type { AnimatableKey, Animation, Keyframe } from "../animation";
import { RANGES } from "./editorState";

/**
 * Ready-made camera moves.
 *
 * Every preset is built RELATIVE to the pose currently on screen, and every
 * one-way preset ENDS on it. That is the whole idea: you frame the shot you
 * want by hand, then pick how the camera arrives at it. Presets with absolute
 * poses baked in would throw that framing away the moment you applied one,
 * and you would be back to rebuilding the shot by hand afterwards.
 *
 * The looping presets start and end on the same values instead, so the last
 * frame cuts back to the first without a jump.
 */

export interface Pose {
  xAxis: number;
  yAxis: number;
  zAxis: number;
  zoom: number;
  panX: number;
  panY: number;
  fold: number;
}

/**
 * Rotation is cyclic — 400 degrees is a real pose and the turntable needs it —
 * so only the bounded properties are clamped. An unclamped zoom would happily
 * go negative and turn the phone inside out.
 */
const BOUNDED: Partial<Record<AnimatableKey, { min: number; max: number }>> = {
  zoom: RANGES.zoom,
  panX: RANGES.panX,
  panY: RANGES.panY,
  fold: RANGES.fold,
};

function clamp(key: AnimatableKey, value: number): number {
  const bounds = BOUNDED[key];
  if (!bounds) return value;
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

/** Rounded because a keyframe you might later nudge by hand should be legible. */
function track(key: AnimatableKey, points: Array<[number, number]>): Keyframe[] {
  return points.map(([time, value]) => ({
    time,
    value: Number(clamp(key, value).toFixed(4)),
  }));
}

/**
 * Entrances arrive on your framing, Moves travel through it, Loops return to
 * where they began. Grouping them says which is which without reading the
 * hint, and the three behave differently enough that mixing them in one list
 * made the picker read as a pile.
 */
export type PresetKind = "entrance" | "move" | "loop";

export interface MotionPreset {
  id: string;
  label: string;
  kind: PresetKind;
  /**
   * Only offered for devices with a hinge.
   *
   * A fold preset on a rigid phone would key a property the model has no
   * geometry for: the card would animate in the picker and do nothing on the
   * stage, which is worse than not being there.
   */
  needsFold?: boolean;
  /** Shown in the picker; says what it does, not what it is called. */
  hint: string;
  /**
   * Easing is deliberately not part of a preset: it is a global preference
   * about how motion should feel, and applying a preset should not silently
   * overrule the one already chosen.
   */
  build: (pose: Pose) => Omit<Animation, "easing">;
}


/**
 * ---------------------------------------------------------------------------
 * How these are built
 * ---------------------------------------------------------------------------
 *
 * The first set of presets were two keys and one property each: start value,
 * end value, done. That is what made them dull, and it is worth naming the
 * three specific reasons rather than calling it taste.
 *
 * 1. ONE MOVING PROPERTY READS AS A SLIDESHOW. Real camera moves change
 *    several things at once — a push-in also drifts a little, a turn also
 *    tips. Each preset below has a primary property that carries the move, a
 *    secondary that supports it, and often a third, tiny one for life. A
 *    single property is a transition; three are a shot.
 *
 * 2. EVERYTHING LANDED ON THE SAME FRAME. When every property finishes at
 *    exactly `durationSec`, the whole thing stops dead, all at once, and the
 *    result feels mechanical. Here the supporting properties settle BEFORE
 *    the primary one, so the move keeps resolving after its main gesture is
 *    over — follow-through, in the Disney sense.
 *
 * 3. NOTHING EVER OVERSHOT. Interpolation is monotone cubic, which is
 *    deliberate: it guarantees a key set to 30 degrees is reached via 30 and
 *    not 34. The cost is that no amount of easing will give you a settle, so
 *    an overshoot has to be WRITTEN — go past the target on one key, come
 *    back on the next. That is what most of the three-key tracks below are.
 *
 * A caution that shapes the numbers: monotone interpolation flattens the
 * tangent wherever the data turns around, so the peak of an overshoot is a
 * genuine instant of stillness. Big overshoots therefore read as a hitch
 * rather than as momentum. Every one here is small — a few degrees, a few
 * percent of zoom — and placed late, where a settle belongs.
 *
 * Timing is asymmetric throughout: most of the distance is covered in the
 * first half, and the remainder spent arriving. Even spacing is what made
 * the old ones feel like they were being dragged rather than thrown.
 */
export const MOTION_PRESETS: MotionPreset[] = [
  // ---------------------------------------------------------- ENTRANCES ----
  {
    id: "rotate-in",
    label: "Rotate in",
    kind: "entrance",
    hint: "Turns in, overshoots a touch, settles",
    build: (p) => ({
      durationSec: 2.2,
      tracks: {
        // 80% of the turn is done by the halfway mark; the rest is arrival.
        yAxis: track("yAxis", [
          [0, p.yAxis - 58],
          [1.1, p.yAxis - 11],
          [1.7, p.yAxis + 5],
          [2.2, p.yAxis],
        ]),
        // Settles early, so the frame is composed before the turn finishes.
        zoom: track("zoom", [
          [0, p.zoom * 0.86],
          [1.6, p.zoom * 1.012],
          [2.2, p.zoom],
        ]),
        // Barely visible. Its job is to stop the turn reading as a flat spin.
        xAxis: track("xAxis", [
          [0, p.xAxis + 5],
          [2.2, p.xAxis],
        ]),
      },
    }),
  },
  {
    id: "whip",
    label: "Whip in",
    kind: "entrance",
    hint: "Fast turn that snaps into place",
    build: (p) => ({
      durationSec: 1.5,
      tracks: {
        // Three quarters of a very large turn inside the first third: the
        // speed IS the effect, and the overshoot is what stops it landing
        // like a brick.
        yAxis: track("yAxis", [
          [0, p.yAxis - 96],
          [0.5, p.yAxis - 18],
          [0.95, p.yAxis + 11],
          [1.5, p.yAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.92],
          [0.9, p.zoom * 1.03],
          [1.5, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "drop-in",
    label: "Drop in",
    kind: "entrance",
    hint: "Falls from above and settles under its own weight",
    build: (p) => ({
      durationSec: 1.8,
      tracks: {
        // Accelerating fall, then two decreasing rebounds. Two, not one: a
        // single bounce reads as a mistake, two reads as weight.
        panY: track("panY", [
          [0, p.panY + 0.42],
          [0.75, p.panY - 0.035],
          [1.15, p.panY + 0.012],
          [1.8, p.panY],
        ]),
        // Tips forward on the way down and rights itself — the phone falls
        // like an object rather than a layer.
        xAxis: track("xAxis", [
          [0, p.xAxis + 15],
          [0.85, p.xAxis - 4],
          [1.8, p.xAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 1.05],
          [0.8, p.zoom * 0.99],
          [1.8, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "slide-in",
    label: "Slide in",
    kind: "entrance",
    hint: "Comes in from the left on a curve",
    build: (p) => ({
      durationSec: 1.9,
      tracks: {
        panX: track("panX", [
          [0, p.panX - 0.58],
          [1.2, p.panX + 0.028],
          [1.9, p.panX],
        ]),
        // Trails the slide and settles after it. The lag is what bends the
        // path into an arc instead of a straight line across the frame.
        yAxis: track("yAxis", [
          [0, p.yAxis - 22],
          [1.35, p.yAxis + 4],
          [1.9, p.yAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.93],
          [1.9, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "tilt-reveal",
    label: "Tilt reveal",
    kind: "entrance",
    hint: "Lies back, then tips up to face you",
    build: (p) => ({
      durationSec: 2.4,
      tracks: {
        // The dip at 0.2s is anticipation: it leans further away before it
        // comes up, which makes the rise look driven rather than dragged.
        xAxis: track("xAxis", [
          [0, p.xAxis - 46],
          [0.2, p.xAxis - 53],
          [1.5, p.xAxis + 6],
          [2.4, p.xAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.88],
          [1.8, p.zoom * 1.01],
          [2.4, p.zoom],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis - 9],
          [2.4, p.yAxis],
        ]),
      },
    }),
  },
  {
    id: "push-in",
    label: "Push in",
    kind: "entrance",
    hint: "Moves in close on a slow arc",
    build: (p) => ({
      durationSec: 2.4,
      tracks: {
        zoom: track("zoom", [
          [0, p.zoom * 0.52],
          [1.5, p.zoom * 0.93],
          [2.4, p.zoom],
        ]),
        // A dolly that only scales looks like a zoom. Letting the angle
        // change slightly as it closes is what sells it as movement.
        yAxis: track("yAxis", [
          [0, p.yAxis - 13],
          [2.4, p.yAxis],
        ]),
        panY: track("panY", [
          [0, p.panY + 0.03],
          [1.9, p.panY - 0.004],
          [2.4, p.panY],
        ]),
      },
    }),
  },
  {
    id: "pull-back",
    label: "Pull back",
    kind: "entrance",
    hint: "Starts tight, opens out to the whole phone",
    build: (p) => ({
      durationSec: 2.4,
      tracks: {
        // Undershoots rather than overshoots — it opens slightly too far and
        // comes back, which is how a real pull-back finds its frame.
        zoom: track("zoom", [
          [0, p.zoom * 1.85],
          [1.6, p.zoom * 0.975],
          [2.4, p.zoom],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis - 8],
          [2.4, p.xAxis],
        ]),
      },
    }),
  },
  {
    id: "hero",
    label: "Hero sweep",
    kind: "entrance",
    hint: "Turn, tilt and push in, landing one after another",
    build: (p) => ({
      durationSec: 3.2,
      tracks: {
        // The three land at 2.55, 2.9 and 3.2. Staggering the arrivals is the
        // entire difference between a sweep and three things stopping at once.
        zoom: track("zoom", [
          [0, p.zoom * 0.58],
          [1.9, p.zoom * 0.94],
          [2.55, p.zoom],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis + 24],
          [1.7, p.xAxis - 2],
          [2.9, p.xAxis],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis - 46],
          [1.6, p.yAxis - 8],
          [2.5, p.yAxis + 4],
          [3.2, p.yAxis],
        ]),
      },
    }),
  },

  {
    id: "crash-zoom",
    label: "Crash zoom",
    kind: "entrance",
    hint: "Slams in from wide to your framing",
    build: (p) => ({
      durationSec: 0.9,
      tracks: {
        // Two thirds of the distance inside the first third of the time. The
        // violence is the point; the small overshoot is the only thing
        // stopping it hitting the end like a wall.
        zoom: track("zoom", [
          [0, p.zoom * 0.5],
          [0.3, p.zoom * 0.87],
          [0.6, p.zoom * 1.05],
          [0.9, p.zoom],
        ]),
        // A few degrees of roll thrown off by the impact and recovered. This
        // is the axis that makes a fast move feel like it had force behind
        // it rather than being played back quickly.
        zAxis: track("zAxis", [
          [0, p.zAxis - 4],
          [0.6, p.zAxis + 1.5],
          [0.9, p.zAxis],
        ]),
      },
    }),
  },
  {
    id: "dutch-settle",
    label: "Dutch settle",
    kind: "entrance",
    hint: "Arrives tilted off-axis and rights itself",
    build: (p) => ({
      durationSec: 2,
      tracks: {
        // A dutch angle is unease; levelling out of one is release. Roll
        // carries the whole idea, so it is the only property that overshoots.
        zAxis: track("zAxis", [
          [0, p.zAxis - 19],
          [1.3, p.zAxis + 4],
          [2, p.zAxis],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis - 21],
          [2, p.yAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.87],
          [1.6, p.zoom * 1.01],
          [2, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "crane-down",
    label: "Crane down",
    kind: "entrance",
    hint: "Descends from above, levelling as it lands",
    build: (p) => ({
      durationSec: 2.6,
      tracks: {
        panY: track("panY", [
          [0, p.panY + 0.5],
          [1.8, p.panY - 0.022],
          [2.6, p.panY],
        ]),
        // Looking down at the start and level by the end is what separates a
        // crane from a slide: the ANGLE changes with the height, so the move
        // reads as a camera descending rather than a phone sliding up.
        xAxis: track("xAxis", [
          [0, p.xAxis + 24],
          [1.9, p.xAxis - 3],
          [2.6, p.xAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.82],
          [2.6, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "tumble-in",
    label: "Tumble in",
    kind: "entrance",
    hint: "Turns on all three axes and lands square",
    build: (p) => ({
      durationSec: 2.3,
      tracks: {
        // The only preset that drives all three rotations. They settle at
        // 2.3, 2.0 and 1.75 — staggering the axes is what keeps a tumble from
        // reading as one rigid body snapping to a stop.
        yAxis: track("yAxis", [
          [0, p.yAxis - 128],
          [1.15, p.yAxis - 24],
          [1.8, p.yAxis + 7],
          [2.3, p.yAxis],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis + 36],
          [1.35, p.xAxis - 5],
          [2, p.xAxis],
        ]),
        zAxis: track("zAxis", [
          [0, p.zAxis - 28],
          [1.2, p.zAxis + 5],
          [1.75, p.zAxis],
        ]),
      },
    }),
  },
  // -------------------------------------------------------------- MOVES ----
  {
    id: "pan-across",
    label: "Pan across",
    kind: "move",
    hint: "Drifts past, turning to hold your eye",
    build: (p) => ({
      durationSec: 4,
      tracks: {
        panX: track("panX", [
          [0, p.panX - 0.34],
          [4, p.panX + 0.34],
        ]),
        // Counter-rotation. The phone turns against the drift, as though
        // keeping its face to camera — the parallax is what gives the move
        // depth instead of sliding a flat card sideways.
        yAxis: track("yAxis", [
          [0, p.yAxis + 11],
          [4, p.yAxis - 11],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.97],
          [2, p.zoom * 1.02],
          [4, p.zoom * 0.97],
        ]),
      },
    }),
  },
  {
    id: "flip",
    label: "Flip",
    kind: "move",
    hint: "Turns from its back around to the front",
    build: (p) => ({
      durationSec: 2.1,
      tracks: {
        yAxis: track("yAxis", [
          [0, p.yAxis - 180],
          [1.25, p.yAxis - 34],
          [1.7, p.yAxis + 8],
          [2.1, p.yAxis],
        ]),
        // Dips closer through the middle of the turn, so the edge-on moment —
        // where the phone is thinnest and least interesting — passes quickly
        // and small.
        zoom: track("zoom", [
          [0, p.zoom * 0.9],
          [1.05, p.zoom * 0.82],
          [2.1, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "showcase",
    label: "Showcase",
    kind: "move",
    hint: "Swings around the phone and comes to rest",
    build: (p) => ({
      durationSec: 4.2,
      tracks: {
        // Most of a half-turn, decelerating hard into the last quarter.
        yAxis: track("yAxis", [
          [0, p.yAxis - 150],
          [1.6, p.yAxis - 62],
          [3.0, p.yAxis - 14],
          [3.7, p.yAxis + 5],
          [4.2, p.yAxis],
        ]),
        // Rises over the top of the arc and comes back down, which is what
        // makes the path read as an orbit rather than a spin on the spot.
        xAxis: track("xAxis", [
          [0, p.xAxis - 6],
          [2.1, p.xAxis + 13],
          [4.2, p.xAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.8],
          [2.1, p.zoom * 0.88],
          [4.2, p.zoom],
        ]),
      },
    }),
  },

  {
    id: "vertigo",
    label: "Vertigo push",
    kind: "move",
    hint: "Closes in while the framing slides under you",
    build: (p) => ({
      durationSec: 3,
      tracks: {
        // Not a true dolly zoom — that needs the field of view to fight the
        // camera distance, and the stage has one fixed 38 degree lens. What
        // it borrows is the unease: the phone grows while the frame drifts
        // the other way, so the size and the position disagree about what is
        // happening.
        zoom: track("zoom", [
          [0, p.zoom * 0.78],
          [3, p.zoom * 1.22],
        ]),
        panY: track("panY", [
          [0, p.panY + 0.07],
          [3, p.panY - 0.07],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis - 11],
          [3, p.xAxis + 11],
        ]),
      },
    }),
  },
  {
    id: "whip-pan",
    label: "Whip pan",
    kind: "move",
    hint: "Slow, then rips across the frame, then slow again",
    build: (p) => ({
      durationSec: 1.2,
      tracks: {
        // Slow, fast, slow: the outer keys are close together in value and
        // far apart in time, the middle pair the reverse. On film the fast
        // middle would smear into motion blur; there is none here, so the
        // speed contrast has to do that work by itself.
        panX: track("panX", [
          [0, p.panX - 0.55],
          [0.4, p.panX - 0.42],
          [0.8, p.panX + 0.42],
          [1.2, p.panX + 0.55],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis + 26],
          [0.4, p.yAxis + 19],
          [0.8, p.yAxis - 19],
          [1.2, p.yAxis - 26],
        ]),
      },
    }),
  },
  {
    id: "crane-up",
    label: "Crane up",
    kind: "move",
    hint: "Rises away, tipping down as it goes",
    build: (p) => ({
      durationSec: 3.2,
      tracks: {
        panY: track("panY", [
          [0, p.panY - 0.08],
          [3.2, p.panY + 0.42],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis - 5],
          [3.2, p.xAxis + 20],
        ]),
        // Opens out as it climbs, which is what makes it read as leaving
        // rather than as the phone falling out of frame.
        zoom: track("zoom", [
          [0, p.zoom],
          [3.2, p.zoom * 0.78],
        ]),
      },
    }),
  },
  // -------------------------------------------------------------- LOOPS ----
  {
    id: "turntable",
    label: "Turntable",
    kind: "loop",
    hint: "Full 360° spin — loops seamlessly",
    build: (p) => ({
      durationSec: 6,
      tracks: {
        // Evenly spaced on purpose: under a monotone fit that gives a
        // constant slope, so the spin runs at one rate the whole way round
        // and the loop point is invisible. Overshoot would be wrong here —
        // a turntable that hesitates is a broken turntable.
        yAxis: track("yAxis", [
          [0, p.yAxis],
          [3, p.yAxis + 180],
          [6, p.yAxis + 360],
        ]),
        // One slow breath across the whole revolution, returning exactly to
        // its start so the seam stays invisible.
        xAxis: track("xAxis", [
          [0, p.xAxis],
          [3, p.xAxis + 3.5],
          [6, p.xAxis],
        ]),
      },
    }),
  },
  {
    id: "float",
    label: "Float",
    kind: "loop",
    hint: "Slow idle drift — loops seamlessly",
    build: (p) => ({
      durationSec: 5,
      tracks: {
        // The axes are deliberately out of phase: in step they read as one
        // rocking motion, offset they read as something suspended.
        yAxis: track("yAxis", [
          [0, p.yAxis - 5],
          [2.5, p.yAxis + 5],
          [5, p.yAxis - 5],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis + 3],
          [1.25, p.xAxis - 3],
          [3.75, p.xAxis + 3],
          [5, p.xAxis + 3],
        ]),
        panY: track("panY", [
          [0, p.panY],
          [2.5, p.panY + 0.035],
          [5, p.panY],
        ]),
      },
    }),
  },
  {
    id: "handheld",
    label: "Handheld",
    kind: "loop",
    hint: "Barely-there human drift, as if someone is holding it",
    build: (p) => ({
      durationSec: 8,
      tracks: {
        // The point is that no two axes share a period, so the pattern never
        // visibly repeats inside the loop. Regular motion reads as machinery;
        // this should read as a person failing to hold perfectly still.
        panX: track("panX", [
          [0, p.panX],
          [2.6, p.panX + 0.016],
          [5.1, p.panX - 0.012],
          [8, p.panX],
        ]),
        panY: track("panY", [
          [0, p.panY],
          [1.9, p.panY - 0.013],
          [4.4, p.panY + 0.017],
          [6.6, p.panY - 0.007],
          [8, p.panY],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis],
          [3.1, p.yAxis + 2.2],
          [5.8, p.yAxis - 1.6],
          [8, p.yAxis],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis],
          [2.2, p.xAxis - 1.4],
          [4.9, p.xAxis + 1.9],
          [8, p.xAxis],
        ]),
      },
    }),
  },
  {
    id: "pendulum",
    label: "Pendulum",
    kind: "loop",
    hint: "Rocks like something hanging — loops seamlessly",
    build: (p) => ({
      durationSec: 4.4,
      tracks: {
        // Roll is the swing. The monotone fit flattens its tangent at each
        // turnaround, which here is exactly right: a pendulum really is
        // motionless for an instant at the top of its arc.
        zAxis: track("zAxis", [
          [0, p.zAxis - 8],
          [2.2, p.zAxis + 8],
          [4.4, p.zAxis - 8],
        ]),
        // Drifts with the swing, a quarter period behind, so the phone
        // travels through the bottom of the arc rather than rolling on the
        // spot.
        panX: track("panX", [
          [0, p.panX],
          [1.1, p.panX + 0.03],
          [3.3, p.panX - 0.03],
          [4.4, p.panX],
        ]),
        panY: track("panY", [
          [0, p.panY],
          [2.2, p.panY - 0.014],
          [4.4, p.panY],
        ]),
      },
    }),
  },
  {
    id: "breathe",
    label: "Breathe",
    kind: "loop",
    hint: "Almost imperceptible pulse for a held shot",
    build: (p) => ({
      durationSec: 6,
      tracks: {
        // Deliberately at the edge of visibility. A held product shot that is
        // perfectly still reads as a frozen frame, and a viewer starts to
        // wonder whether the video has stalled; three percent of scale over
        // six seconds is enough to say it has not, and little enough that
        // nobody catches it doing so.
        zoom: track("zoom", [
          [0, p.zoom],
          [3, p.zoom * 1.03],
          [6, p.zoom],
        ]),
        panY: track("panY", [
          [0, p.panY],
          [3, p.panY - 0.012],
          [6, p.panY],
        ]),
      },
    }),
  },

  // ------------------------------------------------------------- FOLDS ----
  //
  // The hinge is the only thing this device does that no other device can, so
  // these are built around it rather than around the camera. In each one the
  // fold leads and the camera follows a beat behind: opening a phone and
  // pushing in at the same rate reads as one blurred event, where letting the
  // hinge finish first gives the eye something to arrive at.
  {
    id: "unfold",
    label: "Unfold",
    kind: "entrance",
    needsFold: true,
    hint: "Opens the hinge, camera eases in behind it",
    build: (p) => ({
      durationSec: 2.4,
      tracks: {
        // Shut, then most of the way open by 1.4s. The last 20 degrees take
        // as long as the first 80 -- a hinge has mass, and the slow finish is
        // the whole reason it reads as a hinge and not a wipe.
        fold: track("fold", [
          [0, 100],
          [0.5, 88],
          [1.4, 18],
          [2.0, 2],
          [2.4, 0],
        ]),
        // Starts after the hinge has broken open, so the two moves are legible
        // as cause and effect rather than one gesture.
        zoom: track("zoom", [
          [0, p.zoom * 0.9],
          [0.6, p.zoom * 0.92],
          [2.4, p.zoom],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis - 16],
          [2.4, p.yAxis],
        ]),
      },
    }),
  },
  {
    id: "fold-shut",
    label: "Fold shut",
    kind: "move",
    needsFold: true,
    hint: "Closes it, and pulls back as it goes",
    build: (p) => ({
      durationSec: 2.0,
      tracks: {
        // The mirror of Unfold, and deliberately not its reverse: closing is
        // the faster half of a hinge in the hand, and it lands rather than
        // settles.
        fold: track("fold", [
          [0, 0],
          [0.35, 8],
          [1.5, 92],
          [2.0, 100],
        ]),
        zoom: track("zoom", [
          [0, p.zoom],
          [2.0, p.zoom * 0.94],
        ]),
        xAxis: track("xAxis", [
          [0, p.xAxis],
          [2.0, p.xAxis + 4],
        ]),
      },
    }),
  },
  {
    id: "fold-reveal",
    label: "Cover to inside",
    kind: "move",
    needsFold: true,
    hint: "Shows the cover screen, turns, then opens",
    build: (p) => ({
      durationSec: 3.4,
      tracks: {
        // Held shut long enough to read the cover screen, then opened once the
        // turn has carried the inside toward the camera.
        fold: track("fold", [
          [0, 100],
          [1.2, 100],
          [2.6, 12],
          [3.4, 0],
        ]),
        // Half a turn across the whole clip, so the device presents its
        // outside first and its inside last.
        yAxis: track("yAxis", [
          [0, p.yAxis - 180],
          [1.2, p.yAxis - 150],
          [3.4, p.yAxis],
        ]),
        zoom: track("zoom", [
          [0, p.zoom * 0.95],
          [1.2, p.zoom * 0.95],
          [3.4, p.zoom],
        ]),
      },
    }),
  },
  {
    id: "fold-breathe",
    label: "Hinge idle",
    kind: "loop",
    needsFold: true,
    hint: "Opens and closes a little, forever",
    build: (p) => ({
      durationSec: 5.0,
      tracks: {
        // Never fully shut and never fully open: a loop that hits either end
        // pauses there, and the pause is what makes a loop look like a loop.
        fold: track("fold", [
          [0, 8],
          [2.5, 34],
          [5.0, 8],
        ]),
        yAxis: track("yAxis", [
          [0, p.yAxis],
          [2.5, p.yAxis + 7],
          [5.0, p.yAxis],
        ]),
      },
    }),
  },

];

/** Order the picker shows them in. */
export const PRESET_GROUPS: Array<{ kind: PresetKind; label: string }> = [
  { kind: "entrance", label: "Entrances — arrive on your framing" },
  { kind: "move", label: "Moves — travel through it" },
  { kind: "loop", label: "Loops — seamless, for idle shots" },
];

export function getMotionPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS.find((preset) => preset.id === id);
}

/**
 * Stretch a preset to cover the loaded clip.
 *
 * Presets carry their own length — 2.5s for a push-in, 6s for a turntable —
 * which is right with nothing else on the timeline and wrong the moment there
 * is a video, because applying one would shorten the timeline to the preset
 * and the clip would appear to stop partway through. The move is the thing
 * being chosen here, not how long the shot runs, so the timing is rescaled to
 * whatever the footage needs and the shape of the motion is preserved exactly.
 */
export function fitToClip(
  animation: Omit<Animation, "easing">,
  clipSec: number,
): Omit<Animation, "easing"> {
  if (!clipSec || clipSec <= 0) return animation;
  const target = Math.min(30, Math.max(0.5, clipSec));
  const factor = target / animation.durationSec;
  if (!Number.isFinite(factor) || factor <= 0) return animation;

  const tracks: Animation["tracks"] = {};
  for (const [key, keys] of Object.entries(animation.tracks)) {
    if (!keys) continue;
    tracks[key as AnimatableKey] = keys.map((k) => ({
      time: Number((k.time * factor).toFixed(4)),
      value: k.value,
    }));
  }
  return { durationSec: Number(target.toFixed(2)), tracks };
}
