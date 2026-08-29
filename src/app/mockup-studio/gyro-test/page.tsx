import { networkInterfaces } from "node:os";
import GyroTestClient from "./GyroTestClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gyro test",
  robots: { index: false, follow: false },
};

/**
 * Resolved on the server because the browser cannot see the machine's LAN
 * address — `location.hostname` on the desktop is "localhost", which is
 * exactly the address that will not work when typed into the phone.
 */
function lanAddress(): string | null {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return null;
}

export default function GyroTestPage() {
  return <GyroTestClient lanIp={lanAddress()} />;
}
