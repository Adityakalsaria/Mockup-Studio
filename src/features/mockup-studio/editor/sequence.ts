import type { AnimatableKey, Animation, Keyframe } from "../animation";
import type { Pose } from "./motionPresets";

/**
 * Sequences: several shots on one timeline, with cuts between them.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * Every preset in `motionPresets` is ONE continuous camera move, and no amount
 * of craft inside one gets past a ceiling that has nothing to do with the
 * curves. A reference reel was measured to settle this rather than argued
 * about: ten seconds, twelve transitions, a beat every 0.7 seconds, and a
 * fourteen-hundred-millisecond stretch in the middle where the subject's
 * bounding box is byte-identical frame to frame -- the object is not moving at
 * all and the energy is coming from the CUT RHYTHM around it.
 *
 * That is not something a smoother push-in can approximate. Cutting is a
 * different instrument, and this is it.
 *
 * ---------------------------------------------------------------------------
 * Why it is not a second data model
 * ---------------------------------------------------------------------------
 *
 * The obvious build is a `Sequence` type beside `Animation`, with its own
 * playback, its own export path and its own timeline UI. That would be a
 * second renderer to keep in agreement with the first, and they would diverge
 * -- the old `shots.ts` in this repo is exactly that, a snapshot list stranded
 * beside the keyframe system, sharing nothing with it.
 *
 * A cut is a keyframe whose segment does not interpolate. So a sequence
 * COMPILES to an ordinary `Animation`, and every existing piece of machinery
 * keeps working with no changes at all: scrubbing, the frame-exact export, the
 * timeline lanes, per-key easing, the preview cards. A shot boundary is a key
 * carrying `{ kind: "step" }` and nothing else is new.
 */

/**
 * One beat of a sequence.
 *
 * `from` and `to` are absolute channel values, already resolved against the
 * user's framing by the preset that built them. A shot with no `to` is a HELD
 * frame -- which is a real thing to want, not a degenerate case: the reference
 * measured above holds dead still for half a second at 8.0s, and that freeze
 * is what gives the cut after it its snap.
 */
export interface Shot {
  durationSec: number;
  from: Partial<Record<AnimatableKey, number>>;
  /** Where the shot arrives by its last frame. Absent means it holds. */
  to?: Partial<Record<AnimatableKey, number>>;
  /**
   * How far into the shot the move is over, 0..1.
   *
   * Default 1 -- the move uses the whole beat. Lower values are what make a
   * cut land well: the camera does its move in the first two thirds and then
   * SITS for the rest, so the eye has a still frame to read before the cut
   * takes it away. A shot that is still moving when it is cut from reads as an
   * accident, which is the single most common way an edit like this fails.
   */
  settleAt?: number;
}

/**
 * The gap a cut is written across, in seconds.
 *
 * A cut has to occupy some time because two keys at the same instant leave the
 * track undefined there -- `KEY_EPSILON` in `animation.ts` exists to forbid
 * exactly that. One frame at 60fps is the smallest honest answer: shorter than
 * anything that can be displayed, so the jump is instantaneous in every frame
 * that is ever rendered, and wide enough that the two keys are unambiguously
 * distinct to every part of the system that sorts or searches them.
 */
export const CUT_GAP = 1 / 60;

/** Every channel any shot in the sequence has an opinion about. */
function channelsIn(shots: Shot[]): AnimatableKey[] {
  const seen = new Set<AnimatableKey>();
  for (const shot of shots) {
    for (const key of Object.keys(shot.from)) seen.add(key as AnimatableKey);
    for (const key of Object.keys(shot.to ?? {})) seen.add(key as AnimatableKey);
  }
  return [...seen];
}

/**
 * Shots to keyframes.
 *
 * Each shot lays down its own keys inside its slice of the timeline and marks
 * its LAST key as a cut, so the value holds through the gap and then jumps to
 * whatever the next shot opens on.
 *
 * Every channel is written in every shot, filled from `pose` where a shot did
 * not mention it. Letting an unmentioned channel simply inherit whatever the
 * previous shot left would be the cheaper compile and the wrong one: a cut is
 * supposed to be a complete change of frame, and a channel that silently
 * carries over turns the next shot into a continuation of the last one in a
 * way nobody wrote and nobody can see in the shot list.
 */
export function compileSequence(shots: Shot[], pose: Pose): Omit<Animation, "easing"> {
  const tracks: Animation["tracks"] = {};
  const channels = channelsIn(shots);
  if (!shots.length || !channels.length) return { durationSec: 0, tracks };

  const total = shots.reduce((sum, shot) => sum + shot.durationSec, 0);

  for (const channel of channels) {
    const keys: Keyframe[] = [];
    let cursor = 0;

    shots.forEach((shot, index) => {
      const last = index === shots.length - 1;
      const start = cursor;
      // The final shot runs to the very end; every other one stops a cut-gap
      // short, and that gap is the cut.
      const end = cursor + shot.durationSec - (last ? 0 : CUT_GAP);
      cursor += shot.durationSec;

      const from = shot.from[channel] ?? pose[channel as keyof Pose] ?? 0;
      const to = shot.to?.[channel];

      if (to === undefined || to === from) {
        // A held frame. One key, marked as a cut so it holds the whole beat
        // rather than drifting towards whatever the next shot opens on.
        keys.push({ time: round(start), value: round(from), easing: cut(last) });
        return;
      }

      const settle = Math.min(1, Math.max(0.05, shot.settleAt ?? 1));
      const arrive = start + (end - start) * settle;

      keys.push({ time: round(start), value: round(from) });
      if (settle < 1) {
        // Arrive early, then hold to the cut. Two keys, because the hold has
        // to be a segment of its own -- a single key at `end` would spend the
        // whole beat travelling and leave nothing still to cut away from.
        keys.push({ time: round(arrive), value: round(to) });
        keys.push({ time: round(end), value: round(to), easing: cut(last) });
      } else {
        keys.push({ time: round(end), value: round(to), easing: cut(last) });
      }
    });

    tracks[channel] = dedupe(keys);
  }

  return { durationSec: round(total), tracks };
}

/**
 * The last shot's final key is not a cut -- there is nothing after it to cut
 * to, and marking it would make the track hold a value nobody reads.
 */
function cut(isLastShot: boolean): Keyframe["easing"] {
  return isLastShot ? undefined : { kind: "step" };
}

/** Rounded so a key someone later drags by hand reads as a number. */
function round(value: number): number {
  return Number(value.toFixed(4));
}

/**
 * Drop keys that landed within a frame of the one before.
 *
 * A shot shorter than about two cut-gaps can produce a `from` and an `arrive`
 * close enough to collide, and two keys at effectively the same instant leave
 * the segment between them undefined. The earlier key wins because it is the
 * one carrying the shot's opening value.
 */
function dedupe(keys: Keyframe[]): Keyframe[] {
  const out: Keyframe[] = [];
  for (const key of keys) {
    const previous = out[out.length - 1];
    if (previous && key.time - previous.time < CUT_GAP * 0.5) {
      // Keep whichever of the two carries the cut, or the edit is lost.
      if (key.easing) out[out.length - 1] = { ...previous, easing: key.easing };
      continue;
    }
    out.push(key);
  }
  return out;
}

/** How many cuts a compiled animation contains — used to label the presets. */
export function countCuts(animation: Omit<Animation, "easing">): number {
  let most = 0;
  for (const keys of Object.values(animation.tracks)) {
    const cuts = (keys ?? []).filter((k) => k.easing?.kind === "step").length;
    most = Math.max(most, cuts);
  }
  return most;
}
