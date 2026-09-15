"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

/**
 * Tells you the model is still coming.
 *
 * Without it the stage was not blank -- it fell back to the procedural phone
 * body while the GLB loaded -- which was worse than blank. You saw a phone,
 * assumed it was the phone, and then it silently swapped for a different one.
 * Nothing said "wait", so a slow load read as a stuck page.
 *
 * `useProgress` reads drei's store, which is fed by three's default loading
 * manager, so this counts every GLTF and texture the scene pulls without
 * anything having to report in.
 *
 * It sits OUTSIDE the canvas as plain DOM rather than using drei's `Html`,
 * because `Html` mounts inside the scene graph and would suspend along with
 * the very thing it is reporting on.
 */

/** Long enough that a cached load never flashes it. A GLB already in memory
    resolves in a few ms, and a loader that appears and vanishes inside one
    frame reads as a glitch rather than as progress. */
const SHOW_AFTER_MS = 160;

/*
 * Geist's spinner, by hand: twelve bars round a circle, each fading after the
 * one before it. `@vercel/geistcn` is not a published package, and this is
 * the whole of what its Spinner draws.
 */
const LOADER_CSS = `
@keyframes ks-spinner-fade {
  0%   { opacity: 1; }
  100% { opacity: 0.15; }
}
.ks-spinner-bar {
  animation: ks-spinner-fade 1.2s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ks-spinner-bar { animation: none; }
}
`;

const SPINNER_SIZE = 28;
const SPINNER_COLOR = "#0D99FF";


export function StageLoader() {
  const { active } = useProgress();
  const [waited, setWaited] = useState(false);

  // Visibility is DERIVED from `active` rather than mirrored into state, so
  // the effect never has to setState synchronously to hide it. The timer only
  // ever turns the delay on; the cleanup turns it back off when a load ends,
  // which is what re-arms the delay for the next one -- switching device
  // should get the same grace period as the first load did.
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setWaited(true), SHOW_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      setWaited(false);
    };
  }, [active]);

  const shown = active && waited;

  return (
    <div
      aria-hidden={!shown}
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
      style={{
        opacity: shown ? 1 : 0,
        transition: "opacity 220ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      <div role="status" aria-live="polite" aria-label="Loading model">
        <style>{LOADER_CSS}</style>
        <div
          className="relative"
          style={{ width: SPINNER_SIZE, height: SPINNER_SIZE }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="ks-spinner-bar absolute rounded-full"
              style={{
                left: "calc(50% - 1.25px)",
                top: 0,
                width: 2.5,
                height: SPINNER_SIZE * 0.28,
                background: SPINNER_COLOR,
                transformOrigin: `50% ${SPINNER_SIZE / 2}px`,
                transform: `rotate(${i * 30}deg)`,
                animationDelay: `${(i - 12) * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
