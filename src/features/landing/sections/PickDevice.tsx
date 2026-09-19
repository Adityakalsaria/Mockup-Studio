"use client";

import Image from "next/image";
import { useState } from "react";
import { getDevice } from "@/features/mockup-studio/devices";
import { finishesFor } from "@/features/mockup-studio/finishes";
import { GalleryHead, Reveal, Section } from "../Chapter";
import { Cta } from "../Cta";
import { pickId, shotSrc, TILE_DEVICES } from "../shots";
import { STUDIO } from "./Nav";

const ICON: Record<string, string> = {
  "apple-iphone-duo-web": "iphone",
  "apple-iphone-17-pro": "iphone",
  "apple-iphone-air": "iphone",
  "apple-macbook-pro-14": "laptop",
};

/** "Pick your device." Product tiles with finish swatches, each a real render. */
export function PickDevice() {
  return (
    <Section id="devices" className="bg-white">
      <GalleryHead title="Keep exploring Apple devices." link={{ href: STUDIO, label: "Open the studio" }} />
      <div className="layout-media mt-[var(--space-40)] grid grid-cols-1 gap-[var(--space-16)] tablet:grid-cols-2 laptop:grid-cols-4">
        {TILE_DEVICES.map(({ deviceId }, i) => (
          <Reveal key={deviceId} delay={i * 0.06}>
            <Tile deviceId={deviceId} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Tile({ deviceId }: { deviceId: string }) {
  const device = getDevice(deviceId);
  const finishes = finishesFor(device.finishIds);
  const [finishId, setFinishId] = useState(finishes[0].id);
  const finish = finishes.find((f) => f.id === finishId) ?? finishes[0];

  return (
    <article className="flex h-full flex-col items-center rounded-[28px] bg-surface-studio px-[var(--space-24)] pb-[var(--space-32)] text-center">
      <div className="relative aspect-square w-full">
        {finishes.map((f) => (
          <Image
            unoptimized
            key={f.id}
            src={shotSrc(pickId(deviceId, f.id))}
            alt={f.id === finish.id ? `${device.label} in ${f.label}` : ""}
            fill
            sizes="(min-width: 1000px) 25vw, (min-width: 480px) 50vw, 90vw"
            className="object-contain transition-opacity duration-[var(--duration-normal)]"
            style={{ opacity: f.id === finish.id ? 1 : 0 }}
          />
        ))}
      </div>
      <div className="flex gap-[var(--space-8)]" role="radiogroup" aria-label={`${device.label} finish`}>
        {finishes.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={f.id === finish.id}
            aria-label={f.label}
            onClick={() => setFinishId(f.id)}
            className="grid h-[22px] w-[22px] place-items-center rounded-full"
            style={{ boxShadow: f.id === finish.id ? "0 0 0 1.5px var(--color-text-primary-dark)" : "none" }}
          >
            <span className="block h-[16px] w-[16px] rounded-full" style={{ background: f.color, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.1)" }} />
          </button>
        ))}
      </div>
      <h3 className="type-tile mt-[var(--space-24)] text-text-primary-dark">{device.label.replace(/^Apple /, "")}</h3>
      <p className="type-copy mt-[var(--space-8)] text-text-secondary-dark">
        {finish.label} · {finishes.length} finishes
      </p>
      <div className="mt-auto pt-[var(--space-24)]">
        <Cta href={STUDIO} icon={ICON[deviceId]}>
          Start creating
        </Cta>
      </div>
    </article>
  );
}
