"use client";

import Link from "next/link";
import { Wordmark } from "../Wordmark";
import { STUDIO } from "./Nav";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Craft", href: "#craft" },
      { label: "Step by step", href: "#steps" },
      { label: "Motion", href: "#motion" },
      { label: "What you make", href: "#assets" },
    ],
  },
  {
    title: "Studio",
    links: [
      { label: "Start crafting", href: STUDIO },
      { label: "Sign in", href: "/sign-in" },
      { label: "Create an account", href: "/sign-up" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Join the waitlist", href: "/waitlist" },
    ],
  },
];

/**
 * The footer: the name, a line and one button on the left, three columns of
 * links on the right, the small print under a rule -- and the wordmark, far
 * larger than anything above it, faded out as it runs off the bottom edge.
 */
export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#f4f4f5] ds-page-gutter pt-[var(--space-80)]">
      <div className="layout-media">
        <div className="flex flex-col gap-[var(--space-48)] laptop:flex-row laptop:justify-between">
          <div className="max-w-[320px]">
            <span className="text-text-primary-dark">
              <Wordmark width={132} />
            </span>
            <p className="type-copy mt-[var(--space-16)] text-text-secondary-dark">Where craft meets motion.</p>
            <a
              href={STUDIO}
              className="type-caption mt-[var(--space-24)] inline-flex h-[40px] items-center rounded-full px-[var(--space-24)] font-medium text-white transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[#1a8fff] active:scale-[0.99]"
              style={{ background: "#0a84ff", boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.28)" }}
            >
              Start crafting
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-[var(--space-48)] gap-y-[var(--space-32)] tablet:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title} className="flex flex-col gap-[var(--space-12)]">
                <p className="type-copy text-text-muted-dark">{col.title}</p>
                {col.links.map((l) =>
                  l.href.startsWith("#") ? (
                    <a key={l.label} href={l.href} className="type-copy text-text-primary-dark transition-colors hover:text-text-secondary-dark">
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href} className="type-copy text-text-primary-dark transition-colors hover:text-text-secondary-dark">
                      {l.label}
                    </Link>
                  ),
                )}
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-[var(--space-64)] border-t border-black/10 pt-[var(--space-24)]">
          <p className="type-caption max-w-[760px] text-text-muted-dark">
            Apple, iPhone, iPad, MacBook, iMac and Studio Display are trademarks of Apple Inc., registered in the U.S. and other countries. Mocraft is not affiliated with, or endorsed by, Apple.
          </p>
          <p className="type-caption mt-[var(--space-16)] text-text-muted-dark">© {new Date().getFullYear()} Mocraft.</p>
        </div>
      </div>

      {/* The wordmark as an alpha mask filled with a fade, cut off by the page's edge. */}
      <div aria-hidden className="pointer-events-none mx-auto mt-[var(--space-40)] w-[min(100%,1500px)] translate-y-[26%]">
        <div
          style={{
            aspectRatio: "253 / 40",
            background: "linear-gradient(180deg, rgb(0 0 0 / 0.14), rgb(0 0 0 / 0.02) 92%)",
            maskImage: "url(/figma-assets/mockup-studio/wordmark.svg)",
            WebkitMaskImage: "url(/figma-assets/mockup-studio/wordmark.svg)",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      </div>
    </footer>
  );
}
