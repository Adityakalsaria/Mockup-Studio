"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Glass } from "@/design/ui";
import { LIGHTING_PRESETS } from "@/features/mockup-studio/lighting";
import { GalleryHead, Statement } from "../Chapter";
import { LiveDevice, SCREENS, useNear, usePrefersReducedMotion } from "../LiveDevice";
import { shotSrc } from "../shots";
import { STUDIO } from "./Nav";

const SLIDE_MS = 6000;

type Slide = { title: string; dark: boolean; media: (active: boolean) => ReactNode };

const still = (id: string, alt: string, className = "object-cover") => (
  <Image unoptimized src={shotSrc(id)} alt={alt} fill sizes="(min-width: 1000px) 1260px, 90vw" className={className} />
);

/*
 * Each card is a product page's highlight: the caption centred in the top of
 * the card, the device filling what is left and running off the bottom edge.
 */
const SLIDES: Slide[] = [
  { title: "Your design,\non the real thing.", dark: false, media: () => still("hl-front", "Your screen on iPhone 17 Pro in Deep Blue") },
  { title: "Every finish.\nTrue to Apple.", dark: false, media: () => still("hl-finishes", "iPhone 17 Pro in all five finishes") },
  { title: "iPhone Duo.\nOpen or shut.", dark: false, media: () => still("hl-duo", "iPhone Duo, closed in Cloud White and open in Night Sky") },
  {
    title: `${LIGHTING_PRESETS.length} lighting presets.\nStudio light in a click.`,
    dark: true,
    media: () => (
      <div className="absolute inset-x-0 bottom-0 top-[22%] grid grid-cols-5 bg-black">
        {LIGHTING_PRESETS.map(({ id, label }) => (
          <div key={id} className="relative">
            <Image unoptimized src={shotSrc(`hl-light-${id}`)} alt={`${label} lighting`} fill sizes="20vw" className="object-cover object-top" />
            <p className="type-caption absolute bottom-[var(--space-24)] w-full text-center text-text-muted">{label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Motion presets,\nmeasured from real animation.",
    dark: true,
    media: (active) =>
      active ? (
        <LiveDevice
          className="absolute inset-x-0 bottom-0 top-[18%]"
          deviceId="apple-iphone-17-pro"
          finishId="silver"
          screen={`${SCREENS}/dark-5.png`}
          lighting="top"
          preset="rotation-slide-up"
          loop
          pose={{ zoom: 0.8 }}
        />
      ) : null,
  },
  { title: "Depth of field,\ndialled in.", dark: false, media: () => still("hl-dof", "iPhone 17 Pro with a radial depth of field") },
  {
    title: "The whole studio.\nOne calm canvas.",
    dark: false,
    media: () => (
      <div className="absolute inset-x-[6%] bottom-0 top-[24%] overflow-hidden rounded-t-[var(--radius-md)] shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">
        {still("editor", "The Mocraft studio", "object-cover object-top")}
      </div>
    ),
  },
];

/**
 * "Get the highlights." A native scroll-snap track -- swipeable, keyboard
 * scrollable -- that also advances on its own while in view, with the dots and
 * a play/pause underneath in the studio's glass.
 */
export function Highlights() {
  const track = useRef<HTMLDivElement>(null);
  const [sectionRef, inView] = useNear<HTMLElement>("0px");
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const go = useCallback((i: number) => {
    const node = track.current;
    const slide = node?.children[i] as HTMLElement | undefined;
    if (!node || !slide) return;
    node.scrollTo({ left: slide.offsetLeft - (node.clientWidth - slide.clientWidth) / 2, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const onScroll = () => {
      const centre = node.scrollLeft + node.clientWidth / 2;
      const distances = [...node.children].map((c) => {
        const el = c as HTMLElement;
        return Math.abs(el.offsetLeft + el.clientWidth / 2 - centre);
      });
      setIndex(distances.indexOf(Math.min(...distances)));
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  const auto = playing && inView && !reduced;
  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(() => go((index + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [auto, index, go]);

  return (
    <section id="highlights" ref={sectionRef} className="overflow-hidden bg-surface-studio py-[var(--spacing-section)]">
      <div className="ds-page-gutter">
        <Statement first="You design. Mocraft makes it real." second="No photoshoot required." />
        <div className="mt-[var(--spacing-section)]">
          <GalleryHead title="Get the highlights." link={{ href: STUDIO, label: "Start creating" }} />
        </div>
      </div>

      <div
        ref={track}
        className="hide-scrollbar relative mt-[var(--space-40)] flex snap-x snap-mandatory gap-[var(--space-24)] overflow-x-auto px-[max(var(--layout-page-gutter),calc((100vw-var(--layout-media-max))/2))]"
      >
        {SLIDES.map((slide, i) => (
          <article
            key={slide.title}
            aria-hidden={i !== index}
            className={`relative aspect-[3/4] w-[min(var(--layout-media-max),88vw)] shrink-0 snap-center overflow-hidden rounded-[28px] tablet:aspect-[16/9] ${
              slide.dark ? "bg-black" : "bg-white"
            }`}
          >
            {slide.media(i === index)}
            <h3
              className={`type-tile absolute inset-x-0 top-[var(--space-40)] whitespace-pre-line text-center ${
                slide.dark ? "text-text-primary" : "text-text-primary-dark"
              }`}
            >
              {slide.title}
            </h3>
          </article>
        ))}
      </div>

      <div className="mt-[var(--space-32)] flex justify-center gap-[var(--space-12)]">
        <Glass shape="pill" width="auto">
          <div className="relative z-[1] flex h-[36px] items-center gap-[10px] px-[var(--space-16)]">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.title}
                type="button"
                aria-label={`Show highlight ${i + 1}: ${slide.title.replace("\n", " ")}`}
                onClick={() => go(i)}
                className="relative h-[8px] overflow-hidden rounded-full transition-[width] duration-[var(--duration-normal)]"
                style={{ width: i === index ? 48 : 8, background: "var(--mo-field)" }}
              >
                {i === index ? (
                  <span
                    key={`${index}-${auto}`}
                    className="absolute inset-0 rounded-full"
                    style={{ background: "var(--mo-ink)", animation: auto ? `highlight-progress ${SLIDE_MS}ms linear` : "none" }}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </Glass>
        <Glass shape="pill" width="auto">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause highlights" : "Play highlights"}
            className="relative z-[1] grid h-[36px] w-[36px] place-items-center"
            style={{ color: "var(--mo-ink)" }}
          >
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <rect x="2" y="1" width="3" height="10" rx="1" fill="currentColor" />
                <rect x="7" y="1" width="3" height="10" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
              </svg>
            )}
          </button>
        </Glass>
      </div>
      <style>{`@keyframes highlight-progress { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
    </section>
  );
}
