/**
 * Renders the Canvas background presets to WebP.
 *
 *   node scripts/generate-canvas-backgrounds.mjs
 *
 * Each preset is a mesh gradient: a base colour with a handful of soft colour
 * fields laid over it, mixed in OKLab so two saturated colours meet through a
 * saturated middle rather than the grey an sRGB blend walks through. A gentle
 * domain warp keeps the fields from reading as circles, and a fine grain rides
 * on top -- it is what stops an 8-bit gradient banding once the export scales
 * it up, as much as it is a look.
 *
 * Pictures rather than CSS, because the canvas has to paint the backdrop twice
 * (see `backgrounds.ts`) and the `image` kind already does that exactly. A mesh
 * written as layered CSS gradients would need a hand-kept canvas twin, and the
 * two interpolate transparency differently enough to drift apart.
 *
 * Output goes to `public/figma-assets/mockup-studio/backgrounds/`: the full
 * picture at SIZE square -- `cover` crops it to whatever the canvas ratio is --
 * and a small thumbnail for the preset grid, so opening the panel does not pull
 * twelve full-size pictures just to draw twelve chips.
 *
 * Deterministic: the grain is a hash of the pixel, not `Math.random`, so a
 * re-run rewrites byte-identical files and the diff stays empty.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(
  process.cwd(),
  "public/figma-assets/mockup-studio/backgrounds",
);
/** Past a 4x export of the default canvas, so the picture is rarely upscaled. */
const SIZE = 2400;
const THUMB = 160;

/*
 * Each field is [x, y, rx, ry, colour] in the picture's 0..1 space, y down.
 * `rx`/`ry` are the field's reach; it falls off as a Gaussian past them.
 * `weight` is how strongly the base holds its own against the fields.
 */
const PRESETS = [
  {
    id: "studio",
    base: "#c9ccd3",
    weight: 0.5,
    grain: 0.018,
    fields: [
      [0.5, 0.4, 0.42, 0.36, "#fbfbfc"],
      [0.5, 1.05, 0.7, 0.18, "#b6bac3"],
    ],
  },
  {
    id: "graphite",
    base: "#0d0e11",
    weight: 0.5,
    grain: 0.022,
    fields: [
      [0.5, 0.38, 0.4, 0.34, "#3b3f47"],
      [0.5, 1.05, 0.7, 0.2, "#16181c"],
    ],
  },
  {
    id: "peach",
    base: "#fff1e6",
    weight: 0.35,
    grain: 0.02,
    fields: [
      [0.2, 0.25, 0.38, 0.32, "#ffcfae"],
      [0.82, 0.18, 0.34, 0.3, "#ffe6a3"],
      [0.62, 0.85, 0.42, 0.3, "#ffbfc6"],
    ],
  },
  {
    id: "candy",
    base: "#ffe3f1",
    weight: 0.3,
    grain: 0.02,
    fields: [
      [0.18, 0.2, 0.36, 0.3, "#ffadd6"],
      [0.84, 0.28, 0.34, 0.32, "#c7b5ff"],
      [0.3, 0.86, 0.4, 0.28, "#a6d8ff"],
      [0.82, 0.82, 0.3, 0.26, "#ffd9bd"],
    ],
  },
  {
    id: "lavender",
    base: "#eee9ff",
    weight: 0.35,
    grain: 0.02,
    fields: [
      [0.28, 0.28, 0.4, 0.32, "#d3c2ff"],
      [0.82, 0.6, 0.34, 0.34, "#bfd0ff"],
      [0.38, 0.9, 0.38, 0.24, "#f3d1ff"],
    ],
  },
  {
    id: "mint",
    base: "#e8fff3",
    weight: 0.3,
    grain: 0.02,
    fields: [
      [0.2, 0.3, 0.38, 0.32, "#adf0d0"],
      [0.82, 0.18, 0.32, 0.28, "#fff0a0"],
      [0.72, 0.86, 0.4, 0.28, "#a8ddff"],
    ],
  },
  {
    id: "sunset",
    base: "#ff9468",
    weight: 0.25,
    grain: 0.026,
    fields: [
      [0.18, 0.16, 0.36, 0.3, "#ffd46b"],
      [0.84, 0.3, 0.36, 0.32, "#ff577b"],
      [0.72, 0.9, 0.42, 0.3, "#a355ff"],
      [0.16, 0.82, 0.32, 0.3, "#ff7a2e"],
    ],
  },
  {
    id: "citrus",
    base: "#ffd23f",
    weight: 0.25,
    grain: 0.026,
    fields: [
      [0.18, 0.18, 0.34, 0.3, "#c8f23c"],
      [0.78, 0.2, 0.32, 0.28, "#fff27a"],
      [0.82, 0.82, 0.4, 0.32, "#ff8a1c"],
      [0.14, 0.92, 0.3, 0.24, "#ff5a2c"],
    ],
  },
  {
    id: "lagoon",
    base: "#0b4a8c",
    weight: 0.25,
    grain: 0.026,
    fields: [
      [0.2, 0.22, 0.36, 0.3, "#27dcff"],
      [0.84, 0.18, 0.32, 0.3, "#3b72ff"],
      [0.3, 0.88, 0.4, 0.28, "#00c4a7"],
      [0.86, 0.86, 0.34, 0.3, "#081a55"],
    ],
  },
  {
    id: "aurora",
    base: "#0a0f26",
    weight: 0.4,
    grain: 0.028,
    fields: [
      [0.22, 0.3, 0.4, 0.16, "#18cfae"],
      [0.62, 0.52, 0.34, 0.12, "#3eea86"],
      [0.8, 0.22, 0.34, 0.24, "#7a5cff"],
      [0.5, 0.95, 0.6, 0.24, "#172784"],
    ],
  },
  {
    id: "nebula",
    base: "#07061a",
    weight: 0.45,
    grain: 0.028,
    fields: [
      [0.3, 0.34, 0.36, 0.3, "#7a2cff"],
      [0.76, 0.68, 0.34, 0.3, "#ff3ea3"],
      [0.84, 0.16, 0.3, 0.24, "#2a1a8a"],
    ],
  },
  {
    id: "ember",
    base: "#0b0605",
    weight: 0.55,
    grain: 0.028,
    fields: [
      [0.5, 1.1, 0.7, 0.4, "#ff4d12"],
      [0.5, 1.02, 0.36, 0.18, "#ffae3d"],
      [0.12, 0.62, 0.26, 0.3, "#5a0d0a"],
      [0.88, 0.62, 0.26, 0.3, "#5a0d0a"],
    ],
  },
];

/* ------------------------------------------------------------ colour maths */

function hexToLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
}

function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearToByte(v, noise) {
  const c = Math.min(1, Math.max(0, v));
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round((s + noise) * 255)));
}

/** A cheap integer hash to 0..1 -- the grain, repeatable across runs. */
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/* ------------------------------------------------------------------ render */

function render(preset) {
  const base = linearToOklab(hexToLinear(preset.base));
  const fields = preset.fields.map(([x, y, rx, ry, hex]) => ({
    x,
    y,
    irx: 1 / (rx * rx),
    iry: 1 / (ry * ry),
    lab: linearToOklab(hexToLinear(hex)),
  }));
  const pixels = Buffer.alloc(SIZE * SIZE * 3);

  for (let py = 0; py < SIZE; py++) {
    const v = py / (SIZE - 1);
    for (let px = 0; px < SIZE; px++) {
      const u = px / (SIZE - 1);
      // Low-frequency warp: bends the fields into drifts without adding
      // detail small enough to notice as a pattern.
      const wu = u + 0.035 * Math.sin(v * 5.1 + 1.3) + 0.02 * Math.sin(v * 9.7);
      const wv = v + 0.035 * Math.cos(u * 4.3 + 0.7) + 0.02 * Math.cos(u * 8.9);

      let w = preset.weight;
      let L = base[0] * w;
      let A = base[1] * w;
      let B = base[2] * w;
      for (const f of fields) {
        const dx = wu - f.x;
        const dy = wv - f.y;
        const fw = Math.exp(-(dx * dx * f.irx + dy * dy * f.iry));
        L += f.lab[0] * fw;
        A += f.lab[1] * fw;
        B += f.lab[2] * fw;
        w += fw;
      }
      const [r, g, b] = oklabToLinear(L / w, A / w, B / w);
      const noise = (hash(px, py) - 0.5) * preset.grain;
      const i = (py * SIZE + px) * 3;
      pixels[i] = linearToByte(r, noise);
      pixels[i + 1] = linearToByte(g, noise);
      pixels[i + 2] = linearToByte(b, noise);
    }
  }
  return pixels;
}

await mkdir(path.join(OUT, "thumbs"), { recursive: true });

for (const preset of PRESETS) {
  const raw = { raw: { width: SIZE, height: SIZE, channels: 3 } };
  const pixels = render(preset);
  const full = path.join(OUT, `${preset.id}.webp`);
  const thumb = path.join(OUT, "thumbs", `${preset.id}.webp`);
  await sharp(pixels, raw).webp({ quality: 92, smartSubsample: true, effort: 6 }).toFile(full);
  await sharp(pixels, raw)
    .resize(THUMB, THUMB)
    .webp({ quality: 82 })
    .toFile(thumb);
  console.log(`${preset.id} -> ${path.relative(process.cwd(), full)}`);
}
