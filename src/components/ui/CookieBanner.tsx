"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCookieConsent } from "@/providers/CookieConsentProvider";
import Button from "@/components/ui/Button";

export default function CookieBanner() {
  const pathname = usePathname();
  const { showBanner, setConsent } = useCookieConsent();
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Hide cookie banner on referral pages
  if (pathname.startsWith("/r/")) return null;

  const handleConsent = (value: "accepted" | "rejected") => {
    setExiting(true);
  // Store the value to apply after exit animation
    bannerRef.current?.setAttribute("data-consent-value", value);
  };

  const handleTransitionEnd = () => {
    if (exiting) {
      const value = bannerRef.current?.getAttribute("data-consent-value") as
        | "accepted"
        | "rejected"
        | null;
      if (value) setConsent(value);
      setVisible(false);
      setExiting(false);
    }
  };

  // Reset state when banner is shown again
  if (showBanner && !visible) {
    setVisible(true);
    setExiting(false);
  }

  if (!showBanner && !exiting) return null;
  if (!visible && !showBanner) return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Cookie consent"
      onTransitionEnd={handleTransitionEnd}
      className="fixed bottom-4 left-1/2 z-[var(--z-overlay)] w-[calc(100%-var(--space-32))] max-w-[560px] rounded-[var(--radius-lg)] border border-white/[0.08] bg-[rgba(39,39,39,0.52)] p-[var(--space-16)] backdrop-blur-[7.5px] transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]"
      style={{
        transform: exiting
          ? "translate(-50%, 20px)"
          : "translate(-50%, 0)",
        opacity: exiting ? 0 : 1,
      }}
    >
      <div className="flex flex-col gap-[var(--space-12)] tablet:flex-row tablet:items-center tablet:justify-between">
        <p className="type-body-m text-text-secondary">
          We use cookies to improve your experience.
        </p>
        <div className="flex shrink-0 items-center gap-[var(--space-8)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleConsent("rejected")}
          >
            Reject
          </Button>
          <Button
            variant="prominent"
            size="sm"
            onClick={() => handleConsent("accepted")}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
