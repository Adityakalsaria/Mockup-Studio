"use client";

import { Analytics } from "@vercel/analytics/react";
import { useCookieConsent } from "@/providers/CookieConsentProvider";

export default function ConditionalAnalytics() {
  const { consent } = useCookieConsent();
  if (consent !== "accepted") return null;
  return <Analytics />;
}
