import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import DesignSystemPage from "@/features/design-system/DesignSystemPage";
import { designSystemFaq } from "@/features/design-system/data/foundations";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema, techArticleSchema } from "@/lib/seo/schema";

const TITLE = `Website System Colors | ${SITE_NAME}`;
const DESCRIPTION =
  "Color tokens and usage guidance for the Kosh Website System.";

export const metadata: Metadata = {
  title: "Website System Colors",
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/website-system/colors"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/website-system/colors"),
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

export default function WebsiteSystemColorsRoute() {
  const datePublished = "2026-03-05";

  const schemas = [
    techArticleSchema({
      title: TITLE,
      description: DESCRIPTION,
      path: "/website-system/colors",
      datePublished,
      dateModified: datePublished,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Website System", path: "/website-system" },
      { name: "Colors", path: "/website-system/colors" },
    ]),
    faqSchema(designSystemFaq),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <DesignSystemPage initialSection="colors" sectionBasePath="/website-system" />
    </>
  );
}
