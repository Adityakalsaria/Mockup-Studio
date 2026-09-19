"use client";

import { DEVICES } from "@/features/mockup-studio/devices";
import { LIGHTING_PRESETS } from "@/features/mockup-studio/lighting";
import { GalleryHead, Section } from "../Chapter";

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

/** "Questions? Answers." Native disclosure elements, so it works without script. */
export function Faq() {
  return (
    <Section id="faq" className="bg-surface-studio">
      <GalleryHead title="Questions? Answers." />
      <div className="layout-media mt-[var(--space-40)] border-t border-black/10">
        {QUESTIONS.map(({ q, a }) => (
          <details key={q} className="group border-b border-black/10">
            <summary className="type-tile flex cursor-pointer list-none items-center justify-between gap-[var(--space-24)] py-[var(--space-24)] text-text-primary-dark [&::-webkit-details-marker]:hidden">
              {q}
              <span aria-hidden className="text-text-muted-dark transition-transform duration-[var(--duration-normal)] group-open:rotate-45">
                <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
            </summary>
            <p className="type-copy max-w-[720px] pb-[var(--space-32)] text-text-secondary-dark">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
