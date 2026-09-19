"use client";

import Image from "next/image";
import { B, Opener } from "../Chapter";
import { DOTS, GlassPill } from "../parts";
import { shotSrc } from "../shots";

type Tile = { shot: string; alt: string; span: string; pill?: string; icon?: string };

/*
 * A four-column bento: 9 tiles, no holes.
 *   row 1-2:  [ A  A ] [ B ] [ C ]      row 3:  [ E  E ] [ F ] [ G ]
 *             [ A  A ] [ B ] [ D ]      row 4:  [ H  H ] [ I  I ]
 * Every tile is a render from the studio; the pill names how it was made.
 */
const TILES: Tile[] = [
  { shot: "mu-imac-lime", alt: "A design on an iMac against lime", span: "col-span-2 row-span-2", pill: "16:9 · PNG 4×", icon: "image" },
  { shot: "mu-iphone-flat", alt: "A design on an iPhone, laid flat", span: "row-span-2", pill: "9:16 · MP4 60 fps", icon: "play" },
  { shot: "sc-air-gold", alt: "An iPhone Air in Light Gold on peach", span: "", pill: "iPhone Air", icon: "iphone" },
  { shot: "tile-gradient", alt: "An iPhone on a blue gradient", span: "", pill: "Gradient", icon: "gradient" },
  { shot: "grid-ipad-blue", alt: "An iPad Pro on periwinkle", span: "col-span-2", pill: "iPad Pro", icon: "ipad-pro" },
  { shot: "grid-mbp-dark", alt: "A MacBook Pro 14 on black", span: "", pill: "MacBook Pro", icon: "macbook" },
  { shot: "sc-imac-pink", alt: "An iMac 24 in Pink on peach", span: "", pill: "Depth of field", icon: "depth-of-field" },
  { shot: "mu-mac-fly", alt: "A MacBook flying in over periwinkle", span: "col-span-2", pill: "Slide up · 3 s", icon: "styles" },
  { shot: "apple-17pro-finishes", alt: "iPhone 17 Pro in all five finishes", span: "col-span-2", pill: "5 finishes", icon: "background" },
];

/**
 * What comes out: a bento of stills the studio itself rendered, sized like the
 * assets on an artboard, each tagged with how it was made.
 */
export function Bento() {
  return (
    <section id="assets" className="bg-white ds-page-gutter py-[var(--spacing-section)]">
      <Opener eyebrow="Made in Mocraft" title={"Everything you generate,\nrendered by the studio."}>
        Stills up to <B>4×</B> and clips at <B>30 or 60 fps</B>, in the canvas sizes you post at. Every tile here came out of Mocraft.
      </Opener>

      <div className={`layout-media mt-[var(--space-56)] rounded-[32px] p-[var(--space-16)] ring-1 ring-black/5 laptop:p-[var(--space-24)] ${DOTS}`}>
        <div className="grid grid-cols-2 gap-[var(--space-16)] [grid-auto-rows:180px] laptop:grid-cols-4 laptop:[grid-auto-rows:230px]">
          {TILES.map((t) => (
            <figure key={t.shot} className={`relative overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.05),0_2px_6px_rgb(0_0_0/0.06),0_24px_40px_-18px_rgb(0_0_0/0.25)] ${t.span}`}>
              <Image unoptimized src={shotSrc(t.shot)} alt={t.alt} fill sizes="(min-width: 1260px) 600px, 50vw" className="object-cover" />
              {t.pill ? (
                <GlassPill icon={t.icon} className="absolute bottom-[var(--space-12)] left-[var(--space-12)]">
                  {t.pill}
                </GlassPill>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
