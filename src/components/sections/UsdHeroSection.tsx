"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import Button from "@/components/ui/Button";
import { useOpenAccountModal } from "@/components/modals/OpenAccountModal";

function PillText({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chars = container.querySelectorAll<HTMLElement>("[data-char]");
    anime.remove(chars);
    anime({
      targets: chars,
      translateY: [8, 0],
      opacity: [0, 1],
      duration: 520,
      delay: anime.stagger(18),
      easing: "cubicBezier(0.22,1,0.36,1)",
    });
  }, [text]);

  return (
    <span key={text} ref={containerRef} aria-label={text} className="whitespace-nowrap">
      {Array.from(text).map((char, i) => (
        <span
          key={`${i}-${char}`}
          data-char
          aria-hidden
          style={{ display: "inline-block", opacity: 0, transform: "translateY(8px)" }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

const USD_HERO_VIDEO_MP4 = "/figma-assets/final-cta/usd-account-page-cta.mp4";
const USD_HERO_PILL_LABELS = [
  "FOR FREELANCERS AND BUSINESSES",
  "BUILT FOR GLOBAL EARNERS",
  "MADE FOR CROSS-BORDER TEAMS",
] as const;
const DEFAULT_TITLE_LINES = ["Open a USD account", "from anywhere"] as const;
const DEFAULT_DESCRIPTION =
  "Get a USD account in your name and start receiving payments from US clients, payroll, and platforms in minutes.";

type HeroVideoControls = {
  topMobile: number;
  topTablet: number;
  topDesktop: number;
  heightMobile: number;
  heightTablet: number;
  heightDesktop: number;
  widthDesktop: number;
  opacity: number;
};

const DEFAULT_HERO_VIDEO_CONTROLS: HeroVideoControls = {
  topMobile: 96,
  topTablet: 110,
  topDesktop: 56,
  heightMobile: 300,
  heightTablet: 360,
  heightDesktop: 552,
  widthDesktop: 1251,
  opacity: 0.88,
};

interface UsdHeroSectionProps {
  fromLabel?: string;
  pillLabels?: readonly string[];
  titleLines?: readonly [string, string];
  description?: string;
  ctaLabel?: string;
  videoSrc?: string;
  showVideoOutline?: boolean;
  videoFit?: "cover" | "contain";
  videoScale?: number;
  videoControls?: Partial<HeroVideoControls>;
}

export default function UsdHeroSection({
  fromLabel = "anywhere",
  pillLabels = USD_HERO_PILL_LABELS,
  titleLines,
  description = DEFAULT_DESCRIPTION,
  ctaLabel = "Open USD Account",
  videoSrc = USD_HERO_VIDEO_MP4,
  showVideoOutline = false,
  videoFit = "cover",
  videoScale = 1,
  videoControls,
}: UsdHeroSectionProps) {
  const { open: openAccountModal } = useOpenAccountModal();
  const [pillIndex, setPillIndex] = useState(0);
  const [heroVideoDuration, setHeroVideoDuration] = useState<number | null>(null);
  const resolvedTitleLines = titleLines ?? [DEFAULT_TITLE_LINES[0], `from ${fromLabel}`];
  const resolvedVideoControls = { ...DEFAULT_HERO_VIDEO_CONTROLS, ...videoControls };
  const heroVideoFrameStyle = {
    "--hero-video-top-mobile": `${resolvedVideoControls.topMobile}px`,
    "--hero-video-top-tablet": `${resolvedVideoControls.topTablet}px`,
    "--hero-video-top-desktop": `${resolvedVideoControls.topDesktop}px`,
    "--hero-video-height-mobile": `${resolvedVideoControls.heightMobile}px`,
    "--hero-video-height-tablet": `${resolvedVideoControls.heightTablet}px`,
    "--hero-video-height-desktop": `${resolvedVideoControls.heightDesktop}px`,
    "--hero-video-width-desktop": `${resolvedVideoControls.widthDesktop}px`,
    "--hero-video-opacity": `${resolvedVideoControls.opacity}`,
  } as CSSProperties;

  useEffect(() => {
    if (pillLabels.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPillIndex((current) => (current + 1) % pillLabels.length);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pillLabels]);

  return (
    <section
      id="usd-hero-section"
      className="relative -mt-[80px] w-full bg-black desktop:min-h-[970px]"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.82)_100%)]" />

      <div className="relative layout-content ds-page-gutter">
        <div className="relative flex min-h-[760px] flex-col items-center justify-end pt-[120px] pb-[72px] tablet:min-h-[840px] tablet:pb-[82px] desktop:min-h-[946px] desktop:pt-[152px] desktop:pb-[72px]">
          <div
            className="hero-video-frame pointer-events-none absolute inset-x-0 mx-auto w-full mix-blend-screen"
            style={heroVideoFrameStyle}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden
              className={`h-full w-full ${videoFit === "contain" ? "object-contain" : "object-cover"} object-top`}
              onLoadedMetadata={(event) => {
                const duration = event.currentTarget.duration;
                if (Number.isFinite(duration) && duration > 0) {
                  setHeroVideoDuration(duration);
                }
              }}
              style={{
                maskImage: "linear-gradient(90deg, transparent 0%, black 14%, black 86%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 14%, black 86%, transparent 100%)",
                transform: `scale(${videoScale})`,
                transformOrigin: "center top",
              }}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
            {heroVideoDuration ? (
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: "black",
                  animation: `usd-hero-video-loop-fade ${heroVideoDuration}s linear infinite`,
                }}
              />
            ) : null}
            <div className="absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,0,0,0.7)_34%,rgba(0,0,0,0)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-[180px] bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_24%,rgba(0,0,0,0.82)_64%,rgba(0,0,0,1)_100%)]" />
            {showVideoOutline ? (
              <div
                aria-hidden
                className="absolute inset-0 rounded-[2px] border border-[#8BB8FF]/60"
              />
            ) : null}
          </div>

          <div className="relative z-10 mt-[280px] flex w-full max-w-[760px] flex-col items-center gap-[16px] text-center tablet:mt-[320px] desktop:mt-[356px]">
            <div className="rounded-[999px] bg-[rgba(39,39,39,0.52)] px-[20px] py-[11px] text-[14px] font-medium leading-[18px] text-white/90 backdrop-blur-[7.5px]">
              <PillText text={pillLabels[pillIndex] ?? pillLabels[0] ?? USD_HERO_PILL_LABELS[0]} />
            </div>

            <h1 className="type-display text-text-primary">
              <span className="block">{resolvedTitleLines[0]}</span>
              <span className="block">{resolvedTitleLines[1]}</span>
            </h1>

            <p
              className="type-body-l max-w-[740px] text-text-secondary"
              style={{
                animation: "usd-hero-copy-in 720ms cubic-bezier(0.22,1,0.36,1) both",
                animationDelay: "620ms",
              }}
            >
              {description}
            </p>

            <div
              className="pt-[8px]"
              style={{
                animation: "usd-hero-copy-in 720ms cubic-bezier(0.22,1,0.36,1) both",
                animationDelay: "760ms",
              }}
            >
              <Button
                variant="prominent"
                size="md"
                onClick={openAccountModal}
                data-event="usd_hero_open_account"
              >
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes usd-hero-video-loop-fade {
          0% {
            opacity: 1;
          }
          8% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes usd-hero-pill-text-change {
          0% {
            opacity: 0;
            transform: translateY(3px);
            filter: blur(1.5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes usd-hero-copy-in {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-video-frame {
          top: var(--hero-video-top-mobile);
          height: var(--hero-video-height-mobile);
          max-width: 1251px;
          opacity: var(--hero-video-opacity);
        }

        @media (min-width: 768px) {
          .hero-video-frame {
            top: var(--hero-video-top-tablet);
            height: var(--hero-video-height-tablet);
          }
        }

        @media (min-width: 1280px) {
          .hero-video-frame {
            top: var(--hero-video-top-desktop);
            height: var(--hero-video-height-desktop);
            width: var(--hero-video-width-desktop);
            max-width: none;
          }
        }
      `}</style>
    </section>
  );
}
