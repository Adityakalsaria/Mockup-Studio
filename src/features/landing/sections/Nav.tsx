"use client";

import { Glass } from "@/design/ui";
import { Cta } from "../Cta";
import { Wordmark } from "../Wordmark";

export const STUDIO = "/studio";

const LINKS = [
  { href: "#highlights", label: "Highlights" },
  { href: "#closer-look", label: "Closer look" },
  { href: "#devices", label: "Devices" },
  { href: "#faq", label: "FAQ" },
];

/**
 * The floating local nav of a product page, made of the studio's own glass:
 * the name on the left, the chapters and one pill on the right.
 */
export function Nav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-[var(--space-12)] z-[var(--z-navbar)] ds-page-gutter">
      <Glass shape="pill" width="100%" className="pointer-events-auto mx-auto max-w-[1040px]">
        <nav className="relative z-[1] flex h-[36px] items-center justify-between pl-[var(--space-12)]">
          <a href="#top" aria-label="Mocraft" style={{ color: "var(--mo-ink)" }}>
            <Wordmark width={80} />
          </a>
          <div className="flex items-center gap-[var(--space-24)]">
            <div className="hidden items-center gap-[var(--space-24)] laptop:flex">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="type-caption text-text-secondary-dark transition-colors hover:text-text-primary-dark">
                  {l.label}
                </a>
              ))}
            </div>
            <Cta href={STUDIO} icon={null} chevron={false} height={36}>
              Start creating
            </Cta>
          </div>
        </nav>
      </Glass>
    </header>
  );
}
