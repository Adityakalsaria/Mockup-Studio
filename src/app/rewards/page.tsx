import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import FooterSection from "@/components/sections/FooterSection";
import GlassCard from "@/components/ui/GlassCard";
import { absoluteUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "KOSH Reward Program",
  description:
    "Earn points by using KOSH, growing the community, and making your money move. Welcome to the new era of rewards.",
  alternates: {
    canonical: absoluteUrl("/rewards"),
  },
};

/* ─── Page ─── */

export default function RewardsPage() {
  return (
    <main className="bg-black">
      <Navbar />

      {/* ── Section 1: Hero ── */}
      <section className="layout-content ds-page-gutter py-[var(--spacing-section)]">
        <div className="flex flex-col items-center text-center max-w-[944px] mx-auto">
          <h1 className="type-h1 text-text-primary">KOSH Reward Program</h1>
          <p className="type-body-l text-text-secondary mt-[var(--space-20)] max-w-[640px]">
            Welcome to the new era of rewards. Earn points by using KOSH,
            growing the community, and making your money move.
          </p>
        </div>
      </section>

      {/* ── Content Card (single glass container like CopperX) ── */}
      <div className="layout-content ds-page-gutter pb-[var(--spacing-section)]">
        <GlassCard className="max-w-[944px] mx-auto rounded-[24px] backdrop-blur-[7.5px] border border-white/[0.06] p-[var(--space-32)] tablet:p-[48px] desktop:p-[64px]" contentClassName="flex flex-col gap-[var(--spacing-section)]">
          {/* ── Section 2: About KOSH ── */}
          <section>
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)] block">
              About KOSH
            </span>
            <h2 className="type-h2 text-text-primary">
              Banking without borders. Built on stablecoins.
            </h2>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              KOSH brings modern finance to 8.1 billion people and businesses.
              We provide tools like global payouts, corporate debit cards,
              virtual accounts, and offramps. Making stablecoins usable in
              everyday operations. Our mission is to unlock true ownership of
              money with an open, permissionless alternative to traditional
              banking.
            </p>
          </section>

          {/* ── Divider ── */}
          <hr className="border-white/[0.06]" />

          {/* ── Section 3: Stable Game — KOSH Points Season 2 ── */}
          <section>
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)] block">
              Stable Game: KOSH Points Season 2
            </span>
            <h2 className="type-h2 text-text-primary">
              Rewards for every action. Every contribution counts.
            </h2>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              KOSH Points Season 2 rewards real contributions across the
              ecosystem, from product usage and referrals to community
              campaigns and partnerships. Every action that drives value earns
              points. The goal of KOSH Point Season 2 is to build a reputation
              layer around meaningful participation and align long-term
              supporters with KOSH&apos;s growth.
            </p>

            {/* Program Principles */}
            <h3 className="type-body-l text-text-primary font-semibold mt-[var(--space-32)]">
              Program Principles
            </h3>
            <ul className="flex flex-col gap-[var(--space-8)] mt-[var(--space-20)]">
              <li className="type-body-m text-text-secondary">
                <span className="text-text-primary">Contribution &gt; Speculation:</span>{" "}
                Points are earned through real use, not hype.
              </li>
              <li className="type-body-m text-text-secondary">
                <span className="text-text-primary">Transparent:</span>{" "}
                All point mechanics are public in the dashboard.
              </li>
              <li className="type-body-m text-text-secondary">
                <span className="text-text-primary">Fair:</span>{" "}
                Early adopters, builders, and power users are rewarded on merit.
              </li>
              <li className="type-body-m text-text-secondary">
                <span className="text-text-primary">Utility-Driven:</span>{" "}
                Points may unlock product features and future token allocations.
              </li>
            </ul>

            {/* How to Earn Points */}
            <h3 className="type-body-l text-text-primary font-semibold mt-[var(--space-32)]">
              How to Earn Points
            </h3>
            <ul className="flex flex-col gap-[var(--space-8)] mt-[var(--space-20)]">
              <li className="type-body-m text-text-secondary">
                Use or receive stablecoin payments via KOSH Payout
              </li>
              <li className="type-body-m text-text-secondary">
                Refer people or businesses to KOSH
              </li>
              <li className="type-body-m text-text-secondary">
                Join community campaigns
              </li>
              <li className="type-body-m text-text-secondary">
                Share KOSH updates and initiatives on socials
              </li>
              <li className="type-body-m text-text-secondary">
                Engage with tools and ecosystems
              </li>
            </ul>
          </section>

          {/* ── Divider ── */}
          <hr className="border-white/[0.06]" />

          {/* ── Section 4: Point Utility ── */}
          <section>
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)] block">
              Point Utility
            </span>
            <h2 className="type-h2 text-text-primary">
              Every point earns a chance to unlock future value.
            </h2>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              KOSH Points collected in Season 2 are designed to reflect
              meaningful contributions and may unlock access to exclusive
              rewards, including merch claims, discounts, and a future token
              airdrop (subject to launch).
            </p>
            <p className="type-body-l text-text-secondary mt-[var(--space-8)]">
              To keep it simple, here&apos;s how token-related rewards may be
              structured:
            </p>

            {/* Token Airdrop */}
            <h3 className="type-body-l text-text-primary font-semibold mt-[var(--space-32)]">
              Token Airdrop
            </h3>
            <ul className="flex flex-col gap-[var(--space-8)] mt-[var(--space-20)]">
              <li className="type-body-m text-text-secondary">
                1 Point = 1 Future Token
              </li>
              <li className="type-body-m text-text-secondary">
                Token Supply: 1B max total
              </li>
              <li className="type-body-m text-text-secondary">
                Planned TGE Market Cap: ~$200M (targeted, not guaranteed)
              </li>
              <li className="type-body-m text-text-secondary">
                Season 2 Airdrop Pool: Estimated 2–5% of total supply
              </li>
              <li className="type-body-m text-text-secondary">
                Season 1 + Future Allocations: To be announced before TGE
              </li>
            </ul>

            <p className="type-body-m text-text-muted mt-[var(--space-20)]">
              Final tokenomics, redemption eligibility, point conversion, and
              unlock schedules will be confirmed prior to the Token Generation
              Event (TGE). Participation does not guarantee token allocation and
              is subject to change based on market and regulatory
              considerations.
            </p>
          </section>

          {/* ── Divider ── */}
          <hr className="border-white/[0.06]" />

          {/* ── Section 5: Additional Notes ── */}
          <section>
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)] block">
              Additional Notes
            </span>
            <h2 className="type-h2 text-text-primary">
              Built with community, for community
            </h2>
            <p className="type-body-l text-text-secondary mt-[var(--space-20)]">
              The KOSH Points system is evolving with feedback from our
              community. Shaped by transparency, real-world learnings, and
              alignment with our long-term mission.
            </p>

            {/* Fairness & Anti-Gaming */}
            <h3 className="type-body-l text-text-primary font-semibold mt-[var(--space-32)]">
              Fairness &amp; Anti-Gaming
            </h3>
            <p className="type-body-m text-text-secondary mt-[var(--space-8)]">
              We actively monitor for bots, exploitative behavior, and bad
              actors. Points earned through dishonest means will be
              disqualified. KOSH is committed to fair distribution, rewarding
              real users, not manipulation.
            </p>
          </section>

          {/* ── Divider ── */}
          <hr className="border-white/[0.06]" />

          {/* ── Section 6: Token Disclosure ── */}
          <section>
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)] block">
              Token Disclosure
            </span>
            <p className="type-body-m text-text-secondary">
              KOSH Tokenomics is still under development. KOSH Points are not
              tokens. They represent proof of contribution. While not financial
              instruments, points may offer utility such as: Eligibility for
              token airdrops at the Token Generation Event (TGE), Unlocking
              perks (e.g., merch, discounts, reward drops, early access to
              features), Building ecosystem reputation.
            </p>

            <ol className="flex flex-col gap-[var(--space-8)] mt-[var(--space-20)] list-decimal list-inside">
              <li className="type-body-m text-text-muted">
                KOSH may adjust the notional conversion value of points prior to
                TGE based on market conditions and demand.
              </li>
              <li className="type-body-m text-text-muted">
                The program may be restricted in certain jurisdictions,
                including the US, North Korea, Cuba, Iran, Syria, and Sudan.
              </li>
              <li className="type-body-m text-text-muted">
                Additional KOSH Points seasons may be launched at KOSH&apos;s
                discretion.
              </li>
            </ol>
          </section>

          {/* ── Divider ── */}
          <hr className="border-white/[0.06]" />

          {/* ── Section 7: Disclaimer ── */}
          <section>
            <span className="type-micro uppercase tracking-widest text-text-muted mb-[var(--space-20)] block">
              Disclaimer
            </span>
            <p className="type-body-m text-text-muted leading-relaxed">
              KOSH Points are not financial instruments and do not imply
              ownership, token rights, or future returns. Participation in the
              point system does not guarantee future token allocation. All
              token-related decisions, including distribution, eligibility, and
              redemption, will be subject to legal, regulatory, and community
              review.
            </p>

            <div className="flex flex-col gap-[var(--space-8)] mt-[var(--space-32)]">
              <p className="type-body-m text-text-secondary">
                Have questions?{" "}
                <a href="#" className="text-text-primary underline underline-offset-4 hover:text-white/80 transition-colors">
                  Visit our Support Page
                </a>
              </p>
              <p className="type-body-m text-text-secondary">
                Read the full{" "}
                <a href="#" className="text-text-primary underline underline-offset-4 hover:text-white/80 transition-colors">
                  KOSH Rewards Terms &amp; Conditions
                </a>
              </p>
            </div>
          </section>
        </GlassCard>
      </div>

      <FooterSection />
    </main>
  );
}
