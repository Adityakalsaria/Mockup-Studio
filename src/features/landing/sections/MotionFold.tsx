"use client";

import Image from "next/image";
import { Button, Glass, Glyph, Header, ParamRow } from "@/design/ui";
import { DOTS, GlassPill, Ic, SectionHead } from "../parts";
import { shotSrc } from "../shots";

const noop = () => {};

/** A numbered box on the preview well, the way the studio marks a focus point. */
function Point({ n, className }: { n: number; className: string }) {
  return (
    <span className={`absolute rounded-[3px] border border-[#4f86f7] bg-[#4f86f7]/15 ${className}`}>
      <span className="absolute -left-[10px] -top-[10px] grid h-[20px] w-[20px] place-items-center rounded-full bg-[#4f86f7] text-[11px] font-semibold text-white">{n}</span>
    </span>
  );
}

/**
 * The Motion fold: the design's grey band, the heading, and one large rounded
 * picture -- here the Focus points popup at its real size over a soft ground,
 * with frosted verbs around it.
 */
export function MotionFold() {
  return (
    <section id="motion" className="flex w-full justify-center bg-[#fbfbfb] px-5 py-[100px] min-[1040px]:px-12">
      <div className="flex w-[986px] max-w-full flex-col gap-[56px]">
        <SectionHead eyebrow="Motion" title="Aim the camera. Let it move itself.">
          Mark where the camera should look with focus points. Mocraft moves to each one, and the rest of Motion is there to refine it.
        </SectionHead>

        <div className={`relative aspect-[920/676] w-full overflow-hidden rounded-[32px] ring-1 ring-black/5 max-laptop:aspect-[4/5] ${DOTS}`}>
          <Image unoptimized src={shotSrc("mu-mac-fly")} alt="" fill sizes="986px" className="scale-110 object-cover opacity-70 blur-[28px]" aria-hidden />
          <div className="absolute inset-0 bg-white/40" />

          <div className="absolute inset-0 grid place-items-center">
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
      </div>
    </section>
  );
}
