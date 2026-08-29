import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import DesignSystemPage from "@/features/design-system/DesignSystemPage";
import { designSystemFaq } from "@/features/design-system/data/foundations";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema, techArticleSchema } from "@/lib/seo/schema";

const TITLE = `Website System | ${SITE_NAME}`;
const DESCRIPTION =
  "Website System reference for Kosh typography, spacing, components, and implementation rules.";

export const metadata: Metadata = {
  title: "Website System",
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/website-system"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/website-system"),
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

export default function WebsiteSystemRoute() {
  const datePublished = "2026-03-05";

  const schemas = [
    techArticleSchema({
      title: TITLE,
      description: DESCRIPTION,
      path: "/website-system",
      datePublished,
      dateModified: datePublished,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Website System", path: "/website-system" },
    ]),
    faqSchema(designSystemFaq),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <DesignSystemPage initialSection="typography" sectionBasePath="/website-system" />
    </>
  );
}
