"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { Pose } from "@/features/mockup-studio/editor/motionPresets";
import { EASE_SWIFT, TextReveal } from "../Chapter";
import { LiveDevice, usePrefersReducedMotion } from "../LiveDevice";

/** What is on the display's screen: a still of the studio's own UI. */
export const HERO_SCREEN = "/landing/shots/editor.webp";

/**
 * The pose the display rests in once it has risen -- leaned back a little, the
 * way the reference frames it. The rise itself is the studio's "Rotation slide
 * up": a rise from below on a half turn that unwinds, scrubbed by the scroll.
 */
const REST: Partial<Pose> = { xAxis: 8, yAxis: 180, zoom: 1.35, fov: 30, panY: 1.6 };

/** Seconds of the preset that are the move; the rest of its 3s is rest. */
const MOVE = 1.4667;

/**
 * "Where craft meets motion." over a Studio Display that rises as you scroll.
 *
 * A tall track with a pinned frame in it: the frame stays on screen while the
 * scroll position, mapped onto the first two thirds of the track, is the
 * playhead of the studio's own preset. The last third holds the display at
 * rest before the page moves on, so it can be looked at.
 */
export function Hero() {
  const track = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const rise = useTransform(scrollYProgress, [0, 0.66], [0, 1], { clamp: true });

  return (
    <section ref={track} id="top" className="relative h-[240svh]">
      <div className="sticky top-0 h-svh overflow-hidden bg-white bg-[radial-gradient(circle,rgb(0_0_0/0.13)_1.2px,transparent_1.4px)] [background-size:50px_50px]">
        <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--space-80)+var(--space-32))] z-[2] px-[var(--space-24)] text-center">
          <h1 className="type-hero text-text-primary-dark">
            <TextReveal>{"Where craft\nmeets motion."}</TextReveal>
          </h1>
        </div>

        <motion.div
          className="absolute inset-0"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_SWIFT, delay: 0.75 }}
        >
          <LiveDevice
            className="absolute inset-0"
            deviceId="apple-studio-display"
            screen={HERO_SCREEN}
            lighting="studio"
            preset="rotation-slide-up"
            scrub={rise}
            scrubSpan={MOVE}
            pose={REST}
          />
        </motion.div>
      </div>
    </section>
  );
}
