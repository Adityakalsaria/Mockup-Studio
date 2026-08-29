"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    // Lazy-load Lenis so the ~12 KB library stays out of the critical path.
    // The dynamic import fires after first paint (inside useEffect).
    let cancelled = false;

    import("lenis").then(({ default: LenisClass }) => {
      if (cancelled) return;

      const lenis = new LenisClass({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // exponential ease-out
        wheelMultiplier: 0.9,
        touchMultiplier: 1.8,
      });

      lenisRef.current = lenis;

      // Force scroll to top on load so page always starts at Hero
      lenis.scrollTo(0, { immediate: true });

      // Bridge Lenis scroll events to GSAP ScrollTrigger
      lenis.on("scroll", ScrollTrigger.update);

      // Connect Lenis to GSAP ticker for frame-synced updates
      const tickerCallback = (time: number) => {
        lenis.raf(time * 1000); // GSAP ticker uses seconds, Lenis uses ms
      };
      gsap.ticker.add(tickerCallback);

      // Disable GSAP's default lag smoothing for better sync
      gsap.ticker.lagSmoothing(0);

      // Store cleanup data on the ref so the effect cleanup can use it
      lenisRef.current = lenis;
      // Attach cleanup helper
      (lenis as Lenis & { __tickerCb?: (t: number) => void }).__tickerCb = tickerCallback;
    });

    return () => {
      cancelled = true;
      const lenis = lenisRef.current;
      if (lenis) {
        const cb = (lenis as Lenis & { __tickerCb?: (t: number) => void }).__tickerCb;
        if (cb) gsap.ticker.remove(cb);
        lenis.destroy();
        lenisRef.current = null;
      }
    };
  }, []);

  return <>{children}</>;
}
