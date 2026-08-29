"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Image from "next/image";
import CanvasSequence from "@/components/sequence/CanvasSequence";
import TabExplainer, { TABS } from "@/components/sections/TabExplainer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BREAKPOINT_MEDIA, BREAKPOINT_PX } from "@/lib/breakpoints";

// Scroll % at which each tab column animates in
const TAB_ENTER = [0.26, 0.44, 0.60, 0.77];

export default function HeroSecondSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery(BREAKPOINT_MEDIA.laptopUp);
  const revealedRef = useRef([false, false, false, false]);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .from("[data-hero-heading-secondary], [data-hero-subtitle-secondary]", {
          y: 28,
          opacity: 0,
          duration: 0.8,
          stagger: 0.06,
        })
        .from(
          "[data-hero-media-secondary]",
          {
            y: 40,
            opacity: 0,
            duration: 0.9,
          },
          "-=0.4"
        );

      // Only run scroll-driven animation on tablet+ (canvas is hidden on mobile)
      if (window.innerWidth < BREAKPOINT_PX.laptop) return;

      ScrollTrigger.create({
        trigger: "[data-hero-media-secondary]",
        start: "top top+=80px",
        end: "+=300%",
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;

          // Reveal each tab column at its threshold
          TAB_ENTER.forEach((threshold, i) => {
            if (progress >= threshold && !revealedRef.current[i]) {
              revealedRef.current[i] = true;
              // Desktop column
              gsap.to(`[data-tab-col="${i}"]`, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power3.out",
              });
              // Mobile column
              gsap.to(`[data-tab-col-mobile="${i}"]`, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power3.out",
              });
              // Hide previous mobile tab
              if (i > 0) {
                gsap.to(`[data-tab-col-mobile="${i - 1}"]`, {
                  opacity: 0,
                  duration: 0.3,
                  ease: "power2.in",
                });
              }
            }

            // Hide when scrolling back above threshold
            if (progress < threshold && revealedRef.current[i]) {
              revealedRef.current[i] = false;
              gsap.to(`[data-tab-col="${i}"]`, {
                opacity: 0,
                y: 24,
                duration: 0.3,
                ease: "power2.in",
              });
              gsap.to(`[data-tab-col-mobile="${i}"]`, {
                opacity: 0,
                y: 24,
                duration: 0.3,
                ease: "power2.in",
              });
              // Re-show previous mobile tab if it was revealed
              if (i > 0 && revealedRef.current[i - 1]) {
                gsap.to(`[data-tab-col-mobile="${i - 1}"]`, {
                  opacity: 1,
                  duration: 0.3,
                  ease: "power2.out",
                });
              }
            }
          });
        },
        onLeaveBack: () => {
          // Reset all when scrolling back above pin
          revealedRef.current = [false, false, false, false];
          gsap.set("[data-tab-col], [data-tab-col-mobile]", {
            opacity: 0,
            y: 24,
          });
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} id="hero-secondary" className="relative bg-black">
      <div className="mx-auto w-full max-w-[var(--layout-content-max)]">
        <div className="mx-auto w-full max-w-[960px] px-[var(--space-20)] pt-[120px] pb-[var(--spacing-section)] text-center tablet:pt-[160px] tablet:pb-0 tablet:px-0">
          <div className="flex flex-col items-start gap-[var(--space-16)] text-left tablet:items-center tablet:text-center desktop:px-[var(--space-160)]">
            <h2
              data-hero-heading-secondary
              className="type-h1 text-text-primary"
            >
              Designed for how money moves today.
            </h2>
            <p
              data-hero-subtitle-secondary
              className="type-body-l text-text-secondary"
            >
              One app to receive, spend, save, and send. Anywhere in the world.
            </p>
          </div>

          {/* Mobile: static image + tab list */}
          <div className="mt-[var(--space-24,24px)] flex flex-col items-center px-[var(--layout-page-gutter)] laptop:hidden">
            <Image
              src="/images/tab-explainer-mobile.webp"
              alt="Kosh app tab bar"
              width={400}
              height={800}
              sizes="(max-width: 400px) 100vw, 400px"
              className="w-full max-w-[400px] self-center"
            />
            <div className="mt-[var(--space-32,32px)] flex w-full max-w-[400px] flex-col gap-[var(--space-48,48px)] text-left">
              {TABS.map(({ Icon, title, description }) => (
                <div key={title} className="flex flex-col gap-[var(--space-16,16px)]">
                  <Icon />
                  <div className="flex flex-col gap-[8px]">
                    <h4 className="type-h4 text-text-primary">{title}</h4>
                    <p className="type-body-m text-text-secondary">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: canvas sequence + tab explainer */}
          <div
            data-hero-media-secondary
            className="relative mt-[var(--space-24,24px)] hidden justify-center laptop:flex"
          >
            <div className="mx-auto h-[calc(100vh-80px)] w-[50vw] max-w-[600px]">
              {isDesktop && (
                <CanvasSequence
                  frameCount={360}
                  startFrame={0}
                  endFrame={359}
                  triggerSelector="[data-hero-media-secondary]"
                  start="top top+=80px"
                  end="+=300%"
                  fitMode="contain"
                  verticalAlign="top"
                  framePathPrefix="/sequence/tab-bar/new iphone_"
                  frameNumberOffset={240}
                  framePathSuffix=".webp"
                  preloadStrategy="eager"
                  maxConcurrentLoads={10}
                  pinTargetSelector="#sequence-zone"
                  className="h-full w-full"
                />
              )}
            </div>

            {/* Tab explainer — each column animates in at its scroll threshold */}
            <div className="pointer-events-none absolute left-1/2 top-[55%] w-[100vw] -translate-x-1/2">
              <div className="pointer-events-auto mx-auto w-full max-w-[var(--layout-content-max)] text-left">
                <TabExplainer />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
