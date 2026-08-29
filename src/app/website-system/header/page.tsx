import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import DesignSystemPage from "@/features/design-system/DesignSystemPage";
import { designSystemFaq } from "@/features/design-system/data/foundations";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema, techArticleSchema } from "@/lib/seo/schema";

const TITLE = `Website System Header | ${SITE_NAME}`;
const DESCRIPTION =
  "Website header component specification with structure, spacing, and CTA arrangement.";

export const metadata: Metadata = {
  title: "Website System Header",
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/website-system/header"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/website-system/header"),
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

export default function WebsiteSystemHeaderRoute() {
  const datePublished = "2026-03-06";

  const schemas = [
    techArticleSchema({
      title: TITLE,
      description: DESCRIPTION,
      path: "/website-system/header",
      datePublished,
      dateModified: datePublished,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Website System", path: "/website-system" },
      { name: "Header", path: "/website-system/header" },
    ]),
    faqSchema(designSystemFaq),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <DesignSystemPage initialSection="header" sectionBasePath="/website-system" />
    </>
  );
}
