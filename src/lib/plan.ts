/**
 * The two paid plans, and which one someone is on.
 *
 * The plan id is kept on the Clerk user's PUBLIC metadata, written only by the
 * Dodo webhook (`app/api/webhook/dodo-payments`) -- the client can read it but
 * Clerk does not let a browser write it, so it cannot be granted from devtools.
 * There is no table for it: a plan is one word on an account that already
 * exists.
 *
 * This file is imported from the studio's client bundle (`StudioChrome.tsx`,
 * `useStudio.ts`), so it carries no server-only code and no Dodo SDK import --
 * that lives in `lib/dodo.ts`, which this file's types describe but never
 * import from at runtime.
 */
export const FREE_EXPORT_SCALE = 1;

export type PlanId = "lite" | "pro";

/** Display copy for each plan -- the one place its name and price are spelled
    out, so the upgrade sheet and the account menu cannot say two different
    things about what Craft Pro costs. */
export const PLANS: Record<
  PlanId,
  { name: string; price: string; cadence: string }
> = {
  lite: { name: "Craft Lite", price: "$8", cadence: "/month" },
  pro: { name: "Craft Pro", price: "$69", cadence: "/year" },
};

function planOf(
  user: { publicMetadata?: Record<string, unknown> | null } | null | undefined,
): PlanId | null {
  const plan = user?.publicMetadata?.plan;
  return plan === "lite" || plan === "pro" ? plan : null;
}

/** Structural, so it takes Clerk's client `user` and its server `User` alike. */
export function planFor(
  user: { publicMetadata?: Record<string, unknown> | null } | null | undefined,
): PlanId | null {
  return planOf(user);
}

/** Either paid plan unlocks the same premium features; only the price and the
    billing interval differ between them. */
export function isPro(
  user: { publicMetadata?: Record<string, unknown> | null } | null | undefined,
): boolean {
  return planOf(user) !== null;
}
