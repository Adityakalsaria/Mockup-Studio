import type { Metadata } from "next";

/**
 * Site identity.
 *
 * This was Koshmoney's -- name, description, the lot -- because the repo is a
 * copy of that site kept for the studio inside it. Everything Koshmoney is
 * gone; what is left describes the tool that is actually here.
 */
export const SITE_NAME = "Mockup Studio";
export const SITE_DESCRIPTION =
  "A 3D mockup studio: put a screenshot on a phone, frame the shot, and export a still or a video.";
/*
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL (mocraft.app) at build time, so
 * production needs no env var. Without this fallback `metadataBase` was
 * localhost and the og:image URL pointed at it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export const siteMetadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  // X falls back to og:image (from app/opengraph-image.png) but needs the card type.
  twitter: { card: "summary_large_image" },
  /*
   * Not indexed, at the root.
   *
   * The studio is behind a sign-in and there is nothing here for a search
   * engine. `robots.ts` says the same at the origin; this is the per-page half
   * of the same statement.
   */
  robots: { index: false, follow: false },
};
