import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { saans } from "@/lib/fonts";
import { siteMetadata } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = siteMetadata;

/**
 * The shell, stripped to what the studio needs.
 *
 * This was a marketing site's layout and carried a marketing site's baggage:
 * a cookie-consent provider, analytics, an "open an account" modal, a smooth
 * scroll provider, and preloads for a hero image sequence and a Spline scene
 * none of which exist here any more. All of it ran on every studio page, and
 * the consent banner in particular is a promise about tracking that is not
 * being done.
 *
 * The font preload stays -- it is used -- and the design-token provider does
 * not, because the studio carries its own tokens in `globals.css` and the
 * runtime one was there to let the marketing pages theme themselves.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={saans.variable} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Saans-TRIAL-VF.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${saans.className} antialiased bg-black`} suppressHydrationWarning>
        {/* Inside <body>, as Clerk requires. The URLs keep sign-in on this
            site's own pages, and a finished sign-in lands on Mocraft. */}
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          waitlistUrl="/waitlist"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
