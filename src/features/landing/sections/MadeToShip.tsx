"use client";

import Image from "next/image";
import { B, Overline, Reveal, Specs, Statement } from "../Chapter";
import { Cta } from "../Cta";
import { shotSrc } from "../shots";
import { STUDIO } from "./Nav";

/*
 * Two cards side by side, one per kind of export, each on its own pastel with a
 * small-caps label, a headline and a pill -- and the figures under them, which
 * are what export actually writes (see `useStudio.ts` and editor/framing.tsx).
 */
const CARDS = [
  {
    overline: "Stills",
    title: "Screenshots, ready for the App Store.",
    copy: "Every App Store screenshot size is built in.",
    shots: ["ship-app-store", "ship-1x1"],
    ground: "bg-surface-warm",
  },
  {
    overline: "Video",
    title: "Clips for launches, feeds and decks.",
    copy: "16:9 for the site, 9:16 for stories.",
    shots: ["ship-9x16", "ship-16x9"],
    ground: "bg-surface-studio",
  },
];

export function MadeToShip() {
  return (
    <section className="bg-white ds-page-gutter py-[var(--spacing-section)]">
      <Statement first="Made to ship." second="Export. Share. Done." />

      <div className="layout-media mt-[var(--space-48)] grid grid-cols-1 gap-[var(--space-24)] laptop:grid-cols-2">
        {CARDS.map((card, i) => (
          <Reveal key={card.title} delay={i * 0.08} className={`flex flex-col overflow-hidden rounded-[40px] ${card.ground}`}>
            <div className="flex flex-col items-center gap-[var(--space-12)] px-[var(--space-32)] pt-[var(--space-48)] text-center">
              <Overline>{card.overline}</Overline>
              <h3 className="type-headline max-w-[420px] text-text-primary-dark">{card.title}</h3>
              <p className="type-copy text-text-secondary-dark">
                <B>{card.copy}</B>
              </p>
              <div className="mt-[var(--space-8)] flex">
                <Cta href={STUDIO} icon={null}>
                  Export yours
                </Cta>
              </div>
            </div>
            <div className="mt-auto flex items-end justify-center gap-[var(--space-16)] px-[var(--space-32)] pt-[var(--space-48)]">
              {card.shots.map((id) => (
                <div key={id} className="relative h-[clamp(200px,22vw,300px)] shrink-0 overflow-hidden rounded-t-[var(--radius-lg)]" style={{ aspectRatio: id.includes("16x9") ? "16/9" : id.includes("1x1") ? "1" : id.includes("9x16") ? "9/16" : "430/932" }}>
                  <Image unoptimized src={shotSrc(id)} alt="" fill sizes="300px" className="object-cover" />
                </div>
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      <Specs
        className="layout-media mt-[var(--space-48)]"
        items={[
          { pre: "Up to", figure: "4×", label: "PNG export resolution" },
          { pre: "Up to", figure: "60 fps", label: "MP4 video" },
          { figure: "1290 × 2796", label: "App Store screenshot size, built in" },
        ]}
      />
    </section>
  );
}
