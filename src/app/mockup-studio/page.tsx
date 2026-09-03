import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import EditorShell from "@/features/mockup-studio/editor/EditorShell";
import { currentUser, isSupabaseConfigured } from "@/lib/supabase/auth";
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

/**
 * The studio, behind a sign-in -- but only where there is one to be behind.
 *
 * Gating unconditionally locks everyone out of a fresh clone, a preview deploy
 * with no keys, and any machine where .env.local has not been filled in yet.
 * So the gate is conditional on the project being configured at all: enforce
 * auth when there is an auth service to enforce it against, otherwise get out
 * of the way.
 *
 * Decided on the server, before render. A client-side check would paint the
 * whole editor and then yank it away, and would hand the page to anyone with
 * scripting off.
 */
export default async function MockupStudioPage() {
  const user = await currentUser();
  if (isSupabaseConfigured() && !user) {
    // Carries where they were going, so signing in returns them here rather
    // than dumping them on an account page they did not ask for.
    redirect("/auth/sign-in?next=/mockup-studio");
  }

  return <EditorShell userEmail={user?.email ?? null} />;
}
