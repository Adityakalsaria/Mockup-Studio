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
  /** Dilates the silhouette before blurring. */
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
  spread: { min: 0, max: 60, step: 1 },
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
 * The shadow as a CSS `filter` value, for the live stage.
 *
 * `drop-shadow` works on the canvas's ALPHA, which is exactly what makes this
 * possible: the stage renders on a transparent canvas over the background, so
 * the only opaque thing in it is the phone, and its silhouette is already the
 * shape the shadow needs. It follows every rotation for free.
 *
 * Spread has no CSS equivalent, so it is built from repeats: the same shadow
 * with no blur, offset around a ring, dilates the silhouette before the blurred
 * one is laid over it. Only paid for when spread is actually set.
 */
export function dropShadowCss(shadow: ShadowSettings, scale = 1): string | undefined {
  if (!shadow.enabled) return undefined;
  const colour = rgba(shadow.color, shadow.opacity);
  const layers: string[] = [];

  if (shadow.spread > 0) {
    const r = shadow.spread * scale;
    // Eight points is enough for a silhouette this smooth; a ring of them
    // reads as a dilation rather than as eight copies.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      layers.push(
        `drop-shadow(${(Math.cos(a) * r).toFixed(1)}px ${(Math.sin(a) * r).toFixed(1)}px 0 ${colour})`,
      );
    }
  }

  layers.push(
    `drop-shadow(${(shadow.offsetX * scale).toFixed(1)}px ${(shadow.offsetY * scale).toFixed(1)}px ${(
      shadow.blur * scale
    ).toFixed(1)}px ${colour})`,
  );
  return layers.join(" ");
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
): void {
  if (!shadow.enabled) return;
  ctx.shadowColor = rgba(shadow.color, shadow.opacity);
  ctx.shadowOffsetX = shadow.offsetX * scale;
  ctx.shadowOffsetY = shadow.offsetY * scale;
  ctx.shadowBlur = (shadow.blur + shadow.spread) * scale;
}

/** Clears it again, so nothing drawn afterwards inherits it. */
export function clearCanvasShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = "transparent";
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
}
