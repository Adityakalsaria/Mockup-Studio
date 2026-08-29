"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const features = [
  { label: "Contactless", icon: "contactless" },
  { label: "Apple Pay", icon: "apple" },
  { label: "Real-time alerts", icon: "bell" },
  { label: "Freeze instantly", icon: "lock" },
];

function FeatureIcon({ type }: { type: string }) {
  switch (type) {
    case "contactless":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8.5 16.5a5 5 0 0 1 0-9M12 19a8 8 0 0 0 0-14M15.5 16.5a5 5 0 0 0 0-9" />
        </svg>
      );
    case "apple":
      return (
        <svg width="16" height="18" viewBox="0 0 16 20" fill="currentColor">
          <path d="M13.2 10.5c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.7-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.7-2.7-.7C4.5 5.7 3 6.8 2.2 8.4.5 11.6 1.7 16.4 3.3 19c.8 1.2 1.8 2.5 3 2.5 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8 2.1-1.2 2.9-2.4c.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-3.8zM10.8 4.2c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.7-1.3z" />
        </svg>
      );
    case "bell":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "lock":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function CardShowcase() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Card enters with scale + rotation (Apple Card style)
      gsap.from("[data-card-visual]", {
        scale: 0.8,
        rotateY: 12,
        rotateX: 8,
        opacity: 0,
        duration: 1.4,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 65%",
          toggleActions: "play none none reverse",
        },
      });

      // Text fades up
      gsap.from("[data-card-text] > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });

      // Feature pills animate in with stagger
      gsap.from("[data-card-feature]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "[data-card-features]",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="card-showcase"
      className="theme-light overflow-hidden py-[var(--spacing-section)]"
    >
      <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col items-center gap-[var(--space-48)] ds-page-gutter">
        {/* Text */}
        <div data-card-text className="flex flex-col items-center gap-[var(--spacing-sm)] text-center">
          <h2
            className="type-h1"
            style={{
              background: "linear-gradient(to right, #000000, #2d2d2d)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            The card that works
            <br />
            everywhere.
          </h2>
          <p
            className="type-body-m max-w-[440px] text-[var(--color-text-muted)]"
            style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
          >
            Crypto-powered, universally accepted. Spend anywhere, track
            everything, control it all from your phone.
          </p>
        </div>

        {/* Card visual — cinematic full-width */}
        <div
          data-card-visual
          className="relative w-full max-w-[640px]"
          style={{ perspective: "1200px" }}
        >
          <div className="relative aspect-[1.586/1] w-full">
            {/* Card render — placeholder gradient card */}
            <div
              className="h-full w-full rounded-2xl tablet:rounded-3xl"
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)",
                boxShadow: "0 40px 80px -20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
            >
              {/* Card inner content */}
              <div className="flex h-full flex-col justify-between p-[var(--spacing-md)] tablet:p-[var(--spacing-lg)] desktop:p-[var(--space-40)]">
                {/* Chip + contactless */}
                <div className="flex items-start justify-between">
                  <div className="h-8 w-10 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 tablet:h-10 tablet:w-12" />
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                    <path d="M8.5 16.5a5 5 0 0 1 0-9M12 19a8 8 0 0 0 0-14M15.5 16.5a5 5 0 0 0 0-9" />
                  </svg>
                </div>

                {/* Card number area */}
                <div className="flex flex-col gap-[var(--spacing-xs)]">
                  <p className="type-micro font-mono tracking-[0.2em] text-text-secondary">
                    •••• •••• •••• 4289
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="type-micro uppercase tracking-wider text-text-muted">
                      Kosh Cardholder
                    </p>
                    <p className="type-micro text-text-muted">
                      09/28
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle light reflection */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl tablet:rounded-3xl"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)",
              }}
            />
          </div>
        </div>

        {/* Feature pills */}
        <div data-card-features className="flex flex-wrap items-center justify-center gap-[var(--spacing-xs)]">
          {features.map((f) => (
            <div
              key={f.label}
              data-card-feature
              className="type-micro flex items-center gap-[var(--spacing-2xs)] rounded-full border border-[#e5e5e5] bg-[#f5f5f5] px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-[var(--color-text-muted)]"
            >
              <FeatureIcon type={f.icon} />
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
