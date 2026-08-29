"use client";

import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function TelegramIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 28C21.732 28 28 21.732 28 14C28 6.268 21.732 0 14 0C6.268 0 0 6.268 0 14C0 21.732 6.268 28 14 28Z" fill="#26A5E4"/>
      <path d="M6.34 13.79L19.56 8.54C20.18 8.31 20.72 8.7 20.53 9.59L20.53 9.59L18.33 19.89C18.17 20.62 17.74 20.8 17.14 20.46L13.89 18.06L12.32 19.57C12.14 19.75 11.99 19.9 11.65 19.9L11.89 16.6L17.93 11.13C18.19 10.9 17.88 10.77 17.53 11L10.06 15.7L6.85 14.7C6.14 14.48 6.12 13.99 6.99 13.65L6.34 13.79Z" fill="white"/>
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.88 17.64C5.88 18.92 4.84 19.96 3.56 19.96C2.28 19.96 1.24 18.92 1.24 17.64C1.24 16.36 2.28 15.32 3.56 15.32H5.88V17.64Z" fill="#E01E5A"/>
      <path d="M7.04 17.64C7.04 16.36 8.08 15.32 9.36 15.32C10.64 15.32 11.68 16.36 11.68 17.64V24.44C11.68 25.72 10.64 26.76 9.36 26.76C8.08 26.76 7.04 25.72 7.04 24.44V17.64Z" fill="#E01E5A"/>
      <path d="M9.36 5.88C8.08 5.88 7.04 4.84 7.04 3.56C7.04 2.28 8.08 1.24 9.36 1.24C10.64 1.24 11.68 2.28 11.68 3.56V5.88H9.36Z" fill="#36C5F0"/>
      <path d="M9.36 7.04C10.64 7.04 11.68 8.08 11.68 9.36C11.68 10.64 10.64 11.68 9.36 11.68H3.56C2.28 11.68 1.24 10.64 1.24 9.36C1.24 8.08 2.28 7.04 3.56 7.04H9.36Z" fill="#36C5F0"/>
      <path d="M22.12 9.36C22.12 8.08 23.16 7.04 24.44 7.04C25.72 7.04 26.76 8.08 26.76 9.36C26.76 10.64 25.72 11.68 24.44 11.68H22.12V9.36Z" fill="#2EB67D"/>
      <path d="M20.96 9.36C20.96 10.64 19.92 11.68 18.64 11.68C17.36 11.68 16.32 10.64 16.32 9.36V3.56C16.32 2.28 17.36 1.24 18.64 1.24C19.92 1.24 20.96 2.28 20.96 3.56V9.36Z" fill="#2EB67D"/>
      <path d="M18.64 22.12C19.92 22.12 20.96 23.16 20.96 24.44C20.96 25.72 19.92 26.76 18.64 26.76C17.36 26.76 16.32 25.72 16.32 24.44V22.12H18.64Z" fill="#ECB22E"/>
      <path d="M18.64 20.96C17.36 20.96 16.32 19.92 16.32 18.64C16.32 17.36 17.36 16.32 18.64 16.32H24.44C25.72 16.32 26.76 17.36 26.76 18.64C26.76 19.92 25.72 20.96 24.44 20.96H18.64Z" fill="#ECB22E"/>
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="14" fill="#3D9B6F"/>
      <path d="M14 6C9.58 6 6 9.58 6 14C6 18.42 9.58 22 14 22C18.42 22 22 18.42 22 14C22 9.58 18.42 6 14 6ZM14 20C10.69 20 8 17.31 8 14C8 10.69 10.69 8 14 8C17.31 8 20 10.69 20 14C20 17.31 17.31 20 14 20Z" fill="white"/>
    </svg>
  );
}

function PartnerIcon({ label }: { label: string }) {
  return (
    <div className="flex h-7 items-center rounded-full bg-white/10 px-3">
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

type FeatureCard = {
  title: string;
  description: string;
  logos: React.ReactNode;
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: "1:1 Support",
    description:
      "Get direct access to our team through a private 1:1 Telegram or Slack channel \u2013 fast, personal, and always on.",
    logos: (
      <div className="flex items-center gap-3">
        <TelegramIcon />
        <SlackIcon />
      </div>
    ),
  },
  {
    title: "Regulated Partners",
    description:
      "We work with regulated partners and chartered accountants worldwide to help your business stay compliant.",
    logos: (
      <div className="flex flex-wrap items-center gap-2">
        <PartnerIcon label="Licensed" />
        <PartnerIcon label="Audited" />
        <PartnerIcon label="Compliant" />
        <PartnerIcon label="Insured" />
      </div>
    ),
  },
  {
    title: "Fraud Monitoring",
    description:
      "Every transaction is monitored in real-time to meet AML standards and protect your business from suspicious activity.",
    logos: (
      <div className="flex items-center gap-3">
        <CircleIcon />
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-text-muted">
          Coming Soon
        </span>
      </div>
    ),
  },
  {
    title: "Tax Reporting",
    description:
      "Need help with crypto tax filings? We\u2019ve partnered with global experts to support you with accurate and compliant reporting.",
    logos: (
      <div className="flex items-center gap-3">
        <div className="flex h-7 items-center rounded-full bg-white/10 px-3">
          <span className="text-[12px] font-semibold text-text-secondary">Ascent</span>
        </div>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function Card({ card }: { card: FeatureCard }) {
  return (
    <div className="flex h-full flex-col justify-between p-[var(--space-24)] laptop:p-[var(--space-32)]">
      <div>
        <h3 className="type-h3 text-text-primary">{card.title}</h3>
        <p className="mt-[var(--space-8)] type-body-m text-text-secondary">
          {card.description}
        </p>
      </div>
      <div className="mt-[var(--space-20)]">{card.logos}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                        */
/* ------------------------------------------------------------------ */

export default function TrustSection() {
  return (
    <section id="trust-section" className="bg-black">
      <div className="layout-content ds-page-gutter py-[var(--spacing-section)]">
        {/* Heading */}
        <h2 className="mx-auto max-w-[720px] text-center type-h1 text-text-primary">
          Better Banking with KOSH
        </h2>

        {/* ---- Desktop 2×2 grid ---- */}
        <div className="mt-[var(--space-56)] hidden laptop:grid grid-cols-2 gap-0">
          <div className="border-b border-r border-white/12">
            <Card card={FEATURE_CARDS[0]} />
          </div>
          <div className="border-b border-white/12">
            <Card card={FEATURE_CARDS[1]} />
          </div>
          <div className="border-r border-white/12">
            <Card card={FEATURE_CARDS[2]} />
          </div>
          <div>
            <Card card={FEATURE_CARDS[3]} />
          </div>
        </div>

        {/* ---- Mobile stack ---- */}
        <div className="mt-[var(--space-40)] space-y-0 laptop:hidden">
          {FEATURE_CARDS.map((card, i) => (
            <div
              key={card.title}
              className={i < FEATURE_CARDS.length - 1 ? "border-b border-white/12" : ""}
            >
              <Card card={card} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
