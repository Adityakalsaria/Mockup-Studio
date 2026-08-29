"use client";

import { CanvasTexture, type Texture } from "three";

/**
 * Retints the body-coloured pixels inside a model's base-colour map.
 *
 * Most of the phone takes its colour from a material factor, so switching
 * finish is one `color.set()`. The parts that do not are the ones packed into
 * a palette atlas — on this iPhone that is the Apple logo, and it is why the
 * logo stayed orange in every finish: the atlas is authored in the model's
 * own colour (Cosmic Orange), and multiplying an orange texel by a grey
 * finish gives brown, not grey.
 *
 * Nulling the map instead is not an option: the same atlas carries the black
 * lens rings and the near-white flash, and flattening those to the body
 * colour is a worse render than a wrong-coloured logo.
 *
 * So the atlas is rebuilt per finish, and only the texels that are actually
 * body-coloured move. Membership is decided by HUE, matched against the
 * colour the model was authored in — saturation alone is not enough, because
 * a near-black like #05010a computes a saturation of 0.9 off three tiny
 * channel values and would be dragged along with the logo.
 *
 * Matched texels keep their own brightness and take the finish's HUE, but
 * only a fraction of its saturation. The logo is glass over the body, not
 * painted onto it, so what it shows is a pale reflection of the colour
 * underneath — carrying the finish's full saturation up would render Deep
 * Blue as a solid blue sticker instead of a light blue sheen. Brightness
 * stays the texel's own, so shading and the antialiased edge survive.
 */

/** Degrees either side of the authored hue that still count as body colour. */
const HUE_TOLERANCE = 35;
/** Below this a texel is grey enough that its hue is noise, not intent. */
const MIN_SATURATION = 0.3;
/** Below this a texel is black enough that recolouring it would only add fog. */
const MIN_VALUE = 0.06;
/**
 * How much of the finish's saturation the glass trim picks up. Low, because
 * glass tints rather than paints: at 1 the Apple logo reads as a solid decal
 * in the finish colour, and the whole point is that it looks lit from the
 * body beneath it.
 */
const GLASS_TINT = 0.3;
/**
 * How strongly the retinted trim shows against the body at all.
 *
 * The Apple logo and the Camera Control button are both body-coloured
 * swatches, and at full strength they came out as near-white marks stamped on
 * the back — far louder than the etched-glass and polished-metal details they
 * stand for. Blending them most of the way back into the finish leaves them
 * as something you notice on a second look, which is how they read on the
 * actual hardware.
 */
const TRIM_OPACITY = 0.1;

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [rgb[0] + m, rgb[1] + m, rgb[2] + m];
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

/** Smallest angle between two hues, in degrees. */
function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Rebuilding the atlas is cheap (it is 64x4) but it happens inside a render
// path, so the result is kept. Keyed on the source texture and the finish,
// which is everything the output depends on.
const cache = new Map<string, Texture>();

export function recolorBodyTexture(
  source: Texture,
  authoredBodyColor: string,
  finishColor: string,
): Texture {
  const key = `${source.uuid}|${authoredBodyColor}|${finishColor}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const image = source.image as CanvasImageSource & {
    width?: number;
    height?: number;
  };
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;
  // Not decoded yet, or something exotic — the original beats a blank.
  if (!width || !height) return source;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return source;

  try {
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, width, height);
    const px = data.data;

    const [ar, ag, ab] = parseHex(authoredBodyColor);
    const authoredHue = rgbToHsv(ar, ag, ab)[0];
    const [fr, fg, fb] = parseHex(finishColor);
    const [finishHue, finishSat] = rgbToHsv(fr, fg, fb);

    for (let i = 0; i < px.length; i += 4) {
      const [h, s, v] = rgbToHsv(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
      if (s < MIN_SATURATION || v < MIN_VALUE) continue;
      if (hueDistance(h, authoredHue) > HUE_TOLERANCE) continue;
      // Brightness is the texel's own, so the logo keeps its shading and its
      // antialiased edge instead of turning into a flat stamp; the finish
      // arrives as hue plus a light dusting of saturation.
      const [tr, tg, tb] = hsvToRgb(finishHue, finishSat * GLASS_TINT, v);
      // Then most of the way back to the body colour. Mixing rather than
      // lowering alpha keeps the edge antialiasing intact — the texel is
      // still fully opaque, it is just nearly the same colour as what
      // surrounds it.
      px[i] = Math.round((fr + (tr - fr) * TRIM_OPACITY) * 255);
      px[i + 1] = Math.round((fg + (tg - fg) * TRIM_OPACITY) * 255);
      px[i + 2] = Math.round((fb + (tb - fb) * TRIM_OPACITY) * 255);
    }

    ctx.putImageData(data, 0, 0);
  } catch {
    return source;
  }

  const next = new CanvasTexture(canvas);
  // Carry the sampling setup over wholesale — an atlas is packed tightly
  // enough that a changed wrap or flip lands on a neighbouring swatch.
  next.flipY = source.flipY;
  next.colorSpace = source.colorSpace;
  next.wrapS = source.wrapS;
  next.wrapT = source.wrapT;
  next.magFilter = source.magFilter;
  next.minFilter = source.minFilter;
  next.generateMipmaps = source.generateMipmaps;
  next.offset.copy(source.offset);
  next.repeat.copy(source.repeat);
  next.center.copy(source.center);
  next.rotation = source.rotation;
  next.channel = source.channel;
  next.needsUpdate = true;

  cache.set(key, next);
  return next;
}
