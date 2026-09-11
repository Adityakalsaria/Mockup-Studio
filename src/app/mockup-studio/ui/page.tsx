import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import StudioChrome from "@/features/mockup-studio/mocraft/StudioChrome";
import { currentUser, isSupabaseConfigured } from "@/lib/supabase/auth";

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
 *
 * Behind the same sign-in as the old editor, decided the same way: on the
 * server, before render, and only where there is an auth service to enforce
 * it against. This page used to have no check at all -- invisible while it
 * was a route nobody was sent to, and not once mocraft.app opens straight on
 * it. See `/mockup-studio/page.tsx` for why the gate is conditional.
 */
export default async function MocraftUIPage() {
  const user = await currentUser();
  if (isSupabaseConfigured() && !user) {
    // Back HERE after signing in, not to the old editor.
    redirect("/auth/sign-in?next=/mockup-studio/ui");
  }

  return <StudioChrome userEmail={user?.email ?? null} />;
}
