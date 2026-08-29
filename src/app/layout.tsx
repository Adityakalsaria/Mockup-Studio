import type { Metadata } from "next";
import { saans } from "@/lib/fonts";
import { siteMetadata } from "@/lib/metadata";
import SmoothScrollProvider from "@/providers/SmoothScrollProvider";
import DesignTokenRuntimeProvider from "@/providers/DesignTokenRuntimeProvider";
import CookieConsentProvider from "@/providers/CookieConsentProvider";
import { OpenAccountModalProvider } from "@/components/modals/OpenAccountModal";
import ConditionalAnalytics from "@/components/ConditionalAnalytics";
import CookieBanner from "@/components/ui/CookieBanner";
import "./globals.css";
import ScrollToTopOnLoad from "@/components/ScrollToTopOnLoad";

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={saans.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to third-party origins for faster resource fetching */}
        <link rel="preconnect" href="https://prod.spline.design" />
        <link rel="dns-prefetch" href="https://prod.spline.design" />
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />

        {/* Preload Saans font for faster text rendering */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Saans-TRIAL-VF.woff2"
          crossOrigin="anonymous"
        />
        {/* Preload first 5 hero sequence frames for near-instant first paint */}
        {[240, 241, 242, 243, 244].map((n) => (
          <link
            key={n}
            rel="preload"
            as="image"
            type="image/webp"
            href={`/sequence/tab-bar/new iphone_${String(n).padStart(5, "0")}.webp`}
          />
        ))}
      </head>
      <body className={`${saans.className} antialiased bg-black`} suppressHydrationWarning>
        <DesignTokenRuntimeProvider />
        <CookieConsentProvider>
          <OpenAccountModalProvider>
            <SmoothScrollProvider>{children}</SmoothScrollProvider>
          </OpenAccountModalProvider>
          <ScrollToTopOnLoad />
          <ConditionalAnalytics />
          <CookieBanner />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
