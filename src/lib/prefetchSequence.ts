/**
 * Background-prefetch utility for canvas sequence frames.
 * Uses requestIdleCallback to download frames without blocking the main thread.
 * Throttled to `concurrency` simultaneous loads so it doesn't compete with hero sequence.
 */
export function prefetchSequence({
  frameCount,
  pathPrefix,
  pathSuffix = ".webp",
  numberOffset = 0,
  padLength = 5,
  concurrency = 4,
}: {
  frameCount: number;
  pathPrefix: string;
  pathSuffix?: string;
  numberOffset?: number;
  padLength?: number;
  concurrency?: number;
}) {
  let cancelled = false;
  let inFlight = 0;
  let cursor = 0;

  const pad = (n: number) => String(n).padStart(padLength, "0");

  const pump = () => {
    if (cancelled) return;
    while (inFlight < concurrency && cursor < frameCount) {
      const frame = cursor;
      cursor += 1;
      inFlight += 1;
      const img = new Image();
      img.decoding = "async";
      const done = () => {
        inFlight -= 1;
        if (!cancelled) pump();
      };
      img.onload = done;
      img.onerror = done;
      img.src = `${pathPrefix}${pad(frame + numberOffset)}${pathSuffix}`;
    }
  };

  const start = () => {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(pump);
    } else {
      setTimeout(pump, 200);
    }
  };

  start();

  return () => {
    cancelled = true;
  };
}
