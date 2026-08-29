import { networkInterfaces } from "node:os";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { subscriberCount } from "@/features/mockup-studio/gyro/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The pairing details for the phone: where to point it, and a QR of that URL.
 *
 * A route rather than a server component so /mockup-studio stays statically
 * prerendered — reading `networkInterfaces()` during render would force the
 * whole editor dynamic for a panel most sessions never open.
 */

/** The machine's LAN address. `location.hostname` in the studio is
    "localhost", which is precisely the address that cannot work on the phone,
    so this has to come from the server. */
function lanAddress(): string | null {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      // Skip loopback and the 169.254.x self-assigned range, which appears on
      // an interface that never got a lease and routes nowhere.
      if (entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254.")) {
        return entry.address;
      }
    }
  }
  return null;
}

export async function GET(request: Request) {
  const ip = lanAddress();
  const here = new URL(request.url);

  if (!ip) {
    return NextResponse.json({
      url: null,
      qr: null,
      secure: here.protocol === "https:",
      listeners: subscriberCount(),
      reason: "No LAN address — is this machine on Wi-Fi?",
    });
  }

  // The phone must reach the same origin over the network, on the same scheme:
  // iOS releases motion data only in a secure context, so an http URL here
  // pairs successfully and then silently refuses to produce readings.
  const url = `${here.protocol}//${ip}${here.port ? `:${here.port}` : ""}/mockup-studio/remote`;

  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    // Quiet-zone-tight and high contrast: this is scanned off a screen at
    // arm's length, not printed.
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return NextResponse.json({
    url,
    qr,
    secure: here.protocol === "https:",
    listeners: subscriberCount(),
    reason: null,
  });
}
