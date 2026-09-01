/**
 * The drop shadow.
 *
 * A DROP shadow, in the sense a design tool means it: the object's own
 * silhouette, offset, blurred and tinted, drawn behind it. Not a cast shadow
 * from a light in the scene.
 *
 * That distinction was worth several attempts to learn. A real cast shadow
 * needs a surface to land on, and every choice of surface is wrong for a phone
 * floating in frame: a wall behind it collapses to a thin band the moment the
 * phone tilts, because that genuinely is what its silhouette becomes against a
 * vertical plane; a floor puts the shadow underneath rather than behind; and a
 * plane parallel to the phone hides the shadow behind the phone entirely.
 *
 * A drop shadow has none of those problems, because it is not simulating
 * anything. It is the silhouette, so it stays the phone's shape at any angle,
 * and it is composited behind, so it can never fall across the screen.
 */

export type ShadowSettings = {
  enabled: boolean;
  /** Offset in pixels at 1x, like a design tool's X and Y. */
  offsetX: number;
  offsetY: number;
  blur: number;
  /** Dilates the silhouette before it is blurred, as a design tool's does. */
  spread: number;
  opacity: number;
  color: string;
};

export const DEFAULT_SHADOW: ShadowSettings = {
  // Off by default: it changes every existing shot, and a shadow is a choice
  // rather than a correction.
  enabled: false,
  // Straight down and generous. A shadow directly behind an object is invisible
  // -- it has to clear the silhouette to read at all -- and down is where one
  // falls if nobody has said otherwise.
  offsetX: 0,
  offsetY: 24,
  blur: 48,
  spread: 0,
  opacity: 0.28,
  color: "#000000",
};

export const SHADOW_RANGES = {
  offsetX: { min: -200, max: 200, step: 1 },
  offsetY: { min: -200, max: 200, step: 1 },
  blur: { min: 0, max: 200, step: 1 },
  spread: { min: 0, max: 80, step: 1 },
  opacity: { min: 0, max: 1, step: 0.01 },
} as const;

/** `#rrggbb` plus an alpha, as a colour a filter or a canvas will take. */
function rgba(hex: string, alpha: number): string {
  const raw = hex.replace(/^#/, "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(/^[0-9a-f]{6}$/i.test(full) ? full : "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * The shadow as an SVG filter, for the live stage.
 *
 * SVG rather than CSS `drop-shadow`, and for one reason: spread. CSS has no
 * spread, and the obvious workaround -- stacking offset copies of the shadow --
 * does not dilate anything. Each filter in a CSS chain applies to the RESULT of
 * the one before it, so eight copies around a ring draw eight silhouettes, not
 * one fatter one. It also cost nine full-canvas passes a frame.
 *
 * `feMorphology` with operator="dilate" IS the dilation, in one pass, and the
 * rest of the chain is the same drop shadow spelled out: grow the silhouette,
 * blur it, offset it, fill it with the colour, then lay the phone back on top.
 *
 * It works on `SourceAlpha` because the stage renders transparent over the
 * background -- the only opaque thing in the canvas is the phone, so its alpha
 * IS the silhouette, at whatever angle it happens to be.
 */
export type ShadowFilter = {
  /** stdDeviation; CSS blur radius is twice this, which is the figure the
      slider shows so it matches what a design tool would call it. */
  deviation: number;
  dilate: number;
  dx: number;
  dy: number;
  color: string;
  opacity: number;
};

export function shadowFilterParams(shadow: ShadowSettings, scale = 1): ShadowFilter | null {
  if (!shadow.enabled) return null;
  return {
    deviation: (shadow.blur * scale) / 2,
    dilate: shadow.spread * scale,
    dx: shadow.offsetX * scale,
    dy: shadow.offsetY * scale,
    color: shadow.color,
    opacity: shadow.opacity,
  };
}

/**
 * The same shadow on a 2D context, for export.
 *
 * The export compositor paints the background and then draws the stage over
 * it, so setting the context's shadow before that draw puts the shadow in the
 * file. Canvas has no spread either; it is folded into the blur, which is
 * close enough at export sizes and honest about being an approximation.
 */
export function applyCanvasShadow(
  ctx: CanvasRenderingContext2D,
  shadow: ShadowSettings,
  scale = 1,
  filterId?: string | null,
): void {
  if (!shadow.enabled) return;

  /*
   * Prefer the SAME filter the stage uses, so the export matches the preview
   * exactly rather than approximating it. A 2D context can point `filter` at
   * an SVG filter in the document by id, which is the only route that carries
   * spread -- the shadow* properties below have no dilation at all.
   *
   * The filter is authored in 1x pixels for the stage, so an export at 2x or
   * 3x has to be drawn through a scaled transform for it to match; that is
   * handled by the caller, which already scales its draw.
   */
  if (filterId && typeof ctx.filter === "string") {
    ctx.filter = `url(#${filterId})`;
    return;
  }
  ctx.shadowColor = rgba(shadow.color, shadow.opacity);
  ctx.shadowOffsetX = shadow.offsetX * scale;
  ctx.shadowOffsetY = shadow.offsetY * scale;
  // No filter id to point at, so this is the fallback: a 2D context has no
  // dilation, and folding spread into the blur is the closest it can get. It
  // reads slightly softer than the stage rather than slightly smaller, which
  // is the better way to be wrong.
  ctx.shadowBlur = (shadow.blur + shadow.spread) * scale;
}

/** Clears it again, so nothing drawn afterwards inherits it. */
export function clearCanvasShadow(ctx: CanvasRenderingContext2D): void {
  ctx.filter = "none";
  ctx.shadowColor = "transparent";
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
}
