"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import Button from "@/components/ui/Button";

export default function CTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Text fade up
      gsap.from("[data-cta-content] > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="cta"
      className="flex min-h-[80vh] items-center justify-center bg-[#050505] py-[var(--spacing-section)]"
    >
      <div
        data-cta-content
        className="flex flex-col items-center gap-[var(--spacing-md)] px-[var(--spacing-sm)] text-center tablet:gap-[var(--spacing-lg)]"
      >
        <h2
          className="type-display max-w-[600px]"
          style={{
            background: "linear-gradient(to right, #ffffff, #d2d2d2)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Your financial future
          <br />
          starts here.
        </h2>
        <p
          className="type-body-m max-w-[400px] text-text-muted"
          style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
        >
          Join thousands building their financial future with KOSH.
          Get started in minutes.
        </p>
        <div className="mt-[var(--spacing-2xs)] flex flex-col items-center gap-[var(--spacing-sm)] tablet:flex-row">
          <Button
            variant="primary"
            className="px-[var(--space-32)] py-[var(--spacing-xs)]"
          >
            Get Started
          </Button>
        </div>

        {/* App store badges placeholder */}
        <div className="mt-[var(--spacing-sm)] flex items-center gap-[var(--spacing-xs)]">
          <div className="flex items-center gap-[var(--spacing-2xs)] rounded-lg border border-[#262626] bg-[#111] px-[var(--spacing-sm)] py-[var(--spacing-xs)]">
            <svg width="18" height="22" viewBox="0 0 16 20" fill="white">
              <path d="M13.2 10.5c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.7-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.7-2.7-.7C4.5 5.7 3 6.8 2.2 8.4.5 11.6 1.7 16.4 3.3 19c.8 1.2 1.8 2.5 3 2.5 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8 2.1-1.2 2.9-2.4c.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-3.8zM10.8 4.2c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.7-1.3z" />
            </svg>
            <div className="flex flex-col">
              <span className="type-micro leading-none text-text-muted">Download on the</span>
              <span className="type-micro text-text-primary">App Store</span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-2xs)] rounded-lg border border-[#262626] bg-[#111] px-[var(--spacing-sm)] py-[var(--spacing-xs)]">
            <svg width="18" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z" fill="#4285F4" />
              <path d="M16.81 15.12L6.05 21.67L13.69 12L16.81 15.12Z" fill="#F44336" />
              <path d="M20.16 10.81C20.5 11.08 20.5 11.92 20.16 12.19L16.81 15.12L13.69 12L16.81 8.88L20.16 10.81Z" fill="#FFC107" />
              <path d="M6.05 2.33L16.81 8.88L13.69 12L6.05 2.33Z" fill="#4CAF50" />
            </svg>
            <div className="flex flex-col">
              <span className="type-micro leading-none text-text-muted">Get it on</span>
              <span className="type-micro text-text-primary">Google Play</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
