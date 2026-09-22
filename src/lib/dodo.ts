import DodoPayments from "dodopayments";
import { PLANS, type PlanId } from "./plan";

/**
 * Dodo Payments, server side only.
 *
 * `null` when no key is set, and every route that needs it answers 503 rather
 * than throwing -- so the studio runs unchanged, with upgrades simply
 * unavailable, until the keys are in Vercel. Test mode unless
 * `DODO_PAYMENTS_ENVIRONMENT` says `live_mode` outright, so a copied-but-not-
 * reviewed env var can never turn on real charges by accident.
 */
export function dodo(): DodoPayments | null {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) return null;
  return new DodoPayments({
    bearerToken,
    environment:
      process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
        ? "live_mode"
        : "test_mode",
  });
}

/**
 * Craft Lite and Craft Pro are two separate Dodo products -- each its own
 * fixed price and billing interval, set once in the dashboard rather than
 * chosen at checkout -- so a plan id maps straight to one product id.
 */
const PRODUCT_ENV: Record<PlanId, string> = {
  lite: "DODO_PRODUCT_LITE",
  pro: "DODO_PRODUCT_PRO",
};

/** The product id for a plan, or `null` if it is not a real plan or the env
    var is not set yet. Never trust a product id from the client: this is the
    only path from a plan NAME to a product id, and it only ever reads the
    server's own configuration. */
export function productFor(plan: unknown): string | null {
  if (plan !== "lite" && plan !== "pro") return null;
  return process.env[PRODUCT_ENV[plan]] || null;
}

/**
 * The reverse: which plan a purchased product id belongs to.
 *
 * This is what the webhook uses to decide what a subscription is FOR -- from
 * the product Dodo says was actually charged, not from anything the checkout
 * request or its metadata claimed. A product id that matches neither plan
 * (a stray or misconfigured one) resolves to `null`, which the webhook treats
 * as no access rather than guessing -- the safe direction to fail in.
 */
export function planForProduct(
  productId: string | null | undefined,
): PlanId | null {
  if (!productId) return null;
  for (const plan of Object.keys(PLANS) as PlanId[]) {
    if (productFor(plan) === productId) return plan;
  }
  return null;
}
