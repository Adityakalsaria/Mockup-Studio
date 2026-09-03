import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Keeps the session alive.
 *
 * An access token is short-lived, and only middleware and route handlers may
 * write cookies in the App Router -- so if nothing refreshes here, a session
 * quietly expires mid-visit and the next server render sees a logged-out user
 * even though the browser still thinks otherwise.
 *
 * getUser(), not getSession(): getSession reads the cookie and believes it,
 * which is fine in the browser and worthless on the server, where the cookie
 * is exactly the thing an attacker controls. getUser asks Supabase to verify
 * the token. On a page that decides access, that difference is the whole
 * point.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Unconfigured is a normal state -- a fresh clone, or a preview deploy with
  // no keys. Pass the request through rather than throwing on every route.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  /*
   * Everything except static assets and image files.
   *
   * Refreshing a session on a request for a .glb or a favicon costs a network
   * round trip for no benefit, and this app ships megabytes of model and
   * texture -- so the exclusions here are not housekeeping, they are most of
   * the requests.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|mp4|woff2?)$).*)",
  ],
};
