"use client";

import { useEffect, useRef } from "react";

const GRID_COLOR = "#555555";
const CURRENCY_OPTIONS = [
  { symbol: "$", family: "dollar" },
  { symbol: "\u20AC", family: "euro" },
  { symbol: "\u00A3", family: "pound" },
  { symbol: "\u20B9", family: "rupee" },
  { symbol: "\u20BD", family: "ruble" },
] as const;

const BAND_HEIGHT = 550;
const DUPLICATE_GAP = 200;
const SECOND_BAND_TOP = BAND_HEIGHT + DUPLICATE_GAP;
const TOTAL_HEIGHT = SECOND_BAND_TOP + BAND_HEIGHT;
const CELL_SIZE = 25;
const ICON_SIZE = 25;
const ICON_INSET = 0;
const TWO_PI = Math.PI * 2;

type ScatterItem = {
  id: string;
  kind: "currency";
  family: string;
  baseSymbolIndex: number;
  duplicateBaseStateIndex: number;
  left: number;
  top: number;
  size: number;
  lowOpacity: number;
  highOpacity: number;
  duration: number;
  delay: number;
};

type PatternVariant = "both" | "outline" | "normal";
type HeroRandomScatterProps = {
  variant?: PatternVariant;
  embedded?: boolean;
};

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildItems(width: number) {
  const cols = Math.max(1, Math.floor(width / CELL_SIZE));
  const rows = Math.max(1, Math.floor(BAND_HEIGHT / CELL_SIZE));
  const totalCells = cols * rows;
  const occupancy = width >= 1024 ? 0.32 : width >= 640 ? 0.27 : 0.22;
  const targetCount = Math.max(CURRENCY_OPTIONS.length + 1, Math.floor(totalCells * occupancy));
  const count = Math.min(totalCells, targetCount);
  const rng = mulberry32((cols * 73856093) ^ (rows * 19349663) ^ 0x9e3779b9);

  const candidates = Array.from({ length: totalCells }, (_, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    return { idx, row, col };
  });
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = temp;
  }

  const selected = candidates
    .slice(0, count)
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));

  const bucket70 = Math.floor(count * 0.7);
  const bucket20 = Math.floor(count * 0.2);
  const bucket10 = count - bucket70 - bucket20;
  const opacityBands: Array<{ low: number; high: number }> = [
    ...Array.from({ length: bucket70 }, () => ({ low: 0.15, high: 1 })),
    ...Array.from({ length: bucket20 }, () => ({ low: 0.1, high: 0.5 })),
    ...Array.from({ length: bucket10 }, () => ({ low: 0.1, high: 0.7 })),
  ];
  for (let i = opacityBands.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = opacityBands[i];
    opacityBands[i] = opacityBands[j];
    opacityBands[j] = temp;
  }

  const familyByCell = new Array<string | null>(totalCells).fill(null);
  const options = CURRENCY_OPTIONS.map((option, symbolIndex) => ({
    kind: "currency" as const,
    family: option.family,
    symbolIndex,
  }));

  const nextItems: ScatterItem[] = [];
  for (let i = 0; i < selected.length; i += 1) {
    const { idx, row, col } = selected[i];
    const optionOrder = Array.from({ length: options.length }, (_, optionIdx) => optionIdx);
    for (let j = optionOrder.length - 1; j > 0; j -= 1) {
      const swap = Math.floor(rng() * (j + 1));
      const temp = optionOrder[j];
      optionOrder[j] = optionOrder[swap];
      optionOrder[swap] = temp;
    }

    const neighborFamilies: Array<string | null> = [
      col > 0 ? familyByCell[idx - 1] : null,
      row > 0 ? familyByCell[idx - cols] : null,
      row > 0 && col > 0 ? familyByCell[idx - cols - 1] : null,
      row > 0 && col < cols - 1 ? familyByCell[idx - cols + 1] : null,
    ];

    let optionIndex = optionOrder[0];
    for (const candidate of optionOrder) {
      const family = options[candidate].family;
      if (!neighborFamilies.includes(family)) {
        optionIndex = candidate;
        break;
      }
    }

    const selectedOption = options[optionIndex];
    familyByCell[idx] = selectedOption.family;

    const band = opacityBands[i] ?? { low: 0, high: 1 };
    const duration = 3.2 + rng() * 2.8;
    const delay = rng() * duration;

    nextItems.push({
      id: `s-${row}-${col}-${i}`,
      kind: selectedOption.kind,
      family: selectedOption.family,
      baseSymbolIndex: selectedOption.symbolIndex,
      duplicateBaseStateIndex: selectedOption.symbolIndex,
      left: col * CELL_SIZE + ICON_INSET,
      top: row * CELL_SIZE + ICON_INSET,
      size: ICON_SIZE,
      lowOpacity: band.low,
      highOpacity: band.high,
      duration,
      delay,
    });
  }

  return nextItems;
}

function getOpacity(item: ScatterItem, timeSeconds: number) {
  const phase = ((timeSeconds + item.delay) / item.duration) % 1;
  const envelope = (1 + Math.cos(phase * TWO_PI)) * 0.5;
  return item.lowOpacity + (item.highOpacity - item.lowOpacity) * envelope;
}

function getSwapCount(item: ScatterItem, timeSeconds: number) {
  const threshold = timeSeconds + item.delay - item.duration * 0.5;
  if (threshold <= 0) return 0;
  return Math.floor(threshold / item.duration) + 1;
}

export default function HeroRandomScatter({
  variant = "both",
  embedded = false,
}: HeroRandomScatterProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<ScatterItem[]>([]);
  const frameRef = useRef<number>(0);
  const widthRef = useRef<number>(0);
  const dprRef = useRef<number>(1);
  const fontFamilyRef = useRef<string>("sans-serif");

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    fontFamilyRef.current = getComputedStyle(document.body).fontFamily || "sans-serif";

    let resizeRaf = 0;

    const rebuild = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const dpr = window.devicePixelRatio || 1;
      const canvasHeight = variant === "both" ? TOTAL_HEIGHT : BAND_HEIGHT;

      widthRef.current = width;
      dprRef.current = dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${canvasHeight}px`;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(canvasHeight * dpr));
      itemsRef.current = buildItems(width);
    };

    const scheduleRebuild = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        rebuild();
      });
    };

    const observer = new ResizeObserver(scheduleRebuild);
    observer.observe(wrapper);
    window.addEventListener("resize", scheduleRebuild);

    const isVisibleRef = { current: true };

    const draw = (nowMs: number) => {
      if (!isVisibleRef.current) {
        frameRef.current = window.requestAnimationFrame(draw);
        return;
      }

      const width = widthRef.current;
      const dpr = dprRef.current;
      const now = nowMs / 1000;
      const canvasHeight = variant === "both" ? TOTAL_HEIGHT : BAND_HEIGHT;

      const drawTop = variant !== "normal";
      const drawBottom = variant !== "outline";
      const bottomOffset = variant === "both" ? SECOND_BAND_TOP : 0;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, canvasHeight);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = GRID_COLOR;
      context.strokeStyle = GRID_COLOR;
      context.font = `300 13px ${fontFamilyRef.current}`;

      for (const item of itemsRef.current) {
        const opacity = getOpacity(item, now);
        if (opacity <= 0.001) continue;

        context.globalAlpha = opacity;
        if (drawTop) {
          context.lineWidth = 0.5;
          context.strokeRect(item.left + 0.25, item.top + 0.25, item.size - 0.5, item.size - 0.5);

          const swaps = getSwapCount(item, now);
          const symbolIndex = (item.baseSymbolIndex + swaps) % CURRENCY_OPTIONS.length;
          context.fillText(
            CURRENCY_OPTIONS[symbolIndex].symbol,
            item.left + item.size / 2,
            item.top + item.size / 2 + 0.5,
          );
        }

        if (drawBottom) {
          const duplicateSwaps = getSwapCount(item, now);
          const symbolIndex = (item.duplicateBaseStateIndex + duplicateSwaps) % CURRENCY_OPTIONS.length;
          context.fillText(
            CURRENCY_OPTIONS[symbolIndex].symbol,
            item.left + item.size / 2,
            item.top + bottomOffset + item.size / 2 + 0.5,
          );
        }
      }

      context.globalAlpha = 1;
      frameRef.current = window.requestAnimationFrame(draw);
    };

    // Pause rAF loop when section is off-screen
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    visibilityObserver.observe(wrapper);

    rebuild();
    frameRef.current = window.requestAnimationFrame(draw);

    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleRebuild).catch(() => {});
    }

    return () => {
      visibilityObserver.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", scheduleRebuild);
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [variant]);

  const containerHeight = variant === "both" ? TOTAL_HEIGHT : BAND_HEIGHT;

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={
        embedded
          ? "pointer-events-none absolute inset-0 z-0 overflow-hidden"
          : "pointer-events-none absolute inset-x-0 top-[72px] z-0 overflow-hidden tablet:top-[84px] laptop:top-[96px]"
      }
      style={{ height: `${containerHeight}px` }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

export function SymbolStreamOutline({ embedded = false }: { embedded?: boolean }) {
  return <HeroRandomScatter variant="outline" embedded={embedded} />;
}

export function SymbolStream({ embedded = false }: { embedded?: boolean }) {
  return <HeroRandomScatter variant="normal" embedded={embedded} />;
}
