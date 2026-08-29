import type { Metadata } from "next";

export const SITE_NAME = "KOSH";
export const SITE_DESCRIPTION = "The global financial account for freelancers. USD accounts, a global Visa card, and stablecoin payouts — all in one app.";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://koshmoney.com").replace(/\/$/, "");

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export const siteMetadata: Metadata = {
  title: {
    default: "KOSH — The Global Financial Account for Freelancers | USD Accounts, Visa Card & Stablecoin Payouts",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KOSH — The global financial account",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};
