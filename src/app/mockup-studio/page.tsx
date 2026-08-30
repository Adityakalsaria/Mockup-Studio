import type { Metadata, Viewport } from "next";
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

/**
 * Without this, iOS Safari lays the page out at a 980px imaginary viewport and
 * scales the result down to fit -- so a 390px phone renders everything at 0.4x
 * and a 36px control lands at 14px on glass. None of the responsive work below
 * the laptop breakpoint would be reachable. The site has no viewport meta at all,
 * so this is declared per route rather than at the root, where it would change
 * how every marketing page renders.
 *
 * Zoom is deliberately left enabled. Pinch-to-zoom is an accessibility feature
 * and a mockup editor is exactly the kind of dense UI someone needs it for.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The editor runs edge to edge, so it opts into the display cutout area and
  // pads itself back out with the safe-area insets.
  viewportFit: "cover",
};

export default function MockupStudioPage() {
  return <EditorShell />;
}
