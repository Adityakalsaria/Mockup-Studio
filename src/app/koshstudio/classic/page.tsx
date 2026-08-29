import type { Metadata } from "next";
import KoshstudioClient from "@/features/koshstudio/KoshstudioClient";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";

/**
 * The pre-redesign editor, kept reachable while its remaining features —
 * backgrounds, the flow/screen picker, watermark and shadow — are ported
 * into the new shell. Deleting it before then would lose working tools.
 */
export const metadata: Metadata = {
  title: `Koshstudio (classic) | ${SITE_NAME}`,
  description: "Previous Koshstudio workspace, kept during the editor redesign.",
  alternates: {
    canonical: absoluteUrl("/koshstudio/classic"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function KoshstudioClassicPage() {
  return <KoshstudioClient />;
}
