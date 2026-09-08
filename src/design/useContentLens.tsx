"use client";

/**
 * Aave-style content glass — a moving LENS that bends a dedicated
 * `refractionTarget`, not the backdrop and not a stack of decorative plates.
 *
 * Composition (from https://aave.com/design/building-glass-for-the-web):
 *
 *   <AaveGlass
 *     lens={{ width, height, borderRadius }}
 *     x={position}           // lens MOVES; map does NOT rebuild on move
 *     refractionTarget={<FillCopy />}
 *   >
 *     <UnderlyingControl />  // stays sharp outside the lens
 *   </AaveGlass>
 *
 * Callers counter-translate `refractionTarget` by `-x` / `-y` (e.g.
 * `left: -lensX`, `top: -lensTop`) so content stays registered with the
 * control while the lens window moves — that is how mid-travel label
 * refraction reads as “glass forming.”
 *
 * Rules encoded here:
 *  1. Children render normally; only pixels under the lens bend.
 *  2. `filter: url(#feDisplacementMap)` applies to SourceGraphic of the
 *     refractionTarget layer — never backdrop-filter on this path.
 *  3. Displacement map = PNG from lens shape (R/G, 128 neutral). Rebuilt only
 *     when lens W/H/radius change, never when `x` changes.
 *  4. Optional specular sits on the lens chrome ABOVE the filtered layer so it
 *     is not itself displaced (avoids ghost double rims).
 *  5. Outer lens keeps `overflow: hidden`; specular stays ABOVE the filter.
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { generateLensMap } from "../features/mockup-studio/editor/liquidGlass";

const REDUCED_TRANSPARENCY = "(prefers-reduced-transparency: reduce)";

function subscribeToTransparency(onChange: () => void) {
  const query = window.matchMedia(REDUCED_TRANSPARENCY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export type AaveGlassLens = {
  width: number | string;
  height: number | string;
  borderRadius: number;
};

export type AaveGlassProps = {
  lens: AaveGlassLens;
  /**
   * Horizontal lens offset. Number = px. String = raw CSS length
   * (e.g. `${sprung * 100}%` — %-translate is relative to the lens itself).
   */
  x: number | string;
  /**
   * Vertical lens offset, same units as `x`. A column of rows springs this
   * while `x` stays 0; `Segmented` springs `x` while this stays 0.
   */
  y?: number | string;
  /**
   * Content/fill copy that sits inside the lens and receives the displacement.
   * Size this to the full control and counter-translate by `-x` so glyphs stay
   * aligned with children while the lens slides (see Segmented HighlightedOptions).
   */
  refractionTarget: ReactNode;
  /** Underlying control — sharp everywhere outside the lens. */
  children: ReactNode;
  /** Bend strength multiplier. Slider should be softer (~0.3) than Segmented. */
  scale?: number;
  bevel?: number;
  /** Cast / contact shadow on the lens chrome (clip wrapper). */
  lensShadow?: string;
  /**
   * Inset shadow for the finish that sits ABOVE the filtered layer, so it is
   * not itself displaced. Pass `null` for a lens that should have no finish at
   * all; omit it for the default rim.
   */
  specular?: string | null;
  /**
   * Blend mode for that finish. The panel's depth bands blend rather than
   * composite, and the pill's are the same effect at a smaller scale.
   */
  specularBlend?: string;
  /**
   * Surface material for the lens, painted UNDER the refracted content —
   * the same layer stack the panel uses, so a travelling selection is made of
   * what it travels over rather than of a flat plate that resembles it.
   */
  chrome?: ReactNode;
  /** Class on the material's wrapper, to configure it. */
  chromeClassName?: string;
  /** Extra positioning for the lens box (e.g. vertical centering on a track). */
  lensStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
};

type LensMap = {
  url: string;
  scale: number;
  width: number;
  height: number;
};

/**
 * Moving content lens. Map is shape-only; translating via `x` is cheap.
 */
export function AaveGlass({
  lens,
  x,
  y = 0,
  refractionTarget,
  children,
  scale: scaleFactor = 1,
  bevel,
  lensShadow,
  specular = "inset 0 1px 0 rgb(255 255 255 / 0.55), inset 0 -1px 0 rgb(0 0 0 / 0.08)",
  specularBlend,
  chrome,
  chromeClassName = "",
  lensStyle,
  className = "",
  style,
}: AaveGlassProps) {
  const [lensNode, setLensNode] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<LensMap | null>(null);
  const [mapKey, setMapKey] = useState("");

  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const filterId = `mo-aave-glass-${rawId}`;

  const enabled = useSyncExternalStore(
    subscribeToTransparency,
    () => !window.matchMedia(REDUCED_TRANSPARENCY).matches,
    () => false,
  );

  /*
   * BEFORE PAINT, both of them.
   *
   * `generateLensMap` is synchronous — it draws a canvas and hands the URL
   * straight back — but it was being run from `useEffect`, which fires after
   * the browser has already painted the frame. So the first paint of any lens
   * had `map === null`, which makes `active` false, which drops the filter
   * reference entirely: the pill appeared as its own material and rim, and the
   * refraction arrived a frame later. That is the flash — an outline in flat
   * white, and then the finished pill.
   *
   * A layout effect runs after the DOM is in place and before the paint, which
   * is exactly the window this needs: the node can be measured, and the map is
   * ready in the same frame the pill is first drawn in.
   *
   * `useEffect` on the server, where layout effects warn and there is nothing
   * to measure anyway.
   */
  const useMeasureEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

  // Shape only — observe the lens box. Transform/`x` does not change layout
  // size, so dragging never rebuilds the PNG.
  useMeasureEffect(() => {
    if (!lensNode || !enabled) {
      setMap(null);
      setMapKey("");
      return;
    }

    const build = () => {
      // `offset*`, not `getBoundingClientRect()`: the latter reports the
      // TRANSFORMED box, so a lens that scales — the slider knob swelling
      // under a press — would report a new size every frame and rebuild its
      // displacement PNG throughout the animation. The layout box is what the
      // map is drawn against, and a transform never changes it.
      const key = `${lensNode.offsetWidth}x${lensNode.offsetHeight}r${lens.borderRadius}b${bevel ?? ""}`;
      setMapKey((prev) => (prev === key ? prev : key));
    };

    build();
    const observer = new ResizeObserver(build);
    observer.observe(lensNode);
    return () => observer.disconnect();
  }, [lensNode, enabled, lens.borderRadius, lens.width, lens.height, bevel]);

  useMeasureEffect(() => {
    if (!enabled || !mapKey || !lensNode) {
      setMap(null);
      return;
    }
    const width = lensNode.offsetWidth;
    const height = lensNode.offsetHeight;
    const next = generateLensMap({
      width,
      height,
      radius: lens.borderRadius,
      bevel,
    });
    if (!next) {
      setMap(null);
      return;
    }
    setMap({ ...next, width, height });
  }, [mapKey, enabled, lensNode, lens.borderRadius, bevel]);

  // `scale` at zero is a real off switch, not a weak bend: it drops the filter
  // reference entirely so a lens can be parked as a plain fill — the slider
  // knob sits like that until it is actually pressed. The map is kept, because
  // it does not depend on scale, so switching back is instant rather than a
  // canvas rebuild in the first frame of a drag.
  const active = enabled && map !== null && scaleFactor > 0;
  const displacement = active
    ? Math.max(1, Math.round(map.scale * scaleFactor))
    : 0;
  const pad = active ? Math.max(4, Math.ceil(displacement)) : 0;

  // A percentage here resolves against the LENS box, not the container — which
  // is exactly what `Segmented` wants (one unit = one segment) and why the
  // offsets are handed over as raw CSS lengths rather than being normalised.
  const length = (value: number | string) =>
    typeof value === "number" ? `${value}px` : value;
  const translate = `translate(${length(x)}, ${length(y)})`;
  const composedTransform = lensStyle?.transform
    ? `${translate} ${lensStyle.transform}`
    : translate;

  const svg = active ? (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <filter
        id={filterId}
        x={-pad}
        y={-pad}
        width={map.width + pad * 2}
        height={map.height + pad * 2}
        filterUnits="userSpaceOnUse"
        primitiveUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={map.url}
          x={0}
          y={0}
          width={map.width}
          height={map.height}
          result="lens"
          preserveAspectRatio="none"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="lens"
          scale={displacement}
          xChannelSelector="R"
          yChannelSelector="G"
          edgeMode="none"
        />
      </filter>
    </svg>
  ) : null;

  const lensStyleRest = { ...(lensStyle ?? {}) };
  delete lensStyleRest.transform;

  return (
    <div className={`relative ${className}`.trim()} style={style}>
      {/* 1. Underlying control — sharp outside the lens */}
      {children}

      {/* 2. Moving lens chrome (clips filter output; owns cast shadow) */}
      <div
        ref={setLensNode}
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: 0,
          top: 0,
          width: lens.width,
          height: lens.height,
          borderRadius: lens.borderRadius,
          overflow: "hidden",
          boxShadow: lensShadow,
          ...lensStyleRest,
          transform: composedTransform,
        }}
      >
        {/* 2b. The lens's own material, beneath everything it refracts. */}
        {chrome ? (
          <div
            className={chromeClassName}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              pointerEvents: "none",
            }}
          >
            {chrome}
          </div>
        ) : null}

        {/* 3. refractionTarget receives filter:url(#…) on SourceGraphic */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "inherit",
            ...(active ? { filter: `url(#${filterId})` } : null),
          }}
        >
          {svg}
          {refractionTarget}
        </div>

        {/* 4. Specular finish — above the filtered layer, not displaced */}
        {specular ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              boxShadow: specular,
              mixBlendMode: specularBlend as CSSProperties["mixBlendMode"],
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
