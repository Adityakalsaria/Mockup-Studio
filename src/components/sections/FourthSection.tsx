"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "@/lib/gsap";
import LogoMarquee, { type LogoItem } from "@/components/ui/LogoMarquee";
import Image from "next/image";
import PhoneFrame from "@/components/ui/PhoneFrame";
import { FeatureIcon } from "@/components/ui/FeatureIcons";

const CURRENCIES = ["USD", "EURO", "AED"];
const CURRENCY_CYCLE_INTERVAL = 2500;

const STEP_SCREENS = [
  { src: "/images/offering-virtual-account.png", alt: "Virtual USD Account screen" },
  { src: "/images/offering-card.png", alt: "Card balance screen" },
  { src: "/images/offering-wallet.png", alt: "Total balance screen" },
];

const STEP_SCREENS_MOBILE = [
  { src: "/images/offering-virtual-account-mobile.webp", alt: "Virtual USD Account screen" },
  { src: "/images/offering-card-mobile.png", alt: "Card balance screen" },
  { src: "/images/offering-wallet-mobile.png", alt: "Total balance screen" },
];

type StepFeature = { icon: string; label: string };

const VBA_LOGOS = [
  { src: "/figma-assets/vba-usecase/Toptal.svg", alt: "Toptal" },
  { src: "/figma-assets/vba-usecase/deel.svg", alt: "Deel" },
  { src: "/figma-assets/vba-usecase/fiverr.svg", alt: "Fiverr" },
  { src: "/figma-assets/vba-usecase/freelancer.svg", alt: "Freelancer" },
  { src: "/figma-assets/vba-usecase/google ads.svg", alt: "Google Ads" },
  { src: "/figma-assets/vba-usecase/upwork.svg", alt: "Upwork" },
  { src: "/figma-assets/vba-usecase/youtube.svg", alt: "YouTube" },
];

const CARD_LOGOS: LogoItem[] = [
  { src: "/figma-assets/card-usecase/aws.svg", alt: "AWS" },
  { src: "/figma-assets/card-usecase/Canva.svg", alt: "Canva" },
  { src: "/figma-assets/card-usecase/claude.svg", alt: "Claude" },
  { src: "/figma-assets/card-usecase/figma.svg", alt: "Figma" },
  { src: "/figma-assets/card-usecase/gojek.svg", alt: "Gojek" },
  { src: "/figma-assets/card-usecase/Google Cloud.svg", alt: "Google Cloud" },
  { src: "/figma-assets/card-usecase/grab.svg", alt: "Grab" },
  { src: "/figma-assets/card-usecase/netflix.svg", alt: "Netflix" },
  { src: "/figma-assets/card-usecase/openai.svg", alt: "OpenAI" },
];

const PAY_LOGOS: LogoItem[] = [
  { src: "/figma-assets/pay-usecase/USDC.svg", alt: "USDC" },
  { src: "/figma-assets/pay-usecase/Indonesia.svg", alt: "Indonesia" },
  { src: "/figma-assets/pay-usecase/USA.svg", alt: "USA" },
  { src: "/figma-assets/pay-usecase/USDT.svg", alt: "USDT" },
  { src: "/figma-assets/pay-usecase/EU.svg", alt: "EU" },
  { src: "/figma-assets/pay-usecase/India.svg", alt: "India" },
  { src: "/figma-assets/pay-usecase/Thailand.svg", alt: "Thailand" },
  { src: "/figma-assets/pay-usecase/UAE.svg", alt: "UAE" },
];

const STEPS: {
  title: string;
  description: string;
  features: StepFeature[];
  logos?: LogoItem[];
  stats?: { value: string; label: string }[];
  flags?: { src: string; alt: string }[];
}[] = [
  {
    title: "Get paid globally\nwith your own\nUSD account",
    description:
      "You\u2019ll receive a virtual USD, EUR, and AED account with SWIFT support. Ready for international payments from any platform.",
    flags: [
      { src: "/figma-assets/pay-usecase/USA.svg", alt: "USD" },
      { src: "/figma-assets/pay-usecase/EU.svg", alt: "EUR" },
      { src: "/figma-assets/pay-usecase/UAE.svg", alt: "AED" },
    ],
    features: [
      { icon: "bank", label: "Named account" },
      { icon: "globe", label: "SWIFT account support" },
      { icon: "notification", label: "Micro-transaction support" },
      { icon: "check", label: "Get paid from any platform" },
    ],
    logos: VBA_LOGOS,
  },
  {
    title: "Manage every expense\nfrom a single app",
    description:
      "Pay all your bills with a stablecoin-backed Visa card. No need to move money to a separate bank account.",
    features: [
      { icon: "card", label: "Get virtual or physical card" },
      { icon: "aiAnalysis", label: "AI powered expense analysis" },
      { icon: "familyCard", label: "Assign cards to your family members" },
      { icon: "appleWallet", label: "Supports Apple Pay and Google Pay" },
      { icon: "check", label: "Pay all your bills with one app and earn rewards" },
    ],
    logos: CARD_LOGOS,
    stats: [
      { value: "5%", label: "Cashback on Hotel Booking" },
      { value: "10%", label: "Reward Points on each spend" },
    ],
  },
  {
    title: "All your money.\nPerfectly synced.",
    description:
      "Track all your balances and activity in real time, so your finances stay predictable and always within reach.",
    features: [
      { icon: "download", label: "Receive payments with Stablecoin or Fiat" },
      { icon: "bank", label: "Withdraw funds to your own bank account" },
      { icon: "email", label: "Send money by email, just like PayPal" },
      { icon: "money", label: "Send fiat or stablecoin globally" },
    ],
    logos: PAY_LOGOS,
  },
];

function FeatureRows({ features, logos }: { features: StepFeature[]; logos?: LogoItem[] }) {
  return (
    <div className="mt-[var(--space-16)]">
      {features.map((feature) => (
        <div
          key={feature.label}
          className="flex items-center gap-[var(--spacing-xs)] border-t border-white/12 py-[var(--space-20)]"
        >
          <FeatureIcon name={feature.icon} />
          <span className="type-action text-text-primary">
            {feature.label}
          </span>
        </div>
      ))}
      {logos && (
        <LogoMarquee
          logos={logos}
          className="border-t border-white/12 pt-[var(--space-24)]"
          logoHeight={28}
          gap={40}
          speed={60}
        />
      )}
    </div>
  );
}

export default function FourthSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [hoverScreen, setHoverScreen] = useState<number | null>(null);
  const desktopPanelRefs = useRef<(HTMLElement | null)[]>([]);
  const tabletPanelRefs = useRef<(HTMLElement | null)[]>([]);
  const displayedScreen = hoverScreen ?? activeStep;

  // Currency cycling animation (same pattern as hero keywords)
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const currencyElsRef = useRef<Set<HTMLSpanElement>>(new Set());

  const animateCurrency = useCallback((nextIndex: number) => {
    const els = Array.from(currencyElsRef.current);
    if (els.length === 0) return;
    const tl = gsap.timeline();
    tl.to(els, { opacity: 0, duration: 0.4, ease: "none", onComplete: () => setCurrencyIndex(nextIndex) })
      .to(els, { opacity: 1, duration: 0.4, ease: "none" });
  }, []);

  useEffect(() => {
    const indexRef = { current: 0 };
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % CURRENCIES.length;
      animateCurrency(next);
      indexRef.current = next;
    }, CURRENCY_CYCLE_INTERVAL);
    return () => clearInterval(id);
  }, [animateCurrency]);

  // Scroll-based step detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            let idx = desktopPanelRefs.current.indexOf(entry.target as HTMLElement);
            if (idx === -1) idx = tabletPanelRefs.current.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setActiveStep(idx);
          }
        });
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    [...desktopPanelRefs.current, ...tabletPanelRefs.current].forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Preload screen images
  useEffect(() => {
    STEP_SCREENS.forEach(({ src }) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  const handleFeatureHover = useCallback((index: number | null) => {
    setHoverScreen(index);
  }, []);

  return (
    <section id="fourth-section" className="bg-black">
      {/* Desktop layout */}
      <div className="layout-content ds-page-gutter hidden grid-cols-3 gap-[var(--space-32)] laptop:grid">
        {/* Left column — text panels */}
        <div className="min-w-0">
          {STEPS.map((step, i) => (
            <article
              key={step.title}
              ref={(el) => { desktopPanelRefs.current[i] = el; }}
              className="flex h-screen items-center"
            >
              <div className="w-full">
                <h2 className="whitespace-pre-line type-h1 text-text-primary">
                  {i === 0 ? (
                    <>
                      Get paid globally{"\n"}with your own{"\n"}
                      <span className="relative inline-grid overflow-hidden align-bottom [&>span]:col-start-1 [&>span]:row-start-1">
                        {CURRENCIES.map((c) => (
                          <span key={c} className="invisible" aria-hidden="true">{c} account</span>
                        ))}
                        <span ref={(el) => { if (el) currencyElsRef.current.add(el); }}>{CURRENCIES[currencyIndex]} account</span>
                      </span>
                    </>
                  ) : step.title}
                </h2>
                <p className="mt-[var(--space-16)] type-body-l text-text-secondary">{step.description}</p>
                {step.flags && (
                  <div className="mt-[var(--space-16)] flex gap-[var(--space-12)]">
                    {step.flags.map((flag) => (
                      <Image key={flag.alt} src={flag.src} alt={flag.alt} width={32} height={32} />
                    ))}
                  </div>
                )}
                {step.stats && (
                  <div className="mt-[var(--space-16)] flex gap-[var(--space-8)]">
                    {step.stats.map((stat) => (
                      <div key={stat.value} className="flex-1 rounded-[var(--radius-sm)] bg-white/8 p-[var(--space-24)]">
                        <p className="type-h3 text-text-primary">{stat.value}</p>
                        <p className="mt-[10px] type-body-m text-text-secondary">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
          {/* Spacer extends column height so center phone stays sticky while FutureSection scrolls over */}
          <div className="h-[200vh]" aria-hidden="true" />
        </div>

        {/* Center column — phone frame */}
        <div className="min-w-0">
          <div className="sticky top-[88px] flex h-[calc(100vh-88px)] items-center justify-center">
            <PhoneFrame
              screens={STEP_SCREENS}
              activeIndex={displayedScreen}
              className="h-[min(70dvh,697px)] w-auto"
            />
          </div>
        </div>

        {/* Right column — feature rows */}
        <div className="min-w-0">
          {STEPS.map((step, i) => (
            <article
              key={step.description}
              className="flex h-screen items-center"
              onMouseEnter={() => handleFeatureHover(i)}
              onMouseLeave={() => handleFeatureHover(null)}
            >
              <div className="max-w-[416px]">
                <FeatureRows features={step.features} logos={step.logos} />
              </div>
            </article>
          ))}
          {/* Spacer extends column height so center phone stays sticky while FutureSection scrolls over */}
          <div className="h-[200vh]" aria-hidden="true" />
        </div>
      </div>

      {/* Tablet layout — 2-column: sticky phone left, scrolling content right */}
      <div className="layout-content ds-page-gutter hidden grid-cols-2 gap-[var(--space-32)] tablet:grid laptop:hidden">
        {/* Left column — sticky phone */}
        <div className="min-w-0">
          <div className="sticky top-[88px] flex h-[calc(100vh-88px)] items-center justify-center">
            <PhoneFrame
              screens={STEP_SCREENS}
              activeIndex={displayedScreen}
              className="h-[min(60dvh,560px)] w-auto"
            />
          </div>
        </div>

        {/* Right column — scrolling content */}
        <div className="min-w-0">
          {STEPS.map((step, i) => (
            <article
              key={`${step.title}-tablet`}
              ref={(el) => { tabletPanelRefs.current[i] = el; }}
              className="flex min-h-screen items-center"
              onMouseEnter={() => handleFeatureHover(i)}
              onMouseLeave={() => handleFeatureHover(null)}
            >
              <div className="w-full">
                <h2 className="whitespace-pre-line type-h2 text-text-primary">
                  {i === 0 ? (
                    <>
                      Get paid globally{"\n"}with your own{"\n"}
                      <span className="relative inline-grid overflow-hidden align-bottom [&>span]:col-start-1 [&>span]:row-start-1">
                        {CURRENCIES.map((c) => (
                          <span key={c} className="invisible" aria-hidden="true">{c} account</span>
                        ))}
                        <span ref={(el) => { if (el) currencyElsRef.current.add(el); }}>{CURRENCIES[currencyIndex]} account</span>
                      </span>
                    </>
                  ) : step.title}
                </h2>
                <p className="mt-[var(--space-12)] type-body-m text-text-secondary">
                  {step.description}
                </p>
                {step.flags && (
                  <div className="mt-[var(--space-16)] flex gap-[var(--space-12)]">
                    {step.flags.map((flag) => (
                      <Image key={flag.alt} src={flag.src} alt={flag.alt} width={32} height={32} />
                    ))}
                  </div>
                )}
                {step.stats && (
                  <div className="mt-[var(--space-16)] flex gap-[var(--space-8)]">
                    {step.stats.map((stat) => (
                      <div key={stat.value} className="flex-1 rounded-[var(--radius-sm)] bg-white/8 p-[var(--space-24)]">
                        <p className="type-h3 text-text-primary">{stat.value}</p>
                        <p className="mt-[10px] type-body-m text-text-secondary">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <FeatureRows features={step.features} logos={step.logos} />
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="layout-content ds-page-gutter tablet:hidden">
        <div className="space-y-[var(--spacing-section)] py-[var(--spacing-section)]">
          {STEPS.map((step, i) => (
            <article key={`${step.title}-mobile`}>
              <div className="flex justify-center">
                <Image
                  src={STEP_SCREENS_MOBILE[i].src}
                  alt={STEP_SCREENS_MOBILE[i].alt}
                  width={600}
                  height={600}
                  sizes="100vw"
                  className="w-full rounded-[16px]"
                />
              </div>
              <div className="mt-[var(--space-32)]">
                <h2 className="whitespace-pre-line type-h2 text-text-primary">
                  {i === 0 ? (
                    <>
                      Get paid globally{"\n"}with your own{"\n"}
                      <span className="relative inline-grid overflow-hidden align-bottom [&>span]:col-start-1 [&>span]:row-start-1">
                        {CURRENCIES.map((c) => (
                          <span key={c} className="invisible" aria-hidden="true">{c} account</span>
                        ))}
                        <span ref={(el) => { if (el) currencyElsRef.current.add(el); }}>{CURRENCIES[currencyIndex]} account</span>
                      </span>
                    </>
                  ) : step.title}
                </h2>
                <p className="mt-[var(--space-12)] type-body-m text-text-secondary">
                  {step.description}
                </p>
                {step.flags && (
                  <div className="mt-[var(--space-16)] flex gap-[var(--space-12)]">
                    {step.flags.map((flag) => (
                      <Image key={flag.alt} src={flag.src} alt={flag.alt} width={32} height={32} />
                    ))}
                  </div>
                )}
                {step.stats && (
                  <div className="mt-[var(--space-16)] flex gap-[var(--space-8)]">
                    {step.stats.map((stat) => (
                      <div key={stat.value} className="flex-1 rounded-[var(--radius-sm)] bg-white/8 p-[var(--space-24)]">
                        <p className="type-h3 text-text-primary">{stat.value}</p>
                        <p className="mt-[10px] type-body-m text-text-secondary">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                <FeatureRows features={step.features} logos={step.logos} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
