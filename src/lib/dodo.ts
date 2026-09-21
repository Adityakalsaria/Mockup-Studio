import DodoPayments from "dodopayments";

/**
 * Dodo Payments, server side only.
 *
 * `null` when no key is set, and every route that needs it answers 503 rather
 * than throwing -- so the studio runs unchanged, with upgrades simply
 * unavailable, until the keys are in Vercel. Test mode unless
 * `DODO_PAYMENTS_ENVIRONMENT` says `live_mode` outright.
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

/** The two Pro products, created in Dodo's dashboard. */
export function productFor(interval: unknown): string | null {
  const id =
    interval === "yearly"
      ? process.env.DODO_PRODUCT_YEARLY
      : interval === "monthly"
        ? process.env.DODO_PRODUCT_MONTHLY
        : undefined;
  return id || null;
}
