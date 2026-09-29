"use client";

/**
 * Live sliders for the iPhone 17's own material recipe.
 *
 * `devices.ts` defines RAIL/RING/BACK_GLASS/PLATEAU/ANTENNA as one set of
 * numbers, used nowhere but this phone. Retuning any of them today means
 * editing the constant and waiting on a reload; this panel writes into
 * `materialTuning`'s store instead, which `PhoneStage3D` reads and applies
 * directly to the already-mounted materials by name -- a slider shows its
 * effect on the next frame. Nothing here is saved: a reload is the file's
 * values again, and the numbers still have to be copied back into
 * `devices.ts` once they look right.
 *
 * Portalled and placed the way `GlassTuner` is, stacked below it.
 */

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Leva, useControls } from "leva";
import {
  getMaterialTuning,
  setMaterialTuning,
  type MaterialTuningGroup,
} from "./materialTuning";

const GROUPS: { key: MaterialTuningGroup; label: string }[] = [
  { key: "rail", label: "Rail" },
  { key: "ring", label: "Ring" },
  { key: "backGlass", label: "Back glass" },
  { key: "plateau", label: "Plateau" },
  { key: "antenna", label: "Antenna" },
];

export function MaterialTuner({ open }: { open: boolean }) {
  const initial = getMaterialTuning();

  const schema: Record<
    string,
    { value: number; min: number; max: number; step: number; label: string }
  > = {};
  for (const { key, label } of GROUPS) {
    const v = initial[key];
    schema[`${key}Roughness`] = {
      value: v.roughness,
      min: 0,
      max: 1,
      step: 0.01,
      label: `${label} rough`,
    };
    schema[`${key}Metalness`] = {
      value: v.metalness,
      min: 0,
      max: 1,
      step: 0.01,
      label: `${label} metal`,
    };
    schema[`${key}EnvMap`] = {
      value: v.envMapIntensity,
      min: 0,
      max: 3,
      step: 0.05,
      label: `${label} env`,
    };
  }

  const values = useControls("iPhone 17 materials", schema);

  useEffect(() => {
    for (const { key } of GROUPS) {
      setMaterialTuning(key, {
        roughness: values[`${key}Roughness`],
        metalness: values[`${key}Metalness`],
        envMapIntensity: values[`${key}EnvMap`],
      });
    }
    // `values` is a fresh object every render; comparing its serialised form
    // is what keeps this from writing into the store (and asking three.js to
    // re-touch every material) on renders where nothing actually moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  // No body on the server; the client's first render has one.
  const onClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!onClient) return null;

  // `hidden`, never absent -- see `GlassTuner`: an unrendered store makes
  // leva inject its own panel.
  return createPortal(
    <Leva
      hidden={!open}
      titleBar={{ title: "iPhone 17 materials", position: { x: -290, y: 340 } }}
      theme={{ sizes: { rootWidth: "260px" } }}
    />,
    document.body,
  );
}
