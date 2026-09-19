import type { Metadata, Viewport } from "next";
import LandingPage from "@/features/landing/LandingPage";
import { SITE_DESCRIPTION } from "@/lib/metadata";

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

export default function Home() {
  return <LandingPage />;
}
