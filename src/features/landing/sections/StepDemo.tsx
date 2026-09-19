"use client";

import { B, Opener } from "../Chapter";
import { DOTS, FloatCard, GlassPill } from "../parts";

/* One device, one design, three steps -- every still is the same iPhone 17 Pro. */
const STEPS = [
  {
    n: 1,
    title: "Drop your design",
    copy: "A screenshot, an export or a screen recording, straight onto the device's screen.",
    shot: "hl-front",
    alt: "A design on an iPhone 17 Pro",
    pill: "screen.png · fitted",
    icon: "add-image",
    fit: "cover",
  },
  {
    n: 2,
    title: "Set the scene",
    copy: "Turn it, light it, pick the lens and the ground it stands on.",
    shot: "hl-dof",
    alt: "The iPhone 17 Pro turned, lit and set against a warm gradient",
    pill: "Depth of field on",
    icon: "depth-of-field",
    fit: "cover",
  },
  {
    n: 3,
    title: "Export it",
    copy: "A PNG up to 4× or an MP4 at 30 or 60 fps, at the size you post at.",
    shot: "apple-17pro-pair",
    alt: "The finished iPhone 17 Pro shot, back and front",
    pill: "PNG · 4×",
    icon: "image",
    fit: "cover",
  },
] as const;

/**
 * "How it works" for a single device: three tiles, one per step, each a real
 * render of the same phone, each with the frosted pill the studio would show.
 */
export function StepDemo() {
  return (
    <section id="steps" className="bg-white ds-page-gutter pb-[var(--spacing-section)]">
      <Opener eyebrow="Step by step" title={"From a flat screenshot\nto a shot worth posting."}>
        Follow one design onto one <B>iPhone 17 Pro</B>, in three steps.
      </Opener>

      <div className={`layout-media mt-[var(--space-56)] rounded-[32px] p-[var(--space-24)] ring-1 ring-black/5 laptop:p-[var(--space-40)] ${DOTS}`}>
        <ol className="grid grid-cols-1 gap-[var(--space-40)] laptop:grid-cols-3 laptop:gap-[var(--space-24)]">
          {STEPS.map((s, i) => (
            <li key={s.n} className={`flex flex-col gap-[var(--space-20)] ${i === 1 ? "laptop:mt-[var(--space-48)]" : ""}`}>
              <div className="relative">
                <FloatCard shot={s.shot} alt={s.alt} fit={s.fit} className="aspect-[4/5] w-full" />
                <span className="type-caption absolute left-[var(--space-16)] top-[var(--space-16)] z-[3] grid h-[28px] w-[28px] place-items-center rounded-full bg-black/40 font-semibold text-white backdrop-blur-md">
                  {s.n}
                </span>
                <GlassPill icon={s.icon} className="absolute -bottom-[17px] left-1/2 z-[3] -translate-x-1/2">
                  {s.pill}
                </GlassPill>
              </div>
              <div className="pt-[var(--space-16)]">
                <h3 className="type-tile text-text-primary-dark">{s.title}</h3>
                <p className="type-copy mt-[var(--space-8)] text-text-secondary-dark">{s.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
