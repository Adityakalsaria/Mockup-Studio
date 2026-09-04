import type { AnimatableKey, Animation, Keyframe } from "../animation";
import { RANGES } from "./editorState";
import { compileSequence, type Shot } from "./sequence";

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
  /** Vertical field of view in degrees -- the LENS, not the distance. */
  fov: number;
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
  // Below 14 degrees the phone stops reading as a phone and above 90 it is a
  // fisheye. A dolly zoom wants to run hard at one of those walls, so the
  // clamp here is doing real work rather than guarding a typo.
  fov: RANGES.fov,
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
 * Half the frame's angular height, as a tangent.
 *
 * Apparent size on the stage is proportional to `zoom / halfTan(fov)` -- the
 * model's scale over how much the lens takes in. Every lens move in this file
 * is written against that one relation, so it is worth naming rather than
 * rederiving inline four times.
 */
const halfTan = (fovDeg: number): number => Math.tan((fovDeg * Math.PI) / 360);

/** A lens value kept inside the stage's range, so the compensation below is
    computed from the fov that will actually be used rather than from one the
    clamp is about to discard. */
const fovAt = (value: number): number =>
  Math.max(RANGES.fov.min, Math.min(RANGES.fov.max, value));

/** `factor` times the lens in use -- 1.8 wider, 0.5 longer -- kept in range. */
const lens = (p: Pose, factor: number): number => fovAt(p.fov * factor);

/**
 * The zoom that holds the phone at the size it is now, on a different lens.
 *
 * This is the whole trick behind a dolly zoom, and it is one line. Change the
 * lens alone and the phone grows or shrinks with it, so the move reads as an
 * ordinary zoom that has picked up a distortion artefact. Change the lens and
 * compensate the scale, and the phone stays pinned to its size in the frame
 * while its own perspective -- how far the body recedes, how hard the chamfer
 * flares -- collapses or opens underneath it. Nothing translates, and the
 * shot moves anyway.
 */
const sizeHold = (p: Pose, fovDeg: number): number =>
  p.zoom * (halfTan(fovDeg) / halfTan(p.fov));

/**
 * Entrances arrive on your framing, Moves travel through it, Loops return to
 * where they began. Grouping them says which is which without reading the
 * hint, and the three behave differently enough that mixing them in one list
 * made the picker read as a pile.
 */
export type PresetKind = "sequence" | "cinema" | "entrance" | "move" | "loop";

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
   * Whether the last frame cuts back to the first without a jump.
   *
   * Usually the same thing as `kind === "loop"`, and defaulted to it -- but
   * not always, because `kind` now carries a second meaning. A cinema preset
   * can be seamless too, and the preview has to know: a one-way preset gets a
   * tail so you see the pose it settles on, and a seamless one must not, or
   * the loop it is advertising visibly pauses once per cycle.
   */
  loops?: boolean;
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
  // ---------------------------------------------------------- SEQUENCES ----
  /*
   * The only presets that CUT.
   *
   * Everything else in this file is one continuous camera move, and the reason
   * these exist is that a reference reel was measured rather than admired.
   * Ten seconds, twelve transitions, a beat every 0.7 seconds -- and in the
   * middle of it, 1.4 seconds where the subject's bounding box is identical
   * frame to frame. The object is not moving at all there. All of the energy
   * in that stretch is coming from the rhythm of the edit around it.
   *
   * That is not a smoother push-in. It is a different instrument, and no
   * amount of craft inside a single move reaches it.
   *
   * Three things carry over from the measurement into every preset below.
   *
   * BEATS ARE SHORT AND EVEN. Between half a second and one-and-a-bit. The
   * regularity is the point -- an edit on an irregular beat reads as a mistake
   * rather than as a rhythm.
   *
   * EVERY SHOT IS STILL BEFORE IT IS CUT FROM. That is `settleAt`: the move
   * finishes in the first two thirds and the shot SITS for the rest. A shot
   * still travelling when the cut takes it reads as an accident, and it is the
   * most common way an edit like this falls apart.
   *
   * ONE BEAT DOES NOTHING. Each of these holds a completely still frame
   * somewhere in the middle. It is what gives the cut after it its snap, and
   * it is the single most counter-intuitive thing in the measurement -- the
   * stillest part of the reference is what makes the rest feel fast.
   *
   * What is NOT here, and is worth saying plainly: the reference glues its
   * cuts together with motion blur, and this stage has none. These will read
   * harder and more abrupt than the thing they are modelled on until that
   * exists.
   */
  {
    id: "cut-reel",
    label: "Cut reel",
    kind: "sequence",
    hint: "Six angles on a fast beat, cut together — ends on your framing",
    build: (p) => {
      // 0.62s a beat. Fast enough to read as an edit rather than as a
      // slideshow, slow enough that each frame is legible before it goes.
      const B = 0.62;
      const shots: Shot[] = [
        // Wide and off-axis, drifting in. An establishing beat that is already
        // moving, so the first cut lands on motion rather than starting it.
        {
          durationSec: B,
          settleAt: 0.7,
          from: { zoom: p.zoom * 0.6, yAxis: p.yAxis - 34, xAxis: p.xAxis + 10 },
          to: { zoom: p.zoom * 0.72, yAxis: p.yAxis - 24, xAxis: p.xAxis + 7 },
        },
        // Hard the other way. Cutting across the axis is what makes a cut feel
        // like a cut; two similar angles in a row read as a jump in a single
        // shot, which is the one thing an edit must never look like.
        {
          durationSec: B,
          settleAt: 0.62,
          from: { zoom: p.zoom * 1.5, yAxis: p.yAxis + 30, panY: p.panY + 0.22 },
          to: { zoom: p.zoom * 1.62, yAxis: p.yAxis + 22, panY: p.panY + 0.18 },
        },
        // Tight and square. The readable beat -- if the screen content matters
        // at all, this is the frame someone actually reads it in.
        {
          durationSec: B,
          settleAt: 0.55,
          from: { zoom: p.zoom * 2.1, panY: p.panY - 0.34, yAxis: p.yAxis - 4 },
          to: { zoom: p.zoom * 2.2, panY: p.panY - 0.3, yAxis: p.yAxis },
        },
        // The one that does nothing. Dead still, on a long lens so the body
        // reads flat and graphic. This is the beat the measurement argued for.
        {
          durationSec: B * 0.8,
          from: {
            zoom: sizeHold(p, lens(p, 0.6)) * 1.35,
            fov: lens(p, 0.6),
            yAxis: p.yAxis + 12,
            xAxis: p.xAxis - 6,
          },
        },
        // Whip out to wide. Fast, and it settles with a fifth of the beat to
        // spare, so there is a held frame before the last cut.
        {
          durationSec: B,
          settleAt: 0.5,
          from: { zoom: p.zoom * 0.5, yAxis: p.yAxis - 52, zAxis: p.zAxis - 7 },
          to: { zoom: p.zoom * 0.78, yAxis: p.yAxis - 14, zAxis: p.zAxis - 2 },
        },
        // Lands on your framing, and gets a beat and a half to sit on it --
        // the shot anyone would actually freeze the video on.
        {
          durationSec: B * 1.6,
          settleAt: 0.6,
          from: { zoom: p.zoom * 1.1, yAxis: p.yAxis + 9, xAxis: p.xAxis + 3, fov: p.fov },
          to: { zoom: p.zoom, yAxis: p.yAxis, xAxis: p.xAxis, panY: p.panY, panX: p.panX },
        },
      ];
      return compileSequence(shots, p);
    },
  },
  {
    id: "three-beat",
    label: "Three beats",
    kind: "sequence",
    hint: "Wide, then three-quarter, then tight — two cuts, slow and editorial",
    build: (p) => {
      /*
       * The restrained one, and the one to reach for over a headline. Two cuts
       * in four seconds rather than five in five: the grammar of a considered
       * product page instead of a social reel, and it survives being watched
       * more than once, which a fast cut reel does not.
       *
       * Wide, three-quarter, tight is the oldest shot progression there is,
       * and it works because each cut answers a question the previous frame
       * raised -- what is it, what is it like, what is it made of.
       */
      const shots: Shot[] = [
        {
          durationSec: 1.35,
          settleAt: 0.75,
          from: { zoom: p.zoom * 0.66, yAxis: p.yAxis - 5, fov: lens(p, 1.25) },
          to: { zoom: p.zoom * 0.74, yAxis: p.yAxis, fov: lens(p, 1.15) },
        },
        {
          durationSec: 1.35,
          settleAt: 0.7,
          from: { zoom: p.zoom * 1.18, yAxis: p.yAxis + 34, xAxis: p.xAxis + 8, fov: p.fov },
          to: { zoom: p.zoom * 1.26, yAxis: p.yAxis + 26, xAxis: p.xAxis + 5, fov: p.fov },
        },
        {
          durationSec: 1.5,
          settleAt: 0.62,
          // Ends exactly on your framing, on your lens, like every one-way
          // preset in this file.
          from: { zoom: p.zoom * 1.16, yAxis: p.yAxis - 8, panY: p.panY - 0.1, fov: p.fov },
          to: { zoom: p.zoom, yAxis: p.yAxis, panY: p.panY, xAxis: p.xAxis, fov: p.fov },
        },
      ];
      return compileSequence(shots, p);
    },
  },
  {
    id: "whip-cuts",
    label: "Whip cuts",
    kind: "sequence",
    hint: "Every shot arrives mid-whip and stops dead — hardest cut of the three",
    build: (p) => {
      /*
       * The aggressive one. Each beat opens ALREADY MOVING fast and stops
       * inside the first half, so the cut lands on a frame that has just
       * arrived and is now completely still. That contrast -- violent, then
       * frozen, then violent again -- is the effect; it is not the speed.
       *
       * Beats alternate short and shorter rather than staying even, which is
       * the one place these presets break their own rule about regularity. A
       * whip edit is syncopated by nature: identical spacing turns it into a
       * metronome and the whole thing goes flat.
       *
       * This is the preset that will suffer most from having no motion blur.
       * A real whip cut is half blur; here the move is simply very fast.
       */
      const shots: Shot[] = [
        {
          durationSec: 0.5,
          settleAt: 0.42,
          from: { yAxis: p.yAxis - 88, zoom: p.zoom * 0.85, zAxis: p.zAxis - 9 },
          to: { yAxis: p.yAxis - 30, zoom: p.zoom * 0.95, zAxis: p.zAxis - 2 },
        },
        {
          durationSec: 0.42,
          settleAt: 0.38,
          from: { yAxis: p.yAxis + 76, zoom: p.zoom * 1.7, panX: p.panX + 0.4 },
          to: { yAxis: p.yAxis + 28, zoom: p.zoom * 1.55, panX: p.panX + 0.12 },
        },
        {
          durationSec: 0.55,
          settleAt: 0.4,
          from: { panY: p.panY - 0.75, zoom: p.zoom * 2.3, xAxis: p.xAxis + 16 },
          to: { panY: p.panY - 0.38, zoom: p.zoom * 2.1, xAxis: p.xAxis + 6 },
        },
        // The still beat. Longest of the six and it does nothing at all.
        {
          durationSec: 0.62,
          from: { zoom: p.zoom * 1.25, yAxis: p.yAxis + 16, fov: lens(p, 0.72) },
        },
        {
          durationSec: 0.42,
          settleAt: 0.45,
          from: { zAxis: p.zAxis + 12, zoom: p.zoom * 0.62, yAxis: p.yAxis - 40 },
          to: { zAxis: p.zAxis + 3, zoom: p.zoom * 0.8, yAxis: p.yAxis - 16 },
        },
        {
          durationSec: 0.95,
          settleAt: 0.5,
          from: { yAxis: p.yAxis - 22, zoom: p.zoom * 1.14, zAxis: p.zAxis, fov: p.fov },
          to: {
            yAxis: p.yAxis,
            zoom: p.zoom,
            xAxis: p.xAxis,
            panX: p.panX,
            panY: p.panY,
            fov: p.fov,
          },
        },
      ];
      return compileSequence(shots, p);
    },
  },

  // ------------------------------------------------------------ CINEMA ----
  /*
   * The only presets that move the LENS.
   *
   * Everything below composes a shot out of position and rotation, which is
   * what a mockup tool can normally do -- and it is also the ceiling those
   * moves hit. A camera department has a fourth control. Changing it is what
   * separates a product film from a slide transition, because the lens decides
   * how much the body of the phone RECEDES, and an audience reads a change in
   * that as the camera physically travelling even when nothing has moved.
   *
   * Two rules hold this group together.
   *
   * The lens ENDS on yours, like every other one-way preset here. One that
   * left the camera on a 90mm would silently redefine the framing you built,
   * and the next preset you tried would start from a shot you never set.
   *
   * The scale COMPENSATES the lens wherever the point is perspective rather
   * than travel -- that is `sizeHold`. Without it the phone visibly grows as
   * the lens narrows and the move degrades into a zoom wearing a distortion;
   * with it the phone is pinned to its size in frame and the only thing
   * changing is depth, which is the whole effect.
   *
   * These run longer than the rest, 3 to 6 seconds. That is not padding. A
   * perspective change is a slow read -- the eye needs time to accept the new
   * geometry as a camera position rather than as a glitch -- and every one of
   * them is built to be HELD on at the end rather than cut away from.
   */
  {
    id: "vertigo",
    label: "Dolly zoom",
    kind: "cinema",
    hint: "Perspective collapses while the phone holds its size",
    build: (p) => {
      /*
       * This preset used to be a fake, and said so in its own comment: the
       * stage had one fixed lens, so it borrowed the UNEASE of a dolly zoom
       * by growing the phone while drifting the frame the other way. That is
       * a different effect that happens to feel adjacent. This is the move.
       *
       * 1.85x takes the stage's default 35mm out to a 17mm. Far enough that the
       * body visibly flares, short of the range's fisheye end where the
       * corners bend and it stops reading as a lens and starts reading as a
       * filter.
       */
      const wide = lens(p, 1.85);
      const span = wide - p.fov;
      // Front-loaded: most of the collapse is spent by the halfway mark, and
      // the rest is the shot arriving. Even spacing here reads as a slider
      // being dragged rather than as a camera being pushed.
      const at = [wide, fovAt(p.fov + span * 0.42), fovAt(p.fov + span * 0.09), p.fov];
      return {
        durationSec: 3.4,
        tracks: {
          fov: track("fov", [
            [0, at[0]],
            [1.5, at[1]],
            [2.6, at[2]],
            [3.4, at[3]],
          ]),
          // The same key times as the lens, deliberately. Two tracks holding
          // a product between them have to interpolate in step, or the size
          // they are jointly pinning drifts between keys -- and a phone that
          // breathes three percent mid-move is the one thing that gives the
          // whole effect away.
          zoom: track("zoom", [
            [0, sizeHold(p, at[0])],
            [1.5, sizeHold(p, at[1])],
            // The single accent: one percent over its held size, late, so the
            // move lands on a beat instead of merely ceasing.
            [2.6, sizeHold(p, at[2]) * 1.012],
            [3.4, p.zoom],
          ]),
          // Off-square through the middle. A dolly zoom on a dead-flat face
          // has almost nothing to show: the effect lives in the SIDES of the
          // body, and they have to be visible for any of it to read.
          yAxis: track("yAxis", [
            [0, p.yAxis + 9],
            [2.2, p.yAxis - 2.5],
            [3.4, p.yAxis],
          ]),
        },
      };
    },
  },
  {
    id: "compress-in",
    label: "Compress in",
    kind: "cinema",
    hint: "Starts flat and long, gains depth as it arrives",
    build: (p) => {
      /*
       * The dolly zoom run backwards, and a completely different feeling for
       * it. A long lens flattens the phone into a graphic -- almost a render
       * of a render -- and opening back out is the moment it becomes an
       * object with a near edge and a far one. Good over a title, because the
       * flat end is the readable end.
       */
      const long = lens(p, 0.46);
      const span = p.fov - long;
      const at = [long, fovAt(long + span * 0.5), fovAt(p.fov * 0.985), p.fov];
      return {
        durationSec: 3.2,
        tracks: {
          fov: track("fov", [
            [0, at[0]],
            [1.4, at[1]],
            [2.5, at[2]],
            [3.2, at[3]],
          ]),
          zoom: track("zoom", [
            [0, sizeHold(p, at[0])],
            [1.4, sizeHold(p, at[1])],
            [2.5, sizeHold(p, at[2])],
            [3.2, p.zoom],
          ]),
          // A long lens is the one that makes a small sideways move read as a
          // big one, so the drift here is deliberately tiny. Any more and the
          // compression stops being the subject.
          panX: track("panX", [
            [0, p.panX - 0.1],
            [3.2, p.panX],
          ]),
          xAxis: track("xAxis", [
            [0, p.xAxis - 6],
            [2.4, p.xAxis + 1.5],
            [3.2, p.xAxis],
          ]),
        },
      };
    },
  },
  {
    id: "wide-crash",
    label: "Wide crash",
    kind: "cinema",
    hint: "Rushes in on a wide lens and slams onto your framing",
    build: (p) => {
      /*
       * The one preset here where the scale is NOT compensated, and it has to
       * not be. A wide lens exaggerates approach -- things arrive faster than
       * their speed says they should, which is why every chase is shot on
       * one. Holding the size would throw away exactly the thing being
       * borrowed. So the phone genuinely rushes, and the lens closing to
       * yours is what decelerates it without the timing having to.
       */
      const wide = lens(p, 1.7);
      return {
        durationSec: 1.15,
        tracks: {
          fov: track("fov", [
            [0, wide],
            [0.55, fovAt(p.fov * 0.965)],
            [1.15, p.fov],
          ]),
          zoom: track("zoom", [
            [0, p.zoom * 0.42],
            [0.55, p.zoom * 1.055],
            [1.15, p.zoom],
          ]),
          // A crash that arrives dead level looks rendered. Six degrees of
          // roll, gone by the time it settles, is enough to read as impact.
          zAxis: track("zAxis", [
            [0, p.zAxis - 6],
            [0.7, p.zAxis + 1.5],
            [1.15, p.zAxis],
          ]),
          panY: track("panY", [
            [0, p.panY - 0.16],
            [1.15, p.panY],
          ]),
        },
      };
    },
  },
  {
    id: "hero-orbit",
    label: "Hero orbit",
    kind: "cinema",
    hint: "Long lens swings round, opens out and settles — the full move",
    build: (p) => {
      /*
       * The one to put at the top of a landing page. Everything else in this
       * group does one thing well; this does the sequence a product film
       * actually shoots -- start long and off-axis so the phone is a
       * silhouette, carry it round, let the lens open as it turns towards
       * camera so it gains dimension exactly as it gains face, and land.
       *
       * Six seconds, and the four tracks finish at 4.4, 5.1, 5.6 and 6.0. The
       * staggered arrivals are the difference between a sequence and four
       * things that stop together.
       */
      const long = lens(p, 0.58);
      const at = [long, fovAt(long + (p.fov - long) * 0.45), fovAt(p.fov * 1.04), p.fov];
      return {
        durationSec: 6,
        tracks: {
          yAxis: track("yAxis", [
            [0, p.yAxis - 64],
            [2.8, p.yAxis - 17],
            [4.7, p.yAxis + 5],
            [6, p.yAxis],
          ]),
          fov: track("fov", [
            [0, at[0]],
            [2.6, at[1]],
            [4.4, at[2]],
            [5.6, at[3]],
          ]),
          // Held against the lens for the first half, so the turn happens at
          // a constant size and the eye reads rotation alone; then released
          // into a real push over the last third, which is where the shot
          // commits.
          zoom: track("zoom", [
            [0, sizeHold(p, at[0]) * 0.82],
            [2.6, sizeHold(p, at[1]) * 0.93],
            [4.4, p.zoom * 1.014],
            [5.1, p.zoom],
          ]),
          xAxis: track("xAxis", [
            [0, p.xAxis + 16],
            [3.4, p.xAxis - 3.5],
            [5.6, p.xAxis],
          ]),
          panX: track("panX", [
            [0, p.panX + 0.24],
            [4, p.panX - 0.05],
            [6, p.panX],
          ]),
        },
      };
    },
  },
  {
    id: "lift-away",
    label: "Lift away",
    kind: "cinema",
    hint: "Rises and goes long, leaving the phone small and flat — an ending",
    build: (p) => {
      /*
       * The only one-way preset in the file that is meant to END a video
       * rather than open one, which is why it is the only one that leaves the
       * phone smaller than it found it. Rising while the lens goes long is
       * the last shot of almost everything: the subject stops being an object
       * you are with and becomes one you are looking back at.
       *
       * The lens still returns to yours, because the rule holds -- what
       * carries the retreat is the scale and the pan, and the lens going long
       * on the way is what stops it reading as a plain zoom out.
       */
      const long = lens(p, 0.6);
      return {
        durationSec: 4,
        tracks: {
          panY: track("panY", [
            [0, p.panY],
            [2.4, p.panY - 0.5],
            [4, p.panY - 0.86],
          ]),
          zoom: track("zoom", [
            [0, p.zoom],
            [2.2, p.zoom * 0.74],
            [4, p.zoom * 0.52],
          ]),
          fov: track("fov", [
            [0, p.fov],
            [2.2, long],
            [4, fovAt(p.fov * 0.88)],
          ]),
          // Tips down as it goes, the way a crane does when it keeps the
          // subject in frame on the way up.
          xAxis: track("xAxis", [
            [0, p.xAxis],
            [4, p.xAxis - 13],
          ]),
        },
      };
    },
  },
  {
    id: "lens-breath",
    label: "Lens breath",
    kind: "cinema",
    loops: true,
    hint: "A held frame that never quite stops — loops seamlessly",
    build: (p) => {
      /*
       * For the shot you leave on screen. Not a Float -- that drifts the
       * phone, and a drifting phone under a headline eventually annoys.
       * Here the phone does not move at all: the LENS breathes by four
       * percent and the scale holds the size, so what changes is only the
       * depth of the body. It reads as a camera that is alive rather than as
       * an animation that is running, which is the distinction that matters
       * for something on screen for a minute.
       *
       * Seven seconds is roughly a slow human breath, and both ends land on
       * the same values so the cut back is invisible.
       */
      const out = lens(p, 1.04);
      return {
        durationSec: 7,
        tracks: {
          fov: track("fov", [
            [0, p.fov],
            [3.5, out],
            [7, p.fov],
          ]),
          zoom: track("zoom", [
            [0, p.zoom],
            [3.5, sizeHold(p, out)],
            [7, p.zoom],
          ]),
          // A third of a degree. Below the threshold at which anyone can name
          // it, above the one at which the frame reads as frozen.
          yAxis: track("yAxis", [
            [0, p.yAxis],
            [2.3, p.yAxis + 0.35],
            [5.1, p.yAxis - 0.3],
            [7, p.yAxis],
          ]),
        },
      };
    },
  },

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
    id: "fold-hero",
    label: "Fold hero",
    kind: "move",
    needsFold: true,
    hint: "Opens from edge-on, holds the shot, then lifts away",
    build: (p) => ({
      // Ten seconds, from the timeline this was traced off.
      durationSec: 10,
      tracks: {
        /*
         * Times are read off the ruler and are the shape of the original.
         * The VALUES are a reconstruction: they were taken from slider
         * positions in screenshots, where a pixel is about 0.6% of a range --
         * on the Y axis that is a couple of degrees per pixel, so treat them
         * as the right move at approximately the right numbers rather than as
         * the original's own.
         */
        yAxis: track("yAxis", [
          [0, p.yAxis - 150],
          [5.0, p.yAxis],
        ]),
        // Comes up from almost nothing, which is what the first frame is: the
        // phone edge-on and tiny against an empty stage.
        zoom: track("zoom", [
          [0, p.zoom * 0.35],
          [5.0, p.zoom],
        ]),
        // The hinge opens across most of the first half, finishing after the
        // camera has already arrived -- the last of the swing plays out on a
        // shot that has stopped moving, which is what makes it read.
        fold: track("fold", [
          [0, 100],
          [7.7, 0],
        ]),
        // Four keys: a settle, a hold, and a last drift. The middle pair are
        // close together, which is what holds the frame still while the fold
        // finishes behind it.
        xAxis: track("xAxis", [
          [0, p.xAxis + 22],
          [5.65, p.xAxis],
          [6.75, p.xAxis],
          [8.8, p.xAxis - 8],
        ]),
        // Starts late and runs past the end of everything else: the shot lifts
        // out of frame after the device has finished doing anything.
        panY: track("panY", [
          [6.7, p.panY],
          [9.1, p.panY + 1.6],
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
  { kind: "sequence", label: "Sequences — several shots, cut together" },
  { kind: "cinema", label: "Cinematic — the lens moves too" },
  { kind: "entrance", label: "Entrances — arrive on your framing" },
  { kind: "move", label: "Moves — travel through it" },
  { kind: "loop", label: "Loops — seamless, for idle shots" },
];

export function getMotionPreset(id: string): MotionPreset | undefined {
  return MOTION_PRESETS.find((preset) => preset.id === id);
}

/** Whether a preset's end cuts back to its start. */
export function presetLoops(preset: MotionPreset): boolean {
  return preset.loops ?? preset.kind === "loop";
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
