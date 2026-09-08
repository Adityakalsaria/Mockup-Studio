/**
 * Colour maths, shared.
 *
 * It sat under the old editor because the old editor's picker was the only
 * thing that needed it. The system's own picker needs the same conversions and
 * a design system cannot reach up into a feature for them, so it lives here
 * now — no imports of its own, which is what made it easy to move.
 */
/**
 * Colour conversion for the picker.
 *
 * The picker works in HSV and stores hex, so every edit is a round trip. Two
 * consequences shape what follows.
 *
 * Hue is kept as state ALONGSIDE the hex rather than being re-derived from it.
 * At zero saturation, and at zero value, hue is not recoverable -- black is
 * black at every hue -- so a picker that re-derives it snaps the square's
 * gradient back to red the moment you drag into a corner. Keeping hue means
 * dragging to black and back returns the colour you were on.
 *
 * Rounding is done once, at the hex boundary. Converting hex -> HSV -> hex
 * repeatedly must not drift, or a colour would crawl while you look at it.
 */

export type Rgb = { r: number; g: number; b: number };
/** h in [0,360), s and v in [0,1]. */
export type Hsv = { h: number; s: number; v: number };

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function parseHex(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  // Three-digit shorthand is what people type by hand and what half the web
  // quotes colours in, so it is accepted even though nothing here emits it.
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp01(s);
  const vn = clamp01(v);
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;
  const sector = Math.floor(hn / 60) % 6;
  const [r, g, b] = (
    [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ] as const
  )[sector];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export const hexToHsv = (hex: string): Hsv | null => {
  const rgb = parseHex(hex);
  return rgb ? rgbToHsv(rgb) : null;
};

export const hsvToHex = (hsv: Hsv): string => toHex(hsvToRgb(hsv));

/**
 * Whether to draw the marker and any label over a colour in black or white.
 *
 * Uses WCAG relative luminance rather than a naive average, because the eye is
 * far more sensitive to green than to blue: #0000ff and #00ff00 have similar
 * averages and nothing like similar brightness. The 0.5 threshold is on the
 * linearised value, which is why pure blue correctly reads as dark.
 */
export function isLight(hex: string): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const lin = (c: number) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b) > 0.5;
}
