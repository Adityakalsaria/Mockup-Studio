import { useId } from "react";
import type { BackgroundSettings } from "./backgrounds";
import type { BlurSettings } from "./blurStyles";

/**
 * The canvas's picture, as a layer of its own inside the frame so Zoom can
 * scale it without touching what is drawn over it.
 *
 * A real element with the image in its own `background-image`, not a CSS
 * variable: Chrome drops any custom property over about 2 MB, and a phone photo
 * as a data URL is well past that -- the picture vanished and only the colour
 * behind it was left. The host must isolate (`backgroundClass`) so the layer
 * sits above the frame's colour and under everything in it.
 */
export default function BackgroundImage({
  bg,
  blur,
}: {
  bg: BackgroundSettings;
  /**
   * Depth of field's stand-in for this layer. The blur panel's own effect
   * (`DepthOfFieldLayer`) is a screen-space pass over the CANVAS's finished
   * frame -- the phone is the only opaque thing drawn into it, so a backdrop
   * sitting behind that transparent canvas, composited by the browser rather
   * than by three, was never touched by it and stayed sharp under a blurred
   * phone.
   *
   * A plain CSS blur, layered twice and masked, not the same shader: two
   * copies of the same image (one sharp, one blurred) with an SVG mask over
   * the blurred one cut to the same focus shape the shader uses -- a circle
   * for radial, a one-sided band for directional, a two-sided band for tilt
   * shift -- so moving the focus point reveals sharp backdrop the same way it
   * reveals sharp phone. The mask ignores the shader's aspect correction (a
   * true circle skewed to an ellipse on a non-square frame): close enough by
   * eye, and not worth a live container-size measurement for.
   */
  blur?: BlurSettings | null;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (bg.kind !== "image" || !bg.imageSrc) return null;

  const active = !!blur && blur.mode !== "off" && blur.strength > 0;
  const blurPx = active ? (blur!.strength / 100) * 28 : 0;

  const baseStyle = {
    backgroundImage: `url(${bg.imageSrc})`,
    backgroundSize: bg.imageFit,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    // `cover`/`contain` size against this element's own (unrotated) box,
    // then the whole result turns -- the same order `paintBackground`'s
    // `drawFitted` rotates in, so the export never drifts from this.
    transform: `rotate(${bg.imageRotate ?? 0}deg) scale(${bg.imageZoom ?? 1})`,
  } as const;

  if (!active) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: -1, ...baseStyle }} />
    );
  }

  // Same normalisation as `DepthOfFieldLayer`'s shader: radius/feather as a
  // share of HALF the frame.
  const radius = blur!.focusSize * 0.5;
  const feather = 0.02 + blur!.falloff * 0.6;
  // focusX/focusY are already top-down (see `blurStyles.ts`); it is the
  // shader's own UV space that is bottom-up and flips this, not this mask.
  const cx = blur!.focusX;
  const cy = blur!.focusY;
  const rad = (blur!.angle * Math.PI) / 180;
  // SVG's Y grows downward; the shader's UV grows upward, so a direction
  // vector (unlike a point) needs its Y flipped to land on the same side.
  const dirX = Math.cos(rad);
  const dirY = -Math.sin(rad);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const gradId = `mo-bg-focus-grad-${rawId}`;
  const maskId = `mo-bg-focus-mask-${rawId}`;

  let gradient: React.ReactNode;
  if (blur!.mode === "radial") {
    gradient = (
      <radialGradient id={gradId} cx={cx} cy={cy} r={0.5} gradientUnits="objectBoundingBox">
        <stop offset={0} stopColor="black" />
        <stop offset={clamp01(radius)} stopColor="black" />
        <stop offset={clamp01(radius + feather)} stopColor="white" />
        <stop offset={1} stopColor="white" />
      </radialGradient>
    );
  } else {
    // Unit-length direction (perpendicular for tilt shift's band), scaled by
    // 0.5 so a gradient offset lands on the same half-frame units as radius.
    const [vx, vy] = blur!.mode === "tilt-shift" ? [-dirY, dirX] : [dirX, dirY];
    const x1 = cx;
    const y1 = cy;
    const x2 = cx + vx * 0.5;
    const y2 = cy + vy * 0.5;
    gradient = (
      <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="objectBoundingBox">
        {blur!.mode === "tilt-shift" ? (
          <>
            <stop offset={0} stopColor="white" />
            <stop offset={clamp01(0.5 - radius - feather)} stopColor="white" />
            <stop offset={clamp01(0.5 - radius)} stopColor="black" />
            <stop offset={clamp01(0.5 + radius)} stopColor="black" />
            <stop offset={clamp01(0.5 + radius + feather)} stopColor="white" />
            <stop offset={1} stopColor="white" />
          </>
        ) : (
          <>
            <stop offset={0} stopColor="black" />
            <stop offset={clamp01(0.5 + radius)} stopColor="black" />
            <stop offset={clamp01(0.5 + radius + feather)} stopColor="white" />
            <stop offset={1} stopColor="white" />
          </>
        )}
      </linearGradient>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: -1 }}>
      {/* Sharp copy, always underneath -- shows through wherever the mask hides the blur above it. */}
      <div className="absolute inset-0" style={baseStyle} />
      <div
        className="absolute inset-0"
        style={{
          ...baseStyle,
          filter: `blur(${blurPx}px)`,
          mask: `url(#${maskId})`,
          WebkitMask: `url(#${maskId})`,
        }}
      />
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          {gradient}
          <mask id={maskId} maskContentUnits="objectBoundingBox">
            <rect x={0} y={0} width={1} height={1} fill={`url(#${gradId})`} />
          </mask>
        </defs>
      </svg>
    </div>
  );
}
