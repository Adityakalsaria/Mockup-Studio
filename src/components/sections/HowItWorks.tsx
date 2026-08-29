"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const steps = [
  {
    number: "01",
    title: "Sign up in minutes",
    description:
      "Quick KYC verification and you're ready to go. No branch visits, no paperwork.",
    color: "#2563eb",
  },
  {
    number: "02",
    title: "Fund your account",
    description:
      "Bank transfer, crypto deposit, or stablecoin swap. Choose what works for you.",
    color: "#8b5cf6",
  },
  {
    number: "03",
    title: "Send, spend, grow",
    description:
      "Use the card anywhere, send global payouts, and manage your money. All from one app.",
    color: "#10b981",
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // Light → dark background transition
      gsap.fromTo(
        section,
        { backgroundColor: "#ffffff" },
        {
          backgroundColor: "#050505",
          duration: 1,
          scrollTrigger: {
            trigger: section,
            start: "top 50%",
            end: "top 20%",
            scrub: 1,
          },
        }
      );

      // Heading crossfade
      gsap.to("[data-hiw-heading-light]", {
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
        "[data-hiw-heading-dark]",
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
      gsap.to("[data-hiw-subtitle]", {
        color: "#a1a1aa",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Step line color transition
      gsap.to("[data-hiw-line]", {
        borderColor: "#262626",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Step number color
      gsap.to("[data-hiw-number]", {
        color: "#a1a1aa",
        borderColor: "#262626",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Step title color
      gsap.to("[data-hiw-title]", {
        color: "#fafafa",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Step description color
      gsap.to("[data-hiw-desc]", {
        color: "#a1a1aa",
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: "top 50%",
          end: "top 20%",
          scrub: 1,
        },
      });

      // Steps fade up with stagger
      gsap.from("[data-hiw-step]", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "[data-hiw-steps]",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-white py-[var(--spacing-section)]"
    >
      <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col items-center gap-[var(--space-64)] ds-page-gutter">
        {/* Heading with crossfade */}
        <div className="flex flex-col items-center gap-[var(--spacing-sm)] text-center">
          <div className="relative">
            <h2
              data-hiw-heading-light
              className="type-h1"
              style={{
                background: "linear-gradient(to right, #000000, #2d2d2d)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              How it works
            </h2>
            <h2
              data-hiw-heading-dark
              className="type-h1 absolute inset-0 opacity-0"
              style={{
                background: "linear-gradient(to right, #ffffff, #d2d2d2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              aria-hidden="true"
            >
              How it works
            </h2>
          </div>
          <p
            data-hiw-subtitle
            className="type-body-m max-w-[400px] text-text-muted"
            style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
          >
            Three simple steps to take control of your global finances.
          </p>
        </div>

        {/* Steps */}
        <div
          data-hiw-steps
          className="flex w-full max-w-[800px] flex-col gap-0"
        >
          {steps.map((step, i) => (
            <div
            key={step.number}
            data-hiw-step
            className={`flex gap-[var(--spacing-md)] tablet:gap-[var(--spacing-lg)] ${
                i < steps.length - 1
                  ? "border-b border-[#e5e5e5] pb-[var(--space-40)]"
                  : ""
              } ${i > 0 ? "pt-[var(--space-40)]" : ""}`}
            data-hiw-line={i < steps.length - 1 ? "" : undefined}
          >
              {/* Step number */}
              <div className="flex shrink-0 flex-col items-center">
                <span
                  data-hiw-number
                  className="type-action flex h-12 w-12 items-center justify-center rounded-full border border-[#e5e5e5] text-text-muted tablet:h-14 tablet:w-14"
                  style={{ fontFeatureSettings: "'lnum' 1, 'tnum' 1" }}
                >
                  {step.number}
                </span>
              </div>

              {/* Step content */}
              <div className="flex flex-col gap-[var(--spacing-2xs)] pt-[var(--space-4)]">
                <h3
                  data-hiw-title
                  className="type-h3 text-text-primary"
                  style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
                >
                  {step.title}
                </h3>
                <p
                  data-hiw-desc
                  className="type-body-m max-w-[440px] text-text-muted"
                  style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
