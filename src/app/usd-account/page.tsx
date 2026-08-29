import type { Metadata } from "next";
import UsdAccountListPreviewClient from "@/app/usd-account-list-preview/UsdAccountListPreviewClient";
import JsonLd from "@/components/seo/JsonLd";
import { FAQS } from "@/components/sections/faqs-data";
import { getVisitorFromLabel } from "@/lib/geo";
import { absoluteUrl } from "@/lib/metadata";
import { faqSchema } from "@/lib/seo/schema";

const PAGE_TITLE = "USD Account for Freelancers and Global Businesses";
const PAGE_DESCRIPTION =
  "Open a named USD account from anywhere in the world. Receive ACH and international wire payments from US clients, payroll, and platforms, with no US bank or residency required.";
const PAGE_PATH = "/usd-account";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "USD account",
    "USD account for freelancers",
    "ACH payments",
    "international wire transfer",
    "global USD account",
    "named USD account",
    "receive USD payments",
    "USD account no US bank",
    "freelancer USD account",
    "stablecoin USD account",
  ],
  alternates: {
    canonical: absoluteUrl(PAGE_PATH),
  },
  openGraph: {
    title: `${PAGE_TITLE} | KOSH`,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    siteName: "KOSH",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KOSH USD Account for freelancers and global businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | KOSH`,
    description: PAGE_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default async function UsdAccountPage() {
  const heroFromLabel = await getVisitorFromLabel();

  return (
    <>
      <JsonLd data={faqSchema(FAQS)} />
      <UsdAccountListPreviewClient heroFromLabel={heroFromLabel} />
    </>
  );
}
