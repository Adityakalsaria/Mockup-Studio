"use client";

/**
 * Live-tuning store for the iPhone 17's own material recipe.
 *
 * `devices.ts` defines RAIL/RING/BACK_GLASS/PLATEAU/ANTENNA as one set of
 * numbers, used nowhere but this phone (confirmed by grep before this was
 * written). Retuning any of them today means editing the constant and
 * waiting on a reload; `MaterialTuner` and `PhoneStage3D` share this store
 * instead, so a slider mutates the already-mounted materials directly, by
 * name, and shows its effect on the next frame. Nothing here is saved --
 * copy the numbers back into `devices.ts` once they look right.
 */

export type MaterialTuningGroup =
  | "rail"
  | "ring"
  | "backGlass"
  | "plateau"
  | "antenna";

export type MaterialTuningValues = {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
};

/**
 * Which real material names on the iPhone 17's own model each group
 * corresponds to -- the same names `devices.ts` binds RAIL/RING/BACK_GLASS/
 * PLATEAU/ANTENNA to today. Kept here rather than derived from `devices.ts`,
 * because the whole point of this panel is to preview a change before it is
 * typed back in there.
 */
export const MATERIAL_TUNING_GROUPS: Record<MaterialTuningGroup, string[]> = {
  rail: ["sWPfdEwNBQxWmmj", "GMafcrtCzpsZpsb", "CpxQiFcpQUiESUC"],
  ring: ["GSJgRpZoabPIkha"],
  backGlass: ["SSCOTROIPktOHPN", "KChxKESNhKjaHJY", "NWVRqxSZYCCnuGM"],
  plateau: [
    "botRksrkmicTufW",
    "wiybngYOfUNIZCW",
    "oKEipclYWPpUKiP",
    "jefwjNZicFpvTUO",
  ],
  antenna: ["ThlRTlIfGAMlfQi", "BZMPiKcUUzPQcpW"],
};

/** name (as authored) -> which group it tunes, built once. */
export const MATERIAL_NAME_TO_GROUP = new Map<string, MaterialTuningGroup>(
  (
    Object.entries(MATERIAL_TUNING_GROUPS) as [MaterialTuningGroup, string[]][]
  ).flatMap(([group, names]) => names.map((name) => [name, group] as const)),
);

/** The constants' own current values in `devices.ts` -- the panel's start point. */
const DEFAULTS: Record<MaterialTuningGroup, MaterialTuningValues> = {
  rail: { roughness: 0.35, metalness: 0.85, envMapIntensity: 1 },
  ring: { roughness: 0.05, metalness: 1, envMapIntensity: 1 },
  backGlass: { roughness: 0.1, metalness: 0, envMapIntensity: 1.4 },
  plateau: { roughness: 0, metalness: 0, envMapIntensity: 1.9 },
  antenna: { roughness: 1, metalness: 0, envMapIntensity: 0.25 },
};

function cloneDefaults() {
  return Object.fromEntries(
    Object.entries(DEFAULTS).map(([group, values]) => [group, { ...values }]),
  ) as Record<MaterialTuningGroup, MaterialTuningValues>;
}

let state = cloneDefaults();
const listeners = new Set<() => void>();

export function getMaterialTuning() {
  return state;
}

export function subscribeMaterialTuning(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMaterialTuning(
  group: MaterialTuningGroup,
  patch: Partial<MaterialTuningValues>,
) {
  state = { ...state, [group]: { ...state[group], ...patch } };
  listeners.forEach((listener) => listener());
}
