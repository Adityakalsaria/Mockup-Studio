/**
 * The values the surface bench is currently holding.
 *
 * A module-level object rather than context or props, because the two halves
 * of the bench live in DIFFERENT React reconcilers: the sliders are DOM, the
 * thing they adjust is inside the `<Canvas>` and rendered by three. Nothing
 * crosses that boundary as props, so it crosses as a mutable object one side
 * writes and the other reads.
 */
export type SurfaceValues = {
  bodyRoughness: number;
  bodyMetalness: number;
  bodyEnv: number;
  panelDarken: number;
  panelRoughness: number;
  panelMetalness: number;
  panelEnv: number;
  logoRoughness: number;
  logoMetalness: number;
  antennaRoughness: number;
  antennaMetalness: number;
  glassRoughness: number;
  glassMetalness: number;
  glassEnv: number;
  restOn: boolean;
  restRoughness: number;
  restMetalness: number;
  restEnv: number;
};

/**
 * Defaults that change NOTHING.
 *
 * Roughness and metalness start where `finishes.ts` puts them for this
 * lineup, and the environment where the device entry's `bodyEnvMapIntensity`
 * does. The back panel's numbers are the exception and the reason this file
 * still exists: its darkening has no home in the registry yet, so the value
 * here is the only place it is written down. An
 * earlier version opened holding the values I happened to be proposing, so the
 * phone rendered grey-blue before anyone touched a slider and it read as the
 * finish being broken. A bench whose resting state changes the thing it
 * measures is worse than no bench.
 */
export const SURFACE_DEFAULTS: SurfaceValues = {
  bodyRoughness: 0.22,
  bodyMetalness: 0.48,
  bodyEnv: 1.8,
  panelDarken: 0,
  panelRoughness: 0.25,
  panelMetalness: 0.26,
  panelEnv: 0,
  // TEST 4's antenna bands, as the file has them.
  antennaRoughness: 0.5,
  antennaMetalness: 0,
  logoRoughness: 0.12,
  logoMetalness: 0.85,
  /* The back glass — `IxiedJEUxrDhLIX`, the one the model states at
     `opacity 0.3`. It is not body, so nothing else in this bench reaches it,
     and a glossy sheet over a matte one still reads glossy. */
  glassRoughness: 0.31,
  glassMetalness: 0,
  glassEnv: 0.32,
  /*
   * Everything the named groups do not cover.
   *
   * Thirty-four materials on this model and only four of them identified. When
   * a surface still looks wrong after the named sliders are exhausted, the
   * cause is one of the other thirty — so rather than guess which, this moves
   * all of them at once until the offender changes, and then it can be named.
   * Off by default, because on it flattens the lenses too.
   */
  restOn: false,
  restRoughness: 0.5,
  restMetalness: 0.5,
  restEnv: 1,
};

export const surfaceValues: SurfaceValues & { version: number } = {
  ...SURFACE_DEFAULTS,
  /** Bumped on every write, so the scene side can tell "changed" from "same"
      without comparing nine numbers every frame. */
  version: 0,
};

/*
 * Listeners, because polling cannot work here.
 *
 * The first version had the scene side watch `version` inside a `useFrame`,
 * and that is a deadlock on a demand loop: `useFrame` only runs when a frame
 * is being drawn, nothing draws a frame while the studio sits idle, and moving
 * a slider is not itself a frame request. So the change was never noticed, and
 * the `invalidate()` that would have drawn it sat on the far side of the check
 * that never ran.
 *
 * A push tells the scene the moment a value moves, whether or not anything is
 * rendering.
 */
const listeners = new Set<() => void>();

export function subscribeSurface(listener: () => void) {
  listeners.add(listener);
  // Returns void, not the Set's boolean: this is used as an effect cleanup.
  return () => {
    listeners.delete(listener);
  };
}

export function writeSurface(next: SurfaceValues) {
  Object.assign(surfaceValues, next);
  surfaceValues.version += 1;
  for (const listener of listeners) listener();
}
