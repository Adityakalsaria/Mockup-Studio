"use client";

/**
 * The surface bench's sliders — the DOM half.
 *
 * Separate from `MaterialLab` because they cannot be together. leva renders a
 * panel, and a leva hook called inside the `<Canvas>` runs in the three.js
 * reconciler where there is no DOM to render into: the first version of this
 * called `useControls` in the scene and produced no panel at all, silently.
 *
 * The `<Leva />` element is placed explicitly rather than left to leva's own
 * injection, for the same reason it is positioned on the LEFT: leva defaults
 * to the top right, which is exactly where the crafting stack sits, so an
 * auto-injected panel would open underneath the interface and look like it had
 * not opened.
 */

import { useEffect } from "react";
import { Leva, useControls, folder } from "leva";
import { SURFACE_DEFAULTS, writeSurface } from "./materialLabStore";

export function MaterialLabPanel({ active }: { active: boolean }) {
  const values = useControls("iPhone 18 surface", {
    body: folder({
      bodyRoughness: { value: SURFACE_DEFAULTS.bodyRoughness, min: 0, max: 1, step: 0.01 },
      bodyMetalness: { value: SURFACE_DEFAULTS.bodyMetalness, min: 0, max: 1, step: 0.01 },
      bodyEnv: { value: SURFACE_DEFAULTS.bodyEnv, min: 0, max: 4, step: 0.05 },
    }),
    "back panel": folder({
      panelDarken: { value: SURFACE_DEFAULTS.panelDarken, min: 0, max: 0.9, step: 0.01 },
      panelRoughness: { value: SURFACE_DEFAULTS.panelRoughness, min: 0, max: 1, step: 0.01 },
      panelMetalness: { value: SURFACE_DEFAULTS.panelMetalness, min: 0, max: 1, step: 0.01 },
      panelEnv: { value: SURFACE_DEFAULTS.panelEnv, min: 0, max: 4, step: 0.05 },
    }),
    glass: folder({
      glassRoughness: { value: SURFACE_DEFAULTS.glassRoughness, min: 0, max: 1, step: 0.01 },
      glassMetalness: { value: SURFACE_DEFAULTS.glassMetalness, min: 0, max: 1, step: 0.01 },
      glassEnv: { value: SURFACE_DEFAULTS.glassEnv, min: 0, max: 4, step: 0.05 },
    }),
    "everything else": folder({
      restOn: { value: SURFACE_DEFAULTS.restOn, label: "apply" },
      restRoughness: { value: SURFACE_DEFAULTS.restRoughness, min: 0, max: 1, step: 0.01 },
      restMetalness: { value: SURFACE_DEFAULTS.restMetalness, min: 0, max: 1, step: 0.01 },
      restEnv: { value: SURFACE_DEFAULTS.restEnv, min: 0, max: 4, step: 0.05 },
    }),
    logo: folder({
      logoRoughness: { value: SURFACE_DEFAULTS.logoRoughness, min: 0, max: 1, step: 0.01 },
      logoMetalness: { value: SURFACE_DEFAULTS.logoMetalness, min: 0, max: 1, step: 0.01 },
    }),
  });

  useEffect(() => {
    writeSurface(values);
  }, [values]);

  /*
   * `hidden`, never absent.
   *
   * Rendering nothing does not mean no panel: the controls are still
   * registered, and leva answers an unrendered store by injecting its own
   * default panel — top right, on top of the crafting stack, on every device
   * in the registry. Keeping the element mounted and hidden is what actually
   * suppresses it.
   */
  return (
    <Leva
      hidden={!active}
      titleBar={{ title: "Surface", position: { x: 0, y: 0 } }}
      theme={{ sizes: { rootWidth: "260px" } }}
      collapsed
    />
  );
}
