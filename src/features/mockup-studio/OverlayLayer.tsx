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
export function OverlayLayer({ overlay }: { overlay: OverlaySettings }) {
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
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ borderRadius: "inherit" }}
    >
      {frame.width > 0 ? <div style={overlayStyle(overlay, frame)} /> : null}
    </div>
  );
}
