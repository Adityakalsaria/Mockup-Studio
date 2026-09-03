"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IceCandidatePayload, SignalMessage } from "./bus";

/**
 * The studio's end of a direct iPhone → browser screen broadcast.
 *
 * The hook owns exactly one thing: turning a scanned QR into a `MediaStream`.
 * What that stream is *for* is not its business — `useScreenTexture` already
 * takes a MediaStream and does not ask where it came from, which is why this
 * lands in the editor as one more source rather than as a new pipeline.
 *
 * The media never touches the Next process. `/api/broadcast/*` carries the
 * offer, the answer and the candidates; the frames go peer to peer across the
 * LAN. If the studio is running, signalling works — there is nothing else to
 * deploy and nothing to reach on the internet.
 */

export type BroadcastState =
  /** Nothing running. */
  | "idle"
  /** Asking the server for a session and a QR. */
  | "pairing"
  /** QR is up; nobody has scanned it yet. */
  | "waiting"
  /** The phone answered; ICE is still finding a path. */
  | "connecting"
  /** Frames are arriving. */
  | "live"
  | "failed";

export type BroadcastLink = {
  /** Hand this straight to `useScreenTexture`. Null until the phone connects. */
  stream: MediaStream | null;
  state: BroadcastState;
  /** Inline SVG of the pairing payload, or null before it loads. */
  qr: string | null;
  /** The `mockupstudio://` payload encoded in the QR. Shown as text so a
      session can be recovered when the camera will not cooperate. */
  url: string | null;
  sessionId: string | null;
  reason: string | null;
  /** Everything needed to tell a stalled connection from a silent one. */
  diagnostics: Diagnostics;
  start: () => void;
  stop: () => void;
};

export type Diagnostics = {
  signaling: string;
  ice: string;
  gathering: string;
  connection: string;
  offerSent: boolean;
  answerApplied: boolean;
  trackReceived: boolean;
  localCandidates: number;
  remoteCandidates: number;
  /** True when the browser is publishing `<uuid>.local` instead of a real
      address. Harmless between browsers, which resolve it; a dead end for a
      native peer that cannot. */
  mdns: boolean;
  /** From getStats(). Bytes moving is the only proof that video is flowing —
      every other signal can look healthy while nothing arrives. */
  bytesReceived: number;
  framesDecoded: number;
  frameSize: string | null;
};

const EMPTY_DIAGNOSTICS: Diagnostics = {
  signaling: "closed",
  ice: "new",
  gathering: "new",
  connection: "new",
  offerSent: false,
  answerApplied: false,
  trackReceived: false,
  localCandidates: 0,
  remoteCandidates: 0,
  mdns: false,
  bytesReceived: 0,
  framesDecoded: 0,
  frameSize: null,
};

type PairResponse = {
  sessionId: string | null;
  url: string | null;
  qr: string | null;
  reason: string | null;
};

/**
 * No ICE servers, deliberately.
 *
 * STUN exists to discover a public address, which matters only when the peers
 * are on different networks. Both ends are on one Wi-Fi here, so host
 * candidates alone complete the connection — and an empty list is what makes
 * "no internet dependency" true rather than merely intended.
 *
 * The cost is that this cannot traverse client isolation (guest and hotel
 * Wi-Fi). That failure is surfaced rather than papered over: see the
 * `failed` state, which the panel explains.
 */
const ICE_CONFIG: RTCConfiguration = { iceServers: [] };

export function useBroadcastLink(): BroadcastLink {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<BroadcastState>("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics>(EMPTY_DIAGNOSTICS);
  const patch = useCallback(
    (next: Partial<Diagnostics>) => setDiagnostics((d) => ({ ...d, ...next })),
    [],
  );

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  /**
   * Candidates that arrived before the answer did.
   *
   * `addIceCandidate` throws while the remote description is unset, and the
   * phone starts trickling as soon as it has an answer to trickle against —
   * routinely before that answer has been applied here. Dropping them instead
   * of holding them is the classic cause of a negotiation that gets to
   * "connecting" and stops.
   */
  const pendingRef = useRef<IceCandidatePayload[]>([]);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const teardown = useCallback(() => {
    if (statsRef.current) clearInterval(statsRef.current);
    statsRef.current = null;
    sourceRef.current?.close();
    sourceRef.current = null;
    // Closing the peer connection releases the decoder. The tracks belong to
    // the connection, so there is nothing else to stop.
    pcRef.current?.close();
    pcRef.current = null;
    pendingRef.current = [];
  }, []);

  const stop = useCallback(() => {
    const id = sessionId;
    if (id) {
      // Best effort: tell the phone to stop broadcasting rather than leaving
      // it uploading into a connection nobody is reading.
      void fetch("/api/broadcast/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, from: "studio", kind: "bye", reason: "stopped" }),
      }).catch(() => {});
    }
    teardown();
    setStream(null);
    setSessionId(null);
    setQr(null);
    setUrl(null);
    setReason(null);
    setDiagnostics(EMPTY_DIAGNOSTICS);
    setState("idle");
  }, [sessionId, teardown]);

  /**
   * What actually triggers setup — NOT `state`.
   *
   * This effect used to depend on `state`, and that was a bug with no visible
   * cause. Setup ends by moving the state to "waiting", which changed the
   * dependency, which ran the effect's OWN cleanup and set `cancelled = true`.
   * Every handler on the peer connection is guarded by that flag, so from the
   * instant pairing succeeded the connection was live and completely deaf:
   * candidates stopped being posted after the first, the answer was ignored,
   * and `ontrack` dropped the video on arrival.
   *
   * A counter that only `start()` advances keeps the connection's lifetime
   * independent of anything the connection itself reports.
   */
  const [runId, setRunId] = useState(0);

  const start = useCallback(() => {
    setState((current) => (current === "idle" || current === "failed" ? "pairing" : current));
    setRunId((n) => n + 1);
  }, []);

  useEffect(() => {
    if (runId === 0) return;
    let cancelled = false;

    const send = (sid: string, message: SignalMessage) =>
      fetch("/api/broadcast/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, from: "studio", ...message }),
      });

    const run = async () => {
      const pair: PairResponse = await fetch("/api/broadcast/pair").then((r) => r.json());
      if (cancelled) return;

      if (!pair.sessionId) {
        setReason(pair.reason ?? "Could not open a pairing session.");
        setState("failed");
        return;
      }

      setSessionId(pair.sessionId);
      setQr(pair.qr);
      setUrl(pair.url);

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      // Receive-only: the studio has no camera to offer and must not ask for
      // one, or the browser raises a permission prompt for a stream nobody
      // wants. This also fixes the m-line the phone answers against.
      pc.addTransceiver("video", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (cancelled) return;
        patch({ trackReceived: true });
        setStream(event.streams[0] ?? new MediaStream([event.track]));
      };

      const sync = () =>
        patch({
          signaling: pc.signalingState,
          ice: pc.iceConnectionState,
          gathering: pc.iceGatheringState,
          connection: pc.connectionState,
        });

      pc.oniceconnectionstatechange = sync;
      pc.onicegatheringstatechange = sync;
      pc.onsignalingstatechange = sync;

      pc.onicecandidate = (event) => {
        if (!event.candidate || cancelled) return;
        setDiagnostics((d) => ({
          ...d,
          localCandidates: d.localCandidates + 1,
          mdns: d.mdns || event.candidate!.candidate.includes(".local"),
        }));
        void send(pair.sessionId as string, {
          kind: "candidate",
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment,
          },
        });
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        switch (pc.connectionState) {
          case "connected":
            setState("live");
            break;
          case "failed":
            setReason(
              "No direct route to the phone. Both devices must be on the same Wi-Fi, " +
                "and the network must not block device-to-device connections.",
            );
            setState("failed");
            break;
          case "disconnected":
          case "closed":
            setState((current) => (current === "live" ? "waiting" : current));
            break;
          default:
            break;
        }
      };

      const source = new EventSource(
        `/api/broadcast/stream?s=${encodeURIComponent(pair.sessionId)}&role=studio`,
      );
      sourceRef.current = source;

      source.onmessage = (event) => {
        if (cancelled) return;
        const message = JSON.parse(event.data) as SignalMessage;

        if (message.kind === "answer") {
          void pc
            .setRemoteDescription({ type: "answer", sdp: message.sdp })
            .then(async () => {
              patch({ answerApplied: true });
              setState((current) => (current === "live" ? current : "connecting"));
              for (const candidate of pendingRef.current) {
                await pc.addIceCandidate(candidate).catch(() => {});
              }
              pendingRef.current = [];
            })
            .catch(() => {
              setReason("The phone's answer could not be applied.");
              setState("failed");
            });
          return;
        }

        if (message.kind === "candidate") {
          setDiagnostics((d) => ({ ...d, remoteCandidates: d.remoteCandidates + 1 }));
          if (pc.remoteDescription) {
            void pc.addIceCandidate(message.candidate).catch(() => {});
          } else {
            pendingRef.current.push(message.candidate);
          }
          return;
        }

        if (message.kind === "bye") {
          setReason(message.reason);
          setState("waiting");
          setStream(null);
        }
      };

      source.onerror = () => {
        // EventSource reconnects on its own; only report once it has actually
        // given up, or a routine dev-server reload reads as a failure.
        if (source.readyState === EventSource.CLOSED && !cancelled) {
          setReason("Lost the signalling stream.");
          setState("failed");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (cancelled) return;
      await send(pair.sessionId, { kind: "offer", sdp: offer.sdp ?? "" });
      if (cancelled) return;
      patch({ offerSent: true });
      setState("waiting");

      /**
       * Poll getStats for the only number that settles the question.
       *
       * States can all read "connected" while nothing decodes — a codec
       * mismatch, a track that never produces, an encoder that stalled. Bytes
       * and decoded frames climbing is the difference between a connection and
       * a picture.
       */
      const stats = setInterval(async () => {
        if (cancelled || pc.connectionState === "closed") return;
        const report = await pc.getStats().catch(() => null);
        if (!report || cancelled) return;
        report.forEach((entry) => {
          if (entry.type !== "inbound-rtp" || entry.kind !== "video") return;
          patch({
            bytesReceived: entry.bytesReceived ?? 0,
            framesDecoded: entry.framesDecoded ?? 0,
            frameSize:
              entry.frameWidth && entry.frameHeight
                ? `${entry.frameWidth}x${entry.frameHeight}`
                : null,
          });
        });
      }, 1000);
      statsRef.current = stats;
    };

    void run().catch(() => {
      if (cancelled) return;
      setReason("Could not start the broadcast session.");
      setState("failed");
    });

    return () => {
      cancelled = true;
    };
  }, [runId, patch]);

  // Peer connections outlive React. An unmount without this leaves the phone
  // broadcasting into a connection nothing is reading.
  useEffect(() => teardown, [teardown]);

  return { stream, state, qr, url, sessionId, reason, diagnostics, start, stop };
}
