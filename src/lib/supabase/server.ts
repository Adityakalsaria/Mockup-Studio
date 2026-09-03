import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * The server client, for route handlers and server components.
 *
 * Sessions live in cookies rather than localStorage so the server can read
 * them too -- which is what makes a protected page able to decide before it
 * renders, instead of flashing its contents and then redirecting.
 *
 * The setAll catch is deliberate. A Server Component may not write cookies;
 * only middleware and route handlers may. Refresh happens in middleware, so a
 * component that merely reads a session can safely ignore the write.
 */
export async function createClient() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server Component: middleware owns the refresh. See above.
          }
        },
      },
    },
  );
}
