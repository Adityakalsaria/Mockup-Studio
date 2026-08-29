"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import HeroRandomScatter from "./HeroRandomScatter";

const HERO_PRIMARY_VIDEO_WEBM = "/videos/hero.webm";
const HERO_PRIMARY_VIDEO_MP4 = "/videos/hero.mp4";

const KEYWORDS = ["freelancers", "entrepreneurs", "creators", "nomads"];

const NOTIFICATIONS = [
  { title: "$4,500 Received", subtitle: "Payment for AI Agents setup" },
  { title: "$850 Paid", subtitle: "Card purchase at AWS" },
];
const CYCLE_INTERVAL = 2500;

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const keywordRef = useRef<HTMLSpanElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeAvatar, setActiveAvatar] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Cycle avatars on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 479px)");
    if (!mq.matches) return;
    const interval = setInterval(() => {
      setActiveAvatar((prev) => (prev + 1) % 5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const animateKeyword = useCallback(
    (nextIndex: number) => {
      const el = keywordRef.current;
      if (!el) return;

      gsap
        .timeline()
        .to(el, {
          opacity: 0,
          duration: 0.4,
          ease: "none",
          onComplete: () => setCurrentIndex(nextIndex),
        })
        .to(el, {
          opacity: 1,
          duration: 0.4,
          ease: "none",
        });
    },
    []
  );

  useEffect(() => {
    if (prefersReducedMotion) return;
    const indexRef = { current: 0 };
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % KEYWORDS.length;
      animateKeyword(next);
      indexRef.current = next;
    }, CYCLE_INTERVAL);
    return () => clearInterval(id);
  }, [prefersReducedMotion, animateKeyword]);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .from("[data-hero-heading-primary]", {
        y: 40,
        opacity: 0,
        duration: 0.9,
      })
        .from(
          "[data-hero-subtitle-primary]",
          {
            y: 24,
            opacity: 0,
            duration: 0.7,
          },
          "-=0.6"
        )
        .from(
          "[data-hero-media-primary]",
          {
            y: 60,
            opacity: 0,
            duration: 1,
          },
          "-=0.3"
        );

      // Notification overlay animation
      if (prefersReducedMotion || !notificationRef.current) return;

      const notif = notificationRef.current;
      const titleEl = notif.querySelector<HTMLElement>("[data-notif-title]");
      const subtitleEl = notif.querySelector<HTMLElement>("[data-notif-subtitle]");

      const setContent = (index: number) => {
        if (titleEl) titleEl.textContent = NOTIFICATIONS[index].title;
        if (subtitleEl) subtitleEl.textContent = NOTIFICATIONS[index].subtitle;
      };

      gsap.set(notif, { y: -20, opacity: 0 });

      gsap
        .timeline({ repeat: -1, defaults: { ease: "power2.out" } })
        // Notification 1 slide in
        .call(() => setContent(0), undefined, 0.5)
        .to(notif, { y: 0, opacity: 1, duration: 0.5 }, 0.5)
        // Notification 1 slide out
        .to(notif, { y: -20, opacity: 0, duration: 0.5, ease: "power2.in" }, 3.0)
        // Notification 2 slide in
        .call(() => setContent(1), undefined, 4.0)
        .to(notif, { y: 0, opacity: 1, duration: 0.5 }, 4.0)
        // Notification 2 slide out
        .to(notif, { y: -20, opacity: 0, duration: 0.5, ease: "power2.in" }, 6.0)
        // Pad to match video loop duration
        .set({}, {}, 7.05);
    },
    { scope: sectionRef, dependencies: [prefersReducedMotion] }
  );

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative -mt-[80px] bg-black"
    >
      {/* Atmospheric gradient background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[550px]"
        style={{
          background:
            "radial-gradient(60.18% 100% at 50% 100%, #000 45%, #202024 64.68%, #2A2C2F 79.48%, #303235 100%)",
        }}
      />

      {/* Currency animation background */}
      <HeroRandomScatter variant="normal" embedded />

      <div className="relative layout-content ds-page-gutter pt-[var(--spacing-hero-top)]">
        <div className="grid-12">
          {/* Hero copy — centered 8 cols desktop, 10 tablet, full mobile */}
          <div className="relative z-20 [grid-row:1] col-span-12 flex flex-col items-center gap-[var(--spacing-element)] px-[var(--space-32)] text-center tablet:col-span-10 tablet:col-start-2 tablet:px-0 desktop:col-span-8 desktop:col-start-3">
            <h1
              data-hero-heading-primary
              className="type-display text-text-primary"
              aria-label={`The global financial account for ${KEYWORDS[0]}`}
            >
              The global financial account
              <br />
              <span className="relative inline-grid h-[var(--line-height-display)] overflow-hidden align-bottom [&>span]:col-start-1 [&>span]:row-start-1" aria-hidden="true">
                {/* Invisible keywords stacked in same grid cell to size container to the widest */}
                {KEYWORDS.map((kw) => (
                  <span key={kw} className="invisible" aria-hidden="true">
                    for {kw}
                  </span>
                ))}
                {/* Visible animated keyword */}
                <span
                  ref={keywordRef}
                  className="bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#A8A8A8] bg-clip-text text-transparent"
                >
                  for {KEYWORDS[currentIndex]}
                </span>
              </span>
            </h1>
            <p
              data-hero-subtitle-primary
              className="type-body-l text-text-secondary"
            >
              USD accounts, a global Visa card, and instant payouts. All powered by stablecoins.
            </p>
          </div>

          {/* Hero media — 10 cols centered */}
          <div
            data-hero-media-primary
            className="relative mix-blend-screen [grid-row:2] [grid-column:1/-1] mt-[var(--spacing-block)] aspect-[16/10] tablet:[grid-column:2/12]"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              className="h-full w-full object-cover"
            >
              <source src={HERO_PRIMARY_VIDEO_WEBM} type="video/webm" />
              <source src={HERO_PRIMARY_VIDEO_MP4} type="video/mp4" />
            </video>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
          </div>

          {/* Notification overlay — same grid cell as video, outside blend */}
          <div
            className="relative z-10 [grid-row:2] [grid-column:1/-1] mt-[var(--spacing-block)] pointer-events-none tablet:[grid-column:2/12]"
          >
            <div
              ref={notificationRef}
              className="z-10 pointer-events-none absolute left-1/2 top-[var(--space-64)] w-[320px] -translate-x-1/2 opacity-0 max-[479px]:top-[4px] max-[479px]:w-[80%] max-[479px]:scale-90"
            >
              <div
                className="material-dark flex items-center gap-[var(--space-20)] p-[var(--space-20)] max-[479px]:gap-[var(--space-12)] max-[479px]:p-[var(--space-12)] max-[479px]:rounded-[10px]"
              >
                <Image
                  src="/images/kosh-app-icon.svg"
                  alt="Kosh"
                  width={54}
                  height={54}
                  className="shrink-0 rounded-[8px] max-[479px]:w-[44px] max-[479px]:h-[44px]"
                />
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <span data-notif-title className="type-action text-text-primary max-[479px]:text-[length:var(--font-size-micro)]">
                    {NOTIFICATIONS[0].title}
                  </span>
                  <span data-notif-subtitle className="type-body-m text-text-secondary max-[479px]:text-[length:var(--font-size-micro)]">
                    {NOTIFICATIONS[0].subtitle}
                  </span>
                </div>
              </div>
            </div>
          </div>


          {/* Social proof */}
          <div className="relative [grid-row:3] col-span-12 mt-[var(--spacing-section)] flex justify-center">
            <div
              className="relative inline-flex items-center gap-3 rounded-[var(--radius-pill)] pl-4 pr-6 py-3 mx-[var(--space-32)] backdrop-blur-[7.5px] max-[479px]:mx-0 max-[479px]:px-4"
              style={{ background: "rgba(39, 39, 39, 0.28)" }}
              onPointerEnter={(e) => {
                const overlay = e.currentTarget.querySelector<HTMLElement>("[data-glow]");
                if (!overlay) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                const size = Math.round(Math.max(rect.width, rect.height) * 0.92);
                overlay.style.background = `radial-gradient(circle ${size}px at ${x}% ${y}%, var(--material-interactive-glow-core) 0%, var(--material-interactive-glow-edge) 34%, transparent 72%)`;
                overlay.style.opacity = "0.2";
              }}
              onPointerMove={(e) => {
                const overlay = e.currentTarget.querySelector<HTMLElement>("[data-glow]");
                if (!overlay) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                const size = Math.round(Math.max(rect.width, rect.height) * 0.92);
                overlay.style.background = `radial-gradient(circle ${size}px at ${x}% ${y}%, var(--material-interactive-glow-core) 0%, var(--material-interactive-glow-edge) 34%, transparent 72%)`;
                overlay.style.opacity = "0.2";
              }}
              onPointerLeave={(e) => {
                const overlay = e.currentTarget.querySelector<HTMLElement>("[data-glow]");
                if (overlay) overlay.style.opacity = "0";
              }}
            >
              <span
                data-glow
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200"
              />
              <div className="relative z-10 flex -space-x-2 max-[479px]:h-6 max-[479px]:w-6 max-[479px]:space-x-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Image
                    key={i}
                    src={`/images/avatars/user${i}.png`}
                    alt=""
                    width={32}
                    height={32}
                    className={`h-8 w-8 rounded-full border-2 border-black object-cover transition-opacity duration-500 max-[479px]:h-6 max-[479px]:w-6 max-[479px]:absolute max-[479px]:left-0 max-[479px]:top-0 ${activeAvatar === i - 1 ? "max-[479px]:opacity-100" : "max-[479px]:opacity-0"}`}
                  />
                ))}
              </div>
              <span className="relative z-10 type-body-l text-[var(--color-text-muted)] max-[479px]:text-[length:var(--font-size-body-m)] max-[479px]:leading-[var(--line-height-body-m)]">
                Used by thousands in 90+ countries
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
