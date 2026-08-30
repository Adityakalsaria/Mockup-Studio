/**
 * Field of view and focal length are the same setting in two languages.
 *
 * The camera takes a vertical field of view in degrees, so that is what the
 * state stores. Nobody frames a shot that way: 35mm and 85mm carry meaning
 * that 37.8 degrees and 16.1 degrees do not, and the difference between a
 * wide lens and a portrait lens is the single most legible thing about how a
 * product shot is framed.
 *
 * The conversion assumes a full-frame back (36x24mm). The vertical dimension
 * is the one that matters, because the stored angle is vertical -- using the
 * 36mm side here would put every number about 1.5x off and make the slider
 * read as a set of lenses nobody owns.
 */

const SENSOR_HALF_HEIGHT = 12; // 24mm full-frame, halved

export const focalFromFov = (fovDeg: number): number =>
  SENSOR_HALF_HEIGHT / Math.tan((fovDeg * Math.PI) / 360);

export const fovFromFocal = (mm: number): number =>
  (Math.atan(SENSOR_HALF_HEIGHT / mm) * 360) / Math.PI;

/** The ends of the stage's fov range, expressed as lenses. */
export const FOCAL_MIN = 12;
export const FOCAL_MAX = 98;
