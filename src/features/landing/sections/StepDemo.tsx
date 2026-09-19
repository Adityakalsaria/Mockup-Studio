import Image from "next/image";
import { shotSrc } from "../shots";
import { COLUMN, SectionHead } from "../parts";

/* One design, one iPhone 17 Pro, three steps. */
const STEPS = [
  { title: "Drop your design", copy: "A screenshot, an export or a screen recording, straight onto the device's screen.", shot: "hl-front", alt: "A design on an iPhone 17 Pro" },
  { title: "Set the scene", copy: "Turn it, light it, pick the lens and the ground it stands on.", shot: "hl-dof", alt: "The iPhone 17 Pro turned and lit against a warm gradient" },
  { title: "Export it", copy: "A PNG up to 4× or an MP4 at 30 or 60 fps, at the size you post at.", shot: "apple-17pro-pair", alt: "The finished shot, back and front" },
] as const;

/**
 * Step by step: the heading held in place on the left while the three cards
 * scroll past on the right.
 */
export function StepDemo() {
  return (
    <section id="steps" className={`${COLUMN} flex gap-[56px] max-laptop:flex-col`}>
      <div className="min-w-0 flex-1 self-start laptop:sticky laptop:top-[120px]">
        <SectionHead eyebrow="Step by step" title="From a flat screenshot to a shot worth posting." />
      </div>
      <div className="flex w-[465px] max-w-full flex-col gap-[80px]">
        {STEPS.map((s) => (
          <div key={s.title} className="flex flex-col gap-[24px]">
            <div className="relative h-[400px] w-full overflow-clip rounded-[24px] bg-black/[0.02]">
              <Image unoptimized src={shotSrc(s.shot)} alt={s.alt} fill sizes="465px" className="object-cover" />
            </div>
            <div>
              <p className="text-[16px] font-medium leading-[21.76px] tracking-[-0.16px] text-[#282228]">{s.title}</p>
              <p className="mt-[7px] max-w-[314px] text-[16px] leading-[21.76px] tracking-[-0.16px] text-[rgba(40,34,40,0.65)]">{s.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
