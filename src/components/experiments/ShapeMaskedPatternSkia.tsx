/**
 * ShapeMaskedPatternSkia
 *
 * Renders animated currency symbols masked to the shape of a provided image.
 * Dark regions of the image show symbols, light regions are empty.
 *
 * Requirements:
 *   npm install @shopify/react-native-skia
 *
 * Usage:
 *   import ShapeMaskedPatternSkia from "./ShapeMaskedPatternSkia";
 *
 *   // With a local asset
 *   <ShapeMaskedPatternSkia
 *     imageSource={require("./assets/silhouette.jpg")}
 *     width={350}
 *     height={700}
 *     brightnessThreshold={0.55}
 *     cellSize={18}
 *   />
 *
 *   // With a remote URL
 *   <ShapeMaskedPatternSkia
 *     imageSource="https://example.com/silhouette.jpg"
 *     width={350}
 *     height={700}
 *   />
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, Image as RNImage } from "react-native";
import {
  Canvas,
  Text as SkiaText,
  useFont,
  useClockValue,
  useDerivedValue,
  Skia,
  SkImage,
} from "@shopify/react-native-skia";

// ─── Config ───────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS = ["$", "€", "£", "₹", "₽"] as const;

const DEFAULT_CELL_SIZE = 18;
const DEFAULT_BRIGHTNESS_THRESHOLD = 0.55;
const TWO_PI = Math.PI * 2;

// ─── Deterministic RNG ────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MaskedItem = {
  col: number;
  row: number;
  x: number;
  y: number;
  symbolIndex: number;
  lowOpacity: number;
  highOpacity: number;
  duration: number;
  delay: number;
};

// ─── Mask sampling ────────────────────────────────────────────────────────────

/**
 * Loads an image into Skia, scales it to cover the target dimensions,
 * reads pixel data, and returns a 2D boolean mask where `true` means
 * "this cell is inside the dark shape".
 */
async function buildMaskFromImage(
  imageSource: number | string,
  targetWidth: number,
  targetHeight: number,
  cellSize: number,
  brightnessThreshold: number,
): Promise<{ mask: boolean[][]; cols: number; rows: number }> {
  // Resolve the image to a Skia SkImage
  let skImage: SkImage | null = null;

  if (typeof imageSource === "string") {
    // Remote URL
    const response = await fetch(imageSource);
    const arrayBuffer = await response.arrayBuffer();
    const data = Skia.Data.fromBytes(new Uint8Array(arrayBuffer));
    skImage = Skia.Image.MakeImageFromEncoded(data);
  } else {
    // Local require() asset — resolve URI via RN Image
    const resolved = RNImage.resolveAssetSource(imageSource);
    const response = await fetch(resolved.uri);
    const arrayBuffer = await response.arrayBuffer();
    const data = Skia.Data.fromBytes(new Uint8Array(arrayBuffer));
    skImage = Skia.Image.MakeImageFromEncoded(data);
  }

  if (!skImage) throw new Error("Failed to decode image");

  const imgW = skImage.width();
  const imgH = skImage.height();

  // Create an offscreen surface to draw the image scaled to cover
  const surface = Skia.Surface.Make(targetWidth, targetHeight);
  if (!surface) throw new Error("Failed to create Skia surface");

  const canvas = surface.getCanvas();
  const scale = Math.max(targetWidth / imgW, targetHeight / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const offsetX = (targetWidth - drawW) / 2;
  const offsetY = (targetHeight - drawH) / 2;

  const paint = Skia.Paint();
  canvas.drawImageRect(
    skImage,
    Skia.XYWHRect(0, 0, imgW, imgH),
    Skia.XYWHRect(offsetX, offsetY, drawW, drawH),
    paint,
  );

  // Read pixels
  const snapshot = surface.makeImageSnapshot();
  const pixels = snapshot.readPixels(0, 0, {
    width: targetWidth,
    height: targetHeight,
    colorType: 4, // RGBA_8888
    alphaType: 1, // Premul
  });

  if (!pixels) throw new Error("Failed to read pixels");

  const cols = Math.floor(targetWidth / cellSize);
  const rows = Math.floor(targetHeight / cellSize);
  const mask: boolean[][] = [];

  for (let row = 0; row < rows; row++) {
    mask[row] = [];
    for (let col = 0; col < cols; col++) {
      const px = Math.floor(col * cellSize + cellSize / 2);
      const py = Math.floor(row * cellSize + cellSize / 2);
      const idx = (py * targetWidth + px) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      mask[row][col] = brightness < brightnessThreshold;
    }
  }

  return { mask, cols, rows };
}

// ─── Build items from mask ────────────────────────────────────────────────────

function buildItems(
  mask: boolean[][],
  cols: number,
  rows: number,
  cellSize: number,
): MaskedItem[] {
  const rng = mulberry32((cols * 73856093) ^ (rows * 19349663) ^ 0x9e3779b9);
  const items: MaskedItem[] = [];
  const totalCells = cols * rows;
  const familyByCell = new Array<number | null>(totalCells).fill(null);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!mask[row]?.[col]) continue;

      const idx = row * cols + col;

      // Avoid same symbol in adjacent cells
      const neighbors: Array<number | null> = [
        col > 0 ? familyByCell[idx - 1] : null,
        row > 0 ? familyByCell[idx - cols] : null,
        row > 0 && col > 0 ? familyByCell[idx - cols - 1] : null,
        row > 0 && col < cols - 1 ? familyByCell[idx - cols + 1] : null,
      ];

      const order = Array.from({ length: CURRENCY_SYMBOLS.length }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      let symbolIndex = order[0];
      for (const candidate of order) {
        if (!neighbors.includes(candidate)) {
          symbolIndex = candidate;
          break;
        }
      }

      familyByCell[idx] = symbolIndex;

      const band = rng();
      const lowOpacity = band < 0.7 ? 0.15 : 0.1;
      const highOpacity = band < 0.7 ? 1 : band < 0.9 ? 0.5 : 0.7;
      const duration = 3.2 + rng() * 2.8;
      const delay = rng() * duration;

      items.push({
        col,
        row,
        x: col * cellSize + cellSize / 2,
        y: row * cellSize + cellSize / 2,
        symbolIndex,
        lowOpacity,
        highOpacity,
        duration,
        delay,
      });
    }
  }

  return items;
}

// ─── Animated symbol component ────────────────────────────────────────────────

function AnimatedSymbol({
  item,
  clock,
  font,
}: {
  item: MaskedItem;
  clock: { value: number };
  font: ReturnType<typeof useFont>;
}) {
  const animatedOpacity = useDerivedValue(() => {
    const now = clock.value / 1000;
    const phase = ((now + item.delay) / item.duration) % 1;
    const envelope = (1 + Math.cos(phase * TWO_PI)) * 0.5;
    return item.lowOpacity + (item.highOpacity - item.lowOpacity) * envelope;
  }, [clock]);

  const animatedText = useDerivedValue(() => {
    const now = clock.value / 1000;
    const threshold = now + item.delay - item.duration * 0.5;
    const swaps = threshold <= 0 ? 0 : Math.floor(threshold / item.duration) + 1;
    const index = (item.symbolIndex + swaps) % CURRENCY_SYMBOLS.length;
    return CURRENCY_SYMBOLS[index];
  }, [clock]);

  if (!font) return null;

  return (
    <SkiaText
      x={item.x}
      y={item.y}
      text={animatedText}
      font={font}
      color="white"
      opacity={animatedOpacity}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ShapeMaskedPatternSkiaProps {
  /** Local require() or remote URL string */
  imageSource: number | string;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** 0–1, pixels darker than this become symbol cells. Default: 0.55 */
  brightnessThreshold?: number;
  /** Grid cell size in pixels. Default: 18 */
  cellSize?: number;
  /** Path to a .ttf font file for the symbols. Uses default system font if omitted. */
  fontSource?: number | string;
  /** Font size. Default: cellSize * 0.52 */
  fontSize?: number;
}

export default function ShapeMaskedPatternSkia({
  imageSource,
  width,
  height,
  brightnessThreshold = DEFAULT_BRIGHTNESS_THRESHOLD,
  cellSize = DEFAULT_CELL_SIZE,
  fontSource,
  fontSize,
}: ShapeMaskedPatternSkiaProps) {
  const [items, setItems] = useState<MaskedItem[]>([]);
  const clock = useClockValue();

  const resolvedFontSize = fontSize ?? cellSize * 0.52;
  const font = useFont(fontSource ?? null, resolvedFontSize);

  useEffect(() => {
    let cancelled = false;

    buildMaskFromImage(imageSource, width, height, cellSize, brightnessThreshold)
      .then(({ mask, cols, rows }) => {
        if (cancelled) return;
        setItems(buildItems(mask, cols, rows, cellSize));
      })
      .catch((err) => console.error("ShapeMaskedPatternSkia:", err));

    return () => {
      cancelled = true;
    };
  }, [imageSource, width, height, cellSize, brightnessThreshold]);

  if (!font || items.length === 0) {
    return <View style={{ width, height }} />;
  }

  return (
    <Canvas style={{ width, height }}>
      {items.map((item) => (
        <AnimatedSymbol
          key={`${item.col}-${item.row}`}
          item={item}
          clock={clock}
          font={font}
        />
      ))}
    </Canvas>
  );
}
