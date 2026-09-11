import type { Metadata, Viewport } from "next";
import { auth } from "@clerk/nextjs/server";
import StudioChrome from "@/features/mockup-studio/mocraft/StudioChrome";

export const metadata: Metadata = { title: "Mocraft" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Mocraft, at the root of mocraft.app.
 *
 * It used to REDIRECT here -- first to the old editor, then to
 * `/mockup-studio/ui` -- so the address bar read mocraft.app/mockup-studio/ui
 * on the one site whose name is the product. Rendering it here gives it the
 * address it should have had; `/mockup-studio/ui` now redirects back to it so
 * nothing already linked breaks. The old editor keeps `/mockup-studio`, which
 * the pairing QR, the deep link and the iOS app all point at.
 *
 * Behind Clerk's sign-in, decided on the server before render. A client-side
 * check would paint the chrome and then take it away, and would hand the page
 * to anyone with scripting off. `redirectToSignIn` carries this address as
 * the return URL, so signing in comes straight back.
 */
export default async function MocraftPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <StudioChrome />;
}
