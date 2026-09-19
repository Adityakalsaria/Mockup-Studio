"use client";

import { useEffect, useState } from "react";
import { Glass, Segmented } from "@/design/ui";
import { getMotionPreset } from "@/features/mockup-studio/editor/motionPresets";
import { B, Overline, Reveal } from "../Chapter";
import { Cta } from "../Cta";
import { LiveDevice, SCREENS, useNear, usePrefersReducedMotion } from "../LiveDevice";
import { STUDIO } from "./Nav";

/* The three presets the Mocraft studio offers, in its order. */
const PRESETS = ["reward-pop", "slide-up", "rotation-slide-up"] as const;
type PresetId = (typeof PRESETS)[number];
const HOLD_MS = 4200;

/**
 * Motion, as one big black card: the words and a pill on the left, the real
 * renderer on the right playing the studio's presets one after another, and a
 * switch under the words carrying each preset's own description.
 */
export function BringItToLife() {
  const [ref, near] = useNear<HTMLElement>("0px");
  const reduced = usePrefersReducedMotion();
  const [preset, setPreset] = useState<PresetId>(PRESETS[0]);

  useEffect(() => {
    if (!near || reduced) return;
    const timer = window.setInterval(() => setPreset((p) => PRESETS[(PRESETS.indexOf(p) + 1) % PRESETS.length]), HOLD_MS);
    return () => window.clearInterval(timer);
  }, [near, reduced, preset]);

  const current = getMotionPreset(preset);

  return (
    <section ref={ref} className="bg-white ds-page-gutter py-[var(--spacing-section)]">
      <Reveal className="layout-media overflow-hidden rounded-[40px] bg-black">
        <div className="grid grid-cols-1 laptop:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col justify-center gap-[var(--space-24)] p-[var(--space-32)] tablet:p-[var(--space-64)]">
            <Overline dark>Motion</Overline>
            <h2 className="type-section text-text-primary">
              Bring it to life.
              <br />
              <span className="text-text-muted">In one click.</span>
            </h2>
            <p className="type-lead text-text-secondary">
              Pick a preset and the device <B dark>moves on a real timeline</B>. Key your own moves, choose how each one
              eases, then export the clip as an <B dark>MP4</B>.
            </p>
            <div>
              <Glass width={400}>
                <Segmented
                  options={PRESETS.map((id) => ({ id, label: getMotionPreset(id)?.label ?? id }))}
                  value={preset}
                  onChange={setPreset}
                  width={384}
                />
              </Glass>
              <p className="type-copy mt-[var(--space-12)] max-w-[400px] text-text-secondary">
                <B dark>{current?.label}.</B> {current?.hint}.
              </p>
            </div>
            <div className="flex">
              <Cta href={STUDIO} dark>Start creating</Cta>
            </div>
          </div>

          <div className="relative h-[min(72svh,720px)]">
            <LiveDevice
              className="absolute inset-0"
              deviceId="apple-iphone-17-pro"
              finishId="deep-blue"
              screen={`${SCREENS}/dark-5.png`}
              lighting="product"
              preset={preset}
              pose={{ zoom: 1.0, yAxis: 180 }}
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
