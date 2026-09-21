import { clerkClient } from "@clerk/nextjs/server";
import { Webhooks } from "@dodopayments/nextjs";
import { NextResponse } from "next/server";

/**
 * Dodo tells us a subscription changed; we put the result on the Clerk user.
 *
 * Driven by the subscription's STATUS, not by which event arrived: `active`
 * is Pro, anything else (on hold, failed, expired, cancelled) is not. That
 * makes every event idempotent and safe to receive twice or out of order, and
 * it means a subscription cancelled at the end of its term stays Pro until it
 * actually lapses. Signature checking is the adapter's job.
 */
type Subscription = {
  status?: string;
  subscription_id?: string;
  metadata?: Record<string, unknown> | null;
  customer?: { customer_id?: string; email?: string };
};

async function accountFor(data: Subscription): Promise<string | null> {
  const fromMetadata = data.metadata?.clerk_user_id;
  if (typeof fromMetadata === "string") return fromMetadata;
  // Fallback: the checkout was made with the account's own email.
  const email = data.customer?.email;
  if (!email) return null;
  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  return users[0]?.id ?? null;
}

const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

export const POST = secret
  ? Webhooks({
      webhookKey: secret,
      onPayload: async (payload) => {
        if (!payload.type.startsWith("subscription.")) return;
        const data = payload.data as unknown as Subscription;
        const userId = await accountFor(data);
        if (!userId) return;
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            plan: data.status === "active" ? "pro" : null,
            dodoCustomerId: data.customer?.customer_id ?? null,
            dodoSubscriptionId: data.subscription_id ?? null,
          },
        });
      },
    })
  : async () =>
      NextResponse.json({ error: "webhook secret is not set" }, { status: 503 });
