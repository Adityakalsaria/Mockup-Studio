"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { DEVICES } from "@/features/mockup-studio/devices";
import { FINISHES } from "@/features/mockup-studio/finishes";
import { LIGHTING_PRESETS } from "@/features/mockup-studio/lighting";
import { B, Opener, Reveal, Specs } from "../Chapter";
import { shot, shotCaption, shotSrc } from "../shots";

const LINEUP = ["lineup-iphone-duo", "lineup-iphone-17-pro", "lineup-iphone-air", "lineup-ipad-pro", "lineup-macbook-pro", "lineup-imac"];
const appleDevices = DEVICES.filter((d) => d.label.startsWith("Apple "));

/**
 * The lineup, rendered by the studio. The strip is wider than any screen, so on
 * a laptop it travels sideways as the page scrolls past -- the page still
 * scrolls normally, the strip just follows it. Phones get a native swipe.
 * After it, the product page's two columns: a paragraph and the figures.
 */
export function MadeForApple() {
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -travel]);

  useLayoutEffect(() => {
    const measure = () => {
      const node = strip.current;
      if (!node) return;
      const wide = window.matchMedia("(min-width: 1000px)").matches;
      setTravel(wide ? Math.max(0, node.scrollWidth - window.innerWidth) : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div className="bg-white">
      <section ref={track} className="relative" style={{ height: travel ? `calc(100svh + ${travel}px)` : undefined }}>
        <div className={`${travel ? "sticky top-0 flex h-svh flex-col justify-center overflow-hidden" : ""} py-[var(--spacing-section)]`}>
          <div className="ds-page-gutter">
            <Opener eyebrow="Every device" title="Made for Apple." />
          </div>

          <div className={travel ? "" : "hide-scrollbar snap-x snap-mandatory overflow-x-auto"}>
            <motion.div ref={strip} style={{ x }} className="ds-page-gutter mt-[var(--space-48)] flex w-max items-end gap-[var(--space-40)]">
              {LINEUP.map((id) => {
                const s = shot(id);
                const { device, finish } = shotCaption(s);
                return (
                  <figure key={id} className="flex shrink-0 snap-center flex-col items-center">
                    <div className="relative h-[clamp(300px,42svh,500px)]" style={{ aspectRatio: `${s.width} / ${s.height}` }}>
                      <Image unoptimized src={shotSrc(id)} alt={`${device} in ${finish}`} fill sizes="(min-width: 1000px) 50vw, 90vw" className="object-contain" />
                    </div>
                    <figcaption className="text-center">
                      <p className="type-copy font-semibold text-text-primary-dark">{device}</p>
                      <p className="type-caption text-text-muted-dark">{finish}</p>
                    </figcaption>
                  </figure>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      <div className="ds-page-gutter pb-[var(--spacing-section)]">
        <div className="layout-product grid grid-cols-1 gap-[var(--space-48)] laptop:grid-cols-2">
          <Reveal>
            <p className="type-lead text-text-secondary-dark">
              Every model carries <B>the details that make it read as real</B> — the chamfer, the camera plateau, the glass —
              in the finishes Apple ships. From <B>{appleDevices[0].label.replace(/^Apple /, "")}</B> to <B>Studio Display</B>, pick
              one and your screen is on it.
            </p>
          </Reveal>
          <Specs
            className="!grid-cols-1 !gap-[var(--space-24)]"
            items={[
              { figure: String(appleDevices.length), label: "Apple devices" },
              { figure: String(FINISHES.length), label: "Real finishes" },
              { figure: String(LIGHTING_PRESETS.length), label: "Lighting presets" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
