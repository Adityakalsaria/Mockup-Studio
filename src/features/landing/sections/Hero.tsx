"use client";

import { useContext, useEffect, useRef, useState, type DragEvent } from "react";
import { motion } from "motion/react";
import { Button, Glass, Glyph } from "@/design/ui";
import { getDevice } from "@/features/mockup-studio/devices";
import { EASE_OUT, Overline } from "../Chapter";
import { LiveDevice, SCREENS, UserScreenContext, usePrefersReducedMotion } from "../LiveDevice";

const ICONS = "/figma-assets/mockup-studio/icons";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: EASE_OUT, delay },
});

/* The chips under the drop zone: phones, because a dropped design is a phone screen. */
const CHIPS = [
  { id: "apple-iphone-17-pro", finishId: "deep-blue", zoom: 1.1 },
  { id: "apple-iphone-air", finishId: "sky-blue", zoom: 1.1 },
  { id: "apple-iphone-17", finishId: "lavender", zoom: 1.1 },
  { id: "apple-iphone-18-pro", finishId: "iphone18-silver", zoom: 1.1 },
  { id: "apple-iphone-duo-web", finishId: "duo-night-sky", zoom: 0.8 },
];

/**
 * The first screen: a left-set, two-tone headline with a drop zone and device
 * chips under it -- a mockup library's search bar, except this one works on
 * the spot -- and the studio's live renderer on the right, rising in on its
 * "Slide up" preset. Drop a design and it lands on the phone, and on every
 * other live device down the page.
 */
export function Hero() {
  const tilt = usePointerTilt();
  const { screen, setScreen } = useContext(UserScreenContext);
  const [chip, setChip] = useState(CHIPS[0]);
  const [over, setOver] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const read = (file: File | undefined) => {
    if (!file || !/^(image|video)\//.test(file.type)) return;
    // A data URL, as the studio reads its uploads: it carries its own type, so a
    // video is recognised as one without a file extension to go on.
    const reader = new FileReader();
    reader.onload = () => {
      setScreen(String(reader.result));
      setName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    read(e.dataTransfer.files[0]);
  };

  return (
    <section id="top" className="relative overflow-hidden bg-white ds-page-gutter pt-[calc(var(--space-80)+var(--space-32))]">
      <div className="layout-media grid grid-cols-1 items-center gap-[var(--space-32)] laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <motion.div {...rise(0)}>
            <Overline>Apple mockup studio</Overline>
          </motion.div>
          <motion.h1 className="type-hero mt-[var(--space-16)] text-text-primary-dark" {...rise(0.06)}>
            Make it real.
          </motion.h1>
          <motion.p className="type-section mt-[var(--space-4)] text-text-muted-dark" {...rise(0.12)}>
            Beautiful mockups for beautiful work.
          </motion.p>

          <motion.div className="mt-[var(--space-40)]" {...rise(0.18)}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
              style={{ transform: over ? "scale(1.02)" : "none", transition: "transform var(--duration-fast) var(--ease-out)" }}
            >
              <Glass shape="pill" width="100%">
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="relative z-[1] flex h-[40px] w-full items-center gap-[var(--space-12)] px-[var(--space-12)] text-left"
                >
                  <Glyph>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${ICONS}/add-image.svg`} width={20} height={20} alt="" />
                  </Glyph>
                  <span className="type-copy min-w-0 flex-1 truncate" style={{ color: "var(--mo-ink)" }}>
                    {name ? `${name} is on the phone` : over ? "Drop it" : "Drop your design here, or browse"}
                  </span>
                  {screen ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreen(null);
                        setName(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setScreen(null);
                          setName(null);
                        }
                      }}
                      className="type-caption text-text-link"
                    >
                      Reset
                    </span>
                  ) : null}
                </button>
              </Glass>
              <input
                ref={input}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  read(e.currentTarget.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            <div className="mt-[var(--space-16)] flex flex-wrap gap-[var(--space-8)]">
              {CHIPS.map((c) => (
                <Button flat key={c.id} height={32} onClick={() => setChip(c)}>
                  <span
                    className="type-caption px-[var(--space-12)]"
                    style={{ color: c.id === chip.id ? "var(--mo-ink)" : "var(--mo-ink-muted)", fontWeight: c.id === chip.id ? 600 : 500 }}
                  >
                    {getDevice(c.id).label.replace(/^Apple /, "")}
                  </span>
                </Button>
              ))}
            </div>
            <p className="type-caption mt-[var(--space-16)] text-text-muted-dark">
              Nothing is uploaded. Your design stays in this browser tab.
            </p>
          </motion.div>
        </div>

        <div className="relative h-[min(72svh,720px)]">
          <LiveDevice
            className="absolute inset-0"
            deviceId={chip.id}
            finishId={chip.finishId}
            screen={`${SCREENS}/dark.png`}
            lighting="studio"
            preset="slide-up"
            pose={{ zoom: chip.zoom, yAxis: 164, xAxis: 4 }}
            tilt={tilt}
          />
        </div>
      </div>
    </section>
  );
}

/** A few degrees of turn toward the pointer; nothing on touch or reduced motion. */
function usePointerTilt() {
  const reduced = usePrefersReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        setTilt({ x: ny * 4, y: nx * 12 });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);
  return tilt;
}
