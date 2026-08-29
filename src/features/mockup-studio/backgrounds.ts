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

export type BackgroundKind = "solid" | "gradient" | "dots" | "transparent";

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
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  kind: "solid",
  color: "#f4f4f5",
  gradientFrom: "#2d3350",
  gradientTo: "#0d0e14",
  gradientAngle: 180,
  dotColor: "#3a3a3e",
  dotSize: 10,
};

export const BACKGROUND_KINDS: Array<{ id: BackgroundKind; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
  { id: "dots", label: "Dots" },
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
const CHECKER_LIGHT = "rgba(255,255,255,0.06)";
const CHECKER_DARK = "rgba(0,0,0,0.16)";
const CHECKER = 12;

/** What the frame behind the WebGL canvas is styled with. */
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
    case "transparent":
      return {
        backgroundColor: "transparent",
        backgroundImage: `linear-gradient(45deg, ${CHECKER_DARK} 25%, transparent 25%),
           linear-gradient(-45deg, ${CHECKER_DARK} 25%, transparent 25%),
           linear-gradient(45deg, transparent 75%, ${CHECKER_LIGHT} 75%),
           linear-gradient(-45deg, transparent 75%, ${CHECKER_LIGHT} 75%)`,
        backgroundSize: `${CHECKER * 2}px ${CHECKER * 2}px`,
        backgroundPosition: `0 0, 0 ${CHECKER}px, ${CHECKER}px -${CHECKER}px, -${CHECKER}px 0`,
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

  if (bg.kind === "gradient") {
    // CSS measures the angle clockwise from "up"; canvas gradients want two
    // points. Project the angle onto the box so the ramp spans the diagonal
    // it would in CSS rather than stopping short at the edge.
    const rad = ((bg.gradientAngle - 90) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const half = (Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))) / 2;
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
