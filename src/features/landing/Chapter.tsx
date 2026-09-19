"use client";

import { Fragment, useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/** `--ease-out` from globals.css, for the motion library. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** `--ease-swift`: a steeper ease-out, for headlines and anything large. */
export const EASE_SWIFT = [0.19, 1, 0.22, 1] as const;

/**
 * A headline that arrives word by word: each word tips up out of a half-turn on
 * X while it rises and fades in, 0.05s after the one before, once, when the
 * heading is first seen. The numbers are Aave's. A "\n" starts a new line.
 * Reduced motion shows the words as they are.
 */
export function TextReveal({ children, delay = 0.3 }: { children: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  let n = 0;
  return (
    <span ref={ref} aria-label={children.replace(/\n/g, " ")}>
      {children.split("\n").map((line, l) => (
        <Fragment key={l}>
          {l > 0 ? <br /> : null}
          {line.split(/\s+/).filter(Boolean).map((word, i) => (
            <Fragment key={i}>
              {i > 0 ? " " : null}
              <motion.span
                aria-hidden
                style={{ display: "inline-block", position: "relative" }}
                initial={reduced ? false : { opacity: 0, rotateX: -45, y: "50%" }}
                animate={seen || reduced ? { opacity: 1, rotateX: 0, y: "0%" } : undefined}
                transition={{ duration: 0.937, ease: EASE_SWIFT, delay: delay + 0.05 * n++ }}
              >
                {word}
              </motion.span>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </span>
  );
}

/** Rises into place once, when it first enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A section's vertical rhythm and ground. Content widths are the children's call. */
export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative ds-page-gutter py-[var(--spacing-section)] ${className}`}>
      {children}
    </section>
  );
}

/** Black words inside a grey lead -- the product page's way of pointing. */
export function B({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <strong className={`font-semibold ${dark ? "text-text-primary" : "text-text-primary-dark"}`}>{children}</strong>;
}

/**
 * A chapter opener: eyebrow, a big headline (often two lines), and a grey lead
 * with a few words in black. Centered by default, the way a product page opens
 * each chapter; `left` for the chapters that set their headline on the column.
 */
export function Opener({
  eyebrow,
  title,
  children,
  align = "center",
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  align?: "center" | "left";
  dark?: boolean;
}) {
  const centered = align === "center";
  return (
    <Reveal className={`layout-product ${centered ? "text-center" : ""}`}>
      {eyebrow ? (
        <p className={`type-eyebrow mb-[var(--space-8)] ${dark ? "text-text-primary" : "text-text-primary-dark"}`}>{eyebrow}</p>
      ) : null}
      <h2 className={`type-section whitespace-pre-line ${dark ? "text-text-primary" : "text-text-primary-dark"}`}>{title}</h2>
      {children ? (
        <p
          className={`type-lead mt-[var(--space-24)] max-w-[720px] ${centered ? "mx-auto" : ""} ${
            dark ? "text-text-secondary" : "text-text-secondary-dark"
          }`}
        >
          {children}
        </p>
      ) : null}
    </Reveal>
  );
}

/** The left-set headline over a gallery, with an optional link at the far end. */
export function GalleryHead({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <Reveal className="layout-media flex flex-wrap items-end justify-between gap-[var(--space-16)]">
      <h2 className="type-headline whitespace-pre-line text-text-primary-dark">{title}</h2>
      {link ? (
        <a href={link.href} className="type-copy text-text-link hover:underline">
          {link.label} ›
        </a>
      ) : null}
    </Reveal>
  );
}

/**
 * Spec figures: a small qualifier, a big figure, a short label. Every figure on
 * this page is read from the studio's own data or code, never made up.
 */
export function Specs({
  items,
  className = "",
}: {
  items: { pre?: string; figure: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-[var(--space-32)] tablet:grid-cols-3 ${className}`}>
      {items.map(({ pre, figure, label }, i) => (
        <Reveal key={label} delay={i * 0.08}>
          {pre ? <p className="type-caption text-text-primary-dark">{pre}</p> : null}
          <p className="type-callout text-text-primary-dark">{figure}</p>
          <p className="type-caption mt-[var(--space-4)] text-text-secondary-dark">{label}</p>
        </Reveal>
      ))}
    </div>
  );
}

/** "Bold lead. Grey rest." -- the caption under a product page's cards. */
export function Caption({ lead, children }: { lead: string; children: ReactNode }) {
  return (
    <p className="type-copy mt-[var(--space-16)] max-w-[420px] text-text-secondary-dark">
      <B>{lead}</B> {children}
    </p>
  );
}

/** A small-caps label, the way a panel names what it is about. */
export function Overline({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`type-overline ${dark ? "text-text-muted" : "text-text-muted-dark"}`}>{children}</p>;
}

/**
 * The two-tone statement: a black line that says it and a grey line that
 * settles it, left-set and large.
 */
export function Statement({ first, second, as = "h2" }: { first: string; second: string; as?: "h1" | "h2" }) {
  const Tag = as;
  return (
    <Reveal className="layout-media">
      <Tag className={`${as === "h1" ? "type-hero" : "type-section"} text-text-primary-dark`}>
        {first}
        <br />
        <span className="text-text-muted-dark">{second}</span>
      </Tag>
    </Reveal>
  );
}
