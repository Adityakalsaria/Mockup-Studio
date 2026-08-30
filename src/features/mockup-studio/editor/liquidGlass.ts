/**
 * Liquid glass — refraction, not just blur.
 *
 * A blurred translucent panel is frosted glass: it scatters what is behind it
 * but does not BEND it. Real glass with any thickness refracts, and the giveaway
 * is the edge — straight lines behind the panel kink as they pass under its
 * rim, and stay straight through the middle where the glass is flat.
 *
 * The technique (per Aave's write-up) is an SVG `feDisplacementMap` over the
 * backdrop. A displacement map encodes, per pixel, how far to shift the pixel
 * underneath: red is horizontal, green is vertical, and 128 in both means
 * "leave this one alone". So a map that is flat grey in the middle and ramps
 * near the border produces exactly the lens behaviour above — untouched in the
 * centre, bent at the rim.
 *
 * Everything here is about generating that map correctly for a rounded
 * rectangle. The map is a function of the panel's SHAPE, not its position, so
 * it is regenerated on resize and never on scroll or movement.
 */

export type LensOptions = {
  width: number;
  height: number;
  /** Corner radius of the surface, in px. */
  radius: number;
  /** How deep the bevel runs in from the edge. The band over which the glass
      curves; beyond it the pane is flat and nothing is displaced. */
  bevel?: number;
};

/**
 * Signed distance from a point to a rounded rectangle's edge.
 * Negative inside, zero on the edge. This is what makes the bevel follow the
 * corners properly instead of the four sides ramping independently and
 * cross-hatching where they meet.
 */
function roundedRectSdf(
  px: number,
  py: number,
  halfW: number,
  halfH: number,
  radius: number,
): number {
  const qx = Math.abs(px) - halfW + radius;
  const qy = Math.abs(py) - halfH + radius;
  const outsideX = Math.max(qx, 0);
  const outsideY = Math.max(qy, 0);
  const outside = Math.hypot(outsideX, outsideY);
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

/**
 * Build the displacement map as a PNG data URL.
 *
 * Returns null when there is nothing sensible to build — a zero-sized element,
 * or no canvas (this runs on the server during prerender).
 */
export function generateLensMap({
  width,
  height,
  radius,
  bevel = 22,
}: LensOptions): { url: string; scale: number } | null {
  if (typeof document === "undefined") return null;
  const w = Math.round(width);
  const h = Math.round(height);
  if (w < 2 || h < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const image = ctx.createImageData(w, h);
  const data = image.data;

  const halfW = w / 2;
  const halfH = h / 2;
  // A radius larger than half the shorter side is not a rounded rectangle any
  // more; clamping keeps the SDF well-formed rather than folding it inside out.
  const r = Math.min(radius, Math.min(halfW, halfH));
  // The band cannot be deeper than the panel's half-width, or the "flat middle"
  // disappears and the whole surface warps.
  const band = Math.min(bevel, Math.min(halfW, halfH) - 1);

  // The largest shift any pixel asks for, in map units. feDisplacementMap
  // multiplies by `scale`, so this only has to be a normalised shape.
  let peak = 0;
  const shift = new Float32Array(w * h * 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x - halfW + 0.5;
      const py = y - halfH + 0.5;
      const d = roundedRectSdf(px, py, halfW, halfH, r);

      // Only the band just inside the edge refracts.
      const depth = -d; // distance inward from the edge
      let amount = 0;
      if (depth >= 0 && depth < band) {
        const t = 1 - depth / band; // 1 at the rim, 0 at the inner limit
        // Squared, so the bend concentrates at the very edge instead of
        // spreading evenly across the band — which is how a real bevel behaves
        // and why a linear ramp reads as a smudge rather than as a curve.
        amount = t * t;
      }

      let nx = 0;
      let ny = 0;
      if (amount > 0) {
        // Gradient of the SDF by central difference: the direction "outward"
        // at this point, which is the axis the light bends along.
        const e = 1;
        const dx =
          roundedRectSdf(px + e, py, halfW, halfH, r) -
          roundedRectSdf(px - e, py, halfW, halfH, r);
        const dy =
          roundedRectSdf(px, py + e, halfW, halfH, r) -
          roundedRectSdf(px, py - e, halfW, halfH, r);
        const len = Math.hypot(dx, dy) || 1;
        nx = (dx / len) * amount;
        ny = (dy / len) * amount;
      }

      const i = (y * w + x) * 2;
      shift[i] = nx;
      shift[i + 1] = ny;
      peak = Math.max(peak, Math.abs(nx), Math.abs(ny));
    }
  }

  const norm = peak > 0 ? 1 / peak : 0;
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    const sx = shift[i * 2] * norm;
    const sy = shift[i * 2 + 1] * norm;
    // 128 is "no displacement" in both channels. Blue and alpha are unused by
    // the filter but alpha must be opaque or the PNG encodes premultiplied
    // nonsense and the map comes back wrong.
    data[p] = Math.max(0, Math.min(255, Math.round(128 + sx * 127)));
    data[p + 1] = Math.max(0, Math.min(255, Math.round(128 + sy * 127)));
    data[p + 2] = 128;
    data[p + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
  return { url: canvas.toDataURL("image/png"), scale: Math.round(band * 0.9) };
}

/**
 * Whether the browser will actually displace a backdrop.
 *
 * This matters more than a usual feature check: a `backdrop-filter` whose list
 * contains one unsupported function is discarded ENTIRELY, taking the blur
 * with it. Getting this wrong does not degrade the glass — it removes it, and
 * the panel goes flat and transparent. So the filter reference is only ever
 * added once this has said yes.
 */
export function supportsBackdropDisplacement(): boolean {
  if (typeof CSS === "undefined" || !CSS.supports) return false;
  return (
    CSS.supports("backdrop-filter", "url(#test)") ||
    CSS.supports("-webkit-backdrop-filter", "url(#test)")
  );
}
