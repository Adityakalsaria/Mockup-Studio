/**
 * Live-tunable knobs for the empty-screen placeholder's depth, read by
 * `Stage.tsx`'s per-frame `project()` and written by `ScreenDepthTuner`'s
 * Leva panel (`H` in dev).
 *
 * A plain mutable object rather than React state: `project()` already runs
 * inside a `requestAnimationFrame` loop (`ScreenPlaceholderLayer`'s `tick`),
 * so a shared reference read fresh each frame reaches it exactly as fast as
 * a render would, without threading a value through props for something
 * that exists purely to be eyeballed live and never persisted.
 */
export const screenDepthTune = {
  /** Added to all four measured corner Z's after `zGain` is applied. Moves
      the whole placeholder toward or away from the camera without changing
      how much it tilts. */
  zBias: 0,
  /** Multiplies each corner's OWN deviation from the four corners' average
      before `zBias` is added -- 1 leaves the measured curvature exactly as
      measured, 0 flattens the placeholder to a single constant depth (its
      average), and above 1 exaggerates whatever curvature was measured. */
  zGain: 1,
  /** Overrides `Device.screenOutlinePad` outright when set (not multiplied
      with it) -- `null` defers to whatever the device itself states. */
  insetOverride: null as number | null,
  /** Overrides the `facing` cutoff below which the placeholder stops
      rendering (see `MIN_FACING` in `Stage.tsx`). */
  minFacing: 0.08,
};
