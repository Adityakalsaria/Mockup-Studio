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
          <Tile shot="gal-mac-corner" alt="The Mocraft studio on a MacBook Pro 14, framed close on the keyboard and the screen" className="h-[320px] laptop:h-full" />
          <Tile shot="gal-mac-front" alt="The Mocraft studio open on a MacBook Pro 14" className="h-[320px] laptop:h-full" />
        </div>
        <div className="grid grid-cols-3 gap-[24px] max-laptop:h-[260px] laptop:h-[446px] laptop:grid-cols-[305fr_297fr_337fr]">
          <Tile shot="gal-phone-front" alt="A fintech app on an iPhone 17 Pro in Deep Blue, straight on" className="h-full" />
          <Tile shot="gal-phone-tilt" alt="A trading app on an iPhone 17 Pro in Cosmic Orange, tilted, on black" className="h-full" />
          <Tile shot="gal-phone-air" alt="A card app on an iPhone Air in Sky Blue" className="h-full" />
        </div>
        <Tile shot="gal-display" alt="The Mocraft studio on a Studio Display tilted back, on black" className="h-[260px] laptop:h-[448px]" />
      </div>
    </section>
  );
}
