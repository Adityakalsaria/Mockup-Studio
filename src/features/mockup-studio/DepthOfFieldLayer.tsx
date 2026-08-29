"use client";

import { EffectComposer, DepthOfField, TiltShift } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { useMemo } from "react";
import { Vector3 } from "three";
import type { BlurSettings } from "./blurStyles";

/**
 * The lens blur — ultramock's signature look, and the one thing mockup-studio
 * could not do while the screen was a DOM overlay floating in front of the
 * canvas: both passes below read the depth or the frame buffer, and DOM
 * participates in neither.
 *
 * Loaded lazily by PhoneStage3D and mounted only when the blur is actually
 * doing something, so the default path never pays for `postprocessing` or for
 * the extra render targets a composer allocates.
 *
 * `multisampling` is set explicitly on both composers. A composer renders the
 * scene into its own target, and that target does not inherit the canvas's
 * antialiasing — so without this, switching a blur on quietly took the
 * antialiasing off, and the phone's edges went ragged at the exact moment the
 * shot was supposed to look its most photographic.
 */
export default function DepthOfFieldLayer({ blur }: { blur: BlurSettings }) {
  // The radial pass focuses on a point in the SCENE, but the pad gives us a
  // point in the FRAME. Map one to the other across the phone's own plane
  // (z = 0), which is where anything worth focusing on sits.
  const target = useMemo(
    () => new Vector3((blur.focusX - 0.5) * 6, (0.5 - blur.focusY) * 6, 0),
    [blur.focusX, blur.focusY],
  );

  if (blur.mode === "tilt-shift") {
    return (
      <EffectComposer multisampling={8}>
        <TiltShift
          // Strength is a 0..100 dial over the sample kernel. The effect has
          // no continuous "amount" — kernelSize is a discrete enum — so the
          // slider quantises to its six steps rather than pretending to be
          // smooth. resolutionScale carries the in-between: a lower scale
          // blurs further for the same kernel, which is what makes the top of
          // the slider read as genuinely stronger than the middle.
          kernelSize={Math.min(
            KernelSize.HUGE,
            Math.round((blur.strength / 100) * KernelSize.HUGE),
          )}
          resolutionScale={0.5 - (blur.strength / 100) * 0.25}
          // The sharp band: `focusArea` is its width, `feather` softens its
          // edge, `offset` slides it across the frame and `rotation` tilts it.
          // Scan is centred on 0.5, so the default lays the band across the
          // middle of the phone.
          focusArea={blur.focusSize}
          feather={blur.falloff}
          offset={(blur.scan - 0.5) * 2}
          rotation={(blur.angle * Math.PI) / 180}
        />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={8}>
      <DepthOfField
        target={target}
        // Focus size reads as "how much stays sharp", which is focus RANGE,
        // not distance — distance is fixed by the target above.
        focusDistance={0}
        focusRange={Math.max(0.001, blur.focusSize * 0.1)}
        // Falloff widens the transition band rather than moving the plane.
        focalLength={Math.max(0.001, 0.02 + blur.falloff * 0.08)}
        // Bokeh is the expensive, good-looking path; without it the same
        // strength reads as a plain defocus.
        bokehScale={(blur.strength / 100) * (blur.bokeh ? 12 : 4)}
      />
    </EffectComposer>
  );
}
