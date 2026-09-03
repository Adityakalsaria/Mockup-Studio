import { subscribe, type SignalRole } from "@/features/mockup-studio/broadcast/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-sent events rather than a WebSocket, matching /api/gyro/stream.
 *
 * Signalling looks two-way but is two one-way streams: each end POSTs to
 * /api/broadcast/signal and reads its own SSE. That needs no server beyond the
 * route handler Next already gives us, where a WebSocket would mean a second
 * process to run and keep alive next to `next dev`.
 *
 * Both ends use this — `?role=studio` for the browser, `?role=phone` for the
 * iOS app. EventSource cannot set headers, so the session and role travel in
 * the query string.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sessionId = params.get("s");
  const role = params.get("role");

  if (!sessionId || (role !== "studio" && role !== "phone")) {
    return new Response("s and role are required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Enqueuing after the client has gone throws; the cancel handler
          // below is what unsubscribes, so swallowing here is correct.
        }
      };

      // Subscribing replays anything already addressed to this end, which is
      // what lets the phone scan the QR long after the studio published its
      // offer and still negotiate.
      unsubscribe = subscribe(sessionId, role as SignalRole, (entry) => send(entry.message));

      if (!unsubscribe) {
        send({ kind: "bye", reason: "unknown session" });
        controller.close();
        return;
      }

      // Proxies and browsers drop an idle event stream. A comment line is not
      // an event, so it keeps the socket warm without reaching the client's
      // message handler.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* closed */
        }
      }, 15_000);
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and friends buffer by default, which turns a live stream into
      // one long pause followed by everything at once.
      "X-Accel-Buffering": "no",
    },
  });
}
