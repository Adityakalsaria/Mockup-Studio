"use client";

import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import AnimatedElement from "@/components/ui/AnimatedElement";
import { fadeUp, scaleIn } from "@/lib/animations";
import ItemListCarousel from "@/components/sections/ItemListCarousel";

/* ─── Data ─── */

const USE_CASES = [
  {
    title: "Subscriptions & SaaS",
    description:
      "Pay for tools like AWS, Figma, Slack, and Notion directly with stablecoins. No FX fees, no bank delays.",
  },
  {
    title: "Cloud & Infrastructure",
    description:
      "Fund your cloud providers and hosting bills with instant stablecoin settlements.",
  },
  {
    title: "Travel & Events",
    description:
      "Book flights, hotels, and conference tickets with corporate cards that work anywhere Visa is accepted.",
  },
  {
    title: "Department Budgets",
    description:
      "Issue virtual cards per team or project. Set limits, track spend in real time, and stay in control.",
  },
  {
    title: "Contractor Payments",
    description:
      "Pay international contractors instantly. No wire fees, no 3-day waits, no currency conversion headaches.",
  },
] as const;

const PLATFORM_FEATURES = [
  {
    title: "Stablecoin Payments",
    description:
      "Send and receive USDC and USDT across chains. Settle invoices, pay vendors, and move funds globally in seconds.",
  },
  {
    title: "Global USD Account",
    description:
      "Get a virtual USD account with SWIFT and local rails. Receive payments from clients worldwide without a US bank.",
  },
  {
    title: "Corporate Cards",
    description:
      "Issue physical and virtual Visa cards funded by stablecoins. Real-time spend tracking, per-card limits, and instant top-ups.",
  },
] as const;

/* ─── Page Content ─── */

export default function BusinessContent() {
  return (
    <>
      {/* ── Section 1: Hero ── */}
      <section className="layout-content ds-page-gutter py-[var(--spacing-section)]">
        <div className="grid-12">
          {/* Hero copy — 12 cols mobile, 10 tablet, 8 desktop (centered) */}
          <AnimatedElement className="col-span-12 flex flex-col items-center text-center tablet:col-span-10 tablet:col-start-2 desktop:col-span-8 desktop:col-start-3">
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)]">
              Business Credit Cards
            </span>
            <h1 className="type-display text-text-primary">
              The Stablecoin Corporate Card for Your Company
            </h1>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              Fund your corporate cards with stablecoins. Pay for SaaS, travel,
              contractors, and infrastructure — anywhere Visa is accepted.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-[var(--space-12)] mt-[var(--space-32)]">
              <Button variant="primary" href="https://form.typeform.com/to/ua5vZwjN?typeform-source=copperx.io&utm_source=website&utm_medium=business_hero">
                Contact Sales
              </Button>
              <Button variant="secondary" href="https://payout.copperx.io/auth/register?utm_source=website&utm_medium=business_hero&utm_campaign=signup">
                Create Account
              </Button>
            </div>
          </AnimatedElement>

          {/* Hero image placeholder — 12 cols mobile, 10 tablet (centered) */}
          <AnimatedElement
            animation={scaleIn}
            className="col-span-12 mt-[var(--spacing-block)] aspect-[16/9] rounded-[24px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
          >
            <span className="type-body-m text-text-muted">
              Corporate Card Visual
            </span>
          </AnimatedElement>
        </div>
      </section>

      {/* ── Section 2: Social Proof ── */}
      <section className="layout-content ds-page-gutter pb-[var(--spacing-section)]">
        <div className="grid-12">
          {/* Testimonial — 12 mobile, 6 tablet/desktop */}
          <AnimatedElement className="col-span-12 tablet:col-span-6">
            <GlassCard
              className="rounded-[24px] border border-white/[0.06] h-full"
              contentClassName="p-[var(--space-32)] tablet:p-[48px] flex flex-col justify-between h-full"
            >
              <blockquote className="type-body-l text-text-primary leading-relaxed">
                &ldquo;KOSH replaced our entire corporate card stack. We fund
                cards with USDC, our contractors get paid instantly, and
                reconciliation takes minutes instead of days.&rdquo;
              </blockquote>
              <p className="type-body-m text-text-muted mt-[var(--space-20)]">
                — Head of Finance, Series B Startup
              </p>
            </GlassCard>
          </AnimatedElement>

          {/* Stat — 12 mobile, 6 tablet/desktop */}
          <AnimatedElement className="col-span-12 tablet:col-span-6">
            <GlassCard
              className="rounded-[24px] border border-white/[0.06] h-full"
              contentClassName="p-[var(--space-32)] tablet:p-[48px] flex flex-col items-center justify-center text-center h-full"
            >
              <span className="type-display text-text-primary">
                5x
              </span>
              <p className="type-body-l text-text-secondary mt-[var(--space-12)]">
                Faster financial reconciliation
              </p>
            </GlassCard>
          </AnimatedElement>
        </div>
      </section>

      {/* ── Section 3: Use Cases (Carousel) ── */}
      <ItemListCarousel
        items={USE_CASES}
        keyExtractor={(item) => item.title}
        header={
          <div className="text-center mx-auto max-w-[80%] tablet:max-w-[50%]">
            <h1 className="type-h1 text-text-primary">
              How Companies Use KOSH Every Day
            </h1>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              From SaaS subscriptions to contractor payments, KOSH cards power
              every part of your business spend.
            </p>
          </div>
        }
        renderItem={(item) => (
          <>
            <div className="aspect-square rounded-[var(--radius-lg)] bg-white/[0.04] border border-white/[0.06]" />
            <h3 className="type-h4 text-text-primary mt-[var(--space-40)]">
              {item.title}
            </h3>
            <p className="type-body-m text-text-secondary mt-[var(--space-8)]">
              {item.description}
            </p>
          </>
        )}
      />

      {/* ── Section 4: Expense Automation ── */}
      <section className="layout-content ds-page-gutter pb-[var(--spacing-section)]">
        <div className="grid-12 items-center">
          {/* Text — 12 mobile, 6 tablet/desktop */}
          <AnimatedElement className="col-span-12 tablet:col-span-6">
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)] block">
              Expense Automation
            </span>
            <h2 className="type-h2 text-text-primary">
              Scale Confidently with Powerful Spend Management Tools
            </h2>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              Set per-card limits, auto-categorize expenses, and get real-time
              alerts. KOSH gives your finance team full visibility and control
              over every dollar spent across the company.
            </p>
            <div className="mt-[var(--space-32)]">
              <Button variant="secondary">
                Learn More
              </Button>
            </div>
          </AnimatedElement>

          {/* Mockup placeholder — 12 mobile, 6 tablet/desktop */}
          <AnimatedElement
            animation={scaleIn}
            className="col-span-12 tablet:col-span-6 aspect-square rounded-[24px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
          >
            <span className="type-body-m text-text-muted">
              Spend Management Dashboard
            </span>
          </AnimatedElement>
        </div>
      </section>

      {/* ── Section 5: Platform Features ── */}
      <section className="layout-content ds-page-gutter pb-[var(--spacing-section)]">
        <div className="grid-12">
          {/* Heading — centered */}
          <AnimatedElement className="col-span-12 text-center tablet:col-span-10 tablet:col-start-2 desktop:col-span-8 desktop:col-start-3">
            <h2 className="type-h2 text-text-primary">
              One Platform for All Your Business Finance
            </h2>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              Corporate cards are just the start. KOSH gives you the full stack
              for stablecoin-powered business finance.
            </p>
          </AnimatedElement>

          {/* 3 feature cards — full 12-col span, nested grid for cards */}
          <div className="col-span-12 mt-[var(--spacing-block)] grid grid-cols-1 tablet:grid-cols-3 gap-[var(--spacing-grid-gutter)]">
            {PLATFORM_FEATURES.map((feature) => (
              <AnimatedElement key={feature.title}>
                <GlassCard
                  className="rounded-[24px] border border-white/[0.06] h-full"
                  contentClassName="p-[var(--space-24)] tablet:p-[var(--space-32)]"
                >
                  <h3 className="type-body-l text-text-primary font-semibold">
                    {feature.title}
                  </h3>
                  <p className="type-body-m text-text-secondary mt-[var(--space-12)]">
                    {feature.description}
                  </p>
                </GlassCard>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Bottom CTA ── */}
      <section className="layout-content ds-page-gutter pb-[var(--spacing-section)]">
        <div className="grid-12">
          <AnimatedElement className="col-span-12 flex flex-col items-center text-center tablet:col-span-10 tablet:col-start-2 desktop:col-span-8 desktop:col-start-3">
            <h2 className="type-h1 bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
              The Smarter Way to Manage Company Spend
            </h2>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              Join forward-thinking companies using stablecoin-powered cards to
              move faster, spend smarter, and scale globally.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-[var(--space-12)] mt-[var(--space-32)]">
              <Button variant="primary" href="https://form.typeform.com/to/ua5vZwjN?typeform-source=copperx.io&utm_source=website&utm_medium=business_bottom_cta">
                Contact Sales
              </Button>
              <Button variant="secondary" href="https://payout.copperx.io/auth/register?utm_source=website&utm_medium=business_bottom_cta&utm_campaign=signup">
                Create Account
              </Button>
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}
