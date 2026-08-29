"use client";

import KoshLogo from "@/components/KoshLogo";
import AnimatedElement from "@/components/ui/AnimatedElement";

const INVESTORS = [
  { name: "Alliance", role: "Accelerator and Investor" },
  { name: "Jayanti Kanani", role: "Angel" },
  { name: "Aishwariya Gupta", role: "Global Payment Head, Polygon" },
  { name: "Shiv Shrivastava", role: "Lead Investment, MoonPay" },
];

export default function AboutContent() {
  return (
    <>
      {/* KOSH Icon — centered anchor */}
      <section className="layout-content ds-page-gutter">
        <div className="flex justify-center py-[var(--spacing-section)]">
          <KoshLogo variant="icon-only" tone="light" width={80} height={80} />
        </div>
      </section>

      {/* Content — narrow centered column */}
      <section className="layout-content ds-page-gutter pb-[var(--spacing-section)]">
        <div className="mx-auto max-w-[700px]">
          {/* Founder's Note */}
          <AnimatedElement>
            <div className="space-y-[var(--space-32)]">
              <h1 className="type-h2 text-text-primary">
                We believe everyone should have access to money without borders
              </h1>
              <div className="space-y-[var(--space-24)] type-body-m text-text-secondary">
                <p>
                  If you freelance across time zones, run a startup with
                  contractors on three continents, or simply want to hold and
                  move money without a bank dictating the terms — the existing
                  financial system wasn&apos;t built for you. Payouts take days.
                  Conversions eat your margins. And basic things like opening a
                  USD account still require a US address.
                </p>
                <p>
                  We started KOSH to change that. KOSH is a stablecoin-powered
                  financial platform where you can receive payments into a global
                  USD account, spend anywhere with a Visa card, save with
                  competitive yields, and send money across borders — all from
                  one app. Stablecoins give us the speed and reach that
                  traditional rails can&apos;t.
                </p>
                <p>
                  We&apos;re a small team that ships with intention. Every
                  feature we build starts from a real problem, usually one
                  we&apos;ve hit ourselves. We believe financial tools should be
                  transparent, fast, and accessible to anyone who earns globally.
                </p>
              </div>
              <p className="type-body-m text-text-secondary">Dalpat & Tarun</p>
            </div>
          </AnimatedElement>

          {/* Investors — separated by hairline rule */}
          <AnimatedElement>
            <div className="mt-[var(--spacing-section)] border-t border-white/[0.06] pt-[var(--spacing-section)]">
              <div className="space-y-[var(--space-32)]">
                <h2 className="type-h3 text-text-primary">
                  Investors, angels and advisors
                </h2>
                <p className="type-body-m text-text-secondary">
                  The incredible people and early-stage firms who have had our
                  back through thick and thin — supporting us from Day 1.
                </p>
              </div>

              <div className="mt-[var(--space-32)] space-y-[var(--space-32)]">
                {INVESTORS.map((investor) => (
                  <div
                    key={investor.name}
                  >
                    <p className="type-body-l text-text-primary">{investor.name}</p>
                    <p className="mt-[var(--space-4)] type-body-m text-text-muted">
                      {investor.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
