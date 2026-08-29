import type { Metadata } from "next";
import MockupStudioClient from "@/features/mockup-studio/MockupStudioClient";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";

/**
 * The pre-redesign editor, kept reachable while its remaining features —
 * backgrounds, the flow/screen picker, watermark and shadow — are ported
 * into the new shell. Deleting it before then would lose working tools.
 */
export const metadata: Metadata = {
  title: `MockupStudio (classic) | ${SITE_NAME}`,
  description: "Previous MockupStudio workspace, kept during the editor redesign.",
  alternates: {
    canonical: absoluteUrl("/mockup-studio/classic"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function MockupStudioClassicPage() {
  return <MockupStudioClient />;
}
