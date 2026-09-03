import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A no-op the iPhone app calls the moment it pairs.
 *
 * Its only job is to be the FIRST request the app makes to this Mac, because
 * that request is what raises iOS's "allow local network access" prompt. Left
 * to happen on its own, that prompt lands mid-broadcast instead — and iOS
 * fails the connection that triggered it, so the extension's first attempt
 * dies no matter what the user taps.
 *
 * Doing it here means the permission is settled while the user is looking at
 * the pairing screen, where a prompt makes sense, and the extension starts
 * with the answer already given. Deliberately side-effect free: it must not
 * create or touch a session.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
