"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DEVICES } from "@/features/mockup-studio/devices";
import { COLUMN } from "../parts";
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

const ICON_SPRING = { type: "spring", mass: 0.5, damping: 20, stiffness: 220 } as const;
const PANEL_SPRING = { type: "spring", mass: 0.2, damping: 18, stiffness: 280 } as const;
const FADE_SPRING = { type: "spring", mass: 0.5, damping: 18, stiffness: 200 } as const;

/** The plus that becomes a minus: the upright bar shrinks away as it turns, the flat one turns a half. */
function Plus({ open, reduced }: { open: boolean; reduced: boolean }) {
  const spring = reduced ? { duration: 0 } : ICON_SPRING;
  const bar = { transformBox: "fill-box", transformOrigin: "center" } as const;
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <motion.path d="M4 10h12" style={bar} animate={{ rotate: open ? 180 : 0 }} transition={spring} />
      <motion.path d="M10 4v12" style={bar} animate={{ scale: open ? 0 : 1, rotate: open ? 80 : 0 }} transition={spring} />
    </svg>
  );
}

/**
 * One question. The height opens on a quick, slightly bouncy spring; the
 * answer fades in a tenth of a second later so it does not show through a
 * panel that is still too small for it, and fades straight out on the way
 * back. The closed panel is inert, so its text is out of the tab order.
 */
function Item({ q, a, reduced }: { q: string; a: string; reduced: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="relative" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={() => setOpen((was) => !was)}
          className="flex w-full cursor-pointer items-center justify-between gap-6 px-4 pb-[14px] pt-6 text-left text-[18px] font-medium leading-[24.3px] tracking-[-0.33px] text-[#221d1d] outline-none focus-visible:rounded-[16px] focus-visible:ring-2 focus-visible:ring-[#9898ff]"
        >
          <span itemProp="name">{q}</span>
          <span className="shrink-0 text-[#8f8e8e]">
            <Plus open={open} reduced={reduced} />
          </span>
        </button>
      </h3>
      <motion.div
        id={`${id}-a`}
        role="region"
        aria-labelledby={`${id}-q`}
        className="overflow-hidden"
        initial={false}
        animate={{ height: open ? "auto" : 0 }}
        transition={reduced ? { duration: 0 } : PANEL_SPRING}
        inert={!open}
        itemScope
        itemProp="acceptedAnswer"
        itemType="https://schema.org/Answer"
      >
        <motion.p
          className="max-w-[560px] px-4 pb-6 text-[16px] leading-[1.5] tracking-[-0.18px] text-[#636161]"
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { ...FADE_SPRING, delay: open ? 0.1 : 0 }}
          itemProp="text"
        >
          {a}
        </motion.p>
      </motion.div>
      <span aria-hidden className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-[rgba(34,29,29,0.05)]" />
    </div>
  );
}

/**
 * The FAQs, as the design sets them: the heading on the left, a 630px column of
 * questions on the right, each row ruled off by an inset hairline. Each row
 * opens on its own, and the answers are marked up as FAQ data for search.
 */
export function Faq() {
  const reduced = useReducedMotion() ?? false;
  return (
    <section id="faq" className={`${COLUMN} flex flex-wrap items-start gap-x-[72px] gap-y-8`} itemScope itemType="https://schema.org/FAQPage">
      <h2 className="min-w-[178px] text-[32px] font-semibold leading-[1.2] tracking-[-1.2px] text-[#282228] laptop:text-[40px] laptop:leading-[48px]">FAQs</h2>
      <div className="w-full min-[1040px]:ml-auto min-[1040px]:w-[630px]">
        {QUESTIONS.map(({ q, a }) => (
          <Item key={q} q={q} a={a} reduced={reduced} />
        ))}
      </div>
    </section>
  );
}
