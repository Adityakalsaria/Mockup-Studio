"use client";

import { useEffect } from "react";
import { prefetchSequence } from "@/lib/prefetchSequence";

/**
 * Invisible client component that background-prefetches the business
 * canvas sequence frames during idle time, so they're cached before
 * the user scrolls to that section.
 */
export default function PrefetchBusinessSequence() {
  useEffect(() => {
    return prefetchSequence({
      frameCount: 241,
      pathPrefix: "/sequence/business/",
      pathSuffix: ".webp",
      numberOffset: 0,
      padLength: 4,
      concurrency: 4,
    });
  }, []);

  return null;
}
