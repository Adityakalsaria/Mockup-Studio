import { DEFAULT_BLUR, type BlurSettings } from "../blurStyles";
import { DEFAULT_FINISH_ID } from "../finishes";
import { DEFAULT_BACKGROUND, type BackgroundSettings } from "../backgrounds";
import { DEFAULT_ANIMATION, type Animation } from "../animation";

/**
 * Everything the right panel edits, in one value.
 *
 * Grouped as the panel groups it rather than as the renderer consumes it —
 * the panel is what people touch, and a state shape that mirrors the UI is
 * the one you can still reason about when a row moves between sections.
 * PhoneStage3D adapts at its own boundary.
 *
 * Every field here is read by the stage. Rows whose value nothing rendered —
 * the four key-light dials, contact shadow, FOV, and the separate camera-rig
 * rotation — were removed rather than left as sliders that move a number and
 * change nothing on screen.
 */
export interface EditorState {
  /* MOCKUP */
  deviceId: string;
  /** Body finish id from `../finishes`. */
  finishId: string;

  /* CAMERA — the model's own orientation, plus the framing around it. */
  xAxis: number;
  yAxis: number;
  zAxis: number;
  /** Manual nudge on the screen crop, on top of the automatic fit. Needed for
      a mirrored window, whose chrome sits on one edge only — a centred crop
      leaves the content sitting low. */
  screenScale: number;
  screenOffsetX: number;
  screenOffsetY: number;
  zoom: number;
  panX: number;
  panY: number;

  /* BLUR */
  blur: BlurSettings;

  /* CANVAS */
  background: BackgroundSettings;

  /* TIMELINE */
  animation: Animation;
}

export const DEFAULT_EDITOR_STATE: EditorState = {
  deviceId: "iphone-17-pro-max",
  finishId: DEFAULT_FINISH_ID,

  // Opens front-on, centred, and sized to leave a margin on every side.
  //
  // It used to open at -24/48 and 1.9x, which framed the BACK of the phone
  // cropped past the edges of the canvas — so the first thing anyone saw was
  // an anonymous slab of aluminium, and an uploaded screenshot appeared to do
  // nothing because it had landed on the face pointing away.
  //
  // 180 is the front because the model's screen faces -Z. See the widened
  // yAxis range below for why that costs nothing.
  xAxis: 0,
  yAxis: 180,
  zAxis: 0,
  screenScale: 1,
  screenOffsetX: 0,
  screenOffsetY: 0,
  zoom: 0.85,
  panX: 0,
  panY: 0,

  blur: DEFAULT_BLUR,
  background: DEFAULT_BACKGROUND,
  animation: DEFAULT_ANIMATION,
};

/** Ranges live beside the state so the panel and the shot lerp agree. */
export const RANGES = {
  xAxis: { min: -180, max: 180, step: 1 },
  // Wider than the other two axes on purpose. The default pose sits at 180,
  // and against a -180..180 range that is the end of the track — the row
  // would refuse to drag in one direction from the moment the editor opened.
  // A full turn either way also lets the Turntable preset's 360 sit inside
  // the range instead of overflowing the readout.
  yAxis: { min: -360, max: 360, step: 1 },
  zAxis: { min: -180, max: 180, step: 1 },
  // Fractions of the screen, so a nudge means the same on any device.
  screenScale: { min: 0.5, max: 2, step: 0.01 },
  screenOffsetX: { min: -0.5, max: 0.5, step: 0.005 },
  screenOffsetY: { min: -0.5, max: 0.5, step: 0.005 },
  zoom: { min: 0.5, max: 10.5, step: 0.01 },
  panX: { min: -1, max: 1, step: 0.01 },
  panY: { min: -1, max: 1, step: 0.01 },
} as const;
