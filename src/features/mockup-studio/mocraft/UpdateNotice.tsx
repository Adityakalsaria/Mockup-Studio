"use client";

/**
 * "Update now", for a tab left open across a deploy.
 *
 * The page carries the commit it was built from (`NEXT_PUBLIC_BUILD_ID`,
 * inlined at build); `/api/version` answers with the commit that is live now.
 * When they differ, this tab is running old code and the button offers a
 * reload. Checked when the tab comes back into view and every few minutes.
 *
 * Off where there is no commit to compare -- local development -- and it stops
 * asking once it has seen a newer version.
 */

import { useEffect, useState } from "react";
import { GlassButton } from "@/design/ui";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID;
const EVERY_MS = 5 * 60 * 1000;

export default function UpdateNotice() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!BUILD || stale) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/version", { cache: "no-store" })
        .then((res) => res.json())
        .then(({ id }: { id: string | null }) => {
          if (id && id !== BUILD) setStale(true);
        })
        .catch(() => {});
    };
    const timer = setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [stale]);

  if (!stale) return null;
  return (
    <div className="pointer-events-auto absolute" style={{ left: 149, top: 13 }}>
      <GlassButton
        variant="prominent"
        title="A new version of Mocraft is ready"
        onClick={() => window.location.reload()}
      >
        Update now
      </GlassButton>
    </div>
  );
}
