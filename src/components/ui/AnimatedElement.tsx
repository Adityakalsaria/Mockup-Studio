"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { fadeUp } from "@/lib/animations";

interface AnimatedElementProps {
  children: React.ReactNode;
  className?: string;
  animation?: gsap.TweenVars;
  as?: keyof HTMLElementTagNameMap;
}

export default function AnimatedElement({
  children,
  className = "",
  animation = fadeUp,
  as: Tag = "div",
}: AnimatedElementProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.from(ref.current, {
        ...animation,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: ref }
  );

  return (
    // @ts-expect-error -- dynamic tag with ref
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
