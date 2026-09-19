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
 * Mocraft, at mocraft.app/studio. The root is the landing page; its
 * "Start creating" links here.
 *
 * Behind Clerk's sign-in, decided on the server before render. A client-side
 * check would paint the chrome and then take it away. `redirectToSignIn`
 * carries this address as the return URL, so signing in comes straight back.
 */
export default async function MocraftPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return <StudioChrome />;
}
