import Image from "next/image";
import Button from "@/components/ui/Button";

type FeatureCardItem = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  imageWrapClassName: string;
  imageClassName: string;
  imageImgClassName?: string;
};

const FEATURE_CARDS: FeatureCardItem[] = [
  {
    title: "Card for team",
    description:
      "A named USD account to receive ACH and wire payments from US clients, payroll, and platforms.",
    imageSrc: "/figma-assets/more-than-usd/feature-card-reference.png",
    imageAlt: "KOSH Personal card visual",
    imageWrapClassName: "h-[300px]",
    imageClassName: "inset-0",
    imageImgClassName: "h-full w-full object-cover object-center",
  },
  {
    title: "Real time controls",
    description:
      "Hold USD balances and build disciplined saving habits without leaving the app.",
    imageSrc: "/figma-assets/more-than-usd/feature-pillar-reference.png",
    imageAlt: "Savings pillar visual",
    imageWrapClassName: "h-[300px]",
    imageClassName: "inset-0",
    imageImgClassName: "h-full w-full object-cover object-center",
  },
  {
    title: "Manage expenses",
    description:
      "Put idle balances to work and keep your investing journey connected to your account activity.",
    imageSrc: "/figma-assets/more-than-usd/feature-pillar-reference.png",
    imageAlt: "Investment pillar visual",
    imageWrapClassName: "h-[300px]",
    imageClassName: "inset-0",
    imageImgClassName: "h-full w-full object-cover object-center",
  },
  {
    title: "Payment",
    description:
      "Send cross-border payouts, settle client invoices, and manage outgoing payments from one flow.",
    imageSrc: "/figma-assets/more-than-usd/feature-card-reference.png",
    imageAlt: "KOSH Personal card visual",
    imageWrapClassName: "h-[300px]",
    imageClassName: "inset-0",
    imageImgClassName: "h-full w-full object-cover object-center",
  },
];

function FeatureCard({
  feature,
  className = "",
}: {
  feature: FeatureCardItem;
  className?: string;
}) {
  return (
    <a
      href="/usd-account"
      aria-label={`Explore ${feature.title}`}
      className={`group relative block overflow-hidden rounded-[28px] bg-[#141414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-[60%] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 36%, rgba(255,255,255,0) 72%)",
        }}
      />
      <div
        className={`relative overflow-hidden ${feature.imageWrapClassName}`}
      >
        <div className={`pointer-events-none absolute ${feature.imageClassName}`}>
          <Image
            src={feature.imageSrc}
            alt={feature.imageAlt}
            width={560}
            height={840}
            className={feature.imageImgClassName ?? "h-auto w-full object-cover object-top"}
            sizes="(min-width: 1024px) 240px, 56vw"
            style={{
              maskImage:
                "linear-gradient(180deg, #000 0%, #000 70%, rgba(0,0,0,0.82) 82%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(180deg, #000 0%, #000 70%, rgba(0,0,0,0.82) 82%, transparent 100%)",
            }}
          />
        </div>
      </div>

      <div className="relative z-[2] flex min-h-[220px] flex-col p-[24px] tablet:p-[28px]">
        <h3 className="type-h4 whitespace-nowrap text-white">
          {feature.title}
        </h3>
        <p className="type-body-m mt-[var(--space-12)] line-clamp-2 max-w-[28ch] text-white/64">
          {feature.description}
        </p>
        <Button
          variant="secondary"
          size="icon"
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none mt-auto h-12 w-12 rounded-full"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </a>
  );
}

export default function MoreThanUsdAccountSection() {
  return (
    <section
      id="more-than-usd-account-section"
      className="w-full bg-black py-[var(--spacing-section)] desktop:py-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="laptop:hidden">
          <div className="mx-auto max-w-[720px] text-center">
            <h2 className="type-h1 text-text-primary">
              More than just a card
            </h2>
            <p className="type-body-l mx-auto mt-[var(--space-16)] max-w-[56ch] text-text-secondary">
              Along with your USD account, unlock savings, a global Visa card,
              investing, and cross-border payments, all in one app.
            </p>
          </div>

          <div className="mt-[var(--space-40)] grid gap-[8px]">
            {FEATURE_CARDS.map((feature) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                className="min-h-[380px]"
              />
            ))}
          </div>
        </div>

        <div className="hidden laptop:block">
          <div>
            <div className="mx-auto max-w-[760px] text-center">
              <h2 className="type-h1 text-text-primary">
                More than just a card
              </h2>
              <p className="type-body-l mx-auto mt-[var(--space-16)] max-w-[56ch] text-text-secondary">
                Along with your USD account, unlock savings, a global Visa
                card, investing, and cross-border payments, all in one app.
              </p>
            </div>

            <div className="mt-[var(--space-48)] grid grid-cols-4 gap-[8px]">
              {FEATURE_CARDS.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  feature={feature}
                  className="min-w-0"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
