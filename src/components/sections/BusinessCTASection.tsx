"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "@/lib/gsap";
import Image from "next/image";
import CanvasSequence from "@/components/sequence/CanvasSequence";
import Button from "@/components/ui/Button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BREAKPOINT_MEDIA } from "@/lib/breakpoints";

export default function BusinessCTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [startOffset, setStartOffset] = useState("top+=1000 top");
  const isDesktop = useMediaQuery(BREAKPOINT_MEDIA.tabletUp);

  useEffect(() => {
    if (!isDesktop) return;
    const calc = () => {
      // Start playing at 62% of total page scroll
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const targetScrollY = docHeight * 0.62;
      const triggerEl = document.querySelector("[data-business-cta]");
      if (triggerEl) {
        const triggerTop = triggerEl.getBoundingClientRect().top + window.scrollY;
        const offset = targetScrollY - triggerTop;
        setStartOffset(`top+=${Math.max(0, Math.round(offset))}px top`);
      }
    };
    // Wait for GSAP pin-spacers to settle before measuring
    const t = setTimeout(calc, 1000);
    ScrollTrigger.addEventListener("refresh", calc);
    window.addEventListener("resize", calc);
    return () => {
      clearTimeout(t);
      ScrollTrigger.removeEventListener("refresh", calc);
      window.removeEventListener("resize", calc);
    };
  }, [isDesktop]);

  // DEV: broadcast scroll progress for header debug display
  useGSAP(
    () => {
      if (!isDesktop) return;
      ScrollTrigger.create({
        trigger: "[data-business-cta]",
        start: startOffset,
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          const pct = Math.round(self.progress * 100);
          const frame = Math.round(self.progress * 240);
          window.dispatchEvent(
            new CustomEvent("sequence-debug", {
              detail: { progress: pct, frame, activeTab: "biz" },
            })
          );
        },
      });
    },
    { scope: sectionRef, dependencies: [startOffset, isDesktop] }
  );

  return (
    <div ref={sectionRef}>
      {/* Desktop: PNG Sequence section — sticky, scrubs on scroll */}
      {isDesktop && (
        <div className="relative -mt-[100vh] h-[500vh]" data-business-cta>
          <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden bg-black">
            <div className="relative w-full max-w-[var(--layout-content-max)] mx-auto" style={{ height: "800px" }}>
              <CanvasSequence
                frameCount={241}
                startFrame={0}
                endFrame={240}
                triggerSelector="[data-business-cta]"
                start={startOffset}
                end="bottom top"
                fitMode="contain"
                framePathPrefix="/sequence/business/"
                framePathSuffix=".webp"
                frameNumberOffset={0}
                padLength={4}
                preloadStrategy="eager"
                maxConcurrentLoads={6}
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Mobile: static image */}
      {!isDesktop && (
        <div className="bg-black">
          <Image
            src="/images/business-cta-mobile.webp"
            alt="KOSH business dashboard"
            width={1440}
            height={900}
            className="w-full"
          />
        </div>
      )}

      {/* CTA content */}
      <div className="bg-black px-6 pb-[var(--spacing-section)] pt-[var(--space-24,24px)] flex flex-col items-center text-center tablet:text-center">
        <div className="max-w-[562px]">
          <h2 className="type-h1 text-text-primary">
            KOSH for teams and businesses
          </h2>
          <p className="type-body-l text-text-secondary mt-4">
            Manage your team's spending, payroll, and vendor payouts from one dashboard. Custom pricing and dedicated support included.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="secondary" href="https://payout.copperx.io/auth/register?utm_source=website&utm_medium=business_cta&utm_campaign=signup">
              Create Account
            </Button>
            <Button variant="primary" href="https://form.typeform.com/to/ua5vZwjN?typeform-source=copperx.io&utm_source=website&utm_medium=business_cta">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
