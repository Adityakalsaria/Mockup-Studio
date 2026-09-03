/**
 * A layer you put over the shot, and blur.
 *
 * Figma's Layer blur, not a lens. The blur passes in PhoneStage3D act on the
 * SCENE -- they read depth and the frame buffer, so they can only ever affect
 * the phone, and they are the wrong tool for "put a soft dark shape across the
 * bottom of the frame". This is a shape with a fill and a blur, sitting over
 * everything, which is what that job actually is.
 *
 * Geometry is normalised 0..1 against the frame rather than stored in pixels,
 * so an overlay placed at one export size still lands in the same place at
 * another.
 */
export type OverlayShape = "rect" | "ellipse";

/** How the blur varies across the layer. Uniform is one radius everywhere;
    the rest fade the layer out along a direction, which is what reads as a
    blur that gets stronger as it goes. */
export type OverlayFade = "uniform" | "linear" | "radial";

export interface OverlaySettings {
  enabled: boolean;
  shape: OverlayShape;
  /** Centre, 0..1 across the frame. */
  x: number;
  y: number;
  /** Size, 0..1 of the frame. */
  width: number;
  height: number;
  color: string;
  /** 0..1. */
  opacity: number;
  /** Blur radius as a fraction of the frame's shorter side, so it scales with
      the export rather than being a pixel count that only suits one size. */
  blur: number;
  fade: OverlayFade;
  /** Degrees. Which way a linear fade runs; ignored by the others. */
  angle: number;
}

export const OVERLAY_SHAPES: { id: OverlayShape; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
];

export const OVERLAY_FADES: { id: OverlayFade; label: string }[] = [
  { id: "uniform", label: "Uniform" },
  { id: "linear", label: "Linear" },
  { id: "radial", label: "Radial" },
];

export const DEFAULT_OVERLAY: OverlaySettings = {
  enabled: false,
  shape: "ellipse",
  x: 0.5,
  // Low in the frame and wide: the common use is sinking the foot of a shot
  // under a caption, which is where this gets reached for first.
  y: 0.82,
  width: 1.1,
  height: 0.45,
  color: "#000000",
  opacity: 0.85,
  blur: 0.09,
  fade: "uniform",
  angle: 90,
};

export const OVERLAY_RANGES = {
  x: { min: -0.5, max: 1.5, step: 0.005 },
  y: { min: -0.5, max: 1.5, step: 0.005 },
  width: { min: 0.05, max: 2, step: 0.01 },
  height: { min: 0.05, max: 2, step: 0.01 },
  opacity: { min: 0, max: 1, step: 0.01 },
  blur: { min: 0, max: 0.5, step: 0.002 },
  angle: { min: 0, max: 360, step: 1 },
} as const;

export function isOverlayActive(o: OverlaySettings): boolean {
  return o.enabled && o.opacity > 0 && o.width > 0 && o.height > 0;
}

/**
 * The layer as CSS, given the frame it sits in.
 *
 * A mask rather than a second blurred copy: fading a already-blurred fill is
 * one composite, where stacking blurred copies to fake a ramp costs a layer
 * per step and still bands.
 */
export function overlayStyle(
  o: OverlaySettings,
  frame: { width: number; height: number },
): React.CSSProperties {
  const shorter = Math.min(frame.width, frame.height);
  const w = o.width * frame.width;
  const h = o.height * frame.height;
  const mask =
    o.fade === "linear"
      ? `linear-gradient(${o.angle}deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`
      : o.fade === "radial"
        ? "radial-gradient(closest-side, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)"
        : undefined;
  return {
    position: "absolute",
    left: o.x * frame.width - w / 2,
    top: o.y * frame.height - h / 2,
    width: w,
    height: h,
    background: o.color,
    opacity: o.opacity,
    borderRadius: o.shape === "ellipse" ? "50%" : 0,
    filter: o.blur > 0 ? `blur(${o.blur * shorter}px)` : undefined,
    ...(mask ? { maskImage: mask, WebkitMaskImage: mask } : null),
    pointerEvents: "none",
  };
}

/**
 * The same layer, painted onto a canvas for export.
 *
 * The live one is a DOM element with a CSS filter, and neither survives a
 * pixel read -- the exporters composite the backdrop and the WebGL canvas
 * themselves, so anything living in CSS has to be drawn again here or it is
 * simply not in the file. The drop shadow already works this way.
 *
 * Drawn into an offscreen canvas first, because the fade is a mask: filling
 * the shape and then compositing a gradient with destination-in is what a CSS
 * mask-image does, and it cannot be expressed as one fill. The offscreen is
 * padded by three blur radii so the blur has room to fall off rather than
 * being clipped at the shape's own edge.
 */
export function paintOverlay(
  ctx: CanvasRenderingContext2D,
  o: OverlaySettings,
  width: number,
  height: number,
): void {
  if (!isOverlayActive(o)) return;

  const shorter = Math.min(width, height);
  const w = o.width * width;
  const h = o.height * height;
  const x = o.x * width - w / 2;
  const y = o.y * height - h / 2;
  const radius = o.blur * shorter;
  const pad = Math.ceil(radius * 3);

  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.ceil(w + pad * 2));
  off.height = Math.max(1, Math.ceil(h + pad * 2));
  const c = off.getContext("2d");
  if (!c) return;

  c.fillStyle = o.color;
  if (o.shape === "ellipse") {
    c.beginPath();
    c.ellipse(off.width / 2, off.height / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    c.fillRect(pad, pad, w, h);
  }

  if (o.fade !== "uniform") {
    c.globalCompositeOperation = "destination-in";
    const cx = off.width / 2;
    const cy = off.height / 2;
    let g: CanvasGradient;
    if (o.fade === "radial") {
      g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) / 2);
    } else {
      // CSS angles run clockwise from "to top", which is this vector.
      const rad = (o.angle * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      const half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2;
      g = c.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    }
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, off.width, off.height);
    c.globalCompositeOperation = "source-over";
  }

  ctx.save();
  ctx.globalAlpha = o.opacity;
  ctx.filter = radius > 0 ? `blur(${radius}px)` : "none";
  ctx.drawImage(off, x - pad, y - pad);
  ctx.restore();
}
