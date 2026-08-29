"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";

type GuillocheState = {
  angleA: number;
  angleB: number;
  angleC: number;
  angleD: number;
  scaleA: number;
  scaleB: number;
  scaleC: number;
  scaleD: number;
  offset: number;
  repeatCount: number;
  repeatOffset: number;
  thickness: number;
  scale: number;
  segments: number;
  artboard: number;
  stroke: string;
  secondaryStroke: string;
  tertiaryStroke: string;
  background: string;
  opacity: number;
  stackSpread: number;
};

type ImageMapMode = "highlights" | "shadows" | "midtones";
type StackStyle = "mono" | "duotone" | "tritone";
type PresetBank = "portraits" | "seals" | "backgrounds";

type ImageMapState = {
  influence: number;
  contrast: number;
  gamma: number;
  imageOpacity: number;
  showImageUnderlay: boolean;
  mode: ImageMapMode;
  edgeFollow: number;
  edgeStrength: number;
  portraitMode: boolean;
  portraitDensity: number;
  portraitSharpness: number;
  stackStyle: StackStyle;
};

type ImageTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type SliderConfig = {
  key: keyof GuillocheState;
  label: string;
  min: number;
  max: number;
  step?: number;
};

type GuillochePoint = {
  x: number;
  y: number;
};

type RenderLayer = {
  path: string;
  points: GuillochePoint[];
  strokeWidth: number;
  opacity: number;
  stroke: string;
  variantIndex: number;
};

type RenderSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  lineWidth: number;
  stroke: string;
};

type ImageAnalysis = {
  brightness: Float32Array;
  gradX: Float32Array;
  gradY: Float32Array;
  edge: Float32Array;
};

type LayerVariant = {
  stroke: string;
  orbitScaleMul: number;
  masterScaleMul: number;
  thicknessMul: number;
  opacityMul: number;
  angleA: number;
  angleB: number;
  angleC: number;
  angleD: number;
  repeatOffsetShift: number;
};

type Preset = {
  bank: PresetBank;
  name: string;
  description: string;
  state: Partial<GuillocheState>;
  imageMap?: Partial<ImageMapState>;
};

const DEFAULT_STATE: GuillocheState = {
  angleA: -8,
  angleB: 17,
  angleC: 7,
  angleD: 0,
  scaleA: 82,
  scaleB: 41,
  scaleC: 144,
  scaleD: 0,
  offset: 0,
  repeatCount: 5,
  repeatOffset: 45,
  thickness: 1.2,
  scale: 100,
  segments: 2880,
  artboard: 720,
  stroke: "#d3f7cb",
  secondaryStroke: "#9de7f5",
  tertiaryStroke: "#ffe08d",
  background: "#04110a",
  opacity: 0.9,
  stackSpread: 1,
};

const DEFAULT_IMAGE_MAP: ImageMapState = {
  influence: 0.92,
  contrast: 1.28,
  gamma: 0.92,
  imageOpacity: 0.42,
  showImageUnderlay: true,
  mode: "shadows",
  edgeFollow: 0.68,
  edgeStrength: 0.74,
  portraitMode: false,
  portraitDensity: 0.76,
  portraitSharpness: 0.72,
  stackStyle: "mono",
};

const DEFAULT_IMAGE_TRANSFORM: ImageTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

const PRESET_BANKS: Array<{ id: PresetBank; label: string }> = [
  { id: "portraits", label: "Portraits" },
  { id: "seals", label: "Seals" },
  { id: "backgrounds", label: "Backgrounds" },
];

const PRESETS: Preset[] = [
  {
    bank: "portraits",
    name: "Portrait Seal",
    description: "Dense contour-friendly settings for faces and engraving.",
    state: {
      angleA: -12,
      angleB: 31,
      angleC: 17,
      scaleA: 58,
      scaleB: 28,
      scaleC: 156,
      repeatCount: 9,
      repeatOffset: 14,
      thickness: 0.58,
      scale: 96,
      segments: 4320,
      stackSpread: 1.2,
    },
    imageMap: {
      mode: "shadows",
      stackStyle: "tritone",
      portraitMode: true,
      portraitDensity: 0.9,
      portraitSharpness: 0.86,
      edgeFollow: 0.82,
      edgeStrength: 0.92,
    },
  },
  {
    bank: "portraits",
    name: "Micro Portrait",
    description: "Finer texture with restrained line width for close-up faces.",
    state: {
      angleA: -18,
      angleB: 28,
      angleC: 25,
      angleD: -6,
      scaleA: 44,
      scaleB: 22,
      scaleC: 118,
      scaleD: 14,
      repeatCount: 13,
      repeatOffset: 8,
      thickness: 0.42,
      scale: 112,
      segments: 4680,
      stackSpread: 1.5,
    },
    imageMap: {
      mode: "shadows",
      stackStyle: "tritone",
      portraitMode: true,
      portraitDensity: 0.96,
      portraitSharpness: 1.02,
      edgeFollow: 0.74,
      edgeStrength: 0.86,
    },
  },
  {
    bank: "seals",
    name: "Classic Note",
    description: "Balanced banknote-style rosette.",
    state: {},
  },
  {
    bank: "seals",
    name: "Edge Flow",
    description: "Stronger local direction following for illustrated emblems.",
    state: {
      angleA: -4,
      angleB: 19,
      angleC: 21,
      angleD: -3,
      scaleA: 70,
      scaleB: 34,
      scaleC: 128,
      scaleD: 18,
      repeatCount: 7,
      repeatOffset: 22,
      thickness: 0.9,
      scale: 92,
      stackSpread: 0.95,
    },
    imageMap: {
      stackStyle: "duotone",
      edgeFollow: 0.95,
      edgeStrength: 0.88,
      portraitMode: false,
    },
  },
  {
    bank: "backgrounds",
    name: "Wide Orbit",
    description: "Open ornamental sweep for larger background fields.",
    state: {
      angleA: 5,
      angleB: 11,
      angleC: -9,
      angleD: 3,
      scaleA: 120,
      scaleB: 62,
      scaleC: 170,
      scaleD: 22,
      repeatCount: 6,
      repeatOffset: 52,
      thickness: 1.4,
      scale: 86,
      opacity: 0.78,
      stackSpread: 1.1,
    },
    imageMap: {
      stackStyle: "duotone",
      edgeFollow: 0.42,
      edgeStrength: 0.46,
    },
  },
  {
    bank: "backgrounds",
    name: "Micro Weave",
    description: "Fine mesh for certificates, crests, and subtle paper texture.",
    state: {
      angleA: -21,
      angleB: 35,
      angleC: 28,
      angleD: -7,
      scaleA: 40,
      scaleB: 24,
      scaleC: 132,
      scaleD: 18,
      repeatCount: 12,
      repeatOffset: 10,
      thickness: 0.55,
      scale: 110,
      segments: 4320,
      opacity: 0.96,
      stackSpread: 1.4,
    },
    imageMap: {
      stackStyle: "tritone",
      edgeFollow: 0.58,
      edgeStrength: 0.64,
      portraitMode: false,
    },
  },
];

const SLIDERS: SliderConfig[] = [
  { key: "angleA", label: "Angle A", min: -72, max: 72 },
  { key: "angleB", label: "Angle B", min: -72, max: 72 },
  { key: "angleC", label: "Angle C", min: -72, max: 72 },
  { key: "angleD", label: "Angle D", min: -72, max: 72 },
  { key: "scaleA", label: "Scale A", min: -360, max: 360 },
  { key: "scaleB", label: "Scale B", min: -360, max: 360 },
  { key: "scaleC", label: "Scale C", min: -360, max: 360 },
  { key: "scaleD", label: "Scale D", min: -360, max: 360 },
  { key: "offset", label: "Offset", min: -1000, max: 1000 },
  { key: "repeatCount", label: "Repeat Count", min: 1, max: 24, step: 1 },
  { key: "repeatOffset", label: "Repeat Offset", min: -180, max: 180 },
  { key: "thickness", label: "Thickness", min: 0.2, max: 6, step: 0.05 },
  { key: "scale", label: "Master Scale", min: 20, max: 160 },
  { key: "segments", label: "Segments", min: 720, max: 5400, step: 180 },
  { key: "artboard", label: "Artboard", min: 480, max: 1200, step: 20 },
  { key: "opacity", label: "Layer Opacity", min: 0.2, max: 1, step: 0.01 },
  { key: "stackSpread", label: "Stack Spread", min: 0, max: 2.5, step: 0.01 },
];

const DEG_TO_RAD = Math.PI / 180;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function blendAngles(from: number, to: number, amount: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * amount;
}

function pseudoNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function randomBetween(min: number, max: number, step = 1) {
  const steps = Math.round((max - min) / step);
  const randomStep = Math.floor(Math.random() * (steps + 1));
  return min + randomStep * step;
}

function createRandomState(previous: GuillocheState): GuillocheState {
  return {
    ...previous,
    angleA: randomBetween(-24, 24),
    angleB: randomBetween(6, 36),
    angleC: randomBetween(-24, 28),
    angleD: randomBetween(-12, 12),
    scaleA: randomBetween(28, 160),
    scaleB: randomBetween(12, 120),
    scaleC: randomBetween(84, 220),
    scaleD: randomBetween(0, 64),
    offset: randomBetween(-600, 600),
    repeatCount: randomBetween(3, 14),
    repeatOffset: randomBetween(-48, 72),
    thickness: randomBetween(4, 34, 1) / 20,
    scale: randomBetween(72, 126),
    segments: randomBetween(8, 22, 1) * 180,
    opacity: clamp(randomBetween(55, 100) / 100, 0.2, 1),
    stackSpread: clamp(randomBetween(25, 175) / 100, 0, 2.5),
  };
}

function getImagePlacement(image: HTMLImageElement, artboard: number, transform: ImageTransform) {
  const cover = Math.max(artboard / image.width, artboard / image.height) * transform.zoom;
  const width = image.width * cover;
  const height = image.height * cover;
  const x = (artboard - width) / 2 + transform.offsetX;
  const y = (artboard - height) / 2 + transform.offsetY;

  return { x, y, width, height };
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  artboard: number,
  transform: ImageTransform
) {
  const placement = getImagePlacement(image, artboard, transform);
  ctx.drawImage(image, placement.x, placement.y, placement.width, placement.height);
}

function createImageAnalysis(pixels: Uint8ClampedArray, artboard: number): ImageAnalysis {
  const total = artboard * artboard;
  const brightness = new Float32Array(total);
  const gradX = new Float32Array(total);
  const gradY = new Float32Array(total);
  const edge = new Float32Array(total);

  for (let index = 0; index < total; index += 1) {
    const pixelIndex = index * 4;
    brightness[index] =
      (pixels[pixelIndex] * 0.299 + pixels[pixelIndex + 1] * 0.587 + pixels[pixelIndex + 2] * 0.114) / 255;
  }

  for (let y = 1; y < artboard - 1; y += 1) {
    for (let x = 1; x < artboard - 1; x += 1) {
      const index = y * artboard + x;
      const gx =
        brightness[index + 1] -
        brightness[index - 1] +
        0.5 * (brightness[index + artboard + 1] - brightness[index + artboard - 1]) +
        0.5 * (brightness[index - artboard + 1] - brightness[index - artboard - 1]);
      const gy =
        brightness[index + artboard] -
        brightness[index - artboard] +
        0.5 * (brightness[index + artboard + 1] - brightness[index - artboard + 1]) +
        0.5 * (brightness[index + artboard - 1] - brightness[index - artboard - 1]);

      gradX[index] = gx;
      gradY[index] = gy;
      edge[index] = clamp(Math.sqrt(gx * gx + gy * gy) * 2.8, 0, 1);
    }
  }

  return { brightness, gradX, gradY, edge };
}

function getMappedIntensity(value: number, mapState: ImageMapState) {
  const contrasted = clamp((value - 0.5) * mapState.contrast + 0.5, 0, 1);
  const corrected = clamp(Math.pow(contrasted, mapState.gamma), 0, 1);

  switch (mapState.mode) {
    case "highlights":
      return corrected;
    case "shadows":
      return 1 - corrected;
    case "midtones":
      return clamp(1 - Math.abs(corrected - 0.5) * 2, 0, 1);
    default:
      return corrected;
  }
}

function buildLayerVariants(state: GuillocheState, mapState: ImageMapState): LayerVariant[] {
  const spread = state.stackSpread;

  const primary: LayerVariant = {
    stroke: state.stroke,
    orbitScaleMul: 1,
    masterScaleMul: 1,
    thicknessMul: 1,
    opacityMul: 1,
    angleA: 0,
    angleB: 0,
    angleC: 0,
    angleD: 0,
    repeatOffsetShift: 0,
  };

  if (mapState.stackStyle === "mono") return [primary];

  const secondary: LayerVariant = {
    stroke: state.secondaryStroke,
    orbitScaleMul: 0.94 + spread * 0.05,
    masterScaleMul: 0.97 + spread * 0.04,
    thicknessMul: 0.72,
    opacityMul: 0.64,
    angleA: -2.5 * spread,
    angleB: 4.5 * spread,
    angleC: -3 * spread,
    angleD: 1.8 * spread,
    repeatOffsetShift: 16 * spread,
  };

  if (mapState.stackStyle === "duotone") return [primary, secondary];

  const tertiary: LayerVariant = {
    stroke: state.tertiaryStroke,
    orbitScaleMul: 1.05 + spread * 0.04,
    masterScaleMul: 1.02 + spread * 0.06,
    thicknessMul: 0.5,
    opacityMul: 0.48,
    angleA: 3.2 * spread,
    angleB: -5.4 * spread,
    angleC: 2.8 * spread,
    angleD: -3.6 * spread,
    repeatOffsetShift: -11 * spread,
  };

  return [primary, secondary, tertiary];
}

function buildLayerGeometry(
  state: GuillocheState,
  step: number,
  variant: LayerVariant,
  variantIndex: number
): RenderLayer {
  const offset = (state.offset / 500) * step;
  const repeatOffset = ((state.repeatOffset + variant.repeatOffsetShift) / 50) * step;
  const scale = (state.scale / 100) * variant.masterScaleMul;
  const commands: string[] = [];
  const points: GuillochePoint[] = [];

  for (let i = 0; i <= state.segments; i += 1) {
    const degrees = (i / state.segments) * 360;
    const radians = degrees * DEG_TO_RAD;

    const x = Math.sin(radians * (state.angleA + variant.angleA)) * state.scaleA * variant.orbitScaleMul;
    const y = Math.cos(radians * (state.angleA + variant.angleA)) * state.scaleA * variant.orbitScaleMul;

    const xx =
      x + Math.sin(radians * (state.angleB + variant.angleB) + offset) * state.scaleB * variant.orbitScaleMul;
    const yy =
      y + Math.cos(radians * (state.angleB + variant.angleB) + offset) * state.scaleB * variant.orbitScaleMul;

    const xxx = xx + Math.sin(radians * (state.angleC + variant.angleC)) * state.scaleC * variant.orbitScaleMul;
    const yyy = yy + Math.cos(radians * (state.angleC + variant.angleC)) * state.scaleC * variant.orbitScaleMul;

    const xxxx =
      xxx +
      Math.sin(radians * (state.angleD + variant.angleD)) *
        ((state.scaleD + repeatOffset) * variant.orbitScaleMul);
    const yyyy =
      yyy +
      Math.cos(radians * (state.angleD + variant.angleD)) *
        ((state.scaleD + repeatOffset) * variant.orbitScaleMul);

    const point = { x: xxxx * scale, y: yyyy * scale };
    points.push(point);
    commands.push(`${i === 0 ? "M" : "L"} ${point.x} ${point.y}`);
  }

  const progress = (step + 1) / (state.repeatCount + 1);

  return {
    path: `${commands.join(" ")} Z`,
    points,
    strokeWidth: Math.max(0.18, progress * state.thickness * variant.thicknessMul),
    opacity: clamp((0.25 + progress * 0.85) * state.opacity * variant.opacityMul, 0.05, 1),
    stroke: variant.stroke,
    variantIndex,
  };
}

function buildRenderLayers(state: GuillocheState, mapState: ImageMapState) {
  const variants = buildLayerVariants(state, mapState);
  const layers: RenderLayer[] = [];

  variants.forEach((variant, variantIndex) => {
    for (let step = 0; step <= state.repeatCount; step += 1) {
      layers.push(buildLayerGeometry(state, step, variant, variantIndex));
    }
  });

  return layers;
}

function buildMappedSegments(
  layers: RenderLayer[],
  analysis: ImageAnalysis | null,
  mapState: ImageMapState,
  artboard: number
) {
  const half = artboard / 2;
  const segments: RenderSegment[] = [];

  for (const layer of layers) {
    for (let index = 1; index < layer.points.length; index += 1) {
      const previous = layer.points[index - 1];
      const current = layer.points[index];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const baseLength = Math.hypot(dx, dy);
      const centerX = (previous.x + current.x) * 0.5;
      const centerY = (previous.y + current.y) * 0.5;

      let alpha = layer.opacity;
      let lineWidth = layer.strokeWidth;
      let drawAngle = Math.atan2(dy, dx);
      let drawLength = baseLength;

      if (analysis) {
        const sampleX = clamp(Math.round(centerX + half), 0, artboard - 1);
        const sampleY = clamp(Math.round(centerY + half), 0, artboard - 1);
        const sampleIndex = sampleY * artboard + sampleX;
        const brightness = analysis.brightness[sampleIndex];
        const mapped = getMappedIntensity(brightness, mapState);
        const edgeMagnitude = analysis.edge[sampleIndex];
        const gradX = analysis.gradX[sampleIndex];
        const gradY = analysis.gradY[sampleIndex];
        const edgeTangent = Math.atan2(gradY, gradX) + Math.PI / 2;
        const edgeBlend = mapState.edgeFollow * edgeMagnitude;

        drawAngle = blendAngles(drawAngle, edgeTangent, edgeBlend);
        alpha = layer.opacity * ((1 - mapState.influence) + mapState.influence * mapped);
        alpha *= 1 + edgeMagnitude * mapState.edgeStrength * 0.55;

        if (mapState.portraitMode) {
          const darkness = 1 - brightness;
          const contourSignal = clamp(
            darkness * 0.72 + edgeMagnitude * mapState.portraitSharpness,
            0,
            1
          );
          const spacingSignal = clamp(1 - contourSignal * mapState.portraitDensity, 0, 1);
          const keepChance = clamp(0.22 + contourSignal * 0.95, 0.16, 1);
          const deterministic = pseudoNoise(
            centerX * 0.08,
            centerY * 0.08,
            layer.variantIndex * 11 + index * 0.13
          );

          if (deterministic > keepChance) continue;

          lineWidth *= lerp(1.28, 0.48, contourSignal);
          drawLength *= lerp(1.3, 0.76, contourSignal);
          alpha *= lerp(0.34, 1.18, contourSignal);

          if (spacingSignal > 0.72 && deterministic > 0.34) {
            continue;
          }
        }
      }

      alpha = clamp(alpha, 0, 1);
      lineWidth = Math.max(0.1, lineWidth);

      if (alpha <= 0.012 || drawLength <= 0.02) continue;

      const halfLength = drawLength * 0.5;
      const cos = Math.cos(drawAngle);
      const sin = Math.sin(drawAngle);

      segments.push({
        x1: centerX - cos * halfLength,
        y1: centerY - sin * halfLength,
        x2: centerX + cos * halfLength,
        y2: centerY + sin * halfLength,
        alpha,
        lineWidth,
        stroke: layer.stroke,
      });
    }
  }

  return segments;
}

function buildBaseSvgMarkup(state: GuillocheState, layers: RenderLayer[]) {
  const half = state.artboard / 2;
  const paths = layers
    .map(
      (layer) =>
        `<path d="${layer.path}" stroke="${layer.stroke}" stroke-width="${layer.strokeWidth}" stroke-opacity="${layer.opacity}" fill="none" stroke-linejoin="round" stroke-linecap="round" />`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${state.artboard} ${state.artboard}" width="${state.artboard}" height="${state.artboard}">
  <rect x="${-half}" y="${-half}" width="${state.artboard}" height="${state.artboard}" fill="${state.background}" />
  <g>${paths}</g>
</svg>`;
}

function buildSegmentSvgMarkup(state: GuillocheState, segments: RenderSegment[]) {
  const half = state.artboard / 2;
  const buckets = new Map<
    string,
    { stroke: string; alpha: number; width: number; commands: string[] }
  >();

  for (const segment of segments) {
    const alpha = Number(segment.alpha.toFixed(2));
    const width = Number(segment.lineWidth.toFixed(2));
    const key = `${segment.stroke}|${alpha}|${width}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        stroke: segment.stroke,
        alpha,
        width,
        commands: [],
      });
    }

    buckets
      .get(key)
      ?.commands.push(`M ${segment.x1} ${segment.y1} L ${segment.x2} ${segment.y2}`);
  }

  const paths = Array.from(buckets.values())
    .map(
      (bucket) =>
        `<path d="${bucket.commands.join(" ")}" stroke="${bucket.stroke}" stroke-width="${bucket.width}" stroke-opacity="${bucket.alpha}" fill="none" stroke-linecap="round" />`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${state.artboard} ${state.artboard}" width="${state.artboard}" height="${state.artboard}">
  <rect x="${-half}" y="${-half}" width="${state.artboard}" height="${state.artboard}" fill="${state.background}" />
  <g>${paths}</g>
</svg>`;
}

function downloadTextFile(contents: string, filename: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadCanvasFile(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function useAnalyzedImage(
  imageUrl: string | null,
  artboard: number,
  transform: ImageTransform
) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      setAnalysis(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const nextImage = new Image();
    nextImage.decoding = "async";
    setStatus("loading");

    nextImage.onload = () => {
      if (cancelled) return;
      const sampler = document.createElement("canvas");
      sampler.width = artboard;
      sampler.height = artboard;
      const samplerCtx = sampler.getContext("2d");

      if (!samplerCtx) {
        setStatus("error");
        return;
      }

      drawCoverImage(samplerCtx, nextImage, artboard, transform);
      const nextAnalysis = createImageAnalysis(
        samplerCtx.getImageData(0, 0, artboard, artboard).data,
        artboard
      );

      setImage(nextImage);
      setAnalysis(nextAnalysis);
      setStatus("ready");
    };

    nextImage.onerror = () => {
      if (cancelled) return;
      setImage(null);
      setAnalysis(null);
      setStatus("error");
    };

    nextImage.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [artboard, imageUrl, transform]);

  return { image, analysis, status };
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px]">
      <div className="flex items-center justify-between gap-[12px] text-[13px] text-white/72">
        <span>{label}</span>
        <span className="font-mono text-white/92">{formatNumber(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-[10px] w-full accent-[#8fe388]"
      />
    </label>
  );
}

function ControlSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-white/8 bg-white/[0.03]">
      <div className="px-[14px] py-[14px]">
        <p className="text-[12px] uppercase tracking-[0.16em] text-[#bfdab7]/48">{title}</p>
        {subtitle ? (
          <p className="mt-[4px] text-[13px] leading-[1.5] text-[#d2ead1]/64">{subtitle}</p>
        ) : null}
      </div>
      <div className="border-t border-white/8 px-[14px] py-[14px]">{children}</div>
    </section>
  );
}

function MappedGuillocheCanvas({
  state,
  segments,
  image,
  imageTransform,
  imageMap,
  canvasRef,
}: {
  state: GuillocheState;
  segments: RenderSegment[];
  image: HTMLImageElement | null;
  imageTransform: ImageTransform;
  imageMap: ImageMapState;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const artboard = state.artboard;
    const half = artboard / 2;

    canvas.width = Math.floor(artboard * dpr);
    canvas.height = Math.floor(artboard * dpr);
    canvas.style.width = `${artboard}px`;
    canvas.style.height = `${artboard}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, artboard, artboard);
    ctx.fillStyle = state.background;
    ctx.fillRect(0, 0, artboard, artboard);

    if (image && imageMap.showImageUnderlay) {
      ctx.save();
      ctx.globalAlpha = imageMap.imageOpacity;
      drawCoverImage(ctx, image, artboard, imageTransform);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(half, half);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (const segment of segments) {
      ctx.strokeStyle = segment.stroke;
      ctx.lineWidth = segment.lineWidth;
      ctx.globalAlpha = segment.alpha;
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    }

    ctx.restore();
  }, [canvasRef, image, imageMap, imageTransform, segments, state]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}

export default function GuillocheLabClient() {
  const [state, setState] = useState<GuillocheState>(DEFAULT_STATE);
  const [imageMap, setImageMap] = useState<ImageMapState>(DEFAULT_IMAGE_MAP);
  const [imageTransform, setImageTransform] = useState<ImageTransform>(DEFAULT_IMAGE_TRANSFORM);
  const [activeBank, setActiveBank] = useState<PresetBank>("portraits");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const renderState = useDeferredValue(state);
  const deferredImageMap = useDeferredValue(imageMap);
  const deferredImageTransform = useDeferredValue(imageTransform);

  const { image, analysis, status } = useAnalyzedImage(
    imageUrl,
    renderState.artboard,
    deferredImageTransform
  );

  const layers = useMemo(
    () => buildRenderLayers(renderState, deferredImageMap),
    [deferredImageMap, renderState]
  );
  const mappedSegments = useMemo(
    () => buildMappedSegments(layers, analysis, deferredImageMap, renderState.artboard),
    [analysis, deferredImageMap, layers, renderState.artboard]
  );
  const baseSvgMarkup = useMemo(
    () => buildBaseSvgMarkup(renderState, layers),
    [layers, renderState]
  );
  const mappedSvgMarkup = useMemo(
    () => buildSegmentSvgMarkup(renderState, mappedSegments),
    [mappedSegments, renderState]
  );

  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  function update<K extends keyof GuillocheState>(key: K, value: GuillocheState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function updateImageMap<K extends keyof ImageMapState>(key: K, value: ImageMapState[K]) {
    setImageMap((current) => ({ ...current, [key]: value }));
  }

  function updateImageTransform<K extends keyof ImageTransform>(
    key: K,
    value: ImageTransform[K]
  ) {
    setImageTransform((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(
    presetState: Partial<GuillocheState>,
    presetImageMap?: Partial<ImageMapState>
  ) {
    startTransition(() => {
      setState((current) => ({ ...current, ...presetState }));
      if (presetImageMap) {
        setImageMap((current) => ({ ...current, ...presetImageMap }));
      }
    });
  }

  function clearImage() {
    setImageUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return null;
    });
    setImageName(null);
    setImageTransform(DEFAULT_IMAGE_TRANSFORM);
  }

  function handleImageUpload(file: File | null) {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setImageUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return nextUrl;
    });
    setImageName(file.name);
    setImageTransform(DEFAULT_IMAGE_TRANSFORM);
  }

  const filteredPresets = PRESETS.filter((preset) => preset.bank === activeBank);

  return (
    <main className="min-h-screen bg-[#031008] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(155,255,126,0.14),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(255,222,117,0.08),transparent_22%)]"
      />
      <div className="relative layout-content ds-page-gutter py-[36px] tablet:py-[44px] desktop:py-[56px]">
        <div className="mb-[24px] flex flex-col gap-[12px]">
          <span className="w-fit rounded-full border border-[#7fdc84]/25 bg-[#7fdc84]/8 px-[12px] py-[7px] text-[11px] font-medium uppercase tracking-[0.22em] text-[#d9f8d6]">
            Different Page
          </span>
          <div className="max-w-[980px]">
            <h1 className="text-[clamp(2.5rem,4vw,5rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-[#f3ffe8]">
              Guilloche Lab
            </h1>
            <p className="mt-[14px] max-w-[820px] text-[16px] leading-[1.7] text-[#d3e7d0]/76 tablet:text-[18px]">
              Upload an image, drag to frame it, zoom into contours, then drive guilloche geometry
              with luminance, edge flow, layered color stacks, and portrait-weighted density.
            </p>
          </div>
        </div>

        <div className="grid gap-[20px] laptop:grid-cols-[360px_minmax(0,1fr)] desktop:grid-cols-[390px_minmax(0,1fr)]">
          <div className="laptop:sticky laptop:top-[24px] laptop:self-start">
            <GlassCard className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07160d]">
              <div className="p-[18px] tablet:p-[22px]">
                <div className="flex flex-wrap gap-[8px]">
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (canvasRef.current) {
                        downloadCanvasFile(canvasRef.current, "guilloche-image-map.png");
                      }
                    }}
                  >
                    Download PNG
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      downloadTextFile(
                        imageUrl ? mappedSvgMarkup : baseSvgMarkup,
                        imageUrl ? "guilloche-mapped.svg" : "guilloche-pattern.svg",
                        "image/svg+xml;charset=utf-8"
                      )
                    }
                  >
                    Download SVG
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      startTransition(() => {
                        setState((current) => createRandomState(current));
                      });
                    }}
                  >
                    Randomize
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      startTransition(() => {
                        setState(DEFAULT_STATE);
                        setImageMap(DEFAULT_IMAGE_MAP);
                        setImageTransform(DEFAULT_IMAGE_TRANSFORM);
                      });
                    }}
                  >
                    Reset
                  </Button>
                </div>

                <div className="mt-[20px] grid gap-[12px]">
                  <ControlSection
                    title="Image"
                    subtitle="Upload, replace, and clear the source image."
                  >
                    <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-[#a8eeab]/22 bg-[#0b1b11] px-[14px] py-[18px] text-center transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[#102216]">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
                      />
                      <span className="text-[14px] font-medium text-[#f2ffe7]">
                        {imageName ? "Replace image" : "Upload image"}
                      </span>
                    </label>
                    {imageName ? (
                      <div className="mt-[12px] flex items-center justify-between gap-[12px] rounded-[16px] border border-white/8 bg-black/20 px-[12px] py-[10px]">
                        <span className="truncate text-[12px] text-[#d8eed3]/72">{imageName}</span>
                        <button
                          type="button"
                          onClick={clearImage}
                          className="text-[12px] text-[#9dd69f] transition-opacity hover:opacity-80"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </ControlSection>

                  <ControlSection
                    title="Preset Banks"
                    subtitle="Switch between portrait, seal, and background configurations."
                  >
                    <div className="flex flex-wrap gap-[8px]">
                      {PRESET_BANKS.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setActiveBank(bank.id)}
                          className={`rounded-[16px] border px-[12px] py-[10px] text-[12px] font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                            activeBank === bank.id
                              ? "border-[#aef0aa]/32 bg-[#15311b] text-[#efffe5]"
                              : "border-white/8 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]"
                          }`}
                        >
                          {bank.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-[10px] grid gap-[8px]">
                      {filteredPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyPreset(preset.state, preset.imageMap)}
                          className="rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px] text-left transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-white/[0.06]"
                        >
                          <div className="text-[14px] font-medium text-[#f0ffe8]">{preset.name}</div>
                          <div className="mt-[3px] text-[12px] leading-[1.5] text-[#bfdab7]/64">
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ControlSection>

                  {imageUrl ? (
                    <ControlSection
                      title="Image Mapping"
                      subtitle="Luminance, edge flow, portrait density, and framing."
                    >
                      <div className="grid grid-cols-3 gap-[8px]">
                        {(["highlights", "shadows", "midtones"] as ImageMapMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => updateImageMap("mode", mode)}
                            className={`rounded-[16px] border px-[10px] py-[10px] text-[12px] font-medium capitalize transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                              imageMap.mode === mode
                                ? "border-[#aef0aa]/32 bg-[#15311b] text-[#efffe5]"
                                : "border-white/8 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>

                      <RangeField
                        label="Image Zoom"
                        value={imageTransform.zoom}
                        min={1}
                        max={4}
                        step={0.01}
                        onChange={(value) => updateImageTransform("zoom", value)}
                      />
                      <RangeField
                        label="Image Offset X"
                        value={imageTransform.offsetX}
                        min={-renderState.artboard}
                        max={renderState.artboard}
                        step={1}
                        onChange={(value) => updateImageTransform("offsetX", value)}
                      />
                      <RangeField
                        label="Image Offset Y"
                        value={imageTransform.offsetY}
                        min={-renderState.artboard}
                        max={renderState.artboard}
                        step={1}
                        onChange={(value) => updateImageTransform("offsetY", value)}
                      />
                      <RangeField
                        label="Map Influence"
                        value={imageMap.influence}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => updateImageMap("influence", value)}
                      />
                      <RangeField
                        label="Map Contrast"
                        value={imageMap.contrast}
                        min={0.4}
                        max={3}
                        step={0.01}
                        onChange={(value) => updateImageMap("contrast", value)}
                      />
                      <RangeField
                        label="Map Gamma"
                        value={imageMap.gamma}
                        min={0.35}
                        max={2.4}
                        step={0.01}
                        onChange={(value) => updateImageMap("gamma", value)}
                      />
                      <RangeField
                        label="Edge Follow"
                        value={imageMap.edgeFollow}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => updateImageMap("edgeFollow", value)}
                      />
                      <RangeField
                        label="Edge Strength"
                        value={imageMap.edgeStrength}
                        min={0}
                        max={1.4}
                        step={0.01}
                        onChange={(value) => updateImageMap("edgeStrength", value)}
                      />
                      <RangeField
                        label="Underlay Opacity"
                        value={imageMap.imageOpacity}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => updateImageMap("imageOpacity", value)}
                      />

                      <div className="grid grid-cols-3 gap-[8px]">
                        {(["mono", "duotone", "tritone"] as StackStyle[]).map((stackStyle) => (
                          <button
                            key={stackStyle}
                            type="button"
                            onClick={() => updateImageMap("stackStyle", stackStyle)}
                            className={`rounded-[16px] border px-[10px] py-[10px] text-[12px] font-medium capitalize transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                              imageMap.stackStyle === stackStyle
                                ? "border-[#aef0aa]/32 bg-[#15311b] text-[#efffe5]"
                                : "border-white/8 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]"
                            }`}
                          >
                            {stackStyle}
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px] text-[13px] text-white/72">
                        <span>Show image underlay</span>
                        <input
                          type="checkbox"
                          checked={imageMap.showImageUnderlay}
                          onChange={(event) => updateImageMap("showImageUnderlay", event.target.checked)}
                          className="h-[16px] w-[16px] accent-[#8fe388]"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px] text-[13px] text-white/72">
                        <span>Portrait mode</span>
                        <input
                          type="checkbox"
                          checked={imageMap.portraitMode}
                          onChange={(event) => updateImageMap("portraitMode", event.target.checked)}
                          className="h-[16px] w-[16px] accent-[#8fe388]"
                        />
                      </label>

                      {imageMap.portraitMode ? (
                        <>
                          <RangeField
                            label="Portrait Density"
                            value={imageMap.portraitDensity}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={(value) => updateImageMap("portraitDensity", value)}
                          />
                          <RangeField
                            label="Portrait Sharpness"
                            value={imageMap.portraitSharpness}
                            min={0}
                            max={1.4}
                            step={0.01}
                            onChange={(value) => updateImageMap("portraitSharpness", value)}
                          />
                        </>
                      ) : null}

                      <Button
                        variant="secondary"
                        onClick={() => setImageTransform(DEFAULT_IMAGE_TRANSFORM)}
                      >
                        Reset Framing
                      </Button>
                    </ControlSection>
                  ) : null}

                  <ControlSection
                    title="Geometry"
                    subtitle="Orbit math, layering, density, and spacing."
                  >
                    <div className="grid gap-[10px]">
                      {SLIDERS.map((slider) => (
                        <RangeField
                          key={slider.key}
                          label={slider.label}
                          value={state[slider.key] as number}
                          min={slider.min}
                          max={slider.max}
                          step={slider.step}
                          onChange={(value) => update(slider.key, value as never)}
                        />
                      ))}
                    </div>
                  </ControlSection>

                  <ControlSection
                    title="Colors"
                    subtitle="Primary, secondary, tertiary, and background palette."
                  >
                    <div className="grid gap-[10px] tablet:grid-cols-2">
                      <label className="block rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px]">
                        <span className="text-[13px] text-white/72">Primary</span>
                        <input
                          type="color"
                          value={state.stroke}
                          onChange={(event) => update("stroke", event.target.value)}
                          className="mt-[10px] h-[42px] w-full rounded-[12px] border border-white/10 bg-transparent"
                        />
                      </label>
                      <label className="block rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px]">
                        <span className="text-[13px] text-white/72">Background</span>
                        <input
                          type="color"
                          value={state.background}
                          onChange={(event) => update("background", event.target.value)}
                          className="mt-[10px] h-[42px] w-full rounded-[12px] border border-white/10 bg-transparent"
                        />
                      </label>
                      <label className="block rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px]">
                        <span className="text-[13px] text-white/72">Secondary</span>
                        <input
                          type="color"
                          value={state.secondaryStroke}
                          onChange={(event) => update("secondaryStroke", event.target.value)}
                          className="mt-[10px] h-[42px] w-full rounded-[12px] border border-white/10 bg-transparent"
                        />
                      </label>
                      <label className="block rounded-[18px] border border-white/8 bg-white/[0.03] px-[14px] py-[12px]">
                        <span className="text-[13px] text-white/72">Tertiary</span>
                        <input
                          type="color"
                          value={state.tertiaryStroke}
                          onChange={(event) => update("tertiaryStroke", event.target.value)}
                          className="mt-[10px] h-[42px] w-full rounded-[12px] border border-white/10 bg-transparent"
                        />
                      </label>
                    </div>
                  </ControlSection>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-[20px]">
            <GlassCard className="rounded-[28px] border border-white/10 bg-[#07160d]">
              <div className="grid gap-[16px] p-[18px] tablet:p-[24px] desktop:grid-cols-[minmax(0,1fr)_250px]">
                <div className="overflow-hidden rounded-[28px] border border-[#b3f2ae]/8 bg-[#020805] p-[14px] tablet:p-[18px]">
                  <div
                    className={`aspect-square w-full overflow-hidden rounded-[22px] border border-white/8 shadow-[0_30px_100px_rgba(0,0,0,0.45)] ${
                      imageUrl ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    }`}
                    onPointerDown={(event) => {
                      if (!imageUrl) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      dragRef.current = {
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        originX: imageTransform.offsetX,
                        originY: imageTransform.offsetY,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                      event.preventDefault();
                    }}
                    onPointerMove={(event) => {
                      const activeDrag = dragRef.current;
                      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      const scale = renderState.artboard / rect.width;
                      updateImageTransform(
                        "offsetX",
                        activeDrag.originX + (event.clientX - activeDrag.startX) * scale
                      );
                      updateImageTransform(
                        "offsetY",
                        activeDrag.originY + (event.clientY - activeDrag.startY) * scale
                      );
                    }}
                    onPointerUp={(event) => {
                      if (dragRef.current?.pointerId === event.pointerId) {
                        dragRef.current = null;
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                    onPointerCancel={(event) => {
                      if (dragRef.current?.pointerId === event.pointerId) {
                        dragRef.current = null;
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                  >
                    <MappedGuillocheCanvas
                      state={renderState}
                      segments={mappedSegments}
                      image={image}
                      imageTransform={deferredImageTransform}
                      imageMap={deferredImageMap}
                      canvasRef={canvasRef}
                    />
                  </div>
                </div>

                <div className="grid gap-[10px] content-start">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-[16px] py-[14px]">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#bfdab7]/48">
                      Render Segments
                    </div>
                    <div className="mt-[8px] text-[30px] font-semibold text-[#f2ffe7]">
                      {mappedSegments.length}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-[16px] py-[14px]">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#bfdab7]/48">
                      Stack Style
                    </div>
                    <div className="mt-[8px] text-[20px] font-semibold capitalize text-[#f2ffe7]">
                      {imageMap.stackStyle}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-[16px] py-[14px]">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#bfdab7]/48">
                      Image Analysis
                    </div>
                    <div className="mt-[8px] text-[14px] leading-[1.7] text-[#d2ead1]/72">
                      {imageUrl
                        ? `Status: ${status}. Drag in the preview to pan. SVG export is now built from the mapped segments.`
                        : "No image loaded. Preview shows the stacked guilloche geometry only."}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="rounded-[28px] border border-white/10 bg-[#07160d]">
              <div className="p-[18px] tablet:p-[24px]">
                <div className="flex flex-col gap-[8px] tablet:flex-row tablet:items-end tablet:justify-between">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.16em] text-[#bfdab7]/48">
                      Export
                    </p>
                    <h2 className="mt-[6px] text-[24px] font-semibold tracking-[-0.04em] text-[#f2ffe7]">
                      SVG Output
                    </h2>
                  </div>
                  <p className="max-w-[560px] text-[13px] leading-[1.7] text-[#c4dec2]/60">
                    With an uploaded image, SVG export is now based on the mapped segment set rather
                    than the raw orbit paths, so the result matches the image-guided render much more closely.
                  </p>
                </div>

                <pre className="mt-[16px] max-h-[360px] overflow-auto rounded-[24px] border border-white/8 bg-[#020805] p-[16px] text-[12px] leading-[1.7] text-[#d8eed3]/72">
                  {imageUrl ? mappedSvgMarkup : baseSvgMarkup}
                </pre>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </main>
  );
}
