import type { Metadata } from "next";
import GlobalCardPreviewClient from "@/app/global-card/GlobalCardPreviewClient";
import { absoluteUrl } from "@/lib/metadata";

const PAGE_TITLE = "Global Card Preview";
const PAGE_DESCRIPTION = "Blank preview route for the Kosh global card page.";

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | KOSH`,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/global-card"),
  },
  openGraph: {
    title: `${PAGE_TITLE} | KOSH`,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl("/global-card"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | KOSH`,
    description: PAGE_DESCRIPTION,
  },
};

export default function GlobalCardPage() {
  return <GlobalCardPreviewClient />;
}
