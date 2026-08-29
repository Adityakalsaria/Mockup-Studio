"use client";

import { useId, type ReactNode } from "react";
import Image from "next/image";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { StripeGlobe } from "@/registry/magicui/globe";
import { FeatureIcon } from "@/components/ui/FeatureIcons";

type FeatureCard = {
  title: string;
  description: string;
  bullets: Array<string | { icon: string; label: string }>;
  tone?: "wide" | "half";
  imageSrc?: string;
  imageBlendMode?: "screen" | "lighten" | "overlay" | "soft-light" | "multiply";
  visualKind?: "us-payments" | "globe" | "named-usd";
};

export type KeyFeatureCard = FeatureCard;

export type NamedUsdGlassSettings = {
  lightAngle: number;
  lightIntensity: number;
  refraction: number;
  depth: number;
  dispersion: number;
  frost: number;
  splay: number;
};

export const DEFAULT_NAMED_USD_GLASS_SETTINGS: NamedUsdGlassSettings = {
  lightAngle: 175,
  lightIntensity: 37,
  refraction: 42,
  depth: 1,
  dispersion: 32,
  frost: 66,
  splay: 9,
};

const PRIMARY_CARD: FeatureCard = {
  title: "Works with platforms you already use",
  description:
    "Connect your USD account with the platforms you already use to receive payments from clients without changing your existing workflow or setup.",
  bullets: [
    { icon: "bank", label: "Supports major freelancing platforms" },
    { icon: "notification", label: "Works with platform verification (micro-deposits)" },
    { icon: "check", label: "Receive USD payments directly" },
  ],
  visualKind: "us-payments" as const,
  tone: "wide",
};

const SECONDARY_CARDS: FeatureCard[] = [
  {
    title: "Named USD Account",
    description:
      "Get a dedicated USD account in your name so you can receive payments directly with full ownership and transparency.",
    bullets: [
      { icon: "bank", label: "Get your own named USD account" },
      { icon: "money", label: "Receive payments directly in your name" },
      { icon: "check", label: "No shared or pooled accounts" },
    ],
    visualKind: "named-usd",
    tone: "half",
  },
  {
    title: "Built for Global Users",
    description:
      "Open and use your USD account from anywhere in the world without needing a US address or residency.",
    bullets: [
      { icon: "globe", label: "Open without a US address" },
      { icon: "familyCard", label: "Available for individuals and businesses" },
      { icon: "money", label: "Start receiving USD from anywhere" },
    ],
    visualKind: "globe",
    tone: "half",
  },
] as const;

const DEFAULT_SECTION_TITLE = "Why choose a USD account with KOSH";
const DEFAULT_SECTION_DESCRIPTION =
  "KOSH helps you get a USD account in your name and accept ACH and wire payments from US clients and platforms you already use, from anywhere with no US residency required.";

function USPaymentsVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] bg-transparent">
      {/* Served from public/ and rendered with the bundled dotlottie React
          component, so the section needs no CDN at runtime. */}
      <DotLottieReact
        src="/lottie/key-features.lottie"
        autoplay
        loop
        style={{ width: "100%", height: "100%" }}
        aria-hidden="true"
      />
    </div>
  );
}

function GlobeVisual() {
  return (
    <div className="relative flex h-full w-full items-end justify-center overflow-hidden">
      <StripeGlobe />
      {/* Bottom gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[20%]"
        style={{ background: "linear-gradient(to top, #0F0F0F 0%, transparent 100%)" }}
      />
    </div>
  );
}


function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M14.8008 3.06769H16.46V14.0657H12.8682V17.6575H2.69336V5.0882H6.28516V1.4964H14.8008V3.06769ZM4.48828 6.88312V15.8616H11.0732V14.0657H6.28516V6.88312H4.48828ZM8.08008 12.2698H14.665V3.29132H8.08008V12.2698Z" fill="white" fillOpacity="0.45" />
    </svg>
  );
}

const USD_FIELDS = [
  { label: "ACCOUNT NUMBER", value: "987654321098" },
  { label: "ROUTING NUMBER", value: "203948576" },
  { label: "ACCOUNT NAME", value: "Bambang Wijaya" },
  { label: "BANK ADDRESS", value: "1801 Main St., Kansas City, MO 64108" },
];

const NAMED_USD_LIQUID_GLASS_MAP = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <linearGradient id="left" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgb(170,128,128)" />
        <stop offset="100%" stop-color="rgb(128,128,128)" />
      </linearGradient>
      <linearGradient id="right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgb(128,128,128)" />
        <stop offset="100%" stop-color="rgb(86,128,128)" />
      </linearGradient>
      <linearGradient id="top" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgb(128,170,128)" />
        <stop offset="100%" stop-color="rgb(128,128,128)" />
      </linearGradient>
      <linearGradient id="bottom" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgb(128,128,128)" />
        <stop offset="100%" stop-color="rgb(128,86,128)" />
      </linearGradient>
      <radialGradient id="topLeft" cx="0%" cy="0%" r="100%">
        <stop offset="0%" stop-color="rgb(170,170,128)" />
        <stop offset="100%" stop-color="rgb(128,128,128)" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="topRight" cx="100%" cy="0%" r="100%">
        <stop offset="0%" stop-color="rgb(86,170,128)" />
        <stop offset="100%" stop-color="rgb(128,128,128)" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="bottomLeft" cx="0%" cy="100%" r="100%">
        <stop offset="0%" stop-color="rgb(170,86,128)" />
        <stop offset="100%" stop-color="rgb(128,128,128)" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="bottomRight" cx="100%" cy="100%" r="100%">
        <stop offset="0%" stop-color="rgb(86,86,128)" />
        <stop offset="100%" stop-color="rgb(128,128,128)" stop-opacity="0" />
      </radialGradient>
    </defs>

    <rect width="100" height="100" rx="24" ry="24" fill="rgb(128,128,128)" />
    <rect x="0" y="0" width="18" height="100" fill="url(#left)" opacity="0.95" />
    <rect x="82" y="0" width="18" height="100" fill="url(#right)" opacity="0.95" />
    <rect x="0" y="0" width="100" height="18" fill="url(#top)" opacity="0.95" />
    <rect x="0" y="82" width="100" height="18" fill="url(#bottom)" opacity="0.95" />
    <circle cx="0" cy="0" r="26" fill="url(#topLeft)" opacity="0.95" />
    <circle cx="100" cy="0" r="26" fill="url(#topRight)" opacity="0.95" />
    <circle cx="0" cy="100" r="26" fill="url(#bottomLeft)" opacity="0.95" />
    <circle cx="100" cy="100" r="26" fill="url(#bottomRight)" opacity="0.95" />
  </svg>
`)}`;

function NamedUsdVisual({
  glassSettings = DEFAULT_NAMED_USD_GLASS_SETTINGS,
}: {
  glassSettings?: NamedUsdGlassSettings;
}) {
  const filterId = useId().replace(/:/g, "");
  const {
    lightAngle,
    lightIntensity,
    refraction,
    depth,
    dispersion,
    frost,
    splay,
  } = glassSettings;
  const displacementScale = refraction * 0.225;
  const glassBlur = frost * 0.055;
  const glassSaturation = 100 + dispersion * 1.6;
  const layerOpacity = 0.12 + depth * 0.002;
  const baseTintOpacity = 0.32 + depth * 0.0047;
  const highlightOpacity = Math.min(0.02 + lightIntensity * 0.00055 + splay * 0.0002, 0.3);
  const borderStartOpacity = Math.min(0.15 + lightIntensity * 0.003 + splay * 0.001, 0.8);
  const borderEndOpacity = Math.min(0.025 + lightIntensity * 0.00018 + splay * 0.0006, 0.2);
  const lightGlowOpacity = Math.min(0.04 + lightIntensity * 0.0011, 0.18);
  const lightGradientAngle = lightAngle + 135;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
        <defs>
          <filter
            id={filterId}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={NAMED_USD_LIQUID_GLASS_MAP}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="displacementMap"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="displacementMap"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="refractedBackdrop"
            />
            <feGaussianBlur in="refractedBackdrop" stdDeviation={0.18} />
          </filter>
        </defs>
      </svg>

      <div className="relative w-full max-w-[463px] overflow-clip rounded-[24px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 rounded-[24px]"
          style={{
            background: `
              linear-gradient(${lightGradientAngle}deg, rgba(255,255,255,${lightGlowOpacity}) 0%, rgba(255,255,255,${lightGlowOpacity * 0.45}) 18%, transparent 58%),
              radial-gradient(circle at 12% 10%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 16%, transparent 34%),
              radial-gradient(circle at 78% 18%, rgba(255,255,255,0.10) 0%, transparent 28%),
              radial-gradient(circle at 18% 72%, rgba(255,255,255,0.06) 0%, transparent 24%),
              linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 18%, rgba(255,255,255,0.015) 42%, rgba(0,0,0,0.08) 100%),
              linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 34%),
              rgba(39,39,39,${baseTintOpacity})
            `,
          }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] rounded-[24px]"
          style={{
            background: `rgba(39, 39, 39, ${layerOpacity})`,
            backdropFilter: `url(#${filterId}) blur(${glassBlur}px) saturate(${glassSaturation}%)`,
            WebkitBackdropFilter: "blur(26px) saturate(180%)",
            boxShadow: "0 6px 128px rgba(0,0,0,0.1)",
          }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] rounded-[24px] mix-blend-screen"
          style={{
            background: `rgba(255,255,255,${highlightOpacity})`,
          }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3] rounded-[24px]"
          style={{
            padding: "1px",
            background:
              `linear-gradient(155deg, rgba(255,255,255,${borderStartOpacity}) 0%, rgba(255,255,255,${borderEndOpacity}) 100%)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        <div
          className="relative z-[4] h-[72px] overflow-hidden p-[16px] tablet:h-[84px] tablet:p-[20px] desktop:h-[96px] desktop:p-[24px]"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <p className="relative z-[2] max-w-[200px] text-[13px] font-normal leading-[18px] text-white/65 tablet:max-w-[220px] tablet:text-[15px] tablet:leading-[21px] desktop:max-w-[255px] desktop:text-[17px] desktop:leading-[24px]">
            <span className="block">Receive US payments with</span>
            <span className="block">ACH and Wire</span>
          </p>
          <div
            className="absolute right-0 top-[-18px] h-[152px] w-[126px] opacity-90 tablet:top-[-26px] tablet:h-[190px] tablet:w-[156px] desktop:top-[-34px] desktop:h-[232px] desktop:w-[192px]"
            style={{
              maskImage: "linear-gradient(to right, transparent 5%, black 35%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 5%, black 35%)",
            }}
          >
            <Image
              src="/figma-assets/key-features-dollar.webp"
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1440px) 223px, (min-width: 480px) 180px, 150px"
            />
          </div>
        </div>

        <div className="relative z-[4] flex flex-col gap-[4px] p-[12px] tablet:p-[16px] desktop:p-[16px]">
          {USD_FIELDS.map((field) => (
            <div
              key={field.label}
              className="flex items-center gap-[5px] rounded-[12px] bg-transparent px-[14px] py-[10px] transition-colors duration-100 hover:bg-white/[0.03] desktop:rounded-[14px] desktop:px-[16px] desktop:py-[12px]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[4px] desktop:gap-[6px]">
                <span className="text-[10px] font-medium uppercase leading-[14px] tracking-[0.5px] text-white/30 tablet:text-[11px] tablet:leading-[16px] desktop:text-[13px] desktop:leading-[19px] desktop:tracking-[0.66px]">
                  {field.label}
                </span>
                <span className="text-[14px] font-medium leading-[21px] text-white tablet:text-[16px] tablet:leading-[24px] desktop:text-[19px] desktop:leading-[29px]">{field.value}</span>
              </div>
              <button className="flex-shrink-0 opacity-45 transition-opacity hover:opacity-70" type="button">
                <CopyIcon />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureList({
  bullets,
  tone,
}: {
  bullets: Array<string | { icon: string; label: string }>;
  tone: "wide" | "half";
}) {
  const isWide = tone === "wide";

  return (
    <div
      className={`mt-auto flex flex-col ${
        isWide ? "laptop:max-w-[calc(5/12*100%)] desktop:max-w-[608px]" : "w-full"
      }`}
    >
      {bullets.map((bullet, index) => {
        const item = typeof bullet === "string" ? { label: bullet } : bullet;
        const icon = "icon" in item ? item.icon : undefined;

        return (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-[var(--spacing-xs)] border-t border-white/12 py-[var(--space-20)]"
          >
            {icon ? (
              <FeatureIcon name={icon} className="h-[24px] w-[24px] shrink-0" />
            ) : null}
            <p className={icon ? "type-action text-text-primary" : "type-micro text-text-secondary"}>
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function FeaturePanel({
  title,
  description,
  bullets,
  tone = "half",
  imageSrc,
  imageBlendMode,
  visualKind,
  namedUsdGlassSettings,
}: FeatureCard & {
  namedUsdGlassSettings?: NamedUsdGlassSettings;
}) {
  const isWide = tone === "wide";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[24px] bg-[#0F0F0F] px-[24px] py-[24px] tablet:px-[32px] tablet:py-[32px] desktop:px-[48px] desktop:py-[48px] ${
        isWide ? "laptop:h-[600px] desktop:h-[600px]" : "desktop:h-[800px]"
      }`}
    >
      {/* Hover background gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[24px] opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        style={{
          background: "linear-gradient(180deg, rgba(0, 128, 255, 0.06) 0%, transparent 60%)",
        }}
      />
      {isWide ? (
        <div className="relative z-[1] flex h-full flex-col gap-[24px] laptop:grid laptop:grid-cols-2 laptop:grid-rows-[auto_1fr] laptop:gap-x-[72px] laptop:gap-y-0 desktop:gap-x-[104px]">
          <div className="laptop:col-start-1 laptop:row-start-1">
            <h3 className="type-h5 text-text-primary">{title}</h3>
            <p className="type-body-l mt-[12px] text-text-secondary">{description}</p>
          </div>

          <div
            className={`relative h-[220px] tablet:h-[280px] laptop:col-start-2 laptop:row-span-2 laptop:row-start-1 laptop:h-full laptop:items-center laptop:justify-center laptop:flex ${
              visualKind === "us-payments" ? "overflow-hidden" : ""
            }`}
          >
            {visualKind === "named-usd" ? (
              <NamedUsdVisual glassSettings={namedUsdGlassSettings} />
            ) : visualKind === "us-payments" ? (
              <div className="relative h-full min-h-[220px] w-full">
                <USPaymentsVisual />
              </div>
            ) : visualKind === "globe" ? (
              <div className="absolute inset-y-[-8%] left-0 right-[-20%] laptop:right-[-40%] desktop:right-[-50%]">
                <GlobeVisual />
              </div>
            ) : imageSrc ? (
              <div className="relative h-full w-full">
                <Image
                  src={imageSrc}
                  alt={title}
                  fill
                  className="object-contain"
                  sizes="(min-width: 1440px) 48vw, 100vw"
                />
              </div>
            ) : null}
          </div>

          <div className="laptop:col-start-1 laptop:row-start-2 laptop:flex laptop:flex-col laptop:justify-end">
            <FeatureList bullets={bullets} tone="half" />
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-[520px]">
            <h3 className="type-h5 text-text-primary">{title}</h3>
            <p className="type-body-l mt-[12px] text-text-secondary">{description}</p>
          </div>

          <div className={`relative ${visualKind === "named-usd" ? "h-[360px] tablet:h-[400px] desktop:h-[480px]" : "h-[220px] tablet:h-[280px] desktop:h-[444px]"} ${visualKind === "globe" ? "-mx-[24px] tablet:-mx-[32px] desktop:-mx-[48px]" : ""} ${visualKind === "named-usd" ? "overflow-hidden" : ""}`}>
            {visualKind === "us-payments" ? <USPaymentsVisual /> : null}
            {visualKind === "globe" ? <GlobeVisual /> : null}
            {visualKind === "named-usd" ? (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  maskImage: "linear-gradient(180deg, #000 0%, #000 45%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.15) 90%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 45%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.15) 90%, transparent 100%)",
                }}
              >
                <div className="absolute inset-x-0 top-[32px] flex justify-center tablet:top-[40px] desktop:top-[56px]">
                  <div className="w-full max-w-[260px] tablet:max-w-[320px] desktop:max-w-[380px]">
                    <NamedUsdVisual glassSettings={namedUsdGlassSettings} />
                  </div>
                </div>
              </div>
            ) : !visualKind && imageSrc ? (
              <Image
                src={imageSrc}
                alt={title}
                fill
                className="object-contain object-center"
                sizes="(min-width: 1440px) 48vw, 100vw"
                style={imageBlendMode ? { mixBlendMode: imageBlendMode } : undefined}
              />
            ) : null}
          </div>

          <FeatureList bullets={bullets} tone={tone} />
        </>
      )}
    </article>
  );
}

export default function KeyFeatures({
  namedUsdGlassSettings = DEFAULT_NAMED_USD_GLASS_SETTINGS,
  sectionTitle = DEFAULT_SECTION_TITLE,
  sectionDescription = DEFAULT_SECTION_DESCRIPTION,
  primaryCard = PRIMARY_CARD,
  secondaryCards = SECONDARY_CARDS,
}: {
  namedUsdGlassSettings?: NamedUsdGlassSettings;
  sectionTitle?: ReactNode;
  sectionDescription?: string;
  primaryCard?: KeyFeatureCard;
  secondaryCards?: ReadonlyArray<KeyFeatureCard>;
}) {
  return (
    <section
      id="key-features"
      className="w-full bg-black py-[var(--spacing-section)] desktop:pt-[112px] desktop:pb-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="flex flex-col">
          <div className="grid grid-cols-1 gap-[24px] laptop:grid-cols-12 laptop:gap-[32px]">
            <h2 className="type-h1 text-text-primary laptop:col-span-6">
              {sectionTitle}
            </h2>
            <p className="type-body-l text-text-secondary laptop:col-span-6 laptop:mt-[12px]">
              {sectionDescription}
            </p>
          </div>

          <div className="mt-[var(--spacing-section)] grid w-full grid-cols-1 gap-[8px]">
            <FeaturePanel {...primaryCard} namedUsdGlassSettings={namedUsdGlassSettings} />

            <div className="grid grid-cols-1 gap-[8px] laptop:grid-cols-2">
              {secondaryCards.map((card) => (
                <FeaturePanel key={card.title} {...card} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
