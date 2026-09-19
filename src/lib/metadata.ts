import type { Metadata } from "next";

/**
 * Site identity.
 *
 * This was Koshmoney's -- name, description, the lot -- because the repo is a
 * copy of that site kept for the studio inside it. Everything Koshmoney is
 * gone; what is left describes the tool that is actually here.
 */
export const SITE_NAME = "Mocraft";
export const SITE_DESCRIPTION =
  "A studio for beautiful Apple mockups. Put your design on a real device, set the scene, and export a still or a video.";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export const siteMetadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  /*
   * Not indexed by default: everything but the landing page is a tool behind a
   * sign-in. The landing page (`src/app/page.tsx`) opts back in, and
   * `robots.ts` says the same at the origin.
   */
  robots: { index: false, follow: false },
};
