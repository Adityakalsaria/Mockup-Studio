"use client";

import Header from "@/components/layout/Header";

/**
 * Minimal page that renders only the Header component.
 * Used as an iframe source in the design-system preview so that
 * CSS media-query breakpoints fire at the iframe's width, not the
 * outer viewport.
 */
export default function HeaderFramePage() {
  return (
    <div className="bg-[var(--color-background)]">
      {/* Hide the Next.js dev indicator inside the iframe */}
      <style>{`nextjs-portal { display: none !important; }`}</style>
      <Header />
    </div>
  );
}
