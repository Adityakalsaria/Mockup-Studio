"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type FeatureItem = {
  title: string;
  description: string;
  imageSrc: string;
  imageFit?: "cover" | "contain";
  renderOriginal?: boolean;
};

export type PowerfulFeatureItem = FeatureItem;

const FEATURES: FeatureItem[] = [
  {
    title: "Payment tracking",
    description:
      "Track every incoming payment in real time, with clear status updates from initiation to completion.",
    imageSrc: "/figma-assets/powerful-features/payment-tracking-new.png",
  },
  {
    title: "Instant notifications",
    description:
      "Stay updated in real time with alerts for every incoming and outgoing transaction.",
    imageSrc: "/figma-assets/powerful-features/instant-notifications-custom.png",
  },
  {
    title: "Low cost FX conversion",
    description:
      "Convert between currencies at competitive rates with minimal fees and full transparency.",
    imageSrc: "/figma-assets/powerful-features/low-fx-new.png",
  },
  {
    title: "Invoice generation",
    description:
      "Create and send professional invoices to clients and get paid directly into your account.",
    imageSrc: "/figma-assets/powerful-features/invoice-generation-new.png",
  },
  {
    title: "Downloadable statements",
    description:
      "Export monthly statements for accounting, taxes, and audits, formatted for your records and ready to share.",
    imageSrc: "/figma-assets/powerful-features/statements-new.png",
  },
] as const;

const DEFAULT_SECTION_TITLE = "Everything you need to manage global payments";
const DEFAULT_SECTION_DESCRIPTION =
  "Manage incoming payments, track transactions in real time, generate invoices, and control your global finances from one place.";

function ToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[20px] w-[20px] shrink-0 text-white/40 transition-transform duration-300 ease-out"
      fill="none"
      style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
    >
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PowerfulFeatures({
  sectionTitle = DEFAULT_SECTION_TITLE,
  sectionDescription = DEFAULT_SECTION_DESCRIPTION,
  features = FEATURES,
  initialActiveIndex = 0,
}: {
  sectionTitle?: string;
  sectionDescription?: string;
  features?: ReadonlyArray<PowerfulFeatureItem>;
  initialActiveIndex?: number;
}) {
  const safeInitialIndex =
    features.length === 0
      ? 0
      : Math.min(Math.max(initialActiveIndex, 0), features.length - 1);
  const [activeIndex, setActiveIndex] = useState(safeInitialIndex);
  const [isHoverMode, setIsHoverMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 1000px) and (hover: hover) and (pointer: fine)"
    );
    const syncMode = () => setIsHoverMode(mediaQuery.matches);

    syncMode();
    mediaQuery.addEventListener("change", syncMode);

    return () => mediaQuery.removeEventListener("change", syncMode);
  }, []);

  return (
    <section
      id="powerful-features"
      className="w-full bg-black py-[var(--spacing-section)] desktop:pt-[112px] desktop:pb-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        {/* Mobile-only linear list */}
        <div className="laptop:hidden">
          <h2 className="type-h1 text-text-primary">
            {sectionTitle}
          </h2>
          <p className="type-body-l mt-[var(--space-16)] max-w-[520px] text-text-secondary">
            {sectionDescription}
          </p>

          <div className="mt-[var(--space-48)] flex flex-col gap-[var(--space-32)]">
            {features.map((feature, index) => (
              <div key={feature.title} className="flex flex-col">
                <h3 className="type-h5 text-text-primary">{feature.title}</h3>
                <p className="type-body-m mt-[var(--space-12)] text-text-secondary">
                  {feature.description}
                </p>
                <div className="mt-[var(--space-20)] overflow-hidden rounded-[20px]">
                  {feature.renderOriginal ? (
                    <img
                      src={feature.imageSrc}
                      alt={feature.title}
                      className={`h-auto w-full ${feature.imageFit === "contain" ? "object-contain" : ""}`}
                    />
                  ) : (
                    <Image
                      src={feature.imageSrc}
                      alt={feature.title}
                      width={1200}
                      height={900}
                      className={`h-auto w-full ${feature.imageFit === "contain" ? "object-contain" : ""}`}
                      sizes="100vw"
                    />
                  )}
                </div>
                {index < features.length - 1 ? (
                  <div
                    aria-hidden
                    className="mt-[var(--space-32)] h-[1px] w-full"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, var(--color-divider) 0, var(--color-divider) 4px, transparent 4px, transparent 8px)",
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-1 gap-y-[var(--space-48)] laptop:grid laptop:grid-cols-12 laptop:gap-x-[32px] laptop:gap-y-0">
          {/* Left column — header + accordion */}
          <div className="order-2 laptop:order-1 laptop:col-span-4 laptop:min-h-[700px]">
            <div className="flex h-full flex-col">
              <div>
                <h2 className="type-h1 text-text-primary">
                  {sectionTitle}
                </h2>
                <p className="type-body-l mt-[var(--space-16)] max-w-[520px] text-text-secondary">
                  {sectionDescription}
                </p>
              </div>

              {/* Accordion */}
              <div className="mt-[96px] flex flex-col">
                {features.map((feature, index) => {
                  const isActive = index === activeIndex;
                  const detailsId = `powerful-feature-${index}`;
                  const isFirst = index === 0;

                  return (
                    <div
                      key={feature.title}
                      className={`border-white/[0.08] ${isFirst ? "border-t" : ""} border-b`}
                    >
                      <h3>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isHoverMode) setActiveIndex(index);
                          }}
                          onMouseEnter={() => {
                            if (isHoverMode) setActiveIndex(index);
                          }}
                          onFocus={() => {
                            if (isHoverMode) setActiveIndex(index);
                          }}
                          aria-expanded={isActive}
                          aria-controls={detailsId}
                          className="flex w-full cursor-pointer items-center justify-between gap-[var(--space-16)] py-[var(--space-20)] text-left"
                        >
                          <span
                            className={`type-h5 transition-colors duration-200 ${
                              isActive
                                ? "text-text-primary"
                                : "text-white/40"
                            }`}
                          >
                            {feature.title}
                          </span>
                          <ToggleIcon isOpen={isActive} />
                        </button>
                      </h3>

                      <div
                        id={detailsId}
                        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
                        style={{
                          gridTemplateRows: isActive ? "1fr" : "0fr",
                          opacity: isActive ? 1 : 0,
                        }}
                      >
                        <div className="overflow-hidden">
                          <p className="type-body-m max-w-[480px] pb-[var(--space-20)] text-text-secondary">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column — preview image with animated background glow */}
          <div className="order-1 laptop:order-2 laptop:col-span-8 laptop:pl-[32px]">
            <div className="relative min-h-[360px] overflow-hidden rounded-[24px] tablet:min-h-[420px] laptop:h-full laptop:min-h-0">
              <div className="absolute inset-0 opacity-100 transition-opacity duration-300 ease-out">
                {features[activeIndex].renderOriginal ? (
                  <img
                    key={features[activeIndex].imageSrc}
                    src={features[activeIndex].imageSrc}
                    alt={features[activeIndex].title}
                    className={`h-full w-full ${features[activeIndex].imageFit === "contain" ? "object-contain" : "object-cover"} object-center`}
                  />
                ) : (
                  <Image
                    key={features[activeIndex].imageSrc}
                    src={features[activeIndex].imageSrc}
                    alt={features[activeIndex].title}
                    fill
                    priority={activeIndex === 0}
                    className={`${features[activeIndex].imageFit === "contain" ? "object-contain" : "object-cover"} object-center`}
                    sizes="(min-width: 1440px) 720px, (min-width: 1024px) 64vw, 100vw"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes pf-glow-a {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(60px, 40px) scale(1.2);
          }
        }
        @keyframes pf-glow-b {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(-50px, -30px) scale(1.15);
          }
        }
        @keyframes pf-glow-c {
          0% {
            transform: translate(0, 0) scale(0.9);
          }
          100% {
            transform: translate(30px, -40px) scale(1.1);
          }
        }
      `}</style>
    </section>
  );
}
