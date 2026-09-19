import type { Metadata, Viewport } from "next";
import LandingPage from "@/features/landing/LandingPage";
import { SITE_DESCRIPTION } from "@/lib/metadata";
import { signModelToken } from "@/lib/modelToken";

/*
 * The landing page, public at mocraft.app. The studio is at `/studio`, behind
 * sign-in; every "Start creating" on this page links there.
 */
export const metadata: Metadata = {
  title: { absolute: "Mocraft — Make it real." },
  description: SITE_DESCRIPTION,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f4f5",
};

/*
 * Rebuilt hourly, not per request, so the page can be cached and served fast.
 * The model token in it is good until the end of tomorrow (UTC), which outlasts
 * any copy of the page this can leave in a cache.
 */
export const revalidate = 3600;

export default async function Home() {
  return <LandingPage modelToken={await signModelToken(1)} />;
}
