"use client";

import { useEffect, useRef } from "react";

const SYMBOLS: readonly string[] = ["$", "€", "£", "¥", "₹"];

export default function ReferralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouse = { x: -1000, y: -1000 };
    let animationId: number;
    let fontFamily = "sans-serif";
    let paused = false;

    const spacing = 32;
    const radius = 200;

    const symbolTableSize = 4096;
    const symbolTable: string[] = new Array(symbolTableSize);
    const morphMap = new Map<string, number>();

    let seed = 0xdeadbeef;
    const rand = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) % SYMBOLS.length;
    };

    for (let index = 0; index < symbolTableSize; index += 1) {
      symbolTable[index] = SYMBOLS[rand()];
    }

    const getSymbol = (col: number, row: number) => {
      let hash = (col * 374761393 + row * 668265263 + col * row) >>> 0;
      hash = ((hash ^ (hash >>> 13)) * 1274126177) >>> 0;
      return symbolTable[hash % symbolTableSize];
    };

    const readFont = () => {
      const computed = getComputedStyle(document.body).fontFamily;
      if (computed && computed !== "sans-serif") {
        fontFamily = computed;
      }
    };

    void document.fonts.ready.then(readFont).catch(() => {});
    readFont();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      morphMap.clear();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse = { x: event.clientX, y: event.clientY };
    };

    const handleMouseLeave = () => {
      mouse = { x: -1000, y: -1000 };
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let col = 0; col < cols; col += 1) {
        for (let row = 0; row < rows; row += 1) {
          const x = col * spacing;
          const y = row * spacing;
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const targetMorph = dist < radius ? 1 - dist / radius : 0;
          const key = `${col},${row}`;
          const currentMorph = morphMap.get(key) ?? 0;
          const nextMorph = currentMorph + (targetMorph - currentMorph) * 0.1;
          morphMap.set(key, nextMorph);

          const opacity = 0.12 + nextMorph * 0.28;

          if (nextMorph > 0.02) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.font = `300 ${4 + nextMorph * 8}px ${fontFamily}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(getSymbol(col, row), x, y);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fill();
          }
        }
      }

      animationId = window.requestAnimationFrame(draw);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        paused = true;
        window.cancelAnimationFrame(animationId);
      } else if (paused) {
        paused = false;
        animationId = window.requestAnimationFrame(draw);
      }
    };

    resize();
    animationId = window.requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[var(--z-base)]" />;
}
