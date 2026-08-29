"use client";

import { useEffect, useState } from "react";

function getScrollPercent(): number {
  const doc = document.documentElement;
  const max = Math.max(1, doc.scrollHeight - window.innerHeight);
  const current = Math.min(Math.max(window.scrollY, 0), max);
  return Math.round((current / max) * 100);
}

export default function ScrollProgressBadge() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      setPercent(getScrollPercent());
      raf = 0;
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] rounded-[10px] border border-white/20 bg-black/70 px-3 py-1 text-[12px] font-medium leading-[16px] text-white">
      Scroll {percent}%
    </div>
  );
}
