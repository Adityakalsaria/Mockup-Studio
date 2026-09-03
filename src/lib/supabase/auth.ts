import { createClient } from "./server";

/**
 * Whether the project is wired up at all.
 *
 * A gate that fires when Supabase is unconfigured locks everyone out of a
 * fresh clone, a preview deploy with no keys, and any machine where the env
 * file has not been filled in yet -- including the one this was written on.
 * So the rule is: enforce auth when there is an auth service to enforce it
 * against, and otherwise get out of the way.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * The signed-in user, or null.
 *
 * getUser rather than getSession: getSession reads the cookie and believes it,
 * which is fine in the browser and worthless on the server, where the cookie
 * is exactly the thing a visitor controls. Anywhere a decision hangs on the
 * answer, the token has to be verified.
 */
export async function currentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
