"use client";

import Link from "next/link";
import { Button, ChevronIcon, Glyph } from "@/design/ui";
import { Reveal, Statement } from "../Chapter";
import { Wordmark } from "../Wordmark";
import { STUDIO } from "./Nav";

/** The last word: a two-tone statement and the full-width pill under it. */
export function FinalCta() {
  return (
    <section className="bg-white ds-page-gutter pt-[var(--spacing-section)] pb-[var(--space-64)]">
      <Statement first="Your turn." second="Make your next design look real." />
      <Reveal delay={0.1} className="layout-media mt-[var(--space-40)]">
        <Button flat href={STUDIO} width="100%" height={72}>
          <span className="type-tile flex items-center gap-[var(--space-8)]">
            Start creating
            <Glyph muted>
              <ChevronIcon />
            </Glyph>
          </span>
        </Button>
      </Reveal>
    </section>
  );
}

const FOOTER = [
  { title: "Mocraft", links: [{ label: "Start creating", href: STUDIO }, { label: "Sign in", href: "/sign-in" }, { label: "Create an account", href: "/sign-up" }] },
  { title: "Explore", links: [{ label: "Highlights", href: "#highlights" }, { label: "Closer look", href: "#closer-look" }, { label: "Devices", href: "#devices" }] },
  { title: "Help", links: [{ label: "Questions", href: "#faq" }] },
];

/** Black, under the page's rounded bottom edge. */
export function Footer() {
  return (
    <footer className="bg-black ds-page-gutter pt-[var(--space-64)] pb-[var(--space-40)]">
      <div className="layout-media">
        <div className="grid grid-cols-2 gap-[var(--space-32)] tablet:grid-cols-4">
          <span style={{ color: "var(--color-text-primary)" }}>
            <Wordmark width={96} />
          </span>
          {FOOTER.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-[var(--space-12)]">
              <p className="type-copy font-semibold text-text-primary">{col.title}</p>
              {col.links.map((l) =>
                l.href.startsWith("#") ? (
                  <a key={l.label} href={l.href} className="type-copy text-text-muted hover:text-text-primary">
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.label} href={l.href} className="type-copy text-text-muted hover:text-text-primary">
                    {l.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>
        <p className="type-caption mt-[var(--space-64)] border-t border-white/10 pt-[var(--space-24)] text-text-muted">
          Copyright © {new Date().getFullYear()} Mocraft. Apple, iPhone, iPad, MacBook and iMac are trademarks of Apple Inc.
        </p>
      </div>
    </footer>
  );
}
