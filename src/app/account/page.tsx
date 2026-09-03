import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/auth";
import { signOut } from "../auth/actions";

/**
 * Proof that the session works, and the pattern for protecting anything else.
 *
 * getUser rather than getSession: getSession trusts the cookie, which is the
 * one thing a visitor controls. On a page that decides access, the token has
 * to be verified, and that is what getUser does.
 */
export default async function AccountPage() {
  // currentUser returns null when the project is unconfigured rather than
  // constructing a client with undefined keys, which threw a 500 on a machine
  // that simply had no .env.local yet.
  const user = await currentUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <main className="mx-auto flex min-h-[70svh] w-full max-w-[360px] flex-col justify-center gap-[16px] px-[20px]">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Signed in</h1>
      <p className="text-[14px] opacity-70">{user.email}</p>
      <form action={signOut}>
        <button
          type="submit"
          className="h-[40px] w-full rounded-[10px] border text-[14px] font-medium"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
