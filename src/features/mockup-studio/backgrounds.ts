/**
 * The canvas backdrop.
 *
 * Every backdrop has to exist twice: once as CSS, because the WebGL canvas is
 * transparent and what sits behind it in the DOM is what you see while you
 * work; and once as 2D canvas drawing commands, because export reads the
 * WebGL buffer and that buffer has never contained the backdrop. Keeping both
 * in this one file is what stops the editor and the exported PNG drifting
 * apart — the pair of functions below are written to be read side by side.
 */

export type BackgroundKind =
  "solid" | "gradient" | "dots" | "image" | "transparent";

export interface BackgroundSettings {
  kind: BackgroundKind;
  /** Solid fill, and the base the dots are drawn on. */
  color: string;
  /** Gradient only. */
  gradientFrom: string;
  gradientTo: string;
  /** Gradient angle in degrees; 180 is top-to-bottom. */
  gradientAngle: number;
  /** Dots only. */
  dotColor: string;
  /** Dot grid pitch in CSS pixels. */
  dotSize: number;
  /** Image only. A data URL, so the background survives without a server and
      travels with an export that is taken client-side. */
  imageSrc: string | null;
  /** Image only. "cover" fills the frame and crops; "contain" fits it whole. */
  imageFit: "cover" | "contain";
  /** Image only. Zoom into the picture, 1-4; absent is 1. */
  imageZoom?: number;
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  kind: "solid",
  color: "#f4f4f5",
  gradientFrom: "#2d3350",
  gradientTo: "#0d0e14",
  gradientAngle: 180,
  dotColor: "#3a3a3e",
  dotSize: 10,
  imageSrc: null,
  imageFit: "cover",
};

export const BACKGROUND_KINDS: Array<{ id: BackgroundKind; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
  { id: "dots", label: "Dots" },
  { id: "image", label: "Image" },
  { id: "transparent", label: "None" },
];

/** A spread of starting points, so nobody has to build a colour from scratch. */
export const BACKGROUND_PRESETS = [
  "#ffffff",
  "#f4f4f5",
  "#d8dde5",
  "#9aa4b2",
  "#4b5565",
  "#252529",
  "#121214",
  "#000000",
  "#f7d9c4",
  "#e8a87c",
  "#c96f4a",
  "#7d4a3a",
  "#cfe3d4",
  "#7fb08a",
  "#3f7d5c",
  "#1f4d3d",
  "#cdd8f5",
  "#8fa3e8",
  "#4f5bd5",
  "#2a2f6b",
];

/**
 * The checkerboard that stands in for "no background".
 *
 * Only ever shown in the editor. Export writes real transparency, so the
 * squares must not be painted into the file — see `paintBackground`.
 */
const CHECKER_LIGHT = "#ffffff";
const CHECKER_DARK = "#e6e6e6";
/** One square. 10 is the size Photoshop and Figma both draw it at. */
const CHECKER = 10;

/** What the frame behind the WebGL canvas is styled with. */
/** The class that goes with `backgroundCss` when the canvas shows an image:
    the host isolates, so `BackgroundImage` sits under its contents. */
export function backgroundClass(bg: BackgroundSettings): string {
  return bg.kind === "image" && bg.imageSrc ? "isolate" : "";
}

export function backgroundCss(bg: BackgroundSettings): React.CSSProperties {
  switch (bg.kind) {
    case "solid":
      return { background: bg.color };
    case "gradient":
      return {
        background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom} 0%, ${bg.gradientTo} 100%)`,
      };
    case "dots":
      return {
        backgroundColor: bg.color,
        backgroundImage: `radial-gradient(circle, ${bg.dotColor} 1px, transparent 1.2px)`,
        backgroundSize: `${bg.dotSize}px ${bg.dotSize}px`,
      };
    case "image":
      // Falls back to the solid colour with no image chosen, rather than to
      // nothing — an empty frame reads as broken, a coloured one reads as
      // waiting.
      // The frame's own background is the colour behind the picture; the
      // picture is a layer of its own -- see `BackgroundImage`.
      return { background: bg.color };
    case "transparent":
      /*
       * One conic gradient, which is what a chessboard actually is.
       *
       * It was four 45-degree linear gradients — the recipe everyone copied
       * before `conic-gradient` existed — and with two DIFFERENT colours among
       * the four, their diagonal edges never met as squares: what it drew was
       * a field of triangles, which reads as a texture rather than as the
       * universal "nothing here".
       *
       * A conic gradient quartered at 25/50/75 is four right-angled sectors
       * around each corner, so one tile is a 2x2 board and it repeats with no
       * offsets to keep in step.
       */
      return {
        backgroundColor: CHECKER_LIGHT,
        backgroundImage: `conic-gradient(${CHECKER_DARK} 0 25%, ${CHECKER_LIGHT} 0 50%, ${CHECKER_DARK} 0 75%, ${CHECKER_LIGHT} 0)`,
        backgroundSize: `${CHECKER * 2}px ${CHECKER * 2}px`,
      };
  }
}

/**
 * The same backdrop, painted under the exported frame.
 *
 * `scale` is export resolution over editor resolution, so the dot pitch grows
 * with the image instead of turning into a fine grey haze at 2x.
 *
 * "transparent" paints nothing at all — the checkerboard is a UI convention
 * for absent pixels, and baking it into a PNG would hand back the one thing
 * the user picked "None" to avoid.
 */
/**
 * Decoded background images, by source.
 *
 * `paintBackground` is called per frame inside the video encoders and has to
 * stay synchronous, so it cannot decode anything itself. The image is decoded
 * once when it is chosen and again before an export starts, and the painter
 * only ever reads what is already here. A miss paints the base colour rather
 * than nothing, so a frame is never simply absent.
 */
const imageCache = new Map<string, HTMLImageElement>();

export async function preloadBackgroundImage(
  bg: BackgroundSettings,
): Promise<void> {
  if (bg.kind !== "image" || !bg.imageSrc || imageCache.has(bg.imageSrc))
    return;
  const src = bg.imageSrc;
  await new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(src, image);
      resolve();
    };
    // A background that will not decode should not stall an export.
    image.onerror = () => resolve();
    image.src = src;
  });
}

/** Draw an image the way CSS `cover` and `contain` do. */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  fit: "cover" | "contain",
  zoom = 1,
): void {
  const scale =
    (fit === "cover"
      ? Math.max(width / image.width, height / image.height)
      : Math.min(width / image.width, height / image.height)) * zoom;
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

export function paintBackground(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundSettings,
  width: number,
  height: number,
  scale: number,
): void {
  if (bg.kind === "transparent") return;

  if (bg.kind === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (bg.kind === "image") {
    // The colour goes down first either way: with "contain" it fills the bars
    // beside the image, and with a cache miss it is what you get instead of a
    // hole.
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    const image = bg.imageSrc ? imageCache.get(bg.imageSrc) : undefined;
    if (image)
      drawFitted(ctx, image, width, height, bg.imageFit, bg.imageZoom ?? 1);
    return;
  }

  if (bg.kind === "gradient") {
    // CSS measures the angle clockwise from "up"; canvas gradients want two
    // points. Project the angle onto the box so the ramp spans the diagonal
    // it would in CSS rather than stopping short at the edge.
    const rad = ((bg.gradientAngle - 90) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const half =
      (Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))) / 2;
    const gradient = ctx.createLinearGradient(
      cx - Math.cos(rad) * half,
      cy - Math.sin(rad) * half,
      cx + Math.cos(rad) * half,
      cy + Math.sin(rad) * half,
    );
    gradient.addColorStop(0, bg.gradientFrom);
    gradient.addColorStop(1, bg.gradientTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, width, height);
  const pitch = bg.dotSize * scale;
  const radius = Math.max(0.5, 1 * scale);
  ctx.fillStyle = bg.dotColor;
  // CSS centres each dot in its tile; matching that here is the difference
  // between the export lining up with the editor and being half a tile off.
  for (let y = pitch / 2; y < height + pitch; y += pitch) {
    for (let x = pitch / 2; x < width + pitch; x += pitch) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
