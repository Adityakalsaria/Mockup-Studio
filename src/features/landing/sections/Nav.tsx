"use client";

import { Wordmark } from "../Wordmark";

export const STUDIO = "/studio";

/**
 * The top of the page: the wordmark on the left and one blue pill on the right,
 * over whatever ground the page has -- no bar, no links to wander off on.
 */
export function Nav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-navbar)] ds-page-gutter">
      <nav className="pointer-events-auto mx-auto flex h-[88px] max-w-[1260px] items-center justify-between">
        <a href="#top" aria-label="Mocraft" className="text-text-primary-dark">
          <Wordmark width={120} />
        </a>
        <a
          href={STUDIO}
          className="type-caption inline-flex h-[40px] items-center rounded-full px-[var(--space-24)] font-medium text-white transition-[transform,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-[#1a8fff] active:scale-[0.99]"
          style={{ background: "#0a84ff", boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.28), 0 6px 18px rgb(10 132 255 / 0.28)" }}
        >
          Start crafting
        </a>
      </nav>
    </header>
  );
}
