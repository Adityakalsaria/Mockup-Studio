"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useOpenAccountModal } from "@/components/modals/OpenAccountModal";

export default function FloatingCta({
  label = "Open USD Account",
}: {
  label?: string;
} = {}) {
  const { open } = useOpenAccountModal();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > window.innerHeight * 0.6);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-[12px] left-1/2 z-[50] -translate-x-1/2 transition-all duration-500 ease-out tablet:bottom-[32px] ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[20px] opacity-0"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") open();
        }}
        data-event="usd_floating_open_account"
        className="flex cursor-pointer items-center gap-[12px] rounded-full bg-[rgba(50,50,50,0.72)] py-[10px] pl-[24px] pr-[10px] backdrop-blur-[var(--material-glass-blur)] transition-colors duration-200 hover:bg-[rgba(60,60,60,0.78)]"
      >
        <span className="whitespace-nowrap text-[17px] font-medium text-white">
          {label}
        </span>
        <Button
          variant="prominent"
          size="icon"
          tabIndex={-1}
          className="h-[36px] w-[36px]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
}
