/**
 * Every still on the landing page, as a studio shot.
 *
 * Each entry is the same set of numbers the studio keeps for a composition --
 * device, finish, pose, lighting, background, screen -- and the files in
 * `public/landing/shots/` are those shots rendered by the studio's own renderer
 * and export compositor (`/landing-render`, development only). To change a
 * still, change it here and render again.
 *
 * No drop shadows anywhere: product imagery here is lit the way Apple lights
 * its own -- the device, the light and the ground, nothing painted under it.
 */

import { DEFAULT_BACKGROUND, type BackgroundSettings } from "@/features/mockup-studio/backgrounds";
import type { LightingId } from "@/features/mockup-studio/lighting";
import { DEFAULT_BLUR, MODE_DEFAULTS, type BlurSettings } from "@/features/mockup-studio/blurStyles";
import type { Pose } from "@/features/mockup-studio/editor/motionPresets";
import { getDevice } from "@/features/mockup-studio/devices";
import { finishesFor, getFinish } from "@/features/mockup-studio/finishes";

export const SCREEN_DIR = "/figma-assets/mockup-studio/screen-presets";

/** A board of phone screens, for the devices whose panel is landscape. */
export const BOARD = "board";
/** The same board a quarter turn round, for the iPad, whose screen UVs run portrait. */
export const BOARD_TURNED = "board-turned";

export type Shot = {
  id: string;
  /** CSS pixels of the frame; rendered at 2x. */
  width: number;
  height: number;
  deviceId: string;
  finishId: string;
  pose: Partial<Pose>;
  lighting: LightingId;
  /** Null renders transparent. */
  background: BackgroundSettings | null;
  /** A file in `SCREEN_DIR`, `BOARD` or `BOARD_TURNED`. */
  screen: string;
  blur?: BlurSettings;
};

/**
 * Several transparent shots laid out on one ground -- a front and a back, a row
 * of finishes -- trimmed to the device and placed by centre and height, both
 * as fractions of the frame.
 */
export type Composite = {
  id: string;
  width: number;
  height: number;
  ground: string;
  parts: { shot: string; x: number; y: number; h: number }[];
};

const solid = (color: string): BackgroundSettings => ({ ...DEFAULT_BACKGROUND, kind: "solid", color });
const gradient = (from: string, to: string, angle = 180): BackgroundSettings => ({
  ...DEFAULT_BACKGROUND,
  kind: "gradient",
  gradientFrom: from,
  gradientTo: to,
  gradientAngle: angle,
});
const radial = (strength: number, focusSize: number): BlurSettings => ({
  ...DEFAULT_BLUR,
  ...MODE_DEFAULTS.radial,
  mode: "radial",
  strength,
  focusSize,
});

/** A transparent part, sized generously so nothing is clipped before trimming. */
const part = (id: string, deviceId: string, finishId: string, pose: Partial<Pose>, screen = "dark.png", lighting: LightingId = "studio"): Shot => ({
  id,
  width: 900,
  height: 900,
  deviceId,
  finishId,
  pose: { zoom: 0.8, ...pose },
  lighting,
  background: null,
  screen,
});

const finishIds = (deviceId: string) => finishesFor(getDevice(deviceId).finishIds).map((f) => f.id);

/* The Apple view of each device: 180 is the screen, a few degrees off 0 the back. */
const BACK = { yAxis: 18, xAxis: -4 };
const FRONT = { yAxis: 196, xAxis: 2 };

export const TILE_DEVICES: { deviceId: string; pose: Partial<Pose>; screen: string }[] = [
  { deviceId: "apple-iphone-duo-web", pose: { ...BACK, zoom: 1.25, fold: 100 }, screen: "dark.png" },
  { deviceId: "apple-iphone-17-pro", pose: { ...BACK, zoom: 1.05 }, screen: "dark.png" },
  { deviceId: "apple-iphone-air", pose: { ...BACK, zoom: 1.05 }, screen: "dark-3.png" },
  { deviceId: "apple-macbook-pro-14", pose: { yAxis: -18, xAxis: 10, zoom: 1.1 }, screen: BOARD },
];

export const SHOTS: Shot[] = [
  /* Parts for the composites. */
  part("part-17pro-front", "apple-iphone-17-pro", "deep-blue", FRONT, "dark.png"),
  part("part-17pro-back", "apple-iphone-17-pro", "cosmic-orange", BACK),
  ...finishIds("apple-iphone-17-pro").map((f) => part(`part-17pro-${f}`, "apple-iphone-17-pro", f, { yAxis: 24, xAxis: -2 })),
  ...finishIds("apple-iphone-air").map((f) => part(`part-air-${f}`, "apple-iphone-air", f, { yAxis: 24, xAxis: -2 }, "dark-3.png")),
  ...finishIds("apple-iphone-17-pro").flatMap((f) => [
    part(`part-17pro-front-${f}`, "apple-iphone-17-pro", f, { yAxis: 180, xAxis: 0 }, "dark.png"),
    part(`part-17pro-angle-${f}`, "apple-iphone-17-pro", f, { yAxis: 136, xAxis: 2 }, "dark.png"),
  ]),
  part("part-air-side", "apple-iphone-air", "sky-blue", { yAxis: 92, xAxis: 0 }),
  part("part-duo-open", "apple-iphone-duo-web", "duo-night-sky", { yAxis: 180, fold: 0 }, "dark-9.png", "product"),
  part("part-duo-closed", "apple-iphone-duo-web", "cloud-white", { yAxis: 20, xAxis: -4, fold: 100 }, "dark.png", "product"),

  /* Made for Apple -- the lineup, transparent so it sits on the page. */
  { id: "lineup-iphone-duo", width: 720, height: 720, deviceId: "apple-iphone-duo-web", finishId: "duo-night-sky", pose: { yAxis: 196, xAxis: 4, zoom: 0.8 }, lighting: "studio", background: null, screen: "dark-9.png" },
  { id: "lineup-iphone-17-pro", width: 520, height: 720, deviceId: "apple-iphone-17-pro", finishId: "cosmic-orange", pose: { yAxis: 20, xAxis: -6, zoom: 0.8 }, lighting: "studio", background: null, screen: "dark.png" },
  { id: "lineup-iphone-air", width: 520, height: 720, deviceId: "apple-iphone-air", finishId: "sky-blue", pose: { yAxis: 152, xAxis: 4, zoom: 0.8 }, lighting: "studio", background: null, screen: "dark-3.png" },
  { id: "lineup-ipad-pro", width: 900, height: 720, deviceId: "apple-ipad-pro", finishId: "space-black", pose: { yAxis: 196, xAxis: 4, zoom: 1.1 }, lighting: "studio", background: null, screen: BOARD_TURNED },
  { id: "lineup-macbook-pro", width: 1040, height: 720, deviceId: "apple-macbook-pro-14", finishId: "silver", pose: { yAxis: -18, xAxis: 10, zoom: 1.15 }, lighting: "studio", background: null, screen: BOARD },
  { id: "lineup-imac", width: 900, height: 720, deviceId: "apple-imac-24", finishId: "imac-blue", pose: { yAxis: 16, xAxis: 2, zoom: 1.05 }, lighting: "studio", background: null, screen: BOARD },

  /* Highlights. */
  ...(["soft", "studio", "contrast", "product"] as const).map((lighting): Shot => ({ id: `hl-light-${lighting}`, width: 400, height: 900, deviceId: "apple-iphone-17-pro", finishId: "silver", pose: { yAxis: 34, xAxis: 4, zoom: 0.78 }, lighting, background: solid("#000000"), screen: "dark.png" })),
  { id: "hl-dof", width: 1600, height: 900, deviceId: "apple-iphone-17-pro", finishId: "cosmic-orange", pose: { yAxis: 150, xAxis: 16, zAxis: -8, zoom: 1.05 }, lighting: "warm", background: gradient("#f7d9c4", "#c96f4a", 160), screen: "dark-4.png", blur: radial(40, 0.3) },

  /* Made to ship -- one shot per real canvas size. */
  { id: "ship-app-store", width: 430, height: 932, deviceId: "apple-iphone-17-pro", finishId: "silver", pose: { zoom: 0.72, panY: 0.12 }, lighting: "studio", background: gradient("#cfe3d4", "#7fb08a"), screen: "confirm-payment.png" },
  { id: "ship-16x9", width: 960, height: 540, deviceId: "apple-macbook-pro-14", finishId: "space-black", pose: { yAxis: 16, xAxis: 12, zoom: 1.05 }, lighting: "studio", background: solid("#d8dde5"), screen: BOARD },
  { id: "ship-1x1", width: 640, height: 640, deviceId: "apple-iphone-18-pro", finishId: "iphone18-burgundy", pose: { yAxis: 204, xAxis: -8, zAxis: 10, zoom: 0.62 }, lighting: "warm", background: solid("#f7d9c4"), screen: "dark-2.png" },
  { id: "ship-9x16", width: 540, height: 960, deviceId: "apple-iphone-air", finishId: "space-black", pose: { yAxis: 160, zoom: 0.7 }, lighting: "product", background: solid("#121214"), screen: "dark-6.png" },

  /* Showcase -- varied on purpose: scale, angle, ground, crop. */
  { id: "sc-orange-back", width: 720, height: 900, deviceId: "apple-iphone-17-pro", finishId: "cosmic-orange", pose: { yAxis: -20, xAxis: 10, zAxis: 8, zoom: 0.9 }, lighting: "product", background: solid("#000000"), screen: "dark.png" },
  { id: "sc-air-gold", width: 720, height: 720, deviceId: "apple-iphone-air", finishId: "light-gold", pose: { yAxis: 150, xAxis: 18, zAxis: -24, zoom: 0.72 }, lighting: "warm", background: solid("#e8a87c"), screen: "dark-4.png" },
  { id: "sc-18-detail", width: 1280, height: 720, deviceId: "apple-iphone-18-pro", finishId: "iphone18-silver", pose: { yAxis: -32, xAxis: 20, zoom: 1.7, panY: 0.9, panX: 0.4 }, lighting: "product", background: solid("#121214"), screen: "dark-5.png" },
  { id: "sc-17-sage", width: 720, height: 900, deviceId: "apple-iphone-17", finishId: "sage", pose: { zoom: 0.74 }, lighting: "soft", background: solid("#cfe3d4"), screen: "confirm-payment-1.png" },
  { id: "sc-imac-pink", width: 1280, height: 800, deviceId: "apple-imac-24", finishId: "imac-pink", pose: { yAxis: -24, xAxis: 4, zoom: 1.05 }, lighting: "soft", background: solid("#f7d9c4"), screen: BOARD },
  { id: "sc-deep-blue", width: 720, height: 900, deviceId: "apple-iphone-17-pro-max", finishId: "deep-blue", pose: { yAxis: 146, xAxis: -10, zAxis: 12, zoom: 0.8 }, lighting: "cool", background: gradient("#4f5bd5", "#2a2f6b", 160), screen: "dark-7.png" },
  { id: "sc-neo-indigo", width: 1280, height: 800, deviceId: "apple-macbook-neo", finishId: "macbook-indigo", pose: { yAxis: -28, xAxis: 14, zoom: 1.1 }, lighting: "contrast", background: solid("#252529"), screen: BOARD },
  { id: "sc-air-float", width: 720, height: 720, deviceId: "apple-iphone-air", finishId: "cloud-white", pose: { yAxis: 180, xAxis: 0, zAxis: -90, zoom: 0.62 }, lighting: "studio", background: solid("#d8dde5"), screen: "dark-8.png" },

  /* Category grids -- Mac, iPad and iMac on colour, to sit beside the iPhones. */
  { id: "grid-neo-citrus", width: 960, height: 600, deviceId: "apple-macbook-neo", finishId: "macbook-citrus", pose: { yAxis: -24, xAxis: 16, zoom: 1.15 }, lighting: "soft", background: solid("#7fb08a"), screen: BOARD },
  { id: "grid-mbp-dark", width: 640, height: 640, deviceId: "apple-macbook-pro-14", finishId: "silver", pose: { yAxis: 30, xAxis: 20, zoom: 1.2 }, lighting: "product", background: solid("#121214"), screen: BOARD },
  { id: "grid-neo-blush", width: 640, height: 640, deviceId: "apple-macbook-neo", finishId: "macbook-blush", pose: { yAxis: -40, xAxis: 28, zoom: 1.1 }, lighting: "warm", background: solid("#f7d9c4"), screen: BOARD },
  { id: "grid-ipad-blue", width: 960, height: 600, deviceId: "apple-ipad-pro", finishId: "silver", pose: { yAxis: 200, xAxis: 10, zAxis: -8, zoom: 1.2 }, lighting: "soft", background: solid("#8fa3e8"), screen: BOARD_TURNED },
  { id: "grid-imac-yellow", width: 640, height: 640, deviceId: "apple-imac-24", finishId: "imac-yellow", pose: { yAxis: 16, xAxis: 4, zoom: 1.1 }, lighting: "warm", background: solid("#e8a87c"), screen: BOARD },
  { id: "grid-imac-green", width: 640, height: 640, deviceId: "apple-imac-24", finishId: "imac-green", pose: { yAxis: -20, xAxis: 4, zoom: 1.1 }, lighting: "soft", background: solid("#cfe3d4"), screen: BOARD },

  /* Showcase tiles in a mockup library's manner: graphic screens, hard diagonals,
     tight crops, loud grounds. */
  { id: "mu-iphone-diag", width: 960, height: 600, deviceId: "apple-iphone-17-pro", finishId: "silver", pose: { yAxis: 200, xAxis: 18, zAxis: 38, zoom: 1.7, panX: -0.2 }, lighting: "studio", background: solid("#d8dde5"), screen: "graphic-phone-lime" },
  { id: "mu-iphone-flat", width: 640, height: 640, deviceId: "apple-iphone-17-pro", finishId: "deep-blue", pose: { yAxis: 180, zAxis: 28, zoom: 1.25 }, lighting: "studio", background: solid("#e8a87c"), screen: "graphic-phone-blue" },
  { id: "mu-iphone-dark", width: 640, height: 640, deviceId: "apple-iphone-air", finishId: "space-black", pose: { yAxis: 158, xAxis: 8, zAxis: -14, zoom: 1.35, panY: 0.5 }, lighting: "product", background: solid("#121214"), screen: "graphic-phone-lime" },
  { id: "mu-mac-fly", width: 960, height: 600, deviceId: "apple-macbook-pro-14", finishId: "silver", pose: { yAxis: -24, xAxis: 32, zAxis: 26, zoom: 1.45 }, lighting: "studio", background: solid("#8fa3e8"), screen: "graphic-mac-lime" },
  { id: "mu-mac-dark", width: 640, height: 640, deviceId: "apple-macbook-pro-14", finishId: "space-black", pose: { yAxis: 8, xAxis: -6, zoom: 1.35, panY: 0.6 }, lighting: "product", background: solid("#121214"), screen: "graphic-mac-lime" },
  { id: "mu-neo-lime", width: 640, height: 640, deviceId: "apple-macbook-neo", finishId: "macbook-silver", pose: { yAxis: 34, xAxis: 22, zoom: 1.3 }, lighting: "studio", background: solid("#d4f33a"), screen: "graphic-mac-blue" },
  { id: "mu-ipad-diag", width: 960, height: 600, deviceId: "apple-ipad-pro", finishId: "silver", pose: { yAxis: 180, zAxis: -24, zoom: 1.5 }, lighting: "studio", background: solid("#cfe3d4"), screen: "graphic-mac-turned" },
  { id: "mu-imac-orange", width: 640, height: 640, deviceId: "apple-imac-24", finishId: "imac-silver", pose: { yAxis: 0, zoom: 1.25, panY: 0.3 }, lighting: "studio", background: solid("#e8a87c"), screen: "graphic-mac-lime" },
  { id: "mu-imac-lime", width: 640, height: 640, deviceId: "apple-imac-24", finishId: "imac-blue", pose: { yAxis: -26, zoom: 1.2 }, lighting: "studio", background: solid("#d4f33a"), screen: "graphic-mac-blue" },
  { id: "mu-reel-1", width: 720, height: 900, deviceId: "apple-iphone-17-pro", finishId: "cosmic-orange", pose: { yAxis: 186, xAxis: 10, zAxis: 30, zoom: 0.95 }, lighting: "studio", background: solid("#d4f33a"), screen: "graphic-phone-blue" },
  { id: "mu-reel-2", width: 720, height: 900, deviceId: "apple-macbook-pro-14", finishId: "silver", pose: { yAxis: 20, xAxis: 24, zoom: 1.5 }, lighting: "product", background: solid("#252529"), screen: "graphic-mac-lime" },
  { id: "mu-reel-3", width: 720, height: 900, deviceId: "apple-iphone-air", finishId: "cloud-white", pose: { yAxis: 180, zAxis: -22, zoom: 1.3 }, lighting: "studio", background: solid("#8fa3e8"), screen: "graphic-phone-lime" },
  { id: "mu-reel-4", width: 720, height: 900, deviceId: "apple-imac-24", finishId: "imac-green", pose: { yAxis: 18, zoom: 1.3 }, lighting: "soft", background: solid("#f7d9c4"), screen: "graphic-mac-blue" },
  { id: "mu-reel-5", width: 720, height: 900, deviceId: "apple-iphone-18-pro", finishId: "iphone18-silver", pose: { yAxis: 140, xAxis: 6, zoom: 1.6, panY: 0.6 }, lighting: "product", background: solid("#121214"), screen: "graphic-phone-lime" },
  { id: "mu-reel-6", width: 720, height: 900, deviceId: "apple-ipad-pro", finishId: "space-black", pose: { yAxis: 196, xAxis: 30, zAxis: 18, zoom: 1.35 }, lighting: "studio", background: solid("#e8a87c"), screen: "graphic-mac-turned" },
  { id: "mu-reel-7", width: 720, height: 900, deviceId: "apple-iphone-17-pro", finishId: "silver", pose: { yAxis: 206, zAxis: -8, zoom: 1.2 }, lighting: "soft", background: solid("#cfe3d4"), screen: "graphic-phone-blue" },
  { id: "mu-reel-8", width: 720, height: 900, deviceId: "apple-macbook-neo", finishId: "macbook-indigo", pose: { yAxis: -30, xAxis: 20, zoom: 1.4 }, lighting: "studio", background: solid("#d4f33a"), screen: "graphic-mac-lime" },

  /* Set the scene -- one tile per control. */
  { id: "tile-gradient", width: 640, height: 640, deviceId: "apple-iphone-air", finishId: "sky-blue", pose: { yAxis: 160, zAxis: -12, zoom: 0.7 }, lighting: "soft", background: gradient("#8fa3e8", "#2a2f6b", 200), screen: "dark-3.png" },
  { id: "tile-dots", width: 640, height: 640, deviceId: "apple-iphone-17", finishId: "lavender", pose: { yAxis: 180, zoom: 0.66 }, lighting: "studio", background: { ...DEFAULT_BACKGROUND, kind: "dots", color: "#f4f4f5", dotColor: "#9aa4b2", dotSize: 14 }, screen: "confirm-payment-2.png" },
  { id: "tile-dof", width: 640, height: 640, deviceId: "apple-iphone-18-pro", finishId: "iphone18-sky-blue", pose: { yAxis: 136, xAxis: 20, zoom: 1.35 }, lighting: "cool", background: solid("#cdd8f5"), screen: "dark-6.png", blur: radial(60, 0.25) },
  { id: "tile-lens", width: 640, height: 640, deviceId: "apple-iphone-17-pro", finishId: "deep-blue", pose: { yAxis: 130, xAxis: 24, zoom: 2.4, fov: 80 }, lighting: "contrast", background: solid("#252529"), screen: "dark-7.png" },

  /* Pick your device -- every finish of four devices, transparent. */
  ...TILE_DEVICES.flatMap(({ deviceId, pose, screen }) =>
    finishIds(deviceId).map((f): Shot => ({ id: pickId(deviceId, f), width: 640, height: 640, deviceId, finishId: f, pose, lighting: "studio", background: null, screen })),
  ),
];

export const COMPOSITES: Composite[] = [
  /* The product-page trio -- back at three-quarters, front, front at an angle --
     once per finish, so the swatches under it can switch the whole group. */
  ...finishIds("apple-iphone-17-pro").map((f): Composite => ({
    id: trioId(f),
    width: 1600,
    height: 900,
    ground: "#ffffff",
    parts: [
      { shot: `part-17pro-${f}`, x: 0.315, y: 0.53, h: 0.82 },
      { shot: `part-17pro-front-${f}`, x: 0.5, y: 0.5, h: 0.96 },
      { shot: `part-17pro-angle-${f}`, x: 0.685, y: 0.53, h: 0.82 },
    ],
  })),

  /* Highlight cards: the caption sits in the top fifth, the device fills the
     rest and runs off the bottom edge, as a product page's gallery does. */
  { id: "hl-front", width: 1600, height: 900, ground: "#ffffff", parts: [{ shot: "part-17pro-front-deep-blue", x: 0.5, y: 0.86, h: 1.3 }] },
  {
    id: "hl-finishes",
    width: 1600,
    height: 900,
    ground: "#ffffff",
    parts: finishIds("apple-iphone-17-pro").map((f, i, all) => ({ shot: `part-17pro-${f}`, x: 0.5 + (i - (all.length - 1) / 2) * 0.13, y: 0.68, h: 0.78 })),
  },
  {
    id: "hl-duo",
    width: 1600,
    height: 900,
    ground: "#ffffff",
    parts: [
      { shot: "part-duo-closed", x: 0.32, y: 0.8, h: 0.84 },
      { shot: "part-duo-open", x: 0.66, y: 0.8, h: 0.76 },
    ],
  },

  {
    id: "apple-17pro-pair",
    width: 1600,
    height: 1000,
    ground: "#ffffff",
    parts: [
      { shot: "part-17pro-back", x: 0.42, y: 0.52, h: 0.86 },
      { shot: "part-17pro-front", x: 0.58, y: 0.48, h: 0.86 },
    ],
  },
  {
    id: "apple-17pro-finishes",
    width: 1600,
    height: 900,
    ground: "#f4f4f5",
    parts: finishIds("apple-iphone-17-pro").map((f, i, all) => ({
      shot: `part-17pro-${f}`,
      x: 0.5 + (i - (all.length - 1) / 2) * 0.15,
      y: 0.5,
      h: 0.78,
    })),
  },
  {
    id: "apple-air-finishes",
    width: 1600,
    height: 1000,
    ground: "#ffffff",
    parts: [
      ...finishIds("apple-iphone-air").map((f, i, all) => ({
        shot: `part-air-${f}`,
        x: 0.36 + (i - (all.length - 1) / 2) * 0.12,
        y: 0.5 + (i % 2 ? 0.03 : -0.03),
        h: 0.8,
      })),
      { shot: "part-air-side", x: 0.8, y: 0.5, h: 0.8 },
    ],
  },
  {
    id: "apple-duo",
    width: 1600,
    height: 1000,
    ground: "#000000",
    parts: [
      { shot: "part-duo-closed", x: 0.24, y: 0.5, h: 0.66 },
      { shot: "part-duo-open", x: 0.64, y: 0.5, h: 0.6 },
    ],
  },
];

export function trioId(finishId: string) {
  return `trio-17pro-${finishId}`;
}

export function pickId(deviceId: string, finishId: string) {
  return `pick-${deviceId}-${finishId}`;
}

export const shotSrc = (id: string) => `/landing/shots/${id}.webp`;

export const shot = (id: string): Shot => {
  const found = SHOTS.find((s) => s.id === id);
  if (!found) throw new Error(`No landing shot "${id}"`);
  return found;
};

/** "iPhone 17 Pro · Cosmic Orange", from the registry the studio lists. */
export const shotCaption = (s: Pick<Shot, "deviceId" | "finishId">) => ({
  device: getDevice(s.deviceId).label.replace(/^Apple /, ""),
  finish: getFinish(s.finishId).label,
});
