"use client";

import { useEffect, useRef, useState } from "react";
import { overlayStyle, type OverlaySettings } from "./overlay";

/**
 * The layer, sized against the frame it is actually in.
 *
 * Its geometry is stored 0..1, so it needs the frame's pixel size to resolve.
 * A ResizeObserver rather than a one-off measure: the stage reflows when the
 * aspect changes or the window moves, and an overlay pinned to a stale size
 * would drift off the shot the moment either happened.
 */
export function OverlayLayer({
  overlay,
  raise = true,
}: {
  overlay: OverlaySettings;
  /**
   * Lift it above the phone with `z-10`, or leave it to paint order.
   *
   * A z-index only means something inside a stacking context, and neither the
   * stage frame nor the chrome root opens one — so this 10 resolved somewhere
   * far up the page and beat every `z-index: auto` element under it, including
   * the whole chrome. Opening a context to contain it is worse than the
   * problem: the stage becomes its own composited group and the panels'
   * `backdrop-filter` stops being able to sample it, so every popup loses its
   * frost.
   *
   * The Mocraft stage passes `false` and renders this AFTER the phone instead,
   * which puts it above by paint order and needs no number at all. The old
   * editor keeps the default, where the ordering is not so easily changed.
   */
  raise?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setFrame({ width: r.width, height: r.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={host}
      aria-hidden
      // z-10 puts it over the canvas and under the corner chips at z-20.
      className={`pointer-events-none absolute inset-0 overflow-hidden ${raise ? "z-10" : ""}`}
      style={{ borderRadius: "inherit" }}
    >
      {frame.width > 0 ? <div style={overlayStyle(overlay, frame)} /> : null}
    </div>
  );
}
