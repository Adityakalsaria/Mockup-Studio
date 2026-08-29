import { type BlurSettings } from "./blurStyles";

/**
 * A shot is a saved snapshot of everything the camera and lens are doing.
 *
 * This is stage one of the timeline. Deliberately a plain value type with no
 * time in it: stage two interpolates BETWEEN two of these over a duration,
 * stage four replaces the whole-shot snapshot with per-parameter keyframes.
 * Getting the parameter set right now is what makes those cheap later.
 *
 * What is NOT in here is as deliberate as what is. The screen image, the
 * device and the background belong to the project, not the shot — ultramock
 * keeps one SOURCE across its shots too, and animating the device mid-move
 * would be a different feature.
 */
export interface Shot {
  id: string;
  label: string;
  /** Degrees, matching the sliders. */
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  /** Percent. */
  scale: number;
  offsetX: number;
  offsetY: number;
  blur: BlurSettings;
  is3DEnabled: boolean;
  /** Seconds this shot holds for. Unused until stage two; stored now so
      shots created today survive into playback without a migration. */
  durationSec: number;
}

export const DEFAULT_SHOT_DURATION_SEC = 3;

/** The live editor state a shot is captured from and restored into. */
export interface ShotState {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  blur: BlurSettings;
  is3DEnabled: boolean;
}

let seq = 0;

export function createShot(state: ShotState, label?: string): Shot {
  seq += 1;
  return {
    id: `shot-${seq}-${Math.round(Math.random() * 1e6)}`,
    label: label ?? `Shot ${seq}`,
    ...state,
    durationSec: DEFAULT_SHOT_DURATION_SEC,
  };
}

export function shotToState(shot: Shot): ShotState {
  return {
    rotateX: shot.rotateX,
    rotateY: shot.rotateY,
    rotateZ: shot.rotateZ,
    scale: shot.scale,
    offsetX: shot.offsetX,
    offsetY: shot.offsetY,
    blur: shot.blur,
    is3DEnabled: shot.is3DEnabled,
  };
}

/**
 * Linear blend between two shots. Stage two drives this from the playhead.
 *
 * Rotation is blended along the SHORT way round: a move from 170 to -170 is
 * 20 degrees, not 340, and interpolating the raw numbers would spin the phone
 * most of the way round the wrong way.
 */
export function lerpShots(a: Shot, b: Shot, t: number): ShotState {
  const k = Math.max(0, Math.min(1, t));
  const angle = (from: number, to: number) => {
    let delta = ((to - from + 180) % 360) - 180;
    if (delta < -180) delta += 360;
    return from + delta * k;
  };
  const num = (from: number, to: number) => from + (to - from) * k;
  return {
    rotateX: angle(a.rotateX, b.rotateX),
    rotateY: angle(a.rotateY, b.rotateY),
    rotateZ: angle(a.rotateZ, b.rotateZ),
    scale: num(a.scale, b.scale),
    offsetX: num(a.offsetX, b.offsetX),
    offsetY: num(a.offsetY, b.offsetY),
    // The lens blends properly now that it is numbers rather than a preset
    // id: racking focus across a move is the reason to have a timeline at
    // all. Only `mode` and `bokeh` are discrete, and those snap at the
    // midpoint because there is no meaningful half-way between two passes.
    blur: {
      ...(k < 0.5 ? a.blur : b.blur),
      strength: num(a.blur.strength, b.blur.strength),
      focusSize: num(a.blur.focusSize, b.blur.focusSize),
      falloff: num(a.blur.falloff, b.blur.falloff),
      angle: angle(a.blur.angle, b.blur.angle),
      scan: num(a.blur.scan, b.blur.scan),
      focusX: num(a.blur.focusX, b.blur.focusX),
      focusY: num(a.blur.focusY, b.blur.focusY),
    },
    is3DEnabled: k < 0.5 ? a.is3DEnabled : b.is3DEnabled,
  };
}
