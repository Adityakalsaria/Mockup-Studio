"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const features = [
  {
    title: "Multi-currency VBA",
    description:
      "Hold USD, EUR, GBP, and more in virtual bank accounts. All in one place.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    title: "Local bank details",
    description:
      "Receive payments like a local with dedicated account numbers in major markets.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    ),
  },
  {
    title: "Instant funding",
    description:
      "Fund your account via bank transfer, crypto deposit, or stablecoin swap in seconds.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: "No hidden fees",
    description:
      "Transparent pricing with no monthly charges, minimum balances, or surprise costs.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
      </svg>
    ),
  },
];

export default function VirtualAccounts() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Dark → light background transition
      gsap.fromTo(
        section,
        { backgroundColor: "#050505" },
        {
          backgroundColor: "#ffffff",
          duration: 1,
          scrollTrigger: {
            trigger: section,
            start: "top 50%",
            end: "top 20%",
            scrub: 1,
          },
        }
      );

      // Heading gradient crossfade
      gsap.to("[data-va-heading-dark]", {
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });
      gsap.fromTo(
        "[data-va-heading-light]",
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: section,
            start: "top 50%",
            end: "top 20%",
            scrub: 1,
          },
        }
      );

      // Subtitle color transition
      gsap.to("[data-va-subtitle]", {
        color: "#737373",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Card border/bg transitions
      gsap.to("[data-va-card]", {
        borderColor: "#e5e5e5",
        backgroundColor: "#f5f5f5",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Card icon containers
      gsap.to("[data-va-card-icon]", {
        backgroundColor: "#ececec",
        color: "#000000",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Card title text
      gsap.to("[data-va-card-title]", {
        color: "#000000",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Card description text
      gsap.to("[data-va-card-desc]", {
        color: "#737373",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Feature pill transitions
      gsap.to("[data-va-pill]", {
        borderColor: "#e5e5e5",
        backgroundColor: "#f5f5f5",
        color: "#737373",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Cards fade up with stagger
      gsap.from("[data-va-card]", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "[data-va-grid]",
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
      id="virtual-accounts"
      className="bg-[#050505] py-[var(--spacing-section)]"
    >
      <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col items-center gap-[var(--space-48)] ds-page-gutter">
        {/* Heading with crossfade */}
        <div className="flex flex-col items-center gap-[var(--spacing-sm)] text-center">
          <div className="relative">
            <h2
              data-va-heading-dark
              className="type-h1"
              style={{
                background: "linear-gradient(to right, #ffffff, #d2d2d2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Your accounts,
              <br />
              everywhere.
            </h2>
            <h2
              data-va-heading-light
              className="type-h1 absolute inset-0 opacity-0"
              style={{
                background: "linear-gradient(to right, #000000, #2d2d2d)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              aria-hidden="true"
            >
              Your accounts,
              <br />
              everywhere.
            </h2>
          </div>
          <p
            data-va-subtitle
            className="type-body-m max-w-[420px] text-[var(--color-text-muted)]"
            style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
          >
            Open virtual bank accounts in multiple currencies. Receive payments
            like a local, spend like a global citizen.
          </p>
        </div>

        {/* Feature grid */}
        <div
          data-va-grid
          className="grid w-full max-w-[960px] grid-cols-1 gap-[var(--spacing-sm)] tablet:grid-cols-2 tablet:gap-[var(--spacing-md)]"
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              data-va-card
              className="flex flex-col gap-[var(--spacing-sm)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--spacing-md)] tablet:p-[var(--spacing-lg)]"
            >
              <div
                data-va-card-icon
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-foreground)]"
              >
                {feature.icon}
              </div>
              <h3
                data-va-card-title
                className="type-h3 text-[var(--color-foreground)]"
                style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
              >
                {feature.title}
              </h3>
              <p
                data-va-card-desc
                className="type-body-m text-[var(--color-text-muted)]"
                style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
