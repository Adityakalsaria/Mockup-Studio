import { lastSample, subscribe } from "@/features/mockup-studio/gyro/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-sent events rather than a WebSocket.
 *
 * The traffic is entirely one-way — phone to studio — which is exactly the
 * shape SSE has, and it needs no server beyond the route handler we already
 * get from Next. A WebSocket would mean a second process to run and keep
 * alive next to `next dev`.
 */
export async function GET() {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | undefined;
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

      // Anything already known, immediately — otherwise a receiver that
      // connects between samples shows nothing until the phone next moves.
      const seed = lastSample();
      if (seed) send(seed);

      unsubscribe = subscribe(send);

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
      // a batch delivered whenever the buffer happens to flush.
      "X-Accel-Buffering": "no",
    },
  });
}
