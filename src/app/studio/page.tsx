import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import StudioChrome from "@/features/mockup-studio/mocraft/StudioChrome";
import { isMobileUA } from "@/lib/isMobile";
import { signModelToken } from "@/lib/modelToken";
import DesktopOnly from "../DesktopOnly";

export const metadata: Metadata = { title: "Mocraft" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Mocraft, at mocraft.app/studio. The root is the landing page; its "Start
 * crafting" links here.
 *
 * Behind Clerk's sign-in, decided on the server before render. A client-side
 * check would paint the chrome and then take it away, and would hand the page
 * to anyone with scripting off. `redirectToSignIn` carries this address as
 * the return URL, so signing in comes straight back.
 */
export default async function MocraftPage() {
  // Before auth, so a signed-out phone sees the note, not a sign-in form.
  if (isMobileUA((await headers()).get("user-agent"))) return <DesktopOnly />;
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  /*
   * The signed link the stage loads its models through. Minted here because
   * this is where the session has already been established, and handed down
   * rather than fetched, so the first model request carries it. See
   * `lib/modelToken`.
   */
  return <StudioChrome modelToken={await signModelToken()} />;
}
