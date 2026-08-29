import RemoteClient from "./RemoteClient";

export const metadata = {
  title: "Mockup Studio remote",
  // No point in this ever being shared or indexed; it is a device pairing page.
  robots: { index: false, follow: false },
};

export default function RemotePage() {
  return <RemoteClient />;
}
