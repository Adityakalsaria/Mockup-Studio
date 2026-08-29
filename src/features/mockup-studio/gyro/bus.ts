/**
 * A one-process pub/sub for orientation samples.
 *
 * The phone POSTs samples to /api/gyro; the studio subscribes over SSE at
 * /api/gyro/stream. Both handlers run in the same Node process under
 * `next dev`, so a module-level set of subscribers is the entire transport —
 * no WebSocket server, no dependency, nothing to run alongside.
 *
 * The tradeoff is deliberate and worth stating: this does NOT survive a
 * serverless deployment, where each request may land in a different instance
 * with its own module state. That is fine for what this is — a local tool
 * driven by a phone on the same LAN as the laptop. If it ever needs to work
 * deployed, this is the seam to replace with a real broker.
 *
 * Held on globalThis because Next's dev server re-evaluates modules on HMR,
 * and a fresh Set per reload would silently drop every existing subscriber.
 */

export type GyroSample = {
  /**
   * The orientation, as a quaternion. THIS is what drives the model.
   *
   * Converted on the phone rather than here so the Euler angles never travel:
   * they gimbal-lock near vertical and wrap at 360°, and interpolating either
   * artefact is what makes the model flicker. See `./quaternion.ts`.
   */
  q: { x: number; y: number; z: number; w: number };
  /** Compass-relative yaw, degrees. Display only. */
  alpha: number;
  /** Front-to-back tilt, degrees. Display only. */
  beta: number;
  /** Left-to-right tilt, degrees. Display only. */
  gamma: number;
  /** Device clock, milliseconds. Lets the receiver measure real latency and
      spot a stalled sender, which a bare value cannot. */
  t: number;
};

type Subscriber = (sample: GyroSample) => void;

const globalForGyro = globalThis as unknown as {
  __gyroSubscribers?: Set<Subscriber>;
  __gyroLast?: GyroSample | null;
};

const subscribers: Set<Subscriber> = (globalForGyro.__gyroSubscribers ??= new Set());

export function publish(sample: GyroSample): void {
  globalForGyro.__gyroLast = sample;
  for (const send of subscribers) {
    try {
      send(sample);
    } catch {
      // A dead subscriber must not take the others down with it. The stream's
      // own cancel handler is what actually removes it.
    }
  }
}

export function subscribe(send: Subscriber): () => void {
  subscribers.add(send);
  return () => {
    subscribers.delete(send);
  };
}

/** The most recent sample, so a receiver that connects mid-stream has
    something to show immediately instead of an empty panel until the next
    sample lands. */
export function lastSample(): GyroSample | null {
  return globalForGyro.__gyroLast ?? null;
}

export function subscriberCount(): number {
  return subscribers.size;
}
