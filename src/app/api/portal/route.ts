import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { dodo } from "@/lib/dodo";

/**
 * Dodo's customer portal (cancel, change card, invoices) for the signed-in
 * user. The customer id comes from THEIR account, not the request: Dodo's own
 * handler reads it from the URL, which would open anyone's billing page to
 * anyone who guessed an id.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  const client = dodo();
  const user = await currentUser();
  const customerId = user?.publicMetadata?.dodoCustomerId;
  if (!client || typeof customerId !== "string")
    return NextResponse.json({ error: "no subscription to manage" }, { status: 404 });

  const { link } = await client.customers.customerPortal.create(customerId);
  return NextResponse.json({ url: link });
}
