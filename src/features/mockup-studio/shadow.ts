/**
 * The cast shadow.
 *
 * The stage is lit entirely by an image-based environment, which is what makes
 * the aluminium read the way it does but casts nothing: image-based lighting
 * has no direction to cast from. So the shadow is its own rig -- one
 * directional light, and a plane behind the phone that is invisible except
 * where something falls on it.
 *
 * Behind rather than below, because the phone floats. There is no floor in
 * this scene and inventing one would put a horizon through every shot; a
 * backdrop is what a product photograph actually uses, and it stays in frame
 * whichever way the phone is turned.
 */

export type ShadowSettings = {
  enabled: boolean;
  /** Where the light comes from, in degrees clockwise from straight up. */
  angle: number;
  /** How far off-axis the light sits, which is how far the shadow is thrown. */
  throwDistance: number;
  /** Blur radius on the shadow map. */
  softness: number;
  opacity: number;
  color: string;
};

export const DEFAULT_SHADOW: ShadowSettings = {
  // Off by default: it changes every existing shot, and a shadow is a choice
  // rather than a correction.
  enabled: false,
  // Up and a little to the left -- the direction light is assumed to come from
  // in almost every product shot, and the one that reads as daylight rather
  // than as a stage effect.
  angle: 145,
  throwDistance: 0.75,
  softness: 8,
  opacity: 0.38,
  color: "#000000",
};

export const SHADOW_RANGES = {
  angle: { min: 0, max: 360, step: 1 },
  throwDistance: { min: 0, max: 2, step: 0.01 },
  softness: { min: 0, max: 60, step: 0.5 },
  opacity: { min: 0, max: 1, step: 0.01 },
} as const;
