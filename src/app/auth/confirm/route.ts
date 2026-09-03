import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/auth";

/**
 * Where the emailed confirmation link lands.
 *
 * Supabase asks new accounts to confirm their address by default, which means
 * signUp does NOT return a session -- it sends a link, and that link has to
 * arrive somewhere that exchanges its token for one. Without this route the
 * signup flow looks like it works and then dead-ends on a 404, which is the
 * kind of break nobody notices until a real person hits it.
 *
 * A route handler rather than a page: it has to SET the session cookie, and
 * only a handler or middleware may write cookies in the App Router.
 *
 * The link carries a token_hash, not the token, and it is consumed here. That
 * is why this is a GET with a side effect -- the exchange is the point of the
 * request, and the token is single-use.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Same rule as the sign-in form: a redirect target off a query string is an
  // open redirect unless it is forced to be same-origin.
  const raw = searchParams.get("next") ?? "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";

  if (!isSupabaseConfigured() || !tokenHash || !type) {
    return NextResponse.redirect(`${origin}/auth/sign-in?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // Expired or already used. Both are ordinary -- people click old emails --
    // so it goes back to the form with a note rather than an error page.
    return NextResponse.redirect(`${origin}/auth/sign-in?error=link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
