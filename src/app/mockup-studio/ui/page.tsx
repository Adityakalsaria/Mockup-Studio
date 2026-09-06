import type { Metadata, Viewport } from "next";
import StudioChrome from "@/features/mockup-studio/mocraft/StudioChrome";

export const metadata: Metadata = {
  title: "Mocraft UI",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * The new studio chrome, on its own route.
 *
 * Beside the existing editor rather than inside it: `EditorShell` and what it
 * pulls in is some seven thousand lines of working software, and replacing its
 * chrome is a separate change from establishing what the chrome is. This is
 * the thing to look at while that is being decided.
 */
export default function MocraftUIPage() {
  return <StudioChrome />;
}
