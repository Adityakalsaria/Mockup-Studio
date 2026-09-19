"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Divider, Glass, ParamGroup, ParamRow, Segmented, Swatch } from "@/design/ui";
import { backgroundCss, DEFAULT_BACKGROUND } from "@/features/mockup-studio/backgrounds";
import type { LightingId } from "@/features/mockup-studio/lighting";
import { B, Caption, GalleryHead, Opener, Reveal } from "../Chapter";
import { LiveDevice, SCREENS } from "../LiveDevice";
import { shotSrc } from "../shots";

type Look = { ground: string; lighting: LightingId; fov: number; zoom: number; y: number; finish: string; screen: string };

/* Colours from the studio's own BACKGROUND_PRESETS. */
const LOOKS: Look[] = [
  { ground: "#cdd8f5", lighting: "high-key", fov: 38, zoom: 0.84, y: 160, finish: "deep-blue", screen: "dark.png" },
  { ground: "#121214", lighting: "top", fov: 24, zoom: 0.62, y: 204, finish: "silver", screen: "dark-2.png" },
  { ground: "#f7d9c4", lighting: "studio", fov: 50, zoom: 0.76, y: 148, finish: "cosmic-orange", screen: "dark-4.png" },
  { ground: "#cfe3d4", lighting: "high-key", fov: 38, zoom: 0.9, y: 196, finish: "pro-sky-blue", screen: "confirm-payment.png" },
];

const LIGHTS: { id: LightingId; label: string }[] = [
  { id: "high-key", label: "High-key" },
  { id: "studio", label: "Studio" },
  { id: "top", label: "Top light" },
];

const TILES = [
  { id: "tile-gradient", title: "Gradients.", copy: "Two colours and an angle, behind any device." },
  { id: "tile-dots", title: "Dot grids.", copy: "Any colour, any spacing, for a designer's desk of a background." },
  { id: "tile-dof", title: "Depth of field.", copy: "Blur the frame and keep the focus where it counts." },
  { id: "tile-lens", title: "Focal length.", copy: "Go wide and dramatic, or long and flat." },
];

/**
 * A centred opener, the shot with the studio's own controls floating over its
 * corner -- cycling through looks until someone touches a control -- and a
 * gallery of one render per control, captioned the product-page way.
 */
export function SetTheScene() {
  const [look, setLook] = useState<Look>(LOOKS[0]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched) return;
    const timer = window.setInterval(() => {
      setLook((current) => LOOKS[(LOOKS.indexOf(current) + 1) % LOOKS.length] ?? LOOKS[0]);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [touched]);

  const edit = (patch: Partial<Look>) => {
    setTouched(true);
    setLook((current) => ({ ...current, ...patch }));
  };

  return (
    <section className="bg-surface-studio ds-page-gutter py-[var(--spacing-section)]">
      <Opener eyebrow="Scene" title={"Set the scene.\nMake it yours."}>
        Change the <B>background</B>, the <B>light</B> and the <B>lens</B>, and watch the shot change with you. Try the panel.
      </Opener>

      <Reveal className="layout-media relative mt-[var(--space-48)]">
        <div
          className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] tablet:aspect-[16/9]"
          style={{
            ...backgroundCss({ ...DEFAULT_BACKGROUND, kind: "solid", color: look.ground }),
            transition: "background var(--duration-slow) var(--ease-out)",
          }}
        >
          <LiveDevice
            className="h-full w-full"
            deviceId="apple-iphone-17-pro"
            finishId={look.finish}
            screen={`${SCREENS}/${look.screen}`}
            lighting={look.lighting}
            pose={{ zoom: look.zoom, yAxis: look.y, xAxis: 6, fov: look.fov }}
          />
        </div>

        <div className="relative z-[var(--z-above)] -mt-[var(--space-64)] flex justify-center tablet:absolute tablet:right-[var(--space-24)] tablet:top-[var(--space-24)] tablet:mt-0">
          <Glass>
            <ParamGroup title="Background">
              <Segmented
                options={LOOKS.map((l) => ({ id: l.ground, label: <Swatch color={l.ground} /> }))}
                value={look.ground}
                onChange={(ground) => edit({ ground })}
                width={234}
              />
            </ParamGroup>
            <Divider />
            <ParamGroup title="Lighting">
              <Segmented options={LIGHTS} value={look.lighting} onChange={(id) => edit({ lighting: id })} width={234} />
            </ParamGroup>
            <Divider />
            <ParamRow label="Zoom" value={look.zoom} min={0.4} max={1.2} step={0.01} onChange={(zoom) => edit({ zoom })} format={(n) => `${Math.round(n * 100)}%`} />
            <ParamRow label="Lens" value={look.fov} min={20} max={80} step={1} onChange={(fov) => edit({ fov })} format={(n) => `${Math.round(n)}°`} />
          </Glass>
        </div>
      </Reveal>

      <div className="mt-[var(--spacing-section)]">
        <GalleryHead title="Every control, one tap away." />
        <div className="layout-media mt-[var(--space-40)] grid grid-cols-1 gap-[var(--space-24)] tablet:grid-cols-2 laptop:grid-cols-4">
          {TILES.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.06}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
                <Image unoptimized src={shotSrc(t.id)} alt={t.title} fill sizes="(min-width: 1000px) 300px, 90vw" className="object-cover" />
              </div>
              <Caption lead={t.title}>{t.copy}</Caption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
