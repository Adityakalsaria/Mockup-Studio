import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/metadata";

function sanitizeCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}

export function buildReferralMetadata(code: string, path: string): Metadata {
  const safeCode = sanitizeCode(code);
  const title = "You've been invited to KOSH";
  const description =
    `Join KOSH with referral code ${safeCode}. The global financial account for freelancers, entrepreneurs, and businesses.`;
  const canonical = absoluteUrl(path);
  const image = absoluteUrl("/images/download-kosh-app.webp");

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
