"use client";

import { DEVICES } from "@/features/mockup-studio/devices";
import { LIGHTING_PRESETS } from "@/features/mockup-studio/lighting";

const deviceNames = DEVICES.filter((d) => d.label.startsWith("Apple ")).map((d) => d.label.replace(/^Apple /, ""));

/* Every answer describes the studio as it is -- checked against its code. */
const QUESTIONS = [
  {
    q: "Which devices can I use?",
    a: `${deviceNames.join(", ")}. Each comes in its real finishes, and there is a flat image card for anything that isn't a device.`,
  },
  {
    q: "What can I put on the screen?",
    a: "An image or a video. Drop in a screenshot, a design export or a screen recording and it's fitted to the display.",
  },
  {
    q: "Can I animate a mockup?",
    a: "Yes. Pick a motion preset, or key your own moves on the timeline and choose how each one eases. Play it back, loop it, then export it as a video.",
  },
  {
    q: "What does it export?",
    a: "A PNG at up to 4× resolution, or an MP4 at 30 or 60 fps. Canvas sizes include 16:9, 9:16, 1:1, 4:3, 3:4 and the App Store screenshot sizes.",
  },
  {
    q: "How much control do I get over the look?",
    a: `Position, rotation and scale on every axis, focal length, ${LIGHTING_PRESETS.length} lighting presets, depth of field, and a solid, gradient, dotted or image background.`,
  },
  {
    q: "Do I need an account?",
    a: "Yes. Sign in to open the studio, and you'll come straight back to it next time.",
  },
];

/**
 * "Questions? Answers." in two columns, the heading on the left and the list on
 * the right, each question ruled off by a hairline. Native disclosure elements,
 * so it works without script; the springs come with the interaction pass.
 */
export function Faq() {
  return (
    <section id="faq" className="bg-white ds-page-gutter py-[var(--spacing-section)]">
      <div className="layout-product flex flex-col gap-[var(--space-32)] laptop:flex-row laptop:items-start laptop:justify-between laptop:gap-[4.5rem]">
        <h2 className="type-headline whitespace-pre-line text-text-primary-dark laptop:min-w-[11rem]">{"Questions?\nAnswers."}</h2>
        <div className="w-full laptop:w-[630px] laptop:max-w-full">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="group border-b border-black/[0.06] first:border-t">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-[var(--space-24)] py-[var(--space-20)] text-[18px] font-[450] leading-[1.35] tracking-[-0.33px] text-text-primary-dark [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="shrink-0 text-[#8075ff] transition-transform duration-[var(--duration-normal)] ease-[var(--ease-swift)] group-open:rotate-45">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-[560px] pb-[var(--space-24)] text-[16px] leading-[1.5] tracking-[-0.18px] text-text-secondary-dark">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
