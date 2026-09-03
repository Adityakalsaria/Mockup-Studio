import { DEFAULT_BLUR, type BlurSettings } from "../blurStyles";
import { DEFAULT_FINISH_ID } from "../finishes";
import { DEFAULT_BACKGROUND, type BackgroundSettings } from "../backgrounds";
import { DEFAULT_DEVICE_ID } from "../devices";
import { DEFAULT_SHADOW, type ShadowSettings } from "../shadow";
import { DEFAULT_LIGHTING, type LightingId } from "../lighting";
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
  /** The same three, for a device's second screen. */
  coverScale: number;
  coverOffsetX: number;
  coverOffsetY: number;
  zoom: number;
  /** How far the hinge is closed, 0-100. Ignored by devices that do not fold. */
  fold: number;
  /** Camera field of view, vertical, in degrees. The lens rather than the
      distance: zoom moves the phone, this changes how the perspective reads. */
  fov: number;
  panX: number;
  panY: number;

  /* BLUR */
  blur: BlurSettings;

  /* CANVAS */
  background: BackgroundSettings;
  shadow: ShadowSettings;
  /** Which lighting rig the environment builds. */
  lighting: LightingId;

  /* TIMELINE */
  animation: Animation;
}

export const DEFAULT_EDITOR_STATE: EditorState = {
  // The registry's first entry, so the model warmed at module load is the
  // one the editor actually opens on. Naming it separately meant preloading
  // one device and then immediately fetching another.
  deviceId: DEFAULT_DEVICE_ID,
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
  coverScale: 1,
  coverOffsetX: 0,
  coverOffsetY: 0,
  zoom: 0.85,
  // Open. A fold's whole point is the big inner screen, and a mockup that
  // opens shut would be a mockup of a device you cannot see the screen of.
  fold: 0,
  // The lens the stage was framed at.
  fov: 38,
  panX: 0,
  panY: 0,

  blur: DEFAULT_BLUR,
  background: DEFAULT_BACKGROUND,
  shadow: DEFAULT_SHADOW,
  lighting: DEFAULT_LIGHTING,
  animation: DEFAULT_ANIMATION,
};

/** Ranges live beside the state so the panel and the shot lerp agree. */
/**
 * Where the screen fit starts when a live mirror begins.
 *
 * A mirror window is not a clean screenshot: the mirroring app puts its own
 * border and title bar around the device, and only on some edges — so the
 * automatic centre-crop lands the content slightly low and slightly small.
 * These are the numbers that put it back, dialled in by eye against iPhone
 * Mirroring rather than derived — the mirror app's chrome is whatever Apple
 * decided it is, and there is nothing to calculate from.
 *
 * Applied on start and cleared on stop, so an uploaded screenshot -- which
 * needs none of this -- is never cropped by it.
 */
export const MIRROR_SCREEN_FIT = {
  screenScale: 1.04,
  screenOffsetX: 0,
  screenOffsetY: 0.015,
} as const;

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
  coverScale: { min: 0.5, max: 2, step: 0.01 },
  coverOffsetX: { min: -0.5, max: 0.5, step: 0.005 },
  coverOffsetY: { min: -0.5, max: 0.5, step: 0.005 },
  zoom: { min: 0.5, max: 10.5, step: 0.01 },
  fold: { min: 0, max: 100, step: 1 },
  // 14 is very wide and 90 is nearly fisheye. Below 14 a phone at this
  // distance stops being recognisable as one.
  fov: { min: 14, max: 90, step: 1 },
  /*
   * Pan is a fixed distance in world units while the FRAME grows with the
   * lens, so the same pan covers less and less of the shot as the lens widens.
   * At +/-1 the phone could only travel 0.2 units, and reaching the edge of
   * frame needs 1.1 at 98mm, 3.1 at the default 35mm and 9.0 at 12mm -- so on
   * every lens but the longest, the slider ran out before the composition did.
   *
   * 6 clears the frame outright on everything from a portrait lens to a little
   * past 24mm, which covers the range anyone actually frames a product shot
   * in, and still moves two thirds of the way out at the extreme wide end.
   * Going to 9 would cover even that, at the cost of making every ordinary
   * adjustment coarser: the drag maps the range across the track, so a range
   * three times wider is three times less precise per pixel everywhere.
   */
  panX: { min: -6, max: 6, step: 0.01 },
  panY: { min: -6, max: 6, step: 0.01 },
} as const;
