"use client";

/**
 * Live sliders for the empty-screen placeholder's depth, on the laptops and
 * display whose screen mesh needs `screenOutlinePad`/`cornerZs` at all (see
 * `devices.ts`) -- the ones that keep coming back with a residual sliver or
 * a wrong-side render no amount of headless-screenshot guessing has fully
 * closed. Dragging a slider and watching the outline move live is the same
 * thing `GlassTuner` does for the glass material, aimed at the numbers in
 * `screenDepthTune.ts` instead of CSS variables.
 *
 * Portalled and placed the way `GlassTuner`/`MaterialLabPanel` learned to.
 */

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Leva, useControls } from "leva";
import { screenDepthTune } from "./screenDepthTune";

export function ScreenDepthTuner({ open }: { open: boolean }) {
  const v = useControls("Screen Depth", {
    zBias: { value: screenDepthTune.zBias, min: -0.2, max: 0.2, step: 0.001 },
    zGain: { value: screenDepthTune.zGain, min: 0, max: 30, step: 0.1 },
    insetOverride: {
      value: -1,
      min: -1,
      max: 1,
      step: 0.01,
      label: "inset (-1 = device default)",
    },
    minFacing: { value: screenDepthTune.minFacing, min: -0.5, max: 0.9, step: 0.01 },
  });

  useEffect(() => {
    screenDepthTune.zBias = v.zBias;
    screenDepthTune.zGain = v.zGain;
    screenDepthTune.insetOverride = v.insetOverride < 0 ? null : v.insetOverride;
    screenDepthTune.minFacing = v.minFacing;
  }, [v]);

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
      titleBar={{ title: "Screen Depth", position: { x: -290, y: 340 } }}
      theme={{ sizes: { rootWidth: "260px" } }}
    />,
    document.body,
  );
}
