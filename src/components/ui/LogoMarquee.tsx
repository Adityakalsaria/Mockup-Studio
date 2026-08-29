"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";

export type LogoItem = { src: string; alt: string };

interface LogoMarqueeProps {
  logos: LogoItem[];
  /** Pixels per second. Default 60. */
  speed?: number;
  /** Logo height in px. Default 28. */
  logoHeight?: number;
  /** Gap between logos in px. Default 40. */
  gap?: number;
  className?: string;
}

export default function LogoMarquee({
  logos,
  speed = 60,
  logoHeight = 28,
  gap = 40,
  className = "",
}: LogoMarqueeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Wait for images to load so we can measure correctly
    const images = el.querySelectorAll("img");
    const onReady = () => {
      // Measure width of one set of logos
      const children = Array.from(el.children) as HTMLElement[];
      const halfCount = children.length / 2;
      let setWidth = 0;
      for (let i = 0; i < halfCount; i++) {
        setWidth += children[i].offsetWidth + gap;
      }

      const tick = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const delta = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        offsetRef.current -= speed * delta;

        // When we've scrolled one full set, reset to 0 for seamless loop
        if (Math.abs(offsetRef.current) >= setWidth) {
          offsetRef.current += setWidth;
        }

        el.style.transform = `translateX(${offsetRef.current}px)`;
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    let loaded = 0;
    const total = images.length;
    if (total === 0) {
      onReady();
    } else {
      images.forEach((img) => {
        if (img.complete) {
          loaded++;
          if (loaded === total) onReady();
        } else {
          img.onload = img.onerror = () => {
            loaded++;
            if (loaded === total) onReady();
          };
        }
      });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [logos, speed, gap]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left gradient mask */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[48px] bg-gradient-to-r from-black to-transparent" />
      {/* Right gradient mask */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[48px] bg-gradient-to-l from-black to-transparent" />

      <div
        ref={scrollRef}
        className="flex will-change-transform"
        style={{ gap: `${gap}px` }}
      >
        {/* Two identical sets for seamless looping */}
        {[...logos, ...logos].map((logo, i) => (
          <Image
            key={`${logo.alt}-${i}`}
            src={logo.src}
            alt={logo.alt}
            width={Math.round(logoHeight * 2)}
            height={logoHeight}
            className="shrink-0 opacity-60"
            style={{ height: `${logoHeight}px`, width: "auto" }}
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
