"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { generateLensMap, supportsBackdropDisplacement } from "./liquidGlass";

/**
 * Attaches a refracting lens to one element.
 *
 * Returns a callback ref for the surface, the style to spread onto it, and the
 * SVG filter definition to render inside it. The filter is per-surface rather
 * than shared, because the displacement map is generated from that surface's
 * own width, height and radius — two panels of different heights need
 * different maps, and one shared filter would stretch the wrong one.
 *
 * Degrades to plain frosted glass, deliberately and silently:
 *
 *  - Safari and Firefox do not displace backdrops. Worse, a `backdrop-filter`
 *    containing any unsupported function is dropped WHOLE, blur included — so
 *    the reference is only added after the support check passes, or the panel
 *    would go from frosted to fully transparent, which is far worse than
 *    simply not refracting.
 *  - Reduced motion is not the relevant preference here, since nothing moves.
 *    Reduced transparency is: someone who has asked for less see-through does
 *    not want a lens bending the backdrop.
 */

const REDUCED_TRANSPARENCY = "(prefers-reduced-transparency: reduce)";

function subscribeToTransparency(onChange: () => void) {
  const query = window.matchMedia(REDUCED_TRANSPARENCY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useLiquidGlass(radius = 16) {
  // A callback ref, not a ref object: the effect below has to run when the
  // node actually attaches, and a ref object gives no signal that it has.
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [map, setMap] = useState<{ url: string; scale: number } | null>(null);

  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const filterId = `ks-lens-${rawId}`;

  const enabled = useSyncExternalStore(
    subscribeToTransparency,
    () =>
      supportsBackdropDisplacement() &&
      !window.matchMedia(REDUCED_TRANSPARENCY).matches,
    () => false,
  );

  useEffect(() => {
    // No need to clear a stale map when disabled: `active` below requires
    // `enabled` too, so an old map is simply never read.
    if (!node || !enabled) return;

    // The map depends on the panel's SHAPE, so it is rebuilt on resize and
    // never on scroll or movement. Regenerating a 290x900 map per frame while
    // something moved would cost far more than the effect is worth, and the
    // map would be identical every time.
    const build = () => {
      const rect = node.getBoundingClientRect();
      setMap(generateLensMap({ width: rect.width, height: rect.height, radius }));
    };

    build();
    const observer = new ResizeObserver(build);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, enabled, radius]);

  const active = enabled && map !== null;

  return {
    ref: setNode,
    /** Render inside the surface — it is a filter definition, not a visual. */
    svg: active ? (
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter
          id={filterId}
          // The map is in pixels, so the filter has to be too. Under the
          // default objectBoundingBox units the displacement would scale with
          // the element and the bevel would stretch on a taller panel.
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage href={map.url} result="lens" preserveAspectRatio="none" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="lens"
            scale={map.scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    ) : null,
    style: active
      ? ({
          backdropFilter: `blur(24px) saturate(180%) url(#${filterId})`,
          WebkitBackdropFilter: `blur(24px) saturate(180%) url(#${filterId})`,
        } as const)
      : undefined,
  };
}
