import { Waitlist } from "@clerk/nextjs";

export const metadata = {
  title: "Join the Mocraft waitlist",
  robots: { index: false, follow: false },
};

/**
 * Where someone asks for access.
 *
 * Clerk's own form, for the same reason `/sign-in` is Clerk's: the instance is
 * what decides who gets in, and a hand-built form would be a second place for
 * that to be wrong. Entries land in the Clerk dashboard under Waitlist, and
 * approving one emails that person an invitation.
 *
 * This page only does anything once the instance's sign-up mode is set to
 * Waitlist. Until then sign-ups stay open and nobody is sent here.
 */
export default function WaitlistPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-[20px]">
      <Waitlist />
    </main>
  );
}
