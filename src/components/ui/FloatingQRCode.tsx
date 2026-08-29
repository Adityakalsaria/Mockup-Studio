"use client";

import Image from "next/image";
import { useRef } from "react";

export default function FloatingQRCode() {
  const qrRef = useRef<HTMLDivElement>(null);

  const updatePointerEffect = (clientX: number, clientY: number) => {
    requestAnimationFrame(() => {
    const el = qrRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const clampedX = Math.max(0, Math.min(1, px));
    const clampedY = Math.max(0, Math.min(1, py));

    el.style.setProperty("--mx", `${(clampedX * 100).toFixed(2)}%`);
    el.style.setProperty("--my", `${(clampedY * 100).toFixed(2)}%`);
    el.style.setProperty("--rx", `${((0.5 - clampedY) * 10).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((clampedX - 0.5) * 10).toFixed(2)}deg`);
    el.style.setProperty("--holo-opacity", "0.48");

    // Material glow on the card
    const glow = el.querySelector<HTMLElement>("[data-glow-overlay]");
    if (glow) {
      const baseSize = Math.max(rect.width, rect.height);
      const glowSize = Math.round(baseSize * 0.92);
      glow.style.background = `radial-gradient(circle ${glowSize}px at ${(clampedX * 100).toFixed(2)}% ${(clampedY * 100).toFixed(2)}%, var(--material-interactive-glow-core, rgba(255,255,255,0.88)) 0%, var(--material-interactive-glow-edge, rgba(255,255,255,0.52)) 34%, rgba(255,255,255,0) 72%)`;
      glow.style.opacity = "0.2";
    }
    });
  };

  return (
    <div
      ref={qrRef}
      className="fixed bottom-4 left-4 min-[1600px]:bottom-8 min-[1600px]:left-8 z-[220] hidden flex-col items-center gap-3 min-[1600px]:gap-4 rounded-[18px] min-[1600px]:rounded-[var(--material-glass-radius)] p-3 min-[1600px]:p-4 tablet:flex transition-[transform,box-shadow] duration-200 ease-out [transform:perspective(720px)_rotateX(var(--rx))_rotateY(var(--ry))]"
      style={
        {
          "--mx": "50%",
          "--my": "50%",
          "--rx": "0deg",
          "--ry": "0deg",
          "--holo-opacity": "0",
          background: "rgba(39, 39, 39, 0.52)",
          backdropFilter: "blur(7.5px)",
          WebkitBackdropFilter: "blur(7.5px)",
        } as React.CSSProperties
      }
      onMouseEnter={(event) => updatePointerEffect(event.clientX, event.clientY)}
      onMouseMove={(event) => updatePointerEffect(event.clientX, event.clientY)}
      onMouseLeave={() => {
        const el = qrRef.current;
        if (!el) return;
        el.style.setProperty("--mx", "50%");
        el.style.setProperty("--my", "50%");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--holo-opacity", "0");
        const glow = el.querySelector<HTMLElement>("[data-glow-overlay]");
        if (glow) glow.style.opacity = "0";
      }}
    >
      {/* Material glow */}
      <span
        data-glow-overlay
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200"
      />
      {/* Gradient border */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-1px] rounded-[inherit]"
        style={{
          padding: "1px",
          background: "linear-gradient(165deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05), rgba(255,255,255,0.35))",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <span className="type-super-micro text-text-primary">
        GET THE APP
      </span>
      <div className="relative h-[84px] w-[84px] min-[1600px]:h-[128px] min-[1600px]:w-[128px] overflow-hidden rounded-[12px] min-[1600px]:rounded-[16px]" role="img" aria-label="QR code">
        <Image
          src="/images/qr-code.svg"
          alt="QR code"
          width={148}
          height={148}
          className="relative z-10 h-full w-full rounded-[12px] min-[1600px]:rounded-[16px]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-150"
          style={{
            opacity: "var(--holo-opacity)",
            background:
              "conic-gradient(from 180deg at 50% 50%, rgba(93,209,255,0.55), rgba(178,132,255,0.5), rgba(80,255,220,0.45), rgba(93,209,255,0.55))",
            mixBlendMode: "screen",
            WebkitMaskImage:
              "radial-gradient(circle at var(--mx) var(--my), rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 24%, rgba(0,0,0,0) 60%)",
            maskImage:
              "radial-gradient(circle at var(--mx) var(--my), rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 24%, rgba(0,0,0,0) 60%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-150"
          style={{
            opacity: "var(--holo-opacity)",
            background:
              "radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.26) 14%, rgba(255,255,255,0) 42%)",
            mixBlendMode: "screen",
          }}
        />
      </div>
    </div>
  );
}
