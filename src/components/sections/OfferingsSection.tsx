"use client";

const OFFERINGS = [
  {
    title: "Wallet",
    description:
      "Receive USD transfers via ACH or Wire. Share your details, track incoming payments.",
  },
  {
    title: "Virtual Accounts",
    description:
      "Receive USD transfers via ACH or Wire. Share your details, track incoming payments.",
  },
  {
    title: "Card",
    description:
      "Pay for AI tools, subscriptions, cloud services, and everyday essentials directly with your crypto.",
  },
  {
    title: "Rewards",
    description:
      "See your total balance, track recent transactions, and take action in seconds.",
  },
];

export default function OfferingsSection() {
  return (
    <section id="offerings" className="bg-black">
      <div className="mx-auto w-full max-w-[var(--layout-content-max)] py-[240px]">
        <div className="grid grid-cols-1 gap-x-[var(--spacing-grid-gutter)] px-[var(--layout-page-gutter)] laptop:grid-cols-4">
          {OFFERINGS.map((item) => (
            <article key={item.title} className="px-[var(--spacing-grid-gutter)]">
              <h3 className="type-h4 text-text-primary">
                {item.title}
              </h3>
              <p className="mt-[var(--space-8)] type-body-m text-text-secondary">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
