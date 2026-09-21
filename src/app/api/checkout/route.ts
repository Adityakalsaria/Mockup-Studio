import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { dodo, productFor } from "@/lib/dodo";
import { isPro } from "@/lib/plan";

/**
 * Starts a Pro checkout for the signed-in user and hands back Dodo's hosted URL.
 *
 * The product is chosen HERE from `interval`, and the user's identity from the
 * session -- never from the request body. Dodo's ready-made session handler
 * takes both from the client, which would let anyone attach a purchase to
 * someone else's account through the metadata.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  const client = dodo();
  const { interval } = (await request.json().catch(() => ({}))) as {
    interval?: string;
  };
  const product = productFor(interval);
  if (!client || !product)
    return NextResponse.json({ error: "payments are not set up yet" }, { status: 503 });

  const user = await currentUser();
  if (isPro(user))
    return NextResponse.json({ error: "already on Pro" }, { status: 409 });
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return NextResponse.json({ error: "no email on the account" }, { status: 400 });

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: product, quantity: 1 }],
    customer: { email, name: user?.fullName || email.split("@")[0] },
    // Read back by the webhook to find this account; the email is its fallback.
    metadata: { clerk_user_id: userId },
    return_url:
      process.env.DODO_PAYMENTS_RETURN_URL ??
      `${new URL(request.url).origin}/studio?upgraded=1`,
  });
  if (!session.checkout_url)
    return NextResponse.json({ error: "no checkout url" }, { status: 502 });
  return NextResponse.json({ url: session.checkout_url });
}
