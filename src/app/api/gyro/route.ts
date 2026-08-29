import { NextResponse } from "next/server";
import { publish, subscriberCount, type GyroSample } from "@/features/mockup-studio/gyro/bus";

// The whole point is a live value, so nothing here may be cached or
// prerendered — a cached POST handler would serve one sample forever.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "expected JSON" }, { status: 400 });
  }

  const raw = body as Partial<GyroSample>;
  const alpha = finite(raw.alpha);
  const beta = finite(raw.beta);
  const gamma = finite(raw.gamma);

  const q = raw.q;
  const qx = finite(q?.x);
  const qy = finite(q?.y);
  const qz = finite(q?.z);
  const qw = finite(q?.w);

  // iOS hands out nulls before the first real reading, and a NaN that reaches
  // the rotation props turns the phone invisible rather than erroring — so a
  // partial sample is rejected here, at the edge, where it is still debuggable.
  if (alpha === null || beta === null || gamma === null) {
    return NextResponse.json({ error: "alpha, beta and gamma must be finite" }, { status: 400 });
  }
  if (qx === null || qy === null || qz === null || qw === null) {
    return NextResponse.json({ error: "q must be a finite quaternion" }, { status: 400 });
  }

  publish({
    q: { x: qx, y: qy, z: qz, w: qw },
    alpha,
    beta,
    gamma,
    t: finite(raw.t) ?? Date.now(),
  });

  // Echoing the listener count is what lets the phone show "connected" or
  // "waiting for the studio" instead of posting into a void.
  return NextResponse.json({ ok: true, listeners: subscriberCount() });
}
