"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fromDeviceOrientation } from "@/features/mockup-studio/gyro/quaternion";

/**
 * The page you open ON THE PHONE. It reads the device's orientation and posts
 * it to the studio.
 *
 * Two constraints shape all of this:
 *
 * 1. `DeviceOrientationEvent` only fires in a secure context, so the phone has
 *    to reach the dev server over HTTPS — see `npm run dev:https`.
 * 2. On iOS 13+ the events do not fire at all until
 *    `DeviceOrientationEvent.requestPermission()` resolves, and that call is
 *    only honoured from a user gesture. Hence the button; it cannot be
 *    skipped by requesting on mount.
 */

// iOS-only API, absent from the DOM lib's type for DeviceOrientationEvent.
type PermissionCapableDOE = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type Status = "idle" | "requesting" | "streaming" | "denied" | "unsupported";

/** 30 Hz. The sensor fires faster than this on most phones, but the receiver
    damps toward whatever it last heard, so doubling the post rate buys
    smoothness nobody can see and doubles the request load on the LAN. */
const SEND_INTERVAL_MS = 1000 / 30;

export default function RemoteClient() {
  const [status, setStatus] = useState<Status>("idle");
  const [sample, setSample] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);
  const [listeners, setListeners] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The latest reading, written by the sensor and read by the sender. A ref
  // rather than state on purpose: at 60 Hz, setState here would re-render the
  // page on every sensor tick and the phone would cook.
  const latest = useRef<{
    alpha: number;
    beta: number;
    gamma: number;
    q: { x: number; y: number; z: number; w: number };
  } | null>(null);
  const inFlight = useRef(false);
  // The readout is for reassurance, not for driving anything, so it updates a
  // few times a second. Setting it per send re-rendered the page 30 times a
  // second and made the phone warm for no visible gain.
  const lastPaint = useRef(0);

  // Support is decided on tap rather than on mount: the check needs `window`,
  // this page is prerendered, and a state set during hydration to something
  // the server did not render is a mismatch. `start` already reports
  // "unsupported" when the API is missing, so one path covers it.
  const start = useCallback(async () => {
    setError(null);
    setStatus("requesting");

    const DOE = window.DeviceOrientationEvent as PermissionCapableDOE | undefined;
    if (!DOE) {
      setStatus("unsupported");
      return;
    }

    // Android and desktop have no requestPermission and just work; only iOS
    // gates it. Treating "no function" as granted is what keeps this one code
    // path instead of two.
    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return;
        }
      } catch (cause) {
        // The usual cause is an insecure context: iOS rejects rather than
        // prompting when the page is not HTTPS, which is confusing enough to
        // deserve naming explicitly.
        setError(
          window.isSecureContext
            ? String(cause)
            : "This page is not on HTTPS, so iOS will not release motion data. Start the server with npm run dev:https.",
        );
        setStatus("denied");
        return;
      }
    }

    setStatus("streaming");
  }, []);

  // Sensor -> ref
  useEffect(() => {
    if (status !== "streaming") return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return;
      // Converted here, at the source, so the angles never travel — see the
      // gimbal-lock note in gyro/quaternion.ts.
      const screenAngle = window.screen?.orientation?.angle ?? 0;
      latest.current = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        q: fromDeviceOrientation(event.alpha, event.beta, event.gamma, screenAngle),
      };
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [status]);

  // ref -> network, on a fixed cadence
  useEffect(() => {
    if (status !== "streaming") return;

    const timer = setInterval(() => {
      const current = latest.current;
      if (!current) return;
      // Skip rather than queue: on a slow link, queueing would build a backlog
      // of stale poses and the phone on screen would lag further behind the
      // real one the longer it ran.
      if (inFlight.current) return;

      inFlight.current = true;
      void fetch("/api/gyro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, t: Date.now() }),
        keepalive: true,
      })
        .then(async (response) => {
          const data = (await response.json()) as { listeners?: number };
          const now = performance.now();
          if (now - lastPaint.current > 200) {
            lastPaint.current = now;
            setListeners(typeof data.listeners === "number" ? data.listeners : null);
            setSample(current);
            setError(null);
          }
        })
        .catch((cause) => setError(String(cause)))
        .finally(() => {
          inFlight.current = false;
        });
    }, SEND_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [status]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0b0b0c",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ display: "grid", gap: 20, maxWidth: 380, width: "100%" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Mockup Studio remote</h1>
          <p style={{ opacity: 0.6, fontSize: 14, marginTop: 6 }}>
            Keep this open and move the phone.
          </p>
        </div>

        {status === "idle" ? (
          <button type="button" onClick={start} style={buttonStyle}>
            Allow motion access
          </button>
        ) : null}

        {status === "requesting" ? <p style={{ opacity: 0.7 }}>Waiting for permission…</p> : null}

        {status === "denied" ? (
          <>
            <p style={{ color: "#ff6b6b", fontSize: 14 }}>
              Motion access was refused.
            </p>
            <button type="button" onClick={start} style={buttonStyle}>
              Try again
            </button>
          </>
        ) : null}

        {status === "unsupported" ? (
          <p style={{ color: "#ff6b6b", fontSize: 14 }}>
            This browser has no orientation sensor API.
          </p>
        ) : null}

        {status === "streaming" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: listeners ? "#34d058" : "#f0a020",
                }}
              />
              <span style={{ fontSize: 13, opacity: 0.8 }}>
                {listeners
                  ? `Sending to ${listeners} listener${listeners === 1 ? "" : "s"}`
                  : "Sending — studio not connected yet"}
              </span>
            </div>

            <div style={numbersStyle}>
              <Reading label="α" value={sample?.alpha} />
              <Reading label="β" value={sample?.beta} />
              <Reading label="γ" value={sample?.gamma} />
            </div>
          </div>
        ) : null}

        {error ? (
          <p style={{ color: "#ff6b6b", fontSize: 13, lineHeight: 1.5 }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}

function Reading({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <div style={{ opacity: 0.5, fontSize: 12 }}>{label}</div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 20 }}>
        {value === undefined ? "—" : `${value.toFixed(1)}°`}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  appearance: "none",
  border: 0,
  borderRadius: 12,
  padding: "14px 20px",
  background: "#fff",
  color: "#000",
  fontSize: 16,
  fontWeight: 600,
};

const numbersStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  padding: "14px 0",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
};
