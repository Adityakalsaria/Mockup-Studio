import type { Viewport } from "next";
import RemoteClient from "./RemoteClient";

export const metadata = {
  title: "Mockup Studio remote",
  // No point in this ever being shared or indexed; it is a device pairing page.
  robots: { index: false, follow: false },
};

/** This page is only ever opened on a phone -- see the note in ../page.tsx. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RemotePage() {
  return <RemoteClient />;
}
