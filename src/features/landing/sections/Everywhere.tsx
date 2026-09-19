"use client";

import Image from "next/image";
import { Overline, Reveal } from "../Chapter";
import { Cta } from "../Cta";
import { shotSrc } from "../shots";
import { STUDIO } from "./Nav";

const REEL = ["mu-reel-1", "mu-reel-2", "mu-reel-3", "mu-reel-4", "mu-reel-5", "mu-reel-6", "mu-reel-7", "mu-reel-8"];

/**
 * A grey panel with a small-caps label, a headline and one pill, and a reel of
 * finished shots running under it. The reel is two copies of the same row
 * sliding by half its width, so it loops without a seam; reduced motion stops it.
 */
export function Everywhere() {
  return (
    <section className="bg-white ds-page-gutter py-[var(--spacing-section)]">
      <Reveal className="layout-media overflow-hidden rounded-[40px] bg-surface-studio pt-[var(--space-64)] pb-[var(--space-48)]">
        <div className="px-[var(--space-24)] tablet:px-[var(--space-48)]">
          <Overline>One design, every device</Overline>
          <h2 className="type-headline mt-[var(--space-12)] max-w-[520px] text-text-primary-dark">
            Drop your design once.
            <br />
            See it on all of them.
          </h2>
          <div className="mt-[var(--space-24)] flex">
            <Cta href={STUDIO} icon="add-image">
              Start creating
            </Cta>
          </div>
        </div>

        <div className="mt-[var(--space-48)] overflow-hidden">
          <div className="landing-reel flex w-max gap-[var(--space-16)]">
            {[...REEL, ...REEL].map((id, i) => (
              <div key={`${id}-${i}`} aria-hidden={i >= REEL.length} className="relative h-[clamp(200px,24vw,300px)] aspect-[4/5] shrink-0 overflow-hidden rounded-[var(--radius-lg)]">
                <Image unoptimized src={shotSrc(id)} alt="" fill sizes="300px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <style>{`
        @keyframes landing-reel { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .landing-reel { animation: landing-reel 60s linear infinite; }
        .landing-reel:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .landing-reel { animation: none; } }
      `}</style>
    </section>
  );
}
