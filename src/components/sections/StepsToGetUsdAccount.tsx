"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import { useOpenAccountModal } from "@/components/modals/OpenAccountModal";

type StepItem = {
  title: string;
  stepLabel: string;
  iconSrc: string;
};

const STEPS: StepItem[] = [
  {
    title: "Download KOSH app and signup",
    stepLabel: "STEP 1",
    iconSrc: "/figma-assets/steps-to-get-usd-account/card-withdraw.svg",
  },
  {
    title: "Complete your profile verification",
    stepLabel: "STEP 2",
    iconSrc: "/figma-assets/steps-to-get-usd-account/family-card.svg",
  },
  {
    title: "Activate a virtual card or order your physical card",
    stepLabel: "STEP 3",
    iconSrc: "/figma-assets/steps-to-get-usd-account/bank.svg",
  },
  {
    title: "Start spending anywhere Visa is accepted",
    stepLabel: "STEP 4",
    iconSrc: "/figma-assets/steps-to-get-usd-account/internal-transfer.svg",
  },
] as const;

export default function StepsToGetUsdAccount() {
  const { open: openAccountModal } = useOpenAccountModal();

  return (
    <section
      id="steps-to-get-usd-account"
      className="relative w-full bg-black py-[var(--spacing-section)] desktop:h-[596px] desktop:pt-[112px] desktop:pb-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="w-full overflow-hidden rounded-[24px] border border-white/16 bg-black">
          <div className="relative flex min-h-[156px] flex-col gap-[var(--space-32)] border-b border-white/16 px-[var(--space-24)] py-[var(--space-24)] tablet:px-[32px] tablet:py-[32px] laptop:min-h-[144px] laptop:flex-row laptop:items-center laptop:justify-between laptop:px-[40px] laptop:py-[40px] desktop:h-[142px] desktop:min-h-0 desktop:px-[40px] desktop:py-0">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-full overflow-hidden"
            >
              <svg
                className="absolute inset-y-0 left-0 h-full w-full"
                viewBox="0 0 1200 160"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="steps-wave-fade" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.18" />
                    <stop offset="55%" stopColor="white" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                  <mask id="steps-wave-mask">
                    <rect width="1200" height="160" fill="url(#steps-wave-fade)" />
                  </mask>
                </defs>
                <g
                  mask="url(#steps-wave-mask)"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                >
                  <path d="M 0 40 Q 75 10, 150 40 T 300 40 T 450 40 T 600 40 T 750 40 T 900 40 T 1050 40 T 1200 40" />
                  <path d="M 0 56 Q 75 26, 150 56 T 300 56 T 450 56 T 600 56 T 750 56 T 900 56 T 1050 56 T 1200 56" />
                  <path d="M 0 72 Q 75 42, 150 72 T 300 72 T 450 72 T 600 72 T 750 72 T 900 72 T 1050 72 T 1200 72" />
                  <path d="M 0 88 Q 75 58, 150 88 T 300 88 T 450 88 T 600 88 T 750 88 T 900 88 T 1050 88 T 1200 88" />
                  <path d="M 0 104 Q 75 74, 150 104 T 300 104 T 450 104 T 600 104 T 750 104 T 900 104 T 1050 104 T 1200 104" />
                  <path d="M 0 120 Q 75 90, 150 120 T 300 120 T 450 120 T 600 120 T 750 120 T 900 120 T 1050 120 T 1200 120" />
                  <path d="M 0 48 Q 100 78, 200 48 T 400 48 T 600 48 T 800 48 T 1000 48 T 1200 48" opacity="0.6" />
                  <path d="M 0 80 Q 100 110, 200 80 T 400 80 T 600 80 T 800 80 T 1000 80 T 1200 80" opacity="0.6" />
                  <path d="M 0 112 Q 100 142, 200 112 T 400 112 T 600 112 T 800 112 T 1000 112 T 1200 112" opacity="0.6" />
                </g>
              </svg>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-[47.5%] overflow-hidden laptop:block"
            >
              <Image
                src="/figma-assets/steps-to-get-usd-account/top-note.png"
                alt=""
                fill
                sizes="(min-width: 1000px) 48vw, 0px"
                className="object-cover object-center"
              />
            </div>

            <h2 className="type-h3 relative z-10 max-w-[500px] text-text-primary">
              How to get your global card
            </h2>

            <div className="relative z-10">
              <Button
                variant="prominent"
                size="sm"
                onClick={openAccountModal}
                data-event="usd_steps_open_account"
              >
                Get global card
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4">
            {STEPS.map(({ title, stepLabel, iconSrc }, index) => (
              <article
                key={stepLabel}
                className={`group flex min-h-[228px] flex-col px-[var(--space-24)] py-[40px] tablet:min-h-[244px] tablet:px-[32px] tablet:py-[32px] desktop:px-[40px] desktop:py-[40px] ${
                  index > 0 ? "border-t border-white/16" : ""
                } ${
                  index >= 2 ? "tablet:border-t tablet:border-white/16" : "tablet:border-t-0"
                } ${
                  index % 2 === 1 ? "tablet:border-l tablet:border-white/16" : "tablet:border-l-0"
                } ${
                  index > 0 ? "desktop:border-l desktop:border-white/16" : "desktop:border-l-0"
                } desktop:border-t-0`}
              >
                <span
                  aria-hidden
                  className="block h-[32px] w-[32px] bg-white/40 transition-colors duration-200 group-hover:bg-white"
                  style={{
                    maskImage: `url(${iconSrc})`,
                    WebkitMaskImage: `url(${iconSrc})`,
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
                <div className="mt-[40px] max-w-[358px]">
                  <h3 className="type-h5 text-text-primary">
                    {title}
                  </h3>
                </div>
                <p className="type-micro mt-[32px] uppercase text-[var(--color-text-muted)]">
                  {stepLabel}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
