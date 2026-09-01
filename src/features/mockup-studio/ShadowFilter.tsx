"use client";

import { useId } from "react";
import { shadowFilterParams, type ShadowSettings } from "./shadow";

/**
 * The drop shadow, as an SVG filter definition.
 *
 * Renders nothing visible -- it is a definition, and the id it returns is what
 * the stage points its `filter` at. Kept out of ShadowRig's old territory
 * entirely: there is no light and no surface here, just the phone's own
 * silhouette grown, blurred, offset and tinted.
 */
export function useShadowFilter(shadow: ShadowSettings): {
  id: string | null;
  defs: React.ReactNode;
} {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = `ks-shadow-${raw}`;
  const p = shadowFilterParams(shadow);
  if (!p) return { id: null, defs: null };

  return {
    id,
    defs: (
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter
          id={id}
          /* Generous, and it has to be: the region clips the result, and the
             shadow can sit a long way outside the phone once offset, blurred
             and spread are all pushed up. Percentages are of the filtered
             element, so this is the canvas plus a canvas-width of margin. */
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          {/* Grow first, then blur. The other order blurs a sharp edge and
              then dilates the blur, which spreads the falloff rather than the
              shape and reads as a bigger smudge instead of a bigger object. */}
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius={Math.max(0, p.dilate)}
            result="spread"
          />
          <feGaussianBlur in="spread" stdDeviation={Math.max(0, p.deviation)} result="blurred" />
          <feOffset in="blurred" dx={p.dx} dy={p.dy} result="moved" />
          <feFlood floodColor={p.color} floodOpacity={p.opacity} result="tint" />
          {/* Keep the tint only where the shadow shape is. */}
          <feComposite in="tint" in2="moved" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
    ),
  };
}
