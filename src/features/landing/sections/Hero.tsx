import Image from "next/image";
import { COLUMN } from "../parts";

/**
 * The first fold, as the design sets it: the line, a lead, and the Studio
 * Display tilted back with the studio's UI on its screen -- one still, no
 * motion.
 */
export function Hero() {
  return (
    <section id="top" className={`${COLUMN} flex flex-col items-center gap-8`}>
      <div className="flex flex-col items-center gap-3 mix-blend-multiply">
        <h1 className="text-center text-[44px] font-bold leading-[1.1] tracking-[-2px] text-[#38393e] laptop:text-[72px] laptop:leading-[79.2px]">
          Where craft
          <br />
          meets the motion.
        </h1>
        <p className="max-w-[620px] text-center text-[18px] leading-[1.36] tracking-[-0.2px] text-[rgba(40,34,40,0.65)] laptop:text-[20px] laptop:leading-[27.2px]">
          A studio for beautiful Apple mockups. Put your design on a real device, set the scene, and export a still or a video.
        </p>
      </div>
      <div className="relative aspect-[986/560] w-full">
        <Image
          src="/landing/figma/hero-display.webp"
          alt="The Mocraft studio on a Studio Display tilted back, its panels open over a foldable phone"
          fill
          priority
          sizes="986px"
          className="pointer-events-none object-cover"
        />
      </div>
    </section>
  );
}
