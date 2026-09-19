"use client";

import { useCallback, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Button, ChevronIcon, Glyph, ParamRow, PlusIcon } from "@/design/ui";
import { GalleryHead, Reveal, EASE_OUT } from "../Chapter";
import { LiveDevice, SCREENS } from "../LiveDevice";

type Look = {
  id: string;
  label: string;
  copy: string;
  deviceId: string;
  finishId: string;
  screen: string;
  zoom: number;
  /** The studio's own degrees: 180 faces you. */
  y: number;
  x: number;
  lid?: number;
};

const LOOKS: Look[] = [
  { id: "fold", label: "Foldable design", copy: "iPhone Duo opens flat and folds shut. Drag the lid to set it anywhere in between.", deviceId: "apple-iphone-duo-web", finishId: "cloud-white", screen: "dark-9.png", zoom: 0.92, y: 156, x: 6, lid: 0 },
  { id: "front", label: "Front", copy: "Your screen, edge to edge, on the display it was designed for.", deviceId: "apple-iphone-17-pro", finishId: "deep-blue", screen: "dark.png", zoom: 1.2, y: 180, x: 0 },
  { id: "angle", label: "Angle", copy: "A three-quarter turn that gives the device depth and catches the light on the frame.", deviceId: "apple-iphone-17-pro", finishId: "silver", screen: "dark.png", zoom: 1.2, y: 145, x: 8 },
  { id: "side", label: "Side", copy: "iPhone Air on its edge. Thin enough that the profile tells the story.", deviceId: "apple-iphone-air", finishId: "sky-blue", screen: "dark-3.png", zoom: 1.2, y: 92, x: 0 },
  { id: "back", label: "Back", copy: "The camera plateau and the finish, in Cosmic Orange.", deviceId: "apple-iphone-17-pro", finishId: "cosmic-orange", screen: "dark.png", zoom: 1.2, y: 20, x: -4 },
  { id: "closed", label: "Closed", copy: "iPhone Duo folded shut, from behind.", deviceId: "apple-iphone-duo-web", finishId: "duo-night-sky", screen: "dark-9.png", zoom: 1.3, y: 24, x: -4, lid: 100 },
];

/** Same as the studio's drag: 0.4 degrees for every pixel. */
const DEG_PER_PX = 0.4;
const ease = { duration: 0.5, ease: EASE_OUT };

/**
 * "Take a closer look." A product page's viewer: a column of pills where the
 * one you pick opens into its description, arrows to step through them, and
 * the device on the right -- the studio's live renderer, which also turns
 * under a drag.
 */
export function CloserLook() {
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState({ x: 0, y: 0 });
  const [lid, setLid] = useState(0);
  const look = LOOKS[index];

  const pick = (i: number) => {
    const next = (i + LOOKS.length) % LOOKS.length;
    setIndex(next);
    setTurn({ x: 0, y: 0 });
    if (LOOKS[next].lid !== undefined) setLid(LOOKS[next].lid!);
  };

  // Stable, so the stage's pointer listener is not rebound mid-drag.
  const drag = useCallback(({ dx, dy }: { dx: number; dy: number }) => {
    setTurn((t) => ({ x: Math.max(-60, Math.min(60, t.x + dy * DEG_PER_PX)), y: t.y + dx * DEG_PER_PX }));
  }, []);

  return (
    <section id="closer-look" className="bg-surface-studio ds-page-gutter py-[var(--spacing-section)]">
      <GalleryHead title="Take a closer look." />

      <Reveal className="layout-media relative mt-[var(--space-40)] overflow-hidden rounded-[28px] bg-white">
        <div className="grid min-h-[min(84svh,800px)] grid-cols-1 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="order-2 flex items-center gap-[var(--space-24)] p-[var(--space-24)] laptop:order-1 laptop:pl-[var(--space-40)]">
            <div className="hidden flex-col gap-[var(--space-12)] laptop:flex">
              <Button flat width={44} height={44} title="Previous" onClick={() => pick(index - 1)}>
                <span className="block -rotate-90">
                  <Glyph>
                    <ChevronIcon />
                  </Glyph>
                </span>
              </Button>
              <Button flat width={44} height={44} title="Next" onClick={() => pick(index + 1)}>
                <span className="block rotate-90">
                  <Glyph>
                    <ChevronIcon />
                  </Glyph>
                </span>
              </Button>
            </div>

            <LayoutGroup>
              <ul className="flex flex-col items-start gap-[var(--space-12)]">
                {LOOKS.map((l, i) =>
                  i === index ? (
                    <motion.li
                      layout
                      key={l.id}
                      transition={ease}
                      className="max-w-[420px] rounded-[28px] bg-surface-studio p-[var(--space-24)]"
                    >
                      <motion.p layout="position" className="type-copy text-text-secondary-dark">
                        <strong className="font-semibold text-text-primary-dark">{l.label}.</strong> {l.copy}
                      </motion.p>
                      {l.lid !== undefined ? (
                        <div className="mt-[var(--space-12)]">
                          <ParamRow label="Lid" value={lid} min={0} max={100} step={1} onChange={setLid} format={(n) => `${Math.round(n)}%`} />
                        </div>
                      ) : null}
                    </motion.li>
                  ) : (
                    <motion.li layout key={l.id} transition={ease}>
                      <Button flat height={48} onClick={() => pick(i)}>
                        <span className="type-copy flex items-center gap-[var(--space-12)] pl-[var(--space-12)] pr-[var(--space-24)] font-semibold">
                          <Glyph>
                            <PlusIcon />
                          </Glyph>
                          {l.label}
                        </span>
                      </Button>
                    </motion.li>
                  ),
                )}
              </ul>
            </LayoutGroup>
          </div>

          <div className="relative order-1 h-[min(64svh,620px)] cursor-grab touch-pan-y active:cursor-grabbing laptop:order-2 laptop:h-auto">
            <LiveDevice
              className="absolute inset-0"
              deviceId={look.deviceId}
              finishId={look.finishId}
              screen={`${SCREENS}/${look.screen}`}
              lighting="studio"
              pose={{ yAxis: look.y + turn.y, xAxis: look.x + turn.x, zoom: look.zoom, fold: look.lid !== undefined ? lid : 0 }}
              onRotateDrag={drag}
            />
            <p className="type-caption pointer-events-none absolute inset-x-0 bottom-[var(--space-24)] text-center text-text-muted-dark">
              Drag to turn
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
