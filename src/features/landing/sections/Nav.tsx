"use client";

import { Wordmark } from "../Wordmark";

export const STUDIO = "/studio";

const LINKS = [
  { href: "#craft", label: "Craft" },
  { href: "#steps", label: "Steps" },
  { href: "#motion", label: "Motion" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

/**
 * The header, as the design has it: the wordmark, the sections in the middle,
 * and one liquid-glass button at the end, over a frosted white bar with a
 * hairline under it.
 */
export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-[var(--z-navbar)] shadow-[0_1px_0_rgb(0_0_0/0.05)]">
      <div aria-hidden className="absolute inset-0 bg-white/90 backdrop-blur-[12.5px]" />
      <div className="relative mx-auto flex h-[64px] max-w-[1082px] items-center justify-between px-5 min-[1040px]:px-[48px]">
        <a href="#top" aria-label="Mocraft" className="text-[#282228]">
          <Wordmark width={96} />
        </a>
        <nav aria-label="Sections" className="hidden flex-1 items-center justify-center gap-[8px] laptop:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="flex h-[32px] items-center rounded-[50px] px-[16px] text-[14px] text-[rgba(39,34,40,0.65)] transition-colors duration-[var(--duration-fast)] hover:bg-black/[0.04] hover:text-[#282228]"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href={STUDIO}
          className="relative inline-flex items-center justify-center rounded-full px-[12px] py-[8px] text-[14px] font-medium leading-[18px] text-white transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] active:scale-[0.99]"
          style={{
            backgroundImage:
              "linear-gradient(124deg, rgb(0, 62, 169) 30%, rgb(0, 63, 164) 47.6%, rgb(7, 0, 145) 65.3%, rgb(99, 118, 181) 86.5%, rgb(167, 238, 96) 100.6%)",
            boxShadow: "1.25px 0 0 #e6e6e6, -1.25px 0 0 #e6e6e6, 0 8px 15px rgb(0 0 0 / 0.02)",
            fontFeatureSettings: '"ss16" 1',
          }}
        >
          Start crafting
        </a>
      </div>
    </header>
  );
}
