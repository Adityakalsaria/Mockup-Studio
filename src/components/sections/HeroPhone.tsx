"use client";

import Image from "next/image";
import {
  KoshTabIcon,
  BankTabIcon,
  CardTabIcon,
  GiftTabIcon,
} from "@/components/sections/TabExplainer";

const TAB_BAR_ITEMS = [
  { Icon: KoshTabIcon },
  { Icon: BankTabIcon },
  { Icon: CardTabIcon },
  { Icon: GiftTabIcon },
];

function PhoneTabBar({ activeIndex }: { activeIndex: number }) {
  return (
    <div
      className="flex items-center justify-around rounded-full px-2"
      style={{
        background: "rgba(30, 30, 30, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        height: "100%",
        aspectRatio: "250 / 67",
      }}
    >
      {TAB_BAR_ITEMS.map((item, i) => (
        <div
          key={i}
          className="relative flex items-center justify-center"
          style={{ width: "25%", height: "100%" }}
        >
          {i === activeIndex && (
            <div className="absolute inset-y-[12%] inset-x-[4%] rounded-full bg-white/[0.12] transition-all duration-300" />
          )}
          <div className="relative z-10 [&_svg]:w-[22px] [&_svg]:h-[22px]">
            <item.Icon />
          </div>
        </div>
      ))}
    </div>
  );
}

interface HeroPhoneProps {
  activeTabIndex: number;
  className?: string;
}

export default function HeroPhone({ activeTabIndex, className }: HeroPhoneProps) {
  return (
    <div data-hero-phone className={className} style={{ willChange: "transform", aspectRatio: "393 / 852" }}>
      <div className="relative w-full h-full">
        <Image
          src="/images/hero-screen-wallet-optimized.webp"
          alt="Kosh app"
          fill
          className="object-contain"
          priority
        />

        {/* HTML tab bar overlay */}
        <div
          className="absolute"
          style={{
            bottom: "7%",
            left: "10.9%",
            right: "10.8%",
            zIndex: 2,
          }}
        >
          <PhoneTabBar activeIndex={activeTabIndex} />
        </div>
      </div>
    </div>
  );
}
