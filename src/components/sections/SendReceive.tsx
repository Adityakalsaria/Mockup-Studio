"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import Image from "next/image";

export default function SendReceive() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Text fade up
      gsap.from("[data-sr-text] > *", {
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

      // Phone slide in from right
      gsap.from("[data-sr-phone]", {
        x: 80,
        opacity: 0,
        duration: 1.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: section,
          start: "top 65%",
          toggleActions: "play none none reverse",
        },
      });

      // Floating transaction cards stagger in
      gsap.from("[data-sr-card]", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "[data-sr-phone]",
          start: "top 60%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="send-receive"
      className="relative overflow-hidden bg-[#050505] py-[var(--spacing-section)]"
    >
      <div className="ds-page-gutter mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col items-center gap-[var(--space-64)] laptop:flex-row">
        {/* Left: Text */}
        <div data-sr-text className="flex max-w-[480px] flex-col gap-[var(--spacing-md)] laptop:flex-1">
          <h2
            className="type-h1"
            style={{
              background: "linear-gradient(to right, #ffffff, #d2d2d2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Send and receive
            <br />
            money, globally.
          </h2>
          <p
            className="type-body-m text-[var(--color-text-muted)]"
            style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
          >
            Move money across borders in seconds, not days. Powered by
            stablecoins for near-zero fees and real-time settlement.
          </p>

          {/* Feature pills */}
          <div className="mt-[var(--spacing-2xs)] flex flex-wrap gap-[var(--spacing-xs)]">
            {["Instant transfers", "Multi-currency", "Near-zero fees"].map(
              (label) => (
                <span
                  key={label}
                  className="type-micro rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--spacing-sm)] py-[var(--spacing-2xs)] text-[var(--color-text-muted)]"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Right: Phone mockup with floating cards */}
        <div className="relative flex flex-1 items-center justify-center laptop:justify-end">
          <div
            data-sr-phone
            className="relative h-[480px] w-[240px] tablet:h-[560px] tablet:w-[280px] laptop:h-[640px] laptop:w-[320px]"
          >
            {/* Phone frame */}
            <div className="h-full w-full overflow-hidden rounded-[40px] border border-[#2a2a2a] bg-[#111]">
              <Image
                src="/images/phone-mockup.png"
                alt="Kosh send and receive interface"
                width={640}
                height={558}
                sizes="(max-width: 640px) 240px, (max-width: 768px) 280px, 320px"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Floating transaction cards */}
            <div
              data-sr-card
              className="absolute -left-8 top-[25%] rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]/90 px-4 py-3 backdrop-blur-md tablet:-left-12"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 19V5m-7 7 7-7 7 7" />
                  </svg>
                </div>
                <div>
                  <p className="type-micro text-text-primary">Received</p>
                  <p className="type-micro text-text-muted">+$2,400.00</p>
                </div>
              </div>
            </div>

            <div
              data-sr-card
              className="absolute -right-6 top-[50%] rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]/90 px-4 py-3 backdrop-blur-md tablet:-right-10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14m7-7-7 7-7-7" />
                  </svg>
                </div>
                <div>
                  <p className="type-micro text-text-primary">Sent</p>
                  <p className="type-micro text-text-muted">-$850.00</p>
                </div>
              </div>
            </div>

            <div
              data-sr-card
              className="absolute -left-4 bottom-[20%] rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]/90 px-4 py-3 backdrop-blur-md tablet:-left-8"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="type-micro text-text-primary">Converted</p>
                  <p className="type-micro text-text-muted">USD → EUR</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
