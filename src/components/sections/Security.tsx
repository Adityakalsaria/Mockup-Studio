"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import TrustBadge from "@/components/ui/TrustBadge";

const trustPoints = [
  {
    title: "Bank-grade encryption",
    description: "256-bit AES encryption protects every transaction and piece of personal data.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Licensed & regulated",
    description: "Fully compliant with financial regulations across all operating jurisdictions.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    title: "24/7 monitoring",
    description: "Real-time fraud detection and transaction monitoring around the clock.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Stablecoin-backed",
    description: "Your funds are backed 1:1 by regulated, audited stablecoin reserves.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M8 10h8M8 14h8" />
      </svg>
    ),
  },
  {
    title: "Instant settlements",
    description: "Blockchain-powered settlement means your money moves in real time.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: "Data privacy",
    description: "Your data is yours. We never sell personal information to third parties.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
];

export default function Security() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Heading fade up
      gsap.from("[data-sec-heading] > *", {
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

      // Grid items fade in with stagger
      gsap.from("[data-sec-item]", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "[data-sec-grid]",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="security"
      className="bg-[#050505] py-[var(--spacing-section)]"
    >
      <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col items-center gap-[var(--space-64)] ds-page-gutter">
        {/* Heading */}
        <div data-sec-heading className="flex flex-col items-center gap-[var(--spacing-sm)] text-center">
          <h2
            className="type-h1"
            style={{
              background: "linear-gradient(to right, #ffffff, #d2d2d2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Built on trust.
          </h2>
          <p
            className="type-body-m max-w-[400px] text-[var(--color-text-muted)]"
            style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
          >
            Security isn&apos;t a feature. It&apos;s the foundation everything
            else is built on.
          </p>
        </div>

        {/* Trust grid */}
        <div
          data-sec-grid
          className="grid w-full max-w-[960px] grid-cols-2 gap-[var(--space-32)] tablet:gap-[var(--space-48)] tablet:grid-cols-3"
        >
          {trustPoints.map((point) => (
            <div key={point.title} data-sec-item>
              <TrustBadge
                icon={point.icon}
                title={point.title}
                description={point.description}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
