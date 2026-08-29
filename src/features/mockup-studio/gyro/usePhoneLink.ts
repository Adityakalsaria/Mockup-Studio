"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GyroSample } from "./bus";
import { IDENTITY, relativeTo, type Quat } from "./quaternion";

/**
 * One hook for the whole phone connection: the pairing QR, whether a phone is
 * actually sending, and the live pose.
 *
 * The pose is handed back as a **ref**, not as state. At 30 samples a second a
 * state update per sample would re-render the entire editor — panel, timeline
 * and all — thirty times a second, and React's work would then compete with
 * the render loop. The stage reads the ref inside its existing `useFrame`
 * instead, which is where every other transform is already sampled.
 */

export type PhoneLink = {
  /** Live pose, relative to the captured zero. Read inside a frame loop. */
  poseRef: React.RefObject<Quat>;
  /** True while samples are arriving. Goes false if the phone stops. */
  connected: boolean;
  /** Inline SVG of the pairing URL, or null before it loads. */
  qr: string | null;
  url: string | null;
  /** False when the studio is on http — iOS will refuse motion data, so the
      panel warns instead of handing out a URL that pairs and then does
      nothing. */
  secure: boolean;
  reason: string | null;
  zeroed: boolean;
  /** Capture the current pose as neutral. Without it the model faces magnetic
      north rather than the user. */
  setZero: () => void;
  clearZero: () => void;
};

/** A phone that has stopped moving stops sending, so "connected" has to mean
    "heard from recently" rather than "the stream is open". */
const STALE_AFTER_MS = 1500;

export function usePhoneLink(enabled: boolean): PhoneLink {
  const poseRef = useRef<Quat>(IDENTITY);
  const rawRef = useRef<Quat | null>(null);
  const zeroRef = useRef<Quat | null>(null);
  const lastSeen = useRef(0);

  const [connected, setConnected] = useState(false);
  const [zeroed, setZeroed] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [secure, setSecure] = useState(true);
  const [reason, setReason] = useState<string | null>(null);

  // Pairing details, fetched once the panel is opened rather than on mount.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void fetch("/api/gyro/pair")
      .then((response) => response.json())
      .then((data: { qr?: string; url?: string; secure?: boolean; reason?: string }) => {
        if (cancelled) return;
        setQr(data.qr ?? null);
        setUrl(data.url ?? null);
        setSecure(data.secure ?? true);
        setReason(data.reason ?? null);
      })
      .catch(() => {
        if (!cancelled) setReason("Could not reach the pairing endpoint.");
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource("/api/gyro/stream");

    source.onmessage = (event) => {
      const sample = JSON.parse(event.data) as GyroSample;
      rawRef.current = sample.q;
      lastSeen.current = performance.now();
      poseRef.current = zeroRef.current ? relativeTo(zeroRef.current, sample.q) : sample.q;
    };

    // Liveness is polled rather than set per message, so the indicator costs
    // two renders a second instead of thirty.
    const poll = setInterval(() => {
      setConnected(performance.now() - lastSeen.current < STALE_AFTER_MS);
    }, 500);

    return () => {
      source.close();
      clearInterval(poll);
      setConnected(false);
    };
  }, [enabled]);

  const setZero = useCallback(() => {
    if (!rawRef.current) return;
    zeroRef.current = rawRef.current;
    poseRef.current = IDENTITY;
    setZeroed(true);
  }, []);

  const clearZero = useCallback(() => {
    zeroRef.current = null;
    setZeroed(false);
  }, []);

  // Gated on `enabled` here rather than cleared in the effect: unpairing must
  // not leave a stale "connected" visible for the render before cleanup runs.
  return {
    poseRef,
    connected: enabled && connected,
    qr,
    url,
    secure,
    reason,
    zeroed,
    setZero,
    clearZero,
  };
}
