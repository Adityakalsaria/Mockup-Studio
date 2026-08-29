import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import DesignSystemPage from "@/features/design-system/DesignSystemPage";
import { designSystemFaq } from "@/features/design-system/data/foundations";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema, techArticleSchema } from "@/lib/seo/schema";

const TITLE = `Website System Logo | ${SITE_NAME}`;
const DESCRIPTION =
  "Kosh logo variants for website system usage, including KOSH, personal, business, card, rewards, and icon-only marks.";

export const metadata: Metadata = {
  title: "Website System Logo",
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/website-system/logo"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/website-system/logo"),
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WebsiteSystemLogoRoute() {
  const datePublished = "2026-03-06";

  const schemas = [
    techArticleSchema({
      title: TITLE,
      description: DESCRIPTION,
      path: "/website-system/logo",
      datePublished,
      dateModified: datePublished,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Website System", path: "/website-system" },
      { name: "Logo", path: "/website-system/logo" },
    ]),
    faqSchema(designSystemFaq),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <DesignSystemPage initialSection="logo" sectionBasePath="/website-system" />
    </>
  );
}
