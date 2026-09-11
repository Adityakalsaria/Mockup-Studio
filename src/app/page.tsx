import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import StudioChrome from "@/features/mockup-studio/mocraft/StudioChrome";
import { currentUser, isSupabaseConfigured } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Mocraft" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Mocraft, at the root of mocraft.app.
 *
 * This used to REDIRECT to `/mockup-studio/ui`, so the address bar read
 * mocraft.app/mockup-studio/ui on the one site whose name is the product.
 * Rendering it here gives it the address it should have; `/mockup-studio/ui`
 * redirects back so nothing already linked breaks. The old editor keeps
 * `/mockup-studio`, which the pairing QR, the deep link and the iOS app use.
 *
 * Behind the same sign-in as before, decided on the server before render and
 * only when Supabase is configured -- see `/mockup-studio/page.tsx` for why
 * the gate is conditional. Signing in comes back here.
 */
export default async function MocraftPage() {
  const user = await currentUser();
  if (isSupabaseConfigured() && !user) {
    redirect("/auth/sign-in?next=/");
  }
  return <StudioChrome userEmail={user?.email ?? null} />;
}
