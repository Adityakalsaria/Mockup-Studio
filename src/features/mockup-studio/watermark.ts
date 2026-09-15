/**
 * The Mocraft wordmark, bottom right of every export — stills and video.
 *
 * The asset is an alpha mask (the chrome fills it with ink), so it is tinted
 * where it lands: dark on a light corner, white on a dark one, judged from the
 * pixels it is about to cover — a fixed ink vanishes into a black background.
 * Sized off the frame's shorter side so it reads the same at any ratio.
 */

const SRC = "/figma-assets/mockup-studio/wordmark.png";

/** Loaded once per export, then drawn onto as many frames as it has. */
export async function loadWatermark(): Promise<HTMLImageElement | null> {
  const mark = new Image();
  mark.src = SRC;
  try {
    await mark.decode();
    return mark;
  } catch {
    return null;
  }
}

export function paintWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mark: HTMLImageElement,
  /**
   * Holds the tinted mark between frames. Judging the corner reads pixels
   * back off the canvas, and a video doing that every frame stalls the
   * recorder — so a clip judges its first frame and reuses the answer.
   */
  cache: { tint?: HTMLCanvasElement } = {},
) {
  const w = Math.round(Math.min(width, height) * 0.14);
  const h = Math.round((w * mark.height) / mark.width);
  const margin = Math.round(Math.min(width, height) * 0.035);
  const x = width - w - margin;
  const y = height - h - margin;
  if (cache.tint) {
    ctx.drawImage(cache.tint, x, y);
    return;
  }

  const under = ctx.getImageData(x, y, w, h).data;
  let lum = 0;
  for (let i = 0; i < under.length; i += 4) {
    lum += 0.2126 * under[i] + 0.7152 * under[i + 1] + 0.0722 * under[i + 2];
  }
  const light = lum / (under.length / 4) > 140;

  const tint = document.createElement("canvas");
  tint.width = w;
  tint.height = h;
  const t = tint.getContext("2d");
  if (!t) return;
  t.drawImage(mark, 0, 0, w, h);
  t.globalCompositeOperation = "source-in";
  t.fillStyle = light ? "rgba(0, 0, 0, 0.55)" : "rgba(255, 255, 255, 0.75)";
  t.fillRect(0, 0, w, h);
  cache.tint = tint;
  ctx.drawImage(tint, x, y);
}
