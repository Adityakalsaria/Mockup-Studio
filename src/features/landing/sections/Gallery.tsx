import Image from "next/image";
import { shotSrc } from "../shots";
import { COLUMN, SectionHead } from "../parts";

function Tile({ shot, alt, className = "" }: { shot: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] ${className}`}>
      <Image unoptimized src={shotSrc(shot)} alt={alt} fill sizes="(min-width: 1040px) 520px, 90vw" className="object-cover" />
    </div>
  );
}

/**
 * Mocraft in action: the design's six-picture gallery -- two across, three
 * across, one wide -- each a render the studio itself made.
 */
export function Gallery() {
  return (
    <section id="gallery" className={`${COLUMN} flex flex-col gap-[56px]`}>
      <SectionHead title="Mocraft in action">Craft makers recent creation crafted from the mocraft.app</SectionHead>
      <div className="flex flex-col gap-[24px]">
        <div className="grid gap-[24px] laptop:h-[448px] laptop:grid-cols-[448fr_513fr]">
          <Tile shot="mu-imac-lime" alt="A design on an iMac against lime" className="h-[320px] laptop:h-full" />
          <Tile shot="grid-ipad-blue" alt="An iPad Pro on periwinkle" className="h-[320px] laptop:h-full" />
        </div>
        <div className="grid grid-cols-3 gap-[24px] max-laptop:h-[260px] laptop:h-[446px] laptop:grid-cols-[305fr_297fr_337fr]">
          <Tile shot="mu-iphone-flat" alt="A design on an iPhone, laid flat" className="h-full border-4 border-[#efedff]" />
          <Tile shot="sc-air-gold" alt="An iPhone Air in Light Gold on peach" className="h-full" />
          <Tile shot="tile-gradient" alt="An iPhone on a blue gradient" className="h-full" />
        </div>
        <Tile shot="mu-mac-fly" alt="A MacBook flying in over periwinkle" className="h-[260px] laptop:h-[448px]" />
      </div>
    </section>
  );
}
