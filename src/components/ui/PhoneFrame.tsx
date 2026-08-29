"use client";

import type { CSSProperties } from "react";
import Image from "next/image";

interface PhoneScreen {
  src: string;
  alt: string;
}

interface PhoneFrameProps {
  screens: PhoneScreen[];
  activeIndex: number;
  className?: string;
  frameStyle?: CSSProperties;
  railOverlayStyle?: CSSProperties;
}

export default function PhoneFrame({
  screens,
  activeIndex,
  className = "",
  frameStyle,
  railOverlayStyle,
}: PhoneFrameProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Frame image drives the natural size */}
      <Image
        src="/images/iphone-frame.webp"
        alt=""
        width={400}
        height={820}
        sizes="(max-width: 768px) 60vw, 400px"
        className="pointer-events-none relative block h-full w-auto"
        style={{ zIndex: 2, ...frameStyle }}
        priority
      />

      {railOverlayStyle ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 3,
            maskImage: "url(/images/iphone-frame.png)",
            WebkitMaskImage: "url(/images/iphone-frame.png)",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            ...railOverlayStyle,
          }}
        />
      ) : null}

      {/* Screen layer — positioned behind the frame, clipped to screen area */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: "var(--phone-screen-inset-bottom)",
          bottom: "var(--phone-screen-inset-bottom)",
          left: "var(--phone-screen-inset-x)",
          right: "var(--phone-screen-inset-x)",
          borderRadius: "var(--phone-screen-border-radius)",
          zIndex: 1,
        }}
      >
        {screens.map((screen, i) => (
          <Image
            key={screen.src}
            src={screen.src}
            alt={screen.alt}
            fill
            sizes="(max-width: 768px) 60vw, 360px"
            className="object-cover"
            style={{
              opacity: i === activeIndex ? 1 : 0,
              transition: "opacity var(--phone-crossfade-duration) var(--ease-apple)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
