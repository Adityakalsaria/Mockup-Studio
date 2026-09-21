import type { FocusFollow } from "../mocraft/focusMath";
import { DEFAULT_BLUR, type BlurSettings } from "../blurStyles";
import { DEFAULT_OVERLAY, type OverlaySettings } from "../overlay";
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
  /** Fill covers the screen and crops; Fit shows the whole image, with black
      where it does not reach. Absent is Fill, which is what every saved shot
      before this was. */
  screenFitMode?: "fill" | "fit";
  /** A composed focus move's schedule, for depth of field to follow its
      subject frame by frame. Absent when there is no such move. */
  focusFollow?: FocusFollow | null;
  /** Motion's own depth of field -- the one a composed move uses and the
      Motion tab edits. Kept apart from `blur` so Crafting's still-shot blur
      is untouched by it. Absent is off. */
  motionBlur?: BlurSettings;
  /** The same, for a device's second screen: its Fill or Fit, and its three
      numbers. Absent is Fill. */
  coverFitMode?: "fill" | "fit";
  coverScale: number;
  coverOffsetX: number;
  coverOffsetY: number;
  zoom: number;
  /** How far the hinge is closed, 0-100. Ignored by devices that do not fold. */
  fold: number;
  /** Corner radius of the image card, as a fraction of its shorter side. */
  cardRadius: number;
  /** Thickness of the image card, in world units. */
  cardDepth: number;
  /** Camera field of view, vertical, in degrees. The lens rather than the
      distance: zoom moves the phone, this changes how the perspective reads. */
  fov: number;
  panX: number;
  panY: number;
  /**
   * The third translate axis — toward the camera and away from it.
   *
   * The rig had two. A studio's transform inspector has three, and the missing
   * one is not decoration: with X and Y alone a phone can be moved anywhere in
   * the picture plane and nowhere else, so nothing can be pushed behind
   * anything or brought forward of it.
   *
   * Distinct from `zoom`, which is a SCALE. They look alike on a single object
   * against a flat background and stop looking alike the moment there is a
   * second one or a perspective lens: dollying changes what the lens does to
   * the shape, scaling does not.
   */
  panZ: number;
  /**
   * Per-axis scale, multiplied onto `zoom`.
   *
   * `zoom` stays the one master size — it is what the presets animate, what the
   * wheel drives, and what every existing shot was saved with. These three ride
   * on top of it at 1, so a shot that never touches them renders exactly as it
   * did before, and the Transform popup's Scale X/Y/Z have somewhere real to
   * write.
   */
  scaleX: number;
  scaleY: number;
  scaleZ: number;

  /* BLUR */
  blur: BlurSettings;
  overlay: OverlaySettings;

  /* CANVAS */
  background: BackgroundSettings;
  shadow: ShadowSettings;
  /** Which lighting rig the environment builds. */
  lighting: LightingId;
  /**
   * Where the light comes from: degrees round the phone, and up (+) or down
   * (−). 0 and 0 are the rig as authored. Absent on shots saved before them.
   */
  lightAngle: number;
  lightElevation: number;

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
  // A radius you can see at a glance and a thickness you can see at an angle.
  // Both start where a printed card sits rather than at zero, since zero is a
  // sheet of paper and that is the one thing this is not for.
  cardRadius: 0.03,
  cardDepth: 0.012,
  // The lens the stage was framed at.
  fov: 38,
  panX: 0,
  panY: 0,
  panZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,

  blur: DEFAULT_BLUR,
  overlay: DEFAULT_OVERLAY,
  background: DEFAULT_BACKGROUND,
  shadow: DEFAULT_SHADOW,
  lighting: DEFAULT_LIGHTING,
  lightAngle: 0,
  lightElevation: 0,
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

/**
 * The fit for a direct iPhone broadcast.
 *
 * Distinct from `MIRROR_SCREEN_FIT` on purpose. That preset exists to crop a
 * mirror *window's* chrome — a title bar on one edge, which is why it zooms
 * and pushes down. A broadcast carries the device framebuffer and nothing
 * else, so the same nudge would crop real pixels off a screen that already
 * arrives correct. Neutral is right here, and it is a separate constant so
 * that stays true if the mirror preset is ever retuned.
 */
export const BROADCAST_SCREEN_FIT = {
  screenScale: 1,
  screenOffsetX: 0,
  screenOffsetY: 0,
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
  /*
   * The floor is 0.1, not the 0.5 it was, and that was a real bug rather than
   * a matter of taste.
   *
   * Presets are built as multipliers on whatever zoom is current, and at the
   * stage's own default of 0.85 anything under 0.588x fell off the bottom of
   * this range and was clamped. Five multipliers in `motionPresets` did:
   * Crash zoom was written to slam in from 0.35x and actually started at
   * 0.588x, so the preset had been running at little over half its authored
   * travel since the day it was written -- silently, because a clamp does not
   * report anything, and because the preset still looked like it did SOMETHING.
   *
   * It also blocks the lens presets outright. Holding a phone's size on a long
   * lens means scaling by tan(fov/2), which at a 17 degree lens is 0.38x -- so
   * against a 0.5 floor the compensation could not be applied, and the shot
   * that was supposed to hold its size would visibly swell instead.
   *
   * The cost of the wider range is precision: the drag maps the whole range
   * across the track, so every zoom adjustment is 4% coarser. That is a fair
   * trade for presets that do what they say.
   */
  zoom: { min: 0.1, max: 10.5, step: 0.01 },
  fold: { min: 0, max: 100, step: 1 },
  cardRadius: { min: 0, max: 0.5, step: 0.005 },
  cardDepth: { min: 0, max: 0.08, step: 0.001 },
  // The vertical angles of a 120mm and a 1mm lens on a full-frame sensor's
  // 24mm height -- the Focal Length row's 1..120 mm (see `bindings.ts`).
  fov: { min: 11.4, max: 170.5, step: 1 },
  lightAngle: { min: -180, max: 180, step: 1 },
  lightElevation: { min: -60, max: 60, step: 1 },
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
  /*
   * Narrower than X and Y, and not for symmetry's sake. Z runs along the line
   * of sight from a camera 1.8 units out, so the same +/-6 would put the phone
   * a long way through the lens in one direction and most of the way to
   * vanishing in the other. This is the depth the shot has to move in.
   */
  panZ: { min: -1.2, max: 1.2, step: 0.01 },
  /*
   * Multipliers, so 1 is "as `zoom` says" and the track is centred on it. The
   * floor is not 0: a zero scale collapses the body to a plane, which is not a
   * composition anyone is reaching for and is indistinguishable from the model
   * having failed to load.
   */
  scaleX: { min: 0.1, max: 3, step: 0.01 },
  scaleY: { min: 0.1, max: 3, step: 0.01 },
  scaleZ: { min: 0.1, max: 3, step: 0.01 },
} as const;
