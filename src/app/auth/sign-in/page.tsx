import { redirect } from "next/navigation";

/**
 * The old sign-in address, forwarded to Clerk's.
 *
 * Sign-in used to live here, on Supabase, with its return path in `next`.
 * Links and bookmarks still carry that shape, so this passes the same path on
 * as Clerk's `redirect_url` -- same-origin only, as before: a return path
 * taken straight off a query string is an open redirect otherwise.
 */
export default async function LegacySignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/studio";
  redirect(`/sign-in?redirect_url=${encodeURIComponent(safe)}`);
}
