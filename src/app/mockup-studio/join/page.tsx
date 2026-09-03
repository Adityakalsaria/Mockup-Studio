"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * What the pairing QR actually opens.
 *
 * Scanned from the studio with the stock Camera app, so it has to work in
 * Safari on a phone that may have nothing installed yet. Its whole job is to
 * hand the session to the Mockup Studio app — and to say something useful when
 * that app is not there, which is the case for every first-time user.
 *
 * Served from the Mac over the LAN like everything else here. Opening it does
 * not touch the internet.
 */

function Join() {
  const params = useSearchParams();
  const sessionId = params.get("s");

  /**
   * Built at click time, not held in state.
   *
   * It is derived entirely from `sessionId` and the address bar — this page was
   * fetched from the Mac, so its own origin IS the address the app needs to
   * dial, which is one less thing that can disagree with itself. Deriving it in
   * an effect meant a `setState` during render for a value that never changes,
   * and reading `window` during render would not survive prerendering.
   */
  const openInApp = () => {
    const scheme = window.location.protocol.replace(":", "");
    const port = window.location.port || (scheme === "https" ? "443" : "80");
    /**
     * Not attempted automatically on mount.
     *
     * Navigating to a custom scheme no installed app claims does not fail
     * quietly on iOS — Safari raises "the address is invalid", modally. Doing
     * that on load means every user without the app gets an error alert as
     * their first experience of pairing, for a state that is entirely normal.
     * There is no way to feature-detect a registered scheme, so the handoff is
     * a tap the user chooses to make.
     */
    window.location.href =
      `mockupstudio://join?s=${sessionId}` +
      `&h=${window.location.hostname}&p=${port}&x=${scheme}`;
  };

  if (!sessionId) {
    return (
      <main style={shell}>
        <h1 style={title}>No pairing code</h1>
        <p style={body}>Open Mockup Studio on your Mac and scan the code again.</p>
      </main>
    );
  }

  return (
    <main style={shell}>
      <span style={tick}>Connected</span>
      <h1 style={title}>Your phone reached the studio</h1>
      <p style={body}>
        This phone and your Mac are on the same network, and a broadcast
        session is open and waiting.
      </p>

      <div style={codeBox}>
        <span style={codeLabel}>Session</span>
        <span style={code}>{sessionId}</span>
      </div>

      <p style={{ ...body, marginTop: 24 }}>
        To send your screen, continue in the Mockup Studio app. Screen
        broadcasting cannot be done from Safari — iOS only allows it from an
        installed app.
      </p>

      <button type="button" onClick={openInApp} style={buttonStyle}>
        Continue in the app
      </button>

      <p style={{ ...body, marginTop: 12, fontSize: 12 }}>
        Requires the Mockup Studio app on this phone.
      </p>
    </main>
  );
}

export default function JoinPage() {
  // useSearchParams needs a Suspense boundary or the route cannot prerender.
  return (
    <Suspense fallback={null}>
      <Join />
    </Suspense>
  );
}

const shell: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 32,
  textAlign: "center",
  background: "#0b0b0c",
  color: "#f5f5f7",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
};

const title: React.CSSProperties = { fontSize: 22, fontWeight: 600, margin: 0 };
const tick: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "#4ade80",
};
const body: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  margin: 0,
  maxWidth: 320,
  color: "rgba(245,245,247,0.62)",
};
const codeBox: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "14px 22px",
  marginTop: 12,
  borderRadius: 14,
  background: "rgba(255,255,255,0.06)",
};
const codeLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "rgba(245,245,247,0.45)",
};
const code: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 600,
  letterSpacing: 3,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};
const buttonStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "12px 22px",
  borderRadius: 999,
  background: "#f5f5f7",
  color: "#0b0b0c",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};
