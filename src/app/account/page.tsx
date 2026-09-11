import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

/**
 * The signed-in user's account: Clerk's own profile page.
 *
 * Name, email addresses, password, connected accounts and active sessions,
 * all managed by Clerk. Hash routing so the page needs no catch-all route of
 * its own. Gated like every page that shows a user their own data.
 */
export default async function AccountPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return (
    <main className="flex min-h-screen items-center justify-center p-[20px]">
      <UserProfile routing="hash" />
    </main>
  );
}
