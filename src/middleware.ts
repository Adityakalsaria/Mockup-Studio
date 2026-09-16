import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  MODEL_PATH_PREFIX,
  MODEL_TOKEN_PARAM,
  verifyModelToken,
} from "@/lib/modelToken";

/**
 * Clerk's session handling, on every request that can carry one -- and the one
 * gate that has to live here rather than on a page.
 *
 * This replaced a Supabase session refresh. It protects nothing by itself --
 * `clerkMiddleware()` with no handler makes the session available to `auth()`
 * and leaves every route public -- because the gates live on the pages that
 * need them: `/` (Mocraft), `/mockup-studio` and `/account`. The phone's own
 * routes, `/mockup-studio/join`, `/remote` and `/gyro-test`, have to stay open
 * to a device that was never signed in, and a matcher-level rule would have
 * shut them along with everything else under `/mockup-studio`.
 *
 * THE MODELS ARE THE EXCEPTION, because they are not a page. 100MB of device
 * geometry sat on the CDN at guessable URLs, deliberately excluded from this
 * matcher for speed, so the whole set came down with one curl and no account.
 * A static file has no server component to gate it; the middleware is the only
 * place a request for one can be turned away. See `lib/modelToken`.
 *
 * The sign-in and sign-up URLs are stated here, not only in the environment,
 * so a redirect from `auth().redirectToSignIn()` lands on this site's own
 * `/sign-in` rather than on Clerk's hosted page.
 */
export default clerkMiddleware(
  async (auth, request) => {
    if (!request.nextUrl.pathname.startsWith(MODEL_PATH_PREFIX)) return;

    const token = request.nextUrl.searchParams.get(MODEL_TOKEN_PARAM);
    if (await verifyModelToken(token)) return;

    /*
     * A signed-in session is the fallback, so a tab left open past the token's
     * expiry keeps working rather than showing a device that will not load.
     */
    const { userId } = await auth();
    if (userId) return;

    /*
     * 404, not 403: a refusal that says "wrong token" also says "right path".
     * Nothing about the reply should help someone work out what is here.
     */
    return new NextResponse(null, { status: 404 });
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  /*
   * Everything except static assets and image files -- and then Clerk's two,
   * and the models.
   *
   * Refreshing a session on a request for a .glb or a favicon costs a network
   * round trip for no benefit, and this app ships megabytes of model and
   * texture -- so the exclusions are not housekeeping, they are most of the
   * requests. The API routes are listed explicitly because Clerk needs them
   * matched whatever the first pattern excludes, and `/__clerk` is its proxy.
   *
   * The models are listed for the opposite reason: the first pattern excludes
   * every `.glb`, and they are the one kind of file that must not be served
   * without being asked for properly.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|mp4|woff2?)$).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
    "/figma-assets/mockup-studio/models/:path*",
  ],
};
