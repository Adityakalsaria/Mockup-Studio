"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { Leva, useControls } from "leva";
import Navbar from "@/components/layout/Navbar";
import UsdHeroSection from "@/components/sections/UsdHeroSection";
import KeyFeatures, { type KeyFeatureCard } from "@/components/sections/KeyFeatures";
import PowerfulFeatures, { type PowerfulFeatureItem } from "@/components/sections/PowerfulFeatures";
import UsdValueStrip from "@/components/sections/UsdValueStrip";
import CardRewardsFeatureList from "@/components/sections/CardRewardsFeatureList";
import CardBusinessSection from "@/components/sections/CardBusinessSection";
import StepsToGetUsdAccount from "@/components/sections/StepsToGetUsdAccount";
import MoreThanUsdAccountSection from "@/components/sections/MoreThanUsdAccountSection";
import GlobalCardCtaSection from "@/components/sections/GlobalCardCtaSection";
import FAQsSection from "@/components/sections/FAQsSection";
import FloatingCta from "@/components/ui/FloatingCta";
import FloatingQRCode from "@/components/ui/FloatingQRCode";
import FooterSection from "@/components/sections/FooterSection";
import { gsap } from "@/lib/gsap";

const IS_DEV = process.env.NODE_ENV === "development";
const CARD_PRIMARY_FEATURE: KeyFeatureCard = {
  title: "Works globally",
  description:
    "Local cards don't work internationally. This solves that user thought: \"I can finally pay for tools, subscriptions, and travel\"",
  bullets: [
    { icon: "globe", label: "Highlight countries" },
    { icon: "bank", label: "Highlight tools and services" },
    { icon: "check", label: "Highlight vacations" },
  ],
  visualKind: "globe",
  tone: "wide",
};

const CARD_SECONDARY_FEATURES: KeyFeatureCard[] = [
  {
    title: "Spend USD directly",
    description:
      "No forced conversion to local currency. Hold USD -> spend USD. User thought: \"I don't lose money in conversion, and I keep my earnings in dollars\"",
    bullets: [
      { icon: "familyCard", label: "Highlight linking of card with VBA and USD" },
      { icon: "money", label: "Highlight USD acceptance" },
      { icon: "check", label: "Highlight remove friction of conversion" },
    ],
    imageSrc: "/figma-assets/global-card/key-features/spend-usd-wallet-v2.png",
    imageBlendMode: "lighten",
    tone: "half",
  },
  {
    title: "Built for modern earners",
    description:
      "Freelancers, Crypto users, Businesses. User thought: \"This is made for how I earn and spend\"",
    bullets: [
      { icon: "notification", label: "Cashback on travel and hotels" },
      { icon: "money", label: "Points on every transaction" },
      { icon: "check", label: "Access to partner offers" },
    ],
    visualKind: "us-payments",
    tone: "half",
  },
] as const;

const CARD_POWERFUL_FEATURES: PowerfulFeatureItem[] = [
  {
    title: "Card controls",
    description:
      "Set spending limits, freeze or unfreeze instantly, and lock cards to specific categories or merchants.",
    imageSrc: "/figma-assets/global-card/powerful-features/card-control.png",
    renderOriginal: true,
  },
  {
    title: "Instant Virtual Card",
    description:
      "Create a virtual card in seconds for tools, subscriptions, software, and online payments.",
    imageSrc: "/figma-assets/global-card/powerful-features/instant-virtual-card.png",
    renderOriginal: true,
  },
  {
    title: "Get Physical Card",
    description:
      "Order a physical card for travel, everyday spending, and anywhere card-present payments are needed.",
    imageSrc: "/figma-assets/global-card/powerful-features/get-physical-card.png",
    renderOriginal: true,
  },
  {
    title: "Apple Pay / Google Pay",
    description:
      "Add your card to Apple Pay or Google Pay for fast wallet-based payments on the go.",
    imageSrc: "/figma-assets/global-card/powerful-features/apple-pay-google-pay.png",
    renderOriginal: true,
  },
  {
    title: "Spent Analysis",
    description:
      "Track every transaction and understand where your money is going with simple spending visibility.",
    imageSrc: "/figma-assets/global-card/powerful-features/spend-analysis.png",
    renderOriginal: true,
  },
] as const;

const CARD_VALUE_ITEMS = [
  "Works anywhere Visa is accepted",
  "Issue a virtual card instantly",
  "Freeze and manage card controls live",
  "Add to Apple Pay and Google Pay",
] as const;

function SectionDivider() {
  return (
    <div className="relative z-[1] hidden w-full bg-black tablet:block">
      <div className="layout-content ds-page-gutter py-[20px] tablet:py-[24px] desktop:py-[28px]">
        <div
          aria-hidden
          className="h-[1px] w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--color-divider) 0, var(--color-divider) 4px, transparent 4px, transparent 8px)",
          }}
        />
      </div>
    </div>
  );
}

function GridOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <div className="layout-content ds-page-gutter h-full">
        <div className="mx-auto hidden h-full w-full max-w-[554px] grid-cols-2 gap-x-[var(--space-48)] tablet:grid laptop:hidden">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`mobile-grid-${index}`}
              className="h-full border-x border-[#FF0000]/[0.08] bg-[#FF0000]/[0.12]"
            />
          ))}
        </div>

        <div className="mx-auto hidden h-full w-full max-w-[944px] grid-cols-4 gap-x-[32px] laptop:grid desktop:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`laptop-grid-${index}`}
              className="h-full border-x border-[#FF0000]/[0.08] bg-[#FF0000]/[0.12]"
            />
          ))}
        </div>

        <div className="hidden h-full w-full desktop:grid desktop:grid-cols-12 desktop:gap-x-[32px]">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={`desktop-grid-${index}`}
              className="h-full border-x border-[#FF0000]/[0.08] bg-[#FF0000]/[0.12]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DevToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className="inline-flex min-h-[44px] items-center gap-[12px] rounded-[999px] border border-white/10 bg-[rgba(22,22,22,0.78)] px-[14px] py-[8px] text-left text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-[20px] transition-colors hover:bg-[rgba(28,28,28,0.86)]"
    >
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold leading-[15px]">{label}</span>
        <span className="text-[11px] leading-[13px] text-white/45">
          {enabled ? "On" : "Off"}
        </span>
      </span>
      <span
        aria-hidden
        className={`relative ml-[2px] h-[26px] w-[44px] rounded-full border border-white/10 transition-all duration-200 ${
          enabled
            ? "bg-[#34C759] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-[1px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
            enabled ? "translate-x-[19px]" : "translate-x-[1px]"
          }`}
        />
      </span>
    </button>
  );
}

export default function GlobalCardPreviewClient() {
  const mainRef = useRef<HTMLElement>(null);
  const [isGridEnabled, setIsGridEnabled] = useState(false);
  const [isOutlinesEnabled, setIsOutlinesEnabled] = useState(false);
  const heroVideoControls = useControls(
    "Hero Video",
    {
      topMobile: { value: 96, min: 0, max: 220, step: 1 },
      topTablet: { value: 110, min: 0, max: 260, step: 1 },
      topDesktop: { value: 56, min: 0, max: 220, step: 1 },
      heightMobile: { value: 300, min: 120, max: 520, step: 1 },
      heightTablet: { value: 360, min: 160, max: 640, step: 1 },
      heightDesktop: { value: 552, min: 220, max: 760, step: 1 },
      widthDesktop: { value: 1251, min: 720, max: 1440, step: 1 },
      opacity: { value: 0.88, min: 0.1, max: 1, step: 0.01 },
      scale: { value: 1.2, min: 0.5, max: 2, step: 0.01 },
    },
    { collapsed: false }
  );

  useGSAP(
    () => {
      const main = mainRef.current;
      if (!main) return;

      const business = main.querySelector<HTMLElement>("#card-business-section");
      const steps = main.querySelector<HTMLElement>("#steps-to-get-usd-account");

      if (!business || !steps) return;

      gsap.set(main, { backgroundColor: "#000000", willChange: "background-color" });

      gsap.to(main, {
        backgroundColor: "#ffffff",
        ease: "none",
        scrollTrigger: {
          trigger: business,
          start: "top bottom",
          end: "top 35%",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      gsap.to(main, {
        backgroundColor: "#000000",
        ease: "none",
        scrollTrigger: {
          trigger: steps,
          start: "top 72%",
          end: "top top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: mainRef }
  );

  return (
    <main
      ref={mainRef}
      className={`relative min-h-screen bg-black ${isOutlinesEnabled ? "dev-outlines" : ""}`}
    >
      {IS_DEV ? (
        <>
          <Leva
            hidden
            oneLineLabels
            hideCopyButton
            titleBar={{ title: "Hero Video", drag: true, filter: false }}
          />
          <style jsx global>{`
            .dev-outlines *,
            .dev-outlines *::before,
            .dev-outlines *::after {
              outline: 1px solid rgba(255, 255, 255, 0.12);
              outline-offset: -1px;
            }
            .dev-outlines article,
            .dev-outlines header,
            .dev-outlines footer,
            .dev-outlines nav,
            .dev-outlines aside {
              outline: 1px dashed rgba(255, 100, 200, 0.45);
              outline-offset: -1px;
            }
            .dev-outlines .layout-content {
              outline: 1px dashed rgba(255, 200, 0, 0.6);
              outline-offset: -1px;
            }
            .dev-outlines section {
              outline: 1px dashed rgba(0, 200, 255, 0.6);
              outline-offset: -1px;
            }
          `}</style>
          <div className="fixed right-[max(16px,env(safe-area-inset-right))] top-[16px] z-[9999] hidden flex-col gap-[8px] tablet:flex">
            <DevToggle
              label="Grid Overlay"
              enabled={isGridEnabled}
              onToggle={() => setIsGridEnabled((value) => !value)}
            />
            <DevToggle
              label="Outlines"
              enabled={isOutlinesEnabled}
              onToggle={() => setIsOutlinesEnabled((value) => !value)}
            />
          </div>
          {isGridEnabled ? <GridOverlay /> : null}
        </>
      ) : null}

      <Navbar />
      <UsdHeroSection
        pillLabels={["FOR FREELANCERS AND BUSINESSES"]}
        titleLines={["A card for people", "who earn in US Dollar"]}
        description="A global card that works across tools, travel, and everyday payments, built for people who earn in dollars."
        ctaLabel="Get your card"
        videoSrc="/figma-assets/global-card/hero-card-video.mp4"
        showVideoOutline={isOutlinesEnabled}
        videoFit="contain"
        videoScale={heroVideoControls.scale}
        videoControls={heroVideoControls}
      />
      <SectionDivider />
      <UsdValueStrip items={CARD_VALUE_ITEMS} />
      <SectionDivider />
      <KeyFeatures
        sectionTitle={<>How this card works<br />for YOU</>}
        sectionDescription="Issue physical and virtual cards funded by your KOSH USD balance. Spend anywhere Visa is accepted, manage team cards with full control, and earn rewards on every transaction."
        primaryCard={CARD_PRIMARY_FEATURE}
        secondaryCards={CARD_SECONDARY_FEATURES}
      />
      <PowerfulFeatures
        sectionTitle="Everything you need to spend with confidence"
        sectionDescription="Controls, alerts, and rewards built into every card. Issue in seconds, spend globally, and stay on top of every transaction."
        features={CARD_POWERFUL_FEATURES}
        initialActiveIndex={2}
      />
      <CardRewardsFeatureList />
      <CardBusinessSection interactiveOnScroll />
      <StepsToGetUsdAccount />
      <MoreThanUsdAccountSection />
      <GlobalCardCtaSection />
      <FAQsSection />
      <FooterSection />
      <FloatingCta label="Get your card" />
      <FloatingQRCode />
    </main>
  );
}
