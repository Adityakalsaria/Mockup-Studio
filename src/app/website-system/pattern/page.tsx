"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ShapeMaskedPattern from "@/components/experiments/ShapeMaskedPattern";

export default function PatternExperimentPage() {
  const [threshold, setThreshold] = useState(0.55);
  const screenRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-black">
      <div className="flex items-center gap-6 px-6 py-4">
        <h1 className="type-h4 text-text-primary">Pattern Experiment</h1>
        <label className="flex items-center gap-3 type-body-s text-text-muted">
          Brightness threshold
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-32"
          />
          <span className="w-8 type-micro text-text-secondary">{threshold.toFixed(2)}</span>
        </label>
      </div>
      <div className="flex flex-1 items-end justify-center overflow-hidden">
        <div className="relative h-[85vh] w-auto aspect-[400/820]">
          {/* Phone frame */}
          <Image
            src="/images/iphone-frame.png"
            alt=""
            width={400}
            height={820}
            className="pointer-events-none relative block h-full w-auto"
            style={{ zIndex: 1 }}
            priority
          />

          {/* Screen area — measure this, render pattern inside */}
          <div
            ref={screenRef}
            className="absolute overflow-hidden"
            style={{
              top: "var(--phone-screen-inset-top)",
              bottom: "var(--phone-screen-inset-bottom)",
              left: "var(--phone-screen-inset-x)",
              right: "var(--phone-screen-inset-x)",
              borderRadius: "var(--phone-screen-border-radius)",
              zIndex: 2,
            }}
          >
            {dims && (
              <ShapeMaskedPattern
                key={`${threshold}-${dims.w}-${dims.h}`}
                imageSrc="/images/experiments/silhouette.jpg"
                brightnessThreshold={threshold}
                width={dims.w}
                height={dims.h}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
