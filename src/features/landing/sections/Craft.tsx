import Image from "next/image";
import { shotSrc } from "../shots";
import { COLUMN, SectionHead } from "../parts";

const CARDS = [
  {
    title: "Crafting",
    copy: "Position, rotation and scale on every axis, focal length, lighting, depth of field, a shadow and a background behind it.",
    shot: "apple-17pro-pair",
    alt: "An iPhone 17 Pro, from the back and the front",
    fit: "object-contain p-6",
  },
  {
    title: "Motion",
    copy: "Start from a preset or key your own moves, aim the camera with focus points, and export the clip as an MP4.",
    shot: "mu-mac-fly",
    alt: "A MacBook flying in over periwinkle",
    fit: "object-cover",
  },
] as const;

/** One studio, two halves: two cards, one for each, with a caption under each. */
export function Craft() {
  return (
    <section id="craft" className={`${COLUMN} flex flex-col gap-[56px]`}>
      <SectionHead eyebrow="One studio, two halves" title="Craft the shot. Then set it in motion.">
        Crafting frames the device, the light and the lens. Motion keys it over time and exports a clip.
      </SectionHead>
      <div className="flex gap-[24px] max-laptop:flex-col">
        {CARDS.map((c) => (
          <div key={c.title} className="flex min-w-0 flex-1 flex-col gap-[23px]">
            <div className="relative h-[304px] w-full overflow-clip rounded-[24px] bg-black/[0.02]">
              <Image unoptimized src={shotSrc(c.shot)} alt={c.alt} fill sizes="(min-width: 1040px) 481px, 90vw" className={c.fit} />
            </div>
            <div className="flex flex-col gap-[6.8px]">
              <p className="text-[16px] font-semibold leading-[21.76px] tracking-[-0.13px] text-[#282228]">{c.title}</p>
              <p className="max-w-[323px] text-[16px] leading-[21.76px] tracking-[-0.13px] text-[rgba(40,34,40,0.65)]">{c.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
