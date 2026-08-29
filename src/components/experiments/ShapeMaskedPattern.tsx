"use client";

import { useEffect, useRef, useState } from "react";

const CURRENCY_OPTIONS = [
  { symbol: "$", family: "dollar" },
  { symbol: "\u20AC", family: "euro" },
  { symbol: "\u00A3", family: "pound" },
  { symbol: "\u20B9", family: "rupee" },
  { symbol: "\u20BD", family: "ruble" },
] as const;

const CELL_SIZE = 18;
const TWO_PI = Math.PI * 2;

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MaskedItem = {
  col: number;
  row: number;
  symbolIndex: number;
  family: string;
  lowOpacity: number;
  highOpacity: number;
  duration: number;
  delay: number;
};

function sampleMask(
  imageSrc: string,
  canvasWidth: number,
  canvasHeight: number,
  brightnessThreshold: number,
): Promise<boolean[][]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = canvasWidth;
      offscreen.height = canvasHeight;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));

      const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvasWidth - w) / 2, (canvasHeight - h) / 2, w, h);

      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const cols = Math.floor(canvasWidth / CELL_SIZE);
      const rows = Math.floor(canvasHeight / CELL_SIZE);
      const mask: boolean[][] = [];

      for (let row = 0; row < rows; row++) {
        mask[row] = [];
        for (let col = 0; col < cols; col++) {
          const px = Math.floor(col * CELL_SIZE + CELL_SIZE / 2);
          const py = Math.floor(row * CELL_SIZE + CELL_SIZE / 2);
          const idx = (py * canvasWidth + px) * 4;
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          mask[row][col] = brightness < brightnessThreshold;
        }
      }

      resolve(mask);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

function buildMaskedItems(
  mask: boolean[][],
  cols: number,
  rows: number,
): MaskedItem[] {
  const rng = mulberry32((cols * 73856093) ^ (rows * 19349663) ^ 0x9e3779b9);
  const items: MaskedItem[] = [];
  const totalCells = cols * rows;
  const familyByCell = new Array<string | null>(totalCells).fill(null);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!mask[row]?.[col]) continue;

      const idx = row * cols + col;
      const neighborFamilies: Array<string | null> = [
        col > 0 ? familyByCell[idx - 1] : null,
        row > 0 ? familyByCell[idx - cols] : null,
        row > 0 && col > 0 ? familyByCell[idx - cols - 1] : null,
        row > 0 && col < cols - 1 ? familyByCell[idx - cols + 1] : null,
      ];

      const order = Array.from({ length: CURRENCY_OPTIONS.length }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      let symbolIndex = order[0];
      for (const candidate of order) {
        if (!neighborFamilies.includes(CURRENCY_OPTIONS[candidate].family)) {
          symbolIndex = candidate;
          break;
        }
      }

      familyByCell[idx] = CURRENCY_OPTIONS[symbolIndex].family;

      const band = rng();
      const lowOpacity = band < 0.7 ? 0.15 : band < 0.9 ? 0.1 : 0.1;
      const highOpacity = band < 0.7 ? 1 : band < 0.9 ? 0.5 : 0.7;
      const duration = 3.2 + rng() * 2.8;
      const delay = rng() * duration;

      items.push({
        col,
        row,
        symbolIndex,
        family: CURRENCY_OPTIONS[symbolIndex].family,
        lowOpacity,
        highOpacity,
        duration,
        delay,
      });
    }
  }

  return items;
}

interface ShapeMaskedPatternProps {
  imageSrc: string;
  brightnessThreshold?: number;
  width: number;
  height: number;
  className?: string;
}

export default function ShapeMaskedPattern({
  imageSrc,
  brightnessThreshold = 0.55,
  width,
  height,
  className,
}: ShapeMaskedPatternProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<MaskedItem[]>([]);
  const frameRef = useRef<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cancelled = false;
    let fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const cols = Math.floor(width / CELL_SIZE);
    const rows = Math.floor(height / CELL_SIZE);

    const init = async () => {
      const mask = await sampleMask(imageSrc, width, height, brightnessThreshold);
      if (cancelled) return;

      itemsRef.current = buildMaskedItems(mask, cols, rows);
      console.log("ShapeMaskedPattern:", { width, height, cols, rows, items: itemsRef.current.length });
      setReady(true);

      const draw = (nowMs: number) => {
        if (cancelled) return;
        const now = nowMs / 1000;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `300 ${CELL_SIZE * 0.52}px ${fontFamily}`;

        for (const item of itemsRef.current) {
          const phase = ((now + item.delay) / item.duration) % 1;
          const envelope = (1 + Math.cos(phase * TWO_PI)) * 0.5;
          const opacity = item.lowOpacity + (item.highOpacity - item.lowOpacity) * envelope;

          if (opacity <= 0.001) continue;

          const threshold = now + item.delay - item.duration * 0.5;
          const swaps = threshold <= 0 ? 0 : Math.floor(threshold / item.duration) + 1;
          const symbolIndex = (item.symbolIndex + swaps) % CURRENCY_OPTIONS.length;

          const x = item.col * CELL_SIZE + CELL_SIZE / 2;
          const y = item.row * CELL_SIZE + CELL_SIZE / 2;

          ctx.globalAlpha = opacity;
          ctx.fillStyle = "#ffffff";
          ctx.fillText(CURRENCY_OPTIONS[symbolIndex].symbol, x, y + 0.5);
        }

        ctx.globalAlpha = 1;
        frameRef.current = requestAnimationFrame(draw);
      };

      frameRef.current = requestAnimationFrame(draw);
    };

    void document.fonts.ready.then(() => {
      fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
    }).catch(() => {});

    init().catch((err) => console.error("ShapeMaskedPattern init error:", err));

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
    };
  }, [imageSrc, brightnessThreshold, width, height]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className={`block transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ width, height }}
      />
    </div>
  );
}
