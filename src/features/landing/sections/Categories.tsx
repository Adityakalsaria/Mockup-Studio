"use client";

import Image from "next/image";
import { Button, ChevronIcon, Glyph } from "@/design/ui";
import { Reveal } from "../Chapter";
import { shotSrc } from "../shots";
import { STUDIO } from "./Nav";

/*
 * Three columns, a mockup library's front page: a heading that links on, one
 * wide tile and two small ones under it. Every tile is a studio render.
 */
const COLUMNS = [
  { title: "iPhone", tiles: [{ id: "mu-iphone-diag", alt: "iPhone 17 Pro in Silver" }, { id: "mu-iphone-flat", alt: "iPhone 17 Pro in Deep Blue" }, { id: "mu-iphone-dark", alt: "iPhone Air in Space Black" }] },
  { title: "Mac", tiles: [{ id: "mu-mac-fly", alt: "MacBook Pro 14 in Silver" }, { id: "mu-mac-dark", alt: "MacBook Pro 14 in Space Black" }, { id: "mu-neo-lime", alt: "MacBook in Silver" }] },
  { title: "iPad and iMac", tiles: [{ id: "mu-ipad-diag", alt: "iPad Pro in Silver" }, { id: "mu-imac-orange", alt: "iMac 24 in Silver" }, { id: "mu-imac-lime", alt: "iMac 24 in Blue" }] },
];

export function Categories() {
  return (
    <section className="bg-white ds-page-gutter pt-[var(--space-64)] pb-[var(--spacing-section)]">
      <div className="layout-media border-t border-black/10 pt-[var(--space-40)]">
        <div className="grid grid-cols-1 gap-[var(--space-24)] tablet:grid-cols-3">
          {COLUMNS.map((col, c) => (
            <Reveal key={col.title} delay={c * 0.06}>
              <a href={STUDIO} className="type-copy inline-flex items-center gap-[var(--space-4)] font-semibold text-text-primary-dark">
                {col.title}
                <span className="text-text-muted-dark">
                  <ChevronIcon />
                </span>
              </a>
              <div className="mt-[var(--space-12)] grid grid-cols-2 gap-[var(--space-8)]">
                {col.tiles.map((t, i) => (
                  <div key={t.id} className={`group relative overflow-hidden rounded-[var(--radius-md)] ${i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"}`}>
                    <Image
                      unoptimized
                      src={shotSrc(t.id)}
                      alt={t.alt}
                      fill
                      sizes="(min-width: 480px) 33vw, 90vw"
                      className="object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.04]"
                    />
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-[var(--space-24)]">
          <Button flat href={STUDIO} width="100%" height={72}>
            <span className="type-tile flex items-center gap-[var(--space-8)]">
              Open the studio
              <Glyph muted>
                <ChevronIcon />
              </Glyph>
            </span>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
