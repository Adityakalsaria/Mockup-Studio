"use client";

import Image from "next/image";
import { Button, Glass, Glyph, Header, ParamRow } from "@/design/ui";
import { MOTION_PRESETS } from "@/features/mockup-studio/editor/motionPresets";
import { B, Opener } from "../Chapter";
import { DOTS, GlassPill, Ic } from "../parts";
import { shotSrc } from "../shots";

const noop = () => {};

/** A numbered box on the preview well, the way the studio marks a focus point. */
function Point({ n, className }: { n: number; className: string }) {
  return (
    <span className={`absolute rounded-[3px] border border-[#4f86f7] bg-[#4f86f7]/15 ${className}`}>
      <span className="type-caption absolute -left-[10px] -top-[10px] grid h-[20px] w-[20px] place-items-center rounded-full bg-[#4f86f7] text-[11px] font-semibold text-white">{n}</span>
    </span>
  );
}

const ABILITIES = [
  { icon: "focus-point", title: "Focus points", copy: "Mark spots on the shot and the camera moves to them for you." },
  { icon: "styles", title: `${MOTION_PRESETS.length} presets`, copy: "Entrances, moves, loops and cuts, each landing on your framing." },
  { icon: "repeat", title: "Keys and easing", copy: "Key any move on the timeline and choose how each one eases." },
  { icon: "play", title: "MP4 export", copy: "Play it back, loop it, then export at 30 or 60 fps." },
] as const;

/**
 * The Motion tab, with its best idea in front: the Focus points popup at its
 * real size over a soft ground, frosted verbs around it, and the four things
 * Motion does underneath.
 */
export function MotionFold() {
  return (
    <section id="motion" className="bg-[#fafafa] ds-page-gutter py-[var(--spacing-section)]">
      <Opener eyebrow="Motion" title={"Aim the camera.\nLet it move itself."}>
        Mark where the camera should look with <B>focus points</B>. Mocraft moves to each one, and the rest of <B>Motion</B> is there to refine it.
      </Opener>

      <div className={`layout-media relative mt-[var(--space-56)] overflow-hidden rounded-[32px] ring-1 ring-black/5 ${DOTS}`}>
        <Image unoptimized src={shotSrc("mu-mac-fly")} alt="" fill sizes="1260px" className="scale-110 object-cover opacity-70 blur-[28px]" aria-hidden />
        <div className="absolute inset-0 bg-white/40" />

        <div className="relative grid min-h-[620px] place-items-center px-[var(--space-24)] py-[var(--space-64)]">
          <div className="relative">
            <Glass width={250}>
              <Header
                icon={
                  <Glyph>
                    <Ic name="focus-point" />
                  </Glyph>
                }
                closeIcon={<Ic name="close-rounded" />}
                onClose={noop}
              >
                Focus points
              </Header>
              <div className="mt-[var(--space-8)] px-[var(--space-8)]">
                <div className="relative h-[210px] overflow-hidden rounded-[16px] bg-white/70">
                  <Image unoptimized src={shotSrc("hl-front")} alt="An iPhone 17 Pro with two focus points marked on it" fill sizes="250px" className="object-contain" />
                  <Point n={1} className="left-[22%] top-[12%] h-[30%] w-[26%]" />
                  <Point n={2} className="left-[52%] top-[52%] h-[30%] w-[26%]" />
                </div>
              </div>
              <div className="mt-[var(--space-8)]">
                <ParamRow label="Zoom" value={1} min={0.5} max={2} onChange={noop} format={(n) => `${Math.round(n * 100)}%`} />
                <ParamRow label="Depth" value={0} min={0} max={1} onChange={noop} format={(n) => `${Math.round(n * 100)}%`} />
                <ParamRow label="Tilt" value={0.6} min={0} max={1} onChange={noop} format={(n) => `${Math.round(n * 100)}%`} />
              </div>
              <div className="mt-[var(--space-8)] flex gap-[var(--space-8)] px-[var(--space-8)] pb-[var(--space-8)]">
                <Button grow>Compose</Button>
                <Button width={84}>Clear</Button>
              </div>
            </Glass>

            <GlassPill icon="play" className="absolute -right-[180px] top-[24px] hidden laptop:inline-flex">
              Play it back
            </GlassPill>
            <GlassPill icon="styles" className="absolute -right-[214px] top-[92px] hidden laptop:inline-flex">
              Start from a preset
            </GlassPill>
            <GlassPill icon="repeat" className="absolute -left-[168px] top-[150px] hidden laptop:inline-flex">
              Loop the clip
            </GlassPill>
            <GlassPill icon="image" className="absolute -left-[196px] top-[220px] hidden laptop:inline-flex">
              Export an MP4
            </GlassPill>
          </div>
        </div>
      </div>

      <ul className="layout-media mt-[var(--space-40)] grid grid-cols-1 gap-[var(--space-32)] tablet:grid-cols-2 laptop:grid-cols-4">
        {ABILITIES.map((a) => (
          <li key={a.title} className="border-t border-black/10 pt-[var(--space-16)]">
            <span className="mb-[var(--space-12)] grid h-[36px] w-[36px] place-items-center rounded-full bg-black/5">
              <Ic name={a.icon} />
            </span>
            <h3 className="type-tile text-text-primary-dark">{a.title}</h3>
            <p className="type-copy mt-[var(--space-4)] text-text-secondary-dark">{a.copy}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
