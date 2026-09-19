"use client";

import Image from "next/image";
import { useState } from "react";
import { DEVICES, getDevice } from "@/features/mockup-studio/devices";
import { FINISHES, finishesFor } from "@/features/mockup-studio/finishes";
import { B, Opener, Reveal } from "../Chapter";
import { shotSrc, trioId } from "../shots";

const TRIO_DEVICE = "apple-iphone-17-pro";
const appleDevices = DEVICES.filter((d) => d.label.startsWith("Apple ")).length;

/**
 * The chapter that says what Mocraft is: a centred opener, the product-page
 * trio (back, front, angle), and the finish swatches that recolour all three --
 * each trio a real render, so the swatch never shows a colour the studio lacks.
 */
export function Studio() {
  const finishes = finishesFor(getDevice(TRIO_DEVICE).finishIds);
  const [finishId, setFinishId] = useState(finishes[0].id);
  const finish = finishes.find((f) => f.id === finishId) ?? finishes[0];

  return (
    <section className="overflow-hidden bg-white ds-page-gutter pt-[var(--spacing-section)] pb-[var(--space-64)]">
      <Opener eyebrow="Apple-first mockups" title={"A studio for beautiful\nApple mockups."}>
        Drop in a <B>screenshot or a screen recording</B>, put it on <B>{appleDevices} Apple devices</B> in{" "}
        <B>{FINISHES.length} real finishes</B>, then set the light, the lens and the motion. Export a <B>PNG</B> or an{" "}
        <B>MP4</B> when it looks right.
      </Opener>

      <Reveal className="layout-media relative mt-[var(--space-48)] aspect-[16/10] tablet:aspect-[16/9]">
        {finishes.map((f) => (
          <Image
            unoptimized
            key={f.id}
            src={shotSrc(trioId(f.id))}
            alt={f.id === finish.id ? `iPhone 17 Pro in ${f.label}, from the back, the front and an angle` : ""}
            fill
            sizes="(min-width: 1260px) 1260px, 100vw"
            className="object-cover transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out)]"
            style={{ opacity: f.id === finish.id ? 1 : 0 }}
            priority={f.id === finishes[0].id}
          />
        ))}
      </Reveal>

      <div className="flex flex-col items-center gap-[var(--space-8)]">
        <div className="flex gap-[var(--space-12)]" role="radiogroup" aria-label="Finish">
          {finishes.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === finish.id}
              aria-label={f.label}
              onClick={() => setFinishId(f.id)}
              className="grid h-[28px] w-[28px] place-items-center rounded-full"
              style={{ boxShadow: f.id === finish.id ? "0 0 0 1.5px var(--color-text-primary-dark)" : "none" }}
            >
              <span className="block h-[20px] w-[20px] rounded-full" style={{ background: f.color, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.12)" }} />
            </button>
          ))}
        </div>
        <p className="type-caption text-text-secondary-dark">{finish.label}</p>
      </div>
    </section>
  );
}
