"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

interface PngSequenceProps {
  frameCount: number;
  startFrame?: number;
  endFrame?: number;
  className?: string;
  startTrigger: string;
  endTrigger: string;
  pin?: boolean;
  pinSpacing?: boolean;
  start?: string;
  end?: string;
}

function pad5(value: number) {
  return String(value).padStart(5, "0");
}

export default function PngSequence({
  frameCount,
  startFrame = 0,
  endFrame,
  className = "",
  startTrigger,
  endTrigger,
  pin = true,
  pinSpacing = false,
  start = "top top",
  end = "bottom top",
}: PngSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const maxFrame = endFrame ?? frameCount - 1;
  const [frame, setFrame] = useState(startFrame);

  const src = useMemo(() => {
    const filename = `Comp 1_${pad5(frame)}.webp`;
    return `/sequence/comp1/${filename}`;
  }, [frame]);

  useGSAP(
    () => {
      const triggerEl = document.querySelector(startTrigger);
      const endEl = document.querySelector(endTrigger);
      if (!triggerEl || !endEl || !containerRef.current) return;

      const state = { frame: startFrame };
      setFrame(startFrame);

      gsap.to(state, {
        frame: maxFrame,
        ease: "none",
        scrollTrigger: {
          trigger: triggerEl,
          start,
          endTrigger: endEl,
          end,
          scrub: 1,
          pin: pin ? containerRef.current : false,
          pinReparent: true,
          anticipatePin: 1,
          pinSpacing,
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          setFrame(Math.round(state.frame));
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className}>
      <img
        src={src}
        alt="Sequence frame"
        className="h-full w-full object-contain select-none pointer-events-none"
      />
    </div>
  );
}
