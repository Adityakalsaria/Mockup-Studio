"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser client.
 *
 * Both values are public by design: the URL is an address and the anon key is
 * a publishable key that identifies the project, not the caller. Neither
 * grants access on its own -- what a request may read or write is decided by
 * row-level security in the database, against the signed-in user. That is the
 * whole reason RLS is not optional here: the key is in the bundle, so the
 * policy is the security boundary.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
