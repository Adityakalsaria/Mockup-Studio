"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import Button from "@/components/ui/Button";

const APP_SECTIONS = [
  {
    title: "All your money.\nPerfectly in sync.",
    body:
      "See your total balance, track recent transactions, and take action in seconds. Create invoices, buy gift cards, or manage funds.",
  },
  {
    title: "Get paid globally.\nSimple & Secure.",
    body:
      "Receive USD transfers via ACH or Wire. Share your details, track incoming payments, and manage everything in one place.",
  },
  {
    title: "Spend seamlessly.\nStay in control.",
    body:
      "Pay for AI tools, subscriptions, cloud services, and everyday essentials directly with your crypto. Top up instantly, manage your card in seconds.",
  },
];

export default function AppShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRefs = useRef<HTMLDivElement[]>([]);
  const rightRefs = useRef<HTMLDivElement[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [ready, setReady] = useState(false);
  const scrollPerSection = 2; // two viewport scrolls per section
  const frameCount = 200;

  useEffect(() => {
    let mounted = true;
    const images: HTMLImageElement[] = new Array(frameCount);
    let loaded = 0;

    function pad5(value: number) {
      return String(value).padStart(5, "0");
    }

    function getSrc(frame: number) {
      return `/sequence/comp1/new iphone_${pad5(frame)}.webp`;
    }

    for (let i = 0; i < frameCount; i += 1) {
      const img = new Image();
      img.src = getSrc(i);
      img.onload = () => {
        loaded += 1;
        if (mounted && loaded === 1) {
          setReady(true);
        }
      };
      images[i] = img;
    }

    imagesRef.current = images;
    return () => {
      mounted = false;
    };
  }, [frameCount]);

  function renderFrame(frame: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imagesRef.current[frame];
    if (!img || !img.complete) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const scale = Math.min(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (cw - w) / 2;
    const y = 0;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, x, y, w, h);
  }

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const wrapper = canvasWrapRef.current;
    if (!canvas || !wrapper) return;
    const targetCanvas = canvas;
    const targetWrapper = wrapper;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = targetWrapper.getBoundingClientRect();
      targetCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
      targetCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
      targetCanvas.style.width = `${rect.width}px`;
      targetCanvas.style.height = `${rect.height}px`;
      renderFrame(0);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [ready]);

  useGSAP(
    () => {
      const leftItems = leftRefs.current.filter(Boolean);
      const rightItems = rightRefs.current.filter(Boolean);
      if (!leftItems.length || !sectionRef.current) return;

      [...leftItems, ...rightItems].forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
      });

      gsap.set(sectionRef.current, { willChange: "opacity" });
      gsap.to({}, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${APP_SECTIONS.length * scrollPerSection * 100}%`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            const seg = 1 / APP_SECTIONS.length;

            // Soft fade-in at entry to avoid a hard jump from the previous section
            if (sectionRef.current) {
              const fadeIn = Math.min(1, p / 0.05);
              sectionRef.current.style.opacity = String(fadeIn);
            }

            // Map progress into a 0..199 frame range per section
            if (ready) {
              const idx = Math.min(
                APP_SECTIONS.length - 1,
                Math.max(0, Math.floor(p / seg))
              );
              const local = (p - idx * seg) / seg;
              const frame = Math.max(0, Math.min(frameCount - 1, Math.round(local * (frameCount - 1))));
              renderFrame(frame);
            }

            APP_SECTIONS.forEach((_, i) => {
              const leftEl = leftRefs.current[i];
              const rightEl = rightRefs.current[i];
              const start = i * seg;
              const end = start + seg;
              const t = (p - start) / (end - start);
              const clamped = Math.max(0, Math.min(1, t));

              let opacity = 0;
              if (t >= 0 && t <= 1) {
                if (clamped < 0.12) opacity = clamped / 0.12;
                else if (clamped > 0.88) opacity = (1 - clamped) / 0.12;
                else opacity = 1;
              }

              [leftEl, rightEl].forEach((el) => {
                if (!el) return;
                el.style.opacity = String(opacity);
                el.style.transform = `translateY(${(1 - opacity) * 16}px)`;
                el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
              });
            });
          },
        },
      });
    },
    { scope: sectionRef, dependencies: [ready] }
  );

  return (
    <section
      ref={sectionRef}
      id="app-showcase"
      className="relative flex w-full items-center justify-center overflow-hidden bg-black"
      style={{ minHeight: "100vh" }}
    >
      <div className="relative mx-auto flex w-full flex-col items-center gap-[var(--space-40)] px-[var(--spacing-md)] laptop:h-[1117px] laptop:max-w-[var(--layout-bleed-max)] laptop:px-0">
        {/* Left heading block (desktop) */}
        <div className="relative w-full max-w-[420px] laptop:absolute laptop:left-[var(--layout-page-gutter)] laptop:top-1/2 laptop:w-[329px] laptop:max-w-[329px] laptop:-translate-y-1/2">
          {APP_SECTIONS.map((s, i) => (
            <div
              key={s.title}
              ref={(el) => {
                if (el) leftRefs.current[i] = el;
              }}
              className="flex flex-col gap-[var(--spacing-sm)]"
            >
              <h3
                className="type-h2 text-white"
                style={{ whiteSpace: "pre-line", fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
              >
                {s.title}
              </h3>
              <p
                className="type-body-m text-[color:rgb(250_250_250/0.55)] laptop:hidden"
                style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
              >
                {s.body}
              </p>
              <Button
                variant="secondary"
                className="mt-[var(--spacing-2xs)] min-w-fit w-fit self-center px-[var(--space-16)] laptop:hidden"
                style={{ minWidth: "fit-content" }}
              >
                + Explore more
              </Button>
            </div>
          ))}
        </div>

        {/* Phone sequence (center) */}
        <div className="relative w-full max-w-[420px] laptop:absolute laptop:left-1/2 laptop:top-[144px] laptop:w-[460px] laptop:max-w-[460px] laptop:-translate-x-1/2">
          <div
            ref={canvasWrapRef}
            className="relative mx-auto w-full"
            style={{ aspectRatio: "1000 / 1464" }}
          >
            <canvas ref={canvasRef} className="block h-full w-full" />
          </div>
        </div>

        {/* Right body + CTA (desktop) */}
        <div className="relative w-full max-w-[420px] laptop:absolute laptop:right-[var(--layout-page-gutter)] laptop:top-1/2 laptop:w-[309px] laptop:max-w-[309px] laptop:-translate-y-1/2">
          {APP_SECTIONS.map((s, i) => (
            <div
              key={`${s.title}-content`}
              ref={(el) => {
                if (el) rightRefs.current[i] = el;
              }}
              className="hidden flex-col gap-[var(--spacing-sm)] laptop:flex"
            >
              <p
                className="type-body-m text-[color:rgb(250_250_250/0.55)]"
                style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
              >
                {s.body}
              </p>
              <Button
                variant="secondary"
                className="mt-[var(--spacing-2xs)] min-w-fit w-fit self-start px-[var(--space-16)]"
                style={{ minWidth: "fit-content" }}
              >
                + Explore more
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
