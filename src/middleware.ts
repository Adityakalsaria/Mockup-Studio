import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk's session handling, on every request that can carry one.
 *
 * This replaced a Supabase session refresh. It protects nothing by itself --
 * `clerkMiddleware()` with no handler makes the session available to `auth()`
 * and leaves every route public -- because the gates live on the pages that
 * need them: `/` (Mocraft), `/mockup-studio` and `/account`. The phone's own
 * routes, `/mockup-studio/join`, `/remote` and `/gyro-test`, have to stay open
 * to a device that was never signed in, and a matcher-level rule would have
 * shut them along with everything else under `/mockup-studio`.
 *
 * The sign-in and sign-up URLs are stated here, not only in the environment,
 * so a redirect from `auth().redirectToSignIn()` lands on this site's own
 * `/sign-in` rather than on Clerk's hosted page.
 */
export default clerkMiddleware({ signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export const config = {
  /*
   * Everything except static assets and image files -- and then Clerk's two.
   *
   * Refreshing a session on a request for a .glb or a favicon costs a network
   * round trip for no benefit, and this app ships megabytes of model and
   * texture -- so the exclusions are not housekeeping, they are most of the
   * requests. The API routes are listed explicitly because Clerk needs them
   * matched whatever the first pattern excludes, and `/__clerk` is its proxy.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|mp4|woff2?)$).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
