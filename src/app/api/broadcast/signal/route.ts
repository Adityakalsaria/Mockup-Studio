import { NextResponse } from "next/server";
import {
  hasSession,
  publish,
  type IceCandidatePayload,
  type SignalMessage,
  type SignalRole,
} from "@/features/mockup-studio/broadcast/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Where both ends post their half of the negotiation.
 *
 * One handler for both directions: the body says which end is speaking, and
 * the bus routes to the other. Text only — an SDP and some candidates. No
 * media has any route through this process.
 */

function isRole(value: unknown): value is SignalRole {
  return value === "studio" || value === "phone";
}

/**
 * Validate at the edge.
 *
 * A malformed candidate does not throw when it arrives — it throws inside
 * `addIceCandidate` on the far peer, where the only symptom is a connection
 * that never completes. Rejecting here keeps that debuggable.
 */
function parseCandidate(value: unknown): IceCandidatePayload | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.candidate !== "string") return null;

  const sdpMid = raw.sdpMid;
  const sdpMLineIndex = raw.sdpMLineIndex;
  if (sdpMid !== null && typeof sdpMid !== "string" && sdpMid !== undefined) return null;
  if (
    sdpMLineIndex !== null &&
    typeof sdpMLineIndex !== "number" &&
    sdpMLineIndex !== undefined
  ) {
    return null;
  }

  return {
    candidate: raw.candidate,
    sdpMid: typeof sdpMid === "string" ? sdpMid : null,
    sdpMLineIndex: typeof sdpMLineIndex === "number" ? sdpMLineIndex : null,
    usernameFragment:
      typeof raw.usernameFragment === "string" ? raw.usernameFragment : null,
  };
}

function parseMessage(raw: Record<string, unknown>): SignalMessage | null {
  switch (raw.kind) {
    case "offer":
    case "answer":
      return typeof raw.sdp === "string" ? { kind: raw.kind, sdp: raw.sdp } : null;
    case "candidate": {
      const candidate = parseCandidate(raw.candidate);
      return candidate ? { kind: "candidate", candidate } : null;
    }
    case "bye":
      return { kind: "bye", reason: typeof raw.reason === "string" ? raw.reason : "closed" };
    default:
      return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "expected JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const sessionId = raw.sessionId;
  const from = raw.from;

  if (typeof sessionId !== "string" || !isRole(from)) {
    return NextResponse.json({ error: "sessionId and from are required" }, { status: 400 });
  }
  if (!hasSession(sessionId)) {
    // Distinct from a 400: the phone should tell the user to rescan rather
    // than report a bug.
    return NextResponse.json({ error: "unknown session" }, { status: 404 });
  }

  const message = parseMessage(raw);
  if (!message) {
    return NextResponse.json({ error: "unrecognised signal" }, { status: 400 });
  }

  publish(sessionId, from, message);
  return NextResponse.json({ ok: true });
}
