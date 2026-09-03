"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/auth";

/**
 * Sign in, sign up and sign out, as server actions.
 *
 * Server-side rather than a fetch from the browser, so the session cookie is
 * set by the same response that performs the sign-in. Doing it client-side
 * means a round trip, then a second one to tell the server what happened, and
 * a window in between where the two disagree about who you are.
 *
 * Errors come back as a string rather than thrown: a wrong password is an
 * ordinary outcome of a login form, not an exception.
 */
export type AuthResult = { error: string } | undefined;

/**
 * Where to go after signing in.
 *
 * Only same-origin paths. A "next" straight off a query string is an open
 * redirect -- somebody links to the real sign-in page with next=//evil.example
 * and the site itself delivers the victim there, wearing our domain.
 */
function safeNext(value: FormData | string | null): string {
  const raw = typeof value === "string" ? value : String((value as FormData)?.get?.("next") ?? "");
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  // Unconfigured is a normal state on a fresh clone. Say so, rather than
  // throwing a 500 out of a login form.
  if (!isSupabaseConfigured()) return { error: "Sign-in is not configured yet." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Supabase deliberately does not say WHICH of the two was wrong, and neither
  // do we -- telling someone the email exists is how you enumerate accounts.
  if (error) return { error: "That email and password do not match." };

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  // Supabase enforces its own minimum; this is only so the form can say so
  // before spending a round trip on it.
  if (password.length < 8) return { error: "Use at least 8 characters." };
  // Unconfigured is a normal state on a fresh clone. Say so, rather than
  // throwing a 500 out of a login form.
  if (!isSupabaseConfigured()) return { error: "Sign-in is not configured yet." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(safeNext(formData));
}

export async function signOut() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/sign-in");
}
