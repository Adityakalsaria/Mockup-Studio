import { networkInterfaces } from "node:os";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createSession } from "@/features/mockup-studio/broadcast/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Opens a signalling session and returns the QR the iPhone app scans.
 *
 * A route rather than a server component for the same reason as the gyro
 * pairing endpoint: reading `networkInterfaces()` during render would force
 * the whole editor dynamic for a panel most sessions never open.
 */

/**
 * The machine's LAN address. `location.hostname` in the studio is "localhost",
 * which is precisely the address that cannot work on the phone, so this has to
 * come from the server.
 *
 * Stricter than "first non-internal IPv4", which is what it looks like it
 * should be and is wrong on any machine with a VPN or a tethered phone. Those
 * interfaces are non-internal, sort first often enough to matter, and hand
 * back an address the phone cannot route to — pairing then fails with a QR
 * that looks perfectly valid. Only RFC1918 space is offered, and a /32 is
 * rejected outright: a host route has no LAN on it by definition.
 */
function isPrivateV4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function lanAddress(): string | null {
  /**
   * An explicit override, for the cases detection cannot get right: a
   * multi-homed machine, a container, or a network where the interface the
   * phone can reach is not the one that sorts first. Set
   * MOCKUP_STUDIO_LAN_HOST to the address the phone should dial.
   */
  const override = process.env.MOCKUP_STUDIO_LAN_HOST?.trim();
  if (override) return override;

  const candidates: string[] = [];

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      // A /32 is a point-to-point link — Personal Hotspot over USB, or a VPN.
      // There is no local network behind it to pair across.
      if (entry.netmask === "255.255.255.255") continue;
      if (!isPrivateV4(entry.address)) continue;
      candidates.push(entry.address);
    }
  }

  // 192.168/16 first: it is what home Wi-Fi hands out, and where both devices
  // almost always are. A 10/8 address is more often the corporate network the
  // phone is NOT on.
  candidates.sort((x, y) => Number(y.startsWith("192.168.")) - Number(x.startsWith("192.168.")));
  return candidates[0] ?? null;
}

export async function GET(request: Request) {
  const ip = lanAddress();
  const here = new URL(request.url);

  if (!ip) {
    return NextResponse.json({
      sessionId: null,
      url: null,
      qr: null,
      host: null,
      port: null,
      scheme: here.protocol.replace(":", ""),
      reason:
        "No LAN address. This machine is not on a Wi-Fi or Ethernet network the " +
        "phone can reach — a VPN or USB tether alone is not enough.",
    });
  }

  const session = createSession();
  const scheme = here.protocol.replace(":", "");
  const port = here.port || (scheme === "https" ? "443" : "80");

  /**
   * A plain LAN URL, not the app's custom scheme.
   *
   * The scheme version (`mockupstudio://join?…`) is what the app ultimately
   * consumes, and encoding it directly is tempting — it needs no page and no
   * redirect. It is also unscannable: iOS Camera refuses a scheme no installed
   * app claims, with "no usable data found", which is exactly what a user sees
   * before they have installed anything. The QR is the first step of setup, so
   * it cannot require the thing setup produces.
   *
   * An http URL to this machine scans with the stock Camera, opens a page that
   * hands off to the app when it is installed and explains itself when it is
   * not — and still resolves entirely on the LAN, with nothing on the internet
   * involved at any step.
   */
  const origin = `${scheme}://${ip}${port ? `:${port}` : ""}`;
  const url = `${origin}/mockup-studio/join?s=${session.id}`;
  /** What the page hands to the app. Also returned so the app's own in-app
      scanner and any manual entry path can use it directly. */
  const deepLink = `mockupstudio://join?s=${session.id}&h=${ip}&p=${port}&x=${scheme}`;

  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    // Quiet-zone-tight and high contrast: this is scanned off a screen at
    // arm's length, not printed.
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return NextResponse.json({
    sessionId: session.id,
    url,
    deepLink,
    qr,
    host: ip,
    port,
    scheme,
    reason: null,
  });
}
