import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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
 * Open to anyone: the account is asked for at the export, not at the door, so
 * a visitor can make something before deciding it is worth signing in for.
 * See `StudioChrome`.
 */
export default async function MocraftPage() {
  if (isMobileUA((await headers()).get("user-agent"))) return <DesktopOnly />;
  /*
   * The signed link the stage loads its models through, handed down rather
   * than fetched so the first model request carries it. See `lib/modelToken`.
   */
  return <StudioChrome modelToken={await signModelToken()} />;
}
