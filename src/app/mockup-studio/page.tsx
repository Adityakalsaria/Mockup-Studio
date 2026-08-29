import type { Metadata } from "next";
import EditorShell from "@/features/mockup-studio/editor/EditorShell";
import { SITE_NAME, absoluteUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: `MockupStudio | ${SITE_NAME}`,
  description: "Internal MockupStudio workspace for composing mobile-flow mockups from the live app.",
  alternates: {
    canonical: absoluteUrl("/mockup-studio"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function MockupStudioPage() {
  return <EditorShell />;
}
