/**
 * A one-process rendezvous for WebRTC signalling.
 *
 * This is the ONLY server in the broadcast feature, and it never sees a video
 * frame. It carries the offer, the answer and a handful of ICE candidates —
 * a few kilobytes of text, once, while the two peers find each other. Once
 * they have, the media flows iPhone → Mac browser directly and this bus goes
 * silent for the rest of the session.
 *
 * Same shape as `../gyro/bus.ts`, and for the same reason: both handlers run
 * in the same Node process under `next dev`, so a module-level map is the
 * entire transport — no WebSocket server, no broker, nothing to run alongside.
 *
 * The tradeoff is identical too, and worth restating: this does NOT survive a
 * serverless deployment, where each request may land in a different instance
 * with its own module state. That is correct for what this is — a local tool
 * pairing a phone to the laptop it is sitting next to. If it ever needs to
 * work deployed, this file is the seam to replace.
 *
 * Held on globalThis because Next re-evaluates modules on HMR, and a fresh Map
 * per reload would drop every session mid-negotiation.
 */

/** Which end of the connection a message is going to. */
export type SignalRole = "studio" | "phone";

/**
 * An ICE candidate, as plain data.
 *
 * Deliberately not `RTCIceCandidateInit`: that is a DOM type, and this module
 * is imported by route handlers running in Node. The shape is the same.
 */
export type IceCandidatePayload = {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
};

export type SignalMessage =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "candidate"; candidate: IceCandidatePayload }
  | { kind: "bye"; reason: string };

type LogEntry = { seq: number; to: SignalRole; message: SignalMessage };

type Subscriber = (entry: LogEntry) => void;

type Session = {
  id: string;
  createdAt: number;
  /**
   * Every message, kept rather than consumed.
   *
   * Signalling is not synchronous: the studio publishes its offer and its
   * first candidates before the phone has scanned the QR, and a queue that
   * drained on delivery would lose all of them. A subscriber replays the log
   * from the start and then streams — so it does not matter which end
   * connects first, which is the entire failure mode this avoids.
   */
  log: LogEntry[];
  subscribers: Map<SignalRole, Set<Subscriber>>;
  seq: number;
};

const globalForBroadcast = globalThis as unknown as {
  __broadcastSessions?: Map<string, Session>;
};

const sessions: Map<string, Session> = (globalForBroadcast.__broadcastSessions ??= new Map());

/** A session nobody has touched for this long is abandoned — the tab was
    closed, or the QR was never scanned. Pruned lazily on write so there is no
    timer to own and nothing to clean up on shutdown. */
const SESSION_TTL_MS = 10 * 60 * 1000;

function prune(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessions) {
    if (session.createdAt < cutoff) sessions.delete(id);
  }
}

/** Short, unambiguous, and safe in a URL and a QR. No l/1/O/0. */
function newId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export function createSession(): Session {
  prune();
  const session: Session = {
    id: newId(),
    createdAt: Date.now(),
    log: [],
    subscribers: new Map([
      ["studio", new Set<Subscriber>()],
      ["phone", new Set<Subscriber>()],
    ]),
    seq: 0,
  };
  sessions.set(session.id, session);
  return session;
}

export function hasSession(id: string): boolean {
  return sessions.has(id);
}

/**
 * Send a message to the other end.
 *
 * `from` rather than `to` at the call site: a sender always knows which end it
 * is, and never has to reason about who is listening.
 */
export function publish(id: string, from: SignalRole, message: SignalMessage): boolean {
  const session = sessions.get(id);
  if (!session) return false;

  const to: SignalRole = from === "studio" ? "phone" : "studio";

  // Negotiation is invisible when it works and opaque when it does not: both
  // ends fail silently, and the only symptom is a phone that broadcasts into
  // nothing. One line per message is what makes "the answer never arrived"
  // distinguishable from "the answer arrived and ICE failed".
  const listeners = session.subscribers.get(to)?.size ?? 0;
  // The candidate string itself, not just the kind. An address that reads
  // `<uuid>.local` rather than a dotted quad is mDNS masking, and that single
  // detail is the difference between "ICE is negotiating" and "ICE has nothing
  // to negotiate with" — invisible from either end on its own.
  const detail =
    message.kind === "candidate"
      ? `: ${message.candidate.candidate.split(" ").slice(4, 8).join(" ")}`
      : "";
  console.log(
    `[broadcast ${id}] ${from} -> ${to}: ${message.kind}${detail}` +
      (listeners === 0 ? " (queued, no listener yet)" : ""),
  );

  session.seq += 1;
  const entry: LogEntry = { seq: session.seq, to, message };
  session.log.push(entry);
  // Touched, so an active negotiation is never pruned out from under itself.
  session.createdAt = Date.now();

  for (const send of session.subscribers.get(to) ?? []) {
    try {
      send(entry);
    } catch {
      // A dead subscriber must not take the others down with it. The stream's
      // own cancel handler is what actually removes it.
    }
  }
  return true;
}

/**
 * Listen as one end of a session, replaying anything already addressed to you.
 *
 * Returns null when the session is unknown — an expired QR, or a stale tab —
 * so the caller can answer 404 rather than opening a stream that will never
 * carry anything.
 */
export function subscribe(
  id: string,
  role: SignalRole,
  send: Subscriber,
): (() => void) | null {
  const session = sessions.get(id);
  if (!session) return null;

  const replay = session.log.filter((entry) => entry.to === role);
  console.log(
    `[broadcast ${id}] ${role} subscribed, replaying ${replay.length}: ` +
      `${replay.map((e) => e.message.kind).join(", ") || "nothing"}`,
  );
  for (const entry of replay) send(entry);

  const set = session.subscribers.get(role);
  set?.add(send);
  return () => {
    set?.delete(send);
  };
}

/** Whether the other end is currently listening. Drives the studio's "waiting
    for phone" state without a heartbeat of its own. */
export function peerPresent(id: string, role: SignalRole): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  return (session.subscribers.get(role)?.size ?? 0) > 0;
}

export function endSession(id: string): void {
  sessions.delete(id);
}
