"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";

export default function BelowBentoSection() {
  return (
    <section
      id="kosh-business"
      aria-label="Kosh Business"
      className="theme-light relative w-full bg-white"
    >
      <div className="mx-auto w-full max-w-[var(--layout-bleed-max)] px-[var(--spacing-sm)] py-[var(--spacing-section)] tablet:px-[var(--layout-page-gutter)]">
        <div className="relative mx-auto w-full max-w-[1312px] overflow-hidden rounded-[20px] aspect-[16/11] tablet:aspect-[16/9] desktop:aspect-[1312/656]">
          <Image
            src="/images/home-screen.png"
            alt="Business hero background"
            fill
            className="object-cover"
            priority={false}
          />

          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-[70%] tablet:w-[56%] desktop:w-[48%]"
            style={{
              background:
                "linear-gradient(90deg, rgba(15,15,15,0.78) 0%, rgba(15,15,15,0.46) 52%, rgba(15,15,15,0) 100%)",
            }}
          />

          <div className="absolute left-[var(--spacing-md)] top-1/2 w-[min(420px,calc(100%-var(--space-48)))] -translate-y-1/2 tablet:left-[var(--space-40)] desktop:left-[var(--space-96)]">
            <h2 className="type-h1 text-text-primary">
              Get KOSH Business
            </h2>
            <p className="type-body-m mt-[var(--spacing-xs)] text-text-secondary">
              Create virtual accounts, manage balances, and send payouts, all from one
              seamless mobile experience.
            </p>
            <Button
              variant="secondary"
              className="mt-[var(--space-20)] min-w-fit px-[var(--space-16)]"
            >
              <span className="inline-flex items-center gap-[var(--spacing-2xs)]">
                <Image
                  src="/icons/explore-more-icon.svg"
                  alt=""
                  aria-hidden
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
                <span>Explore more</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

    </section>
  );
}
