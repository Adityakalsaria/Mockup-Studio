import type { Metadata } from "next";
import EditorShell from "@/features/koshstudio/editor/EditorShell";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: `Koshstudio | ${SITE_NAME}`,
  description: "Internal Koshstudio workspace for composing mobile-flow mockups from the live app.",
  alternates: {
    canonical: absoluteUrl("/koshstudio"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function KoshstudioPage() {
  return <EditorShell />;
}
