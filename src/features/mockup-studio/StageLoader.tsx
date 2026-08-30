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

const LOADER_CSS = `
@keyframes ks-loader-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(340%); }
}
.ks-loader-bar {
  width: 30%;
  animation: ks-loader-slide 1.1s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
/* Reduced motion is not "no feedback": the bar stops travelling and simply
   sits there as a filled track, so the panel still reads as busy. */
@media (prefers-reduced-motion: reduce) {
  .ks-loader-bar { width: 100%; animation: none; opacity: 0.55; }
}
`;

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
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-[10px] rounded-full px-[16px] py-[10px]"
        style={{
          background: "var(--ks-surface-solid, rgba(255, 255, 255, 0.92))",
          color: "var(--ks-text, #1d1d1f)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
        }}
      >
        {/* Scoped here rather than in the editor theme, because this renders
            wherever the stage does and the theme sheet is only mounted by the
            editor shell. */}
        <style>{LOADER_CSS}</style>
        <span
          className="ks-label"
          style={{ fontSize: 13, lineHeight: "18px", letterSpacing: "-0.08px" }}
        >
          Loading model
        </span>
        {/* Indeterminate, deliberately.
            The obvious thing is a percentage, and the first version did that
            -- but three's loading manager counts FILES, not bytes, and the
            stage loads two. So the bar sat at 4% for the whole of a three
            second download and then jumped straight to 100%: a progress bar
            that does not move is a stronger "this is stuck" signal than no
            progress bar at all, which is the opposite of the point. A bar that
            is honestly indeterminate says "working" without claiming a
            precision the data does not have. */}
        <span
          className="block h-[3px] w-[120px] overflow-hidden rounded-full"
          style={{ background: "var(--ks-ctl, rgba(120, 120, 128, 0.16))" }}
        >
          <span
            className="ks-loader-bar block h-full rounded-full"
            style={{ background: "var(--ks-accent, #007AFF)" }}
          />
        </span>
      </div>
    </div>
  );
}
