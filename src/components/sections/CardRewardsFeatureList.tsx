"use client";

const REWARD_ITEMS = [
  {
    value: "10",
    unit: "%",
    label: "Points",
    description:
      "Earn Points on every transaction with a flexible points system designed to maximize value from your everyday spending.",
  },
  {
    value: "5",
    unit: "%",
    label: "Cashback",
    description:
      "Get 5% cashback on hotel bookings when you pay with your Kosh card it turns travel into instant savings.",
  },
  {
    value: "5",
    unit: "$",
    label: "Rewards",
    description:
      "Invite friends to Kosh and earn $5 for every successful referral , direct rewards for growing the network.",
  },
] as const;

const METALLIC_TEXT_STYLE = {
  backgroundImage:
    "radial-gradient(110% 110% at 20% 12%, #ffffff 0%, #d6d6d6 20%, #a1a1a1 42%, #7c7c7c 58%, #555555 76%, #2f2f2f 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

export default function CardRewardsFeatureList() {
  return (
    <section
      id="card-rewards-feature-list"
      className="w-full bg-black py-[80px] tablet:py-[96px] desktop:py-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="grid grid-cols-1 gap-y-[56px] tablet:grid-cols-12 tablet:gap-x-[32px] tablet:gap-y-[72px]">
          {REWARD_ITEMS.map((item) => (
            <article
              key={item.label}
              className="flex w-full flex-col items-center text-center tablet:col-span-4"
            >
              <div className="flex h-[120px] w-full items-start justify-center overflow-visible">
                <div
                  className={`inline-flex h-[120px] w-[140px] items-start justify-center overflow-visible pt-[6px] ${
                    item.value.length === 1 ? "pl-[18px]" : "pl-[6px]"
                  }`}
                >
                  <span
                    className="font-saans text-[96px] font-medium leading-[1] tracking-[-0.01em]"
                    style={METALLIC_TEXT_STYLE}
                  >
                    {item.value}
                  </span>
                  <span
                    className={`mt-[16px] font-saans text-[24px] font-semibold leading-[1] tracking-[-0.02em] ${
                      item.value.length === 1 ? "ml-[6px]" : "ml-[2px]"
                    }`}
                    style={METALLIC_TEXT_STYLE}
                  >
                    {item.unit}
                  </span>
                </div>
              </div>

              <div className="mt-[8px] flex flex-col items-center gap-[8px]">
                <h3 className="font-saans text-[20px] font-semibold leading-[24px] tracking-[-0.022em] text-white/[0.9]">
                  {item.label}
                </h3>
                <p className="max-w-[300px] font-saans text-[16px] font-normal leading-[24px] tracking-[-0.0195em] text-white/[0.6]">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
