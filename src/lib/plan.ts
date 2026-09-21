/**
 * Which plan someone is on.
 *
 * Kept on the Clerk user's PUBLIC metadata, written only by the Dodo webhook
 * (`app/api/webhook/dodo-payments`) -- the client can read it but Clerk does
 * not let a browser write it, so it cannot be granted from devtools. There is
 * no table for it: a plan is one word on an account that already exists.
 */
export const FREE_EXPORT_SCALE = 1;

/** Structural, so it takes Clerk's client `user` and its server `User` alike. */
export function isPro(
  user: { publicMetadata?: Record<string, unknown> | null } | null | undefined,
): boolean {
  return user?.publicMetadata?.plan === "pro";
}
