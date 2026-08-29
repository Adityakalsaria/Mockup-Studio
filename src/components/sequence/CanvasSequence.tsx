"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface CanvasSequenceProps {
  frameCount: number;
  className?: string;
  triggerSelector: string;
  start?: string;
  end?: string;
  startFrame?: number;
  endFrame?: number;
  fitMode?: "contain" | "cover" | "fill-width";
  framePathPrefix?: string;
  framePathSuffix?: string;
  frameNumberOffset?: number;
  padLength?: number;
  preloadStrategy?: "lazy" | "eager";
  maxConcurrentLoads?: number;
  pinTargetSelector?: string;
  verticalAlign?: "top" | "center";
  scrub?: boolean | number;
  maxDevicePixelRatio?: number;
}

function pad(value: number, length: number) {
  return String(value).padStart(length, "0");
}

function getSrc(
  frame: number,
  framePathPrefix: string,
  framePathSuffix: string,
  frameNumberOffset: number,
  padLength: number
) {
  return `${framePathPrefix}${pad(frame + frameNumberOffset, padLength)}${framePathSuffix}`;
}

export default function CanvasSequence({
  frameCount,
  className = "",
  triggerSelector,
  start = "top top",
  end = "bottom bottom",
  startFrame = 0,
  endFrame,
  fitMode = "contain",
  framePathPrefix = "/sequence/comp1/new iphone_",
  framePathSuffix = ".webp",
  frameNumberOffset = 0,
  padLength = 5,
  preloadStrategy = "lazy",
  maxConcurrentLoads = 8,
  pinTargetSelector,
  verticalAlign = "center",
  scrub = true,
  maxDevicePixelRatio = 2,
}: CanvasSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());
  const lastDrawnFrameRef = useRef<number>(-1);
  const currentFrameRef = useRef<number>(startFrame);
  const renderFrameRef = useRef<(frame: number) => void>(() => {});
  const startRef = useRef(start);
  const endRef = useRef(end);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [ready, setReady] = useState(false);
  const maxFrame = endFrame ?? frameCount - 1;

  const loadFrame = useCallback(
    (frame: number, onDone?: () => void) => {
      if (frame < startFrame || frame > maxFrame) return;
      const cached = imagesRef.current.get(frame);
      if (cached?.complete) {
        onDone?.();
        return;
      }
      if (loadingRef.current.has(frame)) return;

      loadingRef.current.add(frame);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        imagesRef.current.set(frame, img);
        loadingRef.current.delete(frame);
        onDone?.();
      };
      img.onerror = () => {
        loadingRef.current.delete(frame);
        onDone?.();
      };
      img.src = getSrc(frame, framePathPrefix, framePathSuffix, frameNumberOffset, padLength);
    },
    [frameNumberOffset, framePathPrefix, framePathSuffix, maxFrame, padLength, startFrame]
  );

  useEffect(() => {
    let mounted = true;
    imagesRef.current.clear();
    loadingRef.current.clear();
    lastDrawnFrameRef.current = -1;

    loadFrame(startFrame, () => {
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
      imagesRef.current.clear();
      loadingRef.current.clear();
    };
  }, [loadFrame, startFrame]);

  useEffect(() => {
    if (!ready || preloadStrategy !== "eager") return;
    let cancelled = false;
    let inFlight = 0;
    const frames: number[] = [];
    for (let f = startFrame; f <= maxFrame; f += 1) frames.push(f);
    frames.sort((a, b) => Math.abs(a - startFrame) - Math.abs(b - startFrame));
    let cursor = 0;

    const pump = () => {
      if (cancelled) return;
      while (inFlight < maxConcurrentLoads && cursor < frames.length) {
        const frame = frames[cursor];
        cursor += 1;
        if (imagesRef.current.get(frame)?.complete || loadingRef.current.has(frame)) continue;
        inFlight += 1;
        loadFrame(frame, () => {
          inFlight -= 1;
          pump();
        });
      }
    };

    pump();
    return () => {
      cancelled = true;
    };
  }, [ready, preloadStrategy, startFrame, maxFrame, maxConcurrentLoads, loadFrame]);

  const renderFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (frame === lastDrawnFrameRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imagesRef.current.get(frame);
    if (!img || !img.complete) {
      loadFrame(frame, () => renderFrameRef.current(frame));
      return;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const scale =
      fitMode === "cover"
        ? Math.max(cw / iw, ch / ih)
        : fitMode === "fill-width"
          ? cw / iw
          : Math.min(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (cw - w) / 2;
    const y = verticalAlign === "top" ? 0 : (ch - h) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, x, y, w, h);
    lastDrawnFrameRef.current = frame;

    const nextFrames = [
      frame + 1, frame + 2, frame + 3, frame + 4,
      frame + 5, frame + 6, frame - 1, frame - 2,
    ];
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
        () => nextFrames.forEach((f) => loadFrame(f))
      );
    } else {
      setTimeout(() => nextFrames.forEach((f) => loadFrame(f)), 0);
    }
  }, [fitMode, verticalAlign, loadFrame]);

  useEffect(() => {
    renderFrameRef.current = renderFrame;
  }, [renderFrame]);

  // Sync start/end refs and update existing ScrollTrigger without re-creating it
  useEffect(() => {
    startRef.current = start;
    endRef.current = end;
    const tween = tweenRef.current;
    if (tween) {
      const st = tween.scrollTrigger;
      if (st) {
        st.vars.start = start;
        st.vars.end = end;
        ScrollTrigger.refresh();
      }
    }
  }, [start, end]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const dpr = Math.min(maxDevicePixelRatio, window.devicePixelRatio || 1);
      const parent = canvas!.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas!.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas!.style.width = `${rect.width}px`;
      canvas!.style.height = `${rect.height}px`;
      lastDrawnFrameRef.current = -1;
      renderFrame(currentFrameRef.current);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [ready, renderFrame, maxDevicePixelRatio]);

  useGSAP(
    () => {
      if (!ready) return;
      if (!canvasRef.current) return;

      const triggerEl = document.querySelector(triggerSelector);
      if (!triggerEl) return;

      const pinTarget = pinTargetSelector
        ? (document.querySelector(pinTargetSelector) as HTMLElement)
        : undefined;

      const state = { frame: startFrame };

      tweenRef.current = gsap.to(state, {
        frame: maxFrame,
        ease: "none",
        scrollTrigger: {
          trigger: triggerEl,
          start: startRef.current,
          end: endRef.current,
          scrub,
          pin: pinTarget || false,
          pinSpacing: !!pinTarget,
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          const frame = Math.round(state.frame);
          currentFrameRef.current = frame;
          renderFrame(frame);
        },
      });
    },
    {
      scope: canvasRef,
      dependencies: [ready, maxFrame, startFrame, scrub, pinTargetSelector],
    }
  );

  return <canvas ref={canvasRef} aria-hidden="true" role="presentation" className={`block ${className}`} />;
}
