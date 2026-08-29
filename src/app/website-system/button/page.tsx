import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import DesignSystemPage from "@/features/design-system/DesignSystemPage";
import { designSystemFaq } from "@/features/design-system/data/foundations";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema, techArticleSchema } from "@/lib/seo/schema";

const TITLE = `Website System Button | ${SITE_NAME}`;
const DESCRIPTION =
  "Pill button variants for website CTAs, including interactive material and solid fill.";

export const metadata: Metadata = {
  title: "Website System Button",
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/website-system/button"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/website-system/button"),
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

export default function WebsiteSystemButtonRoute() {
  const datePublished = "2026-03-05";

  const schemas = [
    techArticleSchema({
      title: TITLE,
      description: DESCRIPTION,
      path: "/website-system/button",
      datePublished,
      dateModified: datePublished,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Website System", path: "/website-system" },
      { name: "Button", path: "/website-system/button" },
    ]),
    faqSchema(designSystemFaq),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <DesignSystemPage initialSection="button" sectionBasePath="/website-system" />
    </>
  );
}
