"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function ReferralHeroImages() {
  const [entered, setEntered] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  const startParallax = useCallback(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      targetRef.current = { x, y };
    };

    const animate = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.05;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.05;

      const leftX = currentRef.current.x * 20;
      const leftY = currentRef.current.y * 10;
      const rightX = currentRef.current.x * 12;
      const rightY = currentRef.current.y * 8;

      if (leftRef.current) {
        leftRef.current.style.transform = `translate(${leftX}px, ${leftY}px)`;
      }
      if (rightRef.current) {
        rightRef.current.style.transform = `translate(${rightX}px, ${rightY}px)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const entryDelay = 200;
    const timer = window.setTimeout(() => setEntered(true), entryDelay);

    const parallaxTimer = window.setTimeout(() => {
      cleanupParallax = startParallax();
    }, entryDelay + 1200);

    let cleanupParallax: (() => void) | undefined;

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(parallaxTimer);
      cleanupParallax?.();
    };
  }, [startParallax]);

  const leftEntranceStyle: React.CSSProperties = {
    transform: entered ? "translate(0, 0)" : "translate(-400px, 0)",
    opacity: entered ? 1 : 0,
    transition: entered
      ? "transform var(--duration-slower) var(--ease-in-out), opacity var(--duration-slower) var(--ease-in-out)"
      : "none",
  };

  const rightEntranceStyle: React.CSSProperties = {
    transform: entered ? "translate(0, 0)" : "translate(400px, 0)",
    opacity: entered ? 1 : 0,
    transition: entered
      ? "transform var(--duration-slower) var(--ease-in-out) 0.15s, opacity var(--duration-slower) var(--ease-in-out) 0.15s"
      : "none",
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[var(--z-base)] overflow-hidden">
      {/* Left hand */}
      <div
        className="absolute top-auto bottom-0 left-[-132px] flex h-[220px] w-[260px] items-end justify-center tablet:left-[-138px] tablet:h-[310px] tablet:w-[360px] laptop:left-[-110px] laptop:h-[clamp(300px,50dvh,470px)] laptop:w-[clamp(360px,60dvh,560px)] desktop:left-[-65px] desktop:h-[clamp(400px,65dvh,665px)] desktop:w-[clamp(480px,80dvh,804px)]"
        style={leftEntranceStyle}
      >
        <div ref={leftRef}>
          <div className="flex-none rotate-[4.26deg]">
            {/* Sprite-sheet crop: left hand is the first 52.8% of hands.png, sized at 189.22% to show only that portion */}
            <div className="pointer-events-none relative h-[204px] w-[246px] overflow-hidden tablet:h-[284px] tablet:w-[338px] laptop:h-[clamp(280px,46dvh,430px)] laptop:w-[clamp(340px,56dvh,530px)] desktop:h-[clamp(380px,60dvh,610px)] desktop:w-[clamp(470px,75dvh,761px)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/referral/hands.webp"
                alt=""
                className="absolute max-w-none grayscale"
                style={{
                  width: "189.22%",
                  height: "100.08%",
                  left: "0",
                  top: "-0.04%",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right hand */}
      <div
        className="absolute top-auto bottom-0 right-[-122px] flex h-[220px] w-[245px] items-end justify-center tablet:right-[-150px] tablet:h-[300px] tablet:w-[340px] laptop:right-[-108px] laptop:h-[clamp(290px,48dvh,450px)] laptop:w-[clamp(320px,53dvh,500px)] desktop:right-[-71px] desktop:h-[clamp(400px,64dvh,657px)] desktop:w-[clamp(430px,69dvh,703px)]"
        style={rightEntranceStyle}
      >
        <div ref={rightRef}>
          <div className="flex-none rotate-[4.26deg]">
            {/* Sprite-sheet crop: right hand starts at 54.3% of hands.png, offset via negative left */}
            <div className="pointer-events-none relative h-[204px] w-[228px] overflow-hidden tablet:h-[278px] tablet:w-[314px] laptop:h-[clamp(270px,44dvh,418px)] laptop:w-[clamp(300px,50dvh,470px)] desktop:h-[clamp(380px,60dvh,610px)] desktop:w-[clamp(410px,65dvh,659px)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/referral/hands.webp"
                alt=""
                className="absolute max-w-none grayscale"
                style={{
                  width: "218.51%",
                  height: "100.08%",
                  left: "-118.51%",
                  top: "-0.04%",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
