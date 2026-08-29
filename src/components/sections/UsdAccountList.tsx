"use client";

import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";

type AccountType = {
  label: string;
  src: string;
  alt: string;
  flagSrc: string;
  flagAlt: string;
};

const ACCOUNTS: AccountType[] = [
  {
    label: "USD Account",
    src: "/figma-assets/usd-account-list/usd-account.png",
    alt: "USD account medallion",
    flagSrc: "/figma-assets/usd-account-list/us-flag.svg",
    flagAlt: "US flag",
  },
  {
    label: "EUR Account",
    src: "/figma-assets/usd-account-list/eur-account.png",
    alt: "EUR account medallion",
    flagSrc: "/figma-assets/usd-account-list/eur-flag.svg",
    flagAlt: "European Union flag",
  },
  {
    label: "AED Account",
    src: "/figma-assets/usd-account-list/aed-account.png",
    alt: "AED account medallion",
    flagSrc: "/figma-assets/usd-account-list/aed-flag.svg",
    flagAlt: "United Arab Emirates flag",
  },
  {
    label: "SWIFT Account",
    src: "/figma-assets/usd-account-list/swift-account.png",
    alt: "SWIFT account medallion",
    flagSrc: "/figma-assets/usd-account-list/swift-flag.svg",
    flagAlt: "SWIFT network icon",
  },
  {
    label: "GBP Account",
    src: "/figma-assets/usd-account-list/gbp-account.png",
    alt: "GBP account medallion",
    flagSrc: "/figma-assets/usd-account-list/gbp-flag.svg",
    flagAlt: "United Kingdom flag",
  },
];

function AccountMedallion({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const medallionRef = useRef<HTMLDivElement>(null);

  const updatePointerEffect = (clientX: number, clientY: number) => {
    requestAnimationFrame(() => {
      const el = medallionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const clampedX = Math.max(0, Math.min(1, px));
      const clampedY = Math.max(0, Math.min(1, py));

      el.style.setProperty("--mx", `${(clampedX * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(clampedY * 100).toFixed(2)}%`);
      el.style.setProperty("--rx", `${((0.5 - clampedY) * 24).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((clampedX - 0.5) * 28).toFixed(2)}deg`);
      el.style.setProperty("--shadow-x", `${((clampedX - 0.5) * 24).toFixed(2)}px`);
      el.style.setProperty("--shadow-y", `${((clampedY - 0.5) * 22).toFixed(2)}px`);
    });
  };

  const resetPointerEffect = () => {
    const el = medallionRef.current;
    if (!el) return;

    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--shadow-x", "0px");
    el.style.setProperty("--shadow-y", "0px");
  };

  return (
    <div
      ref={medallionRef}
      className="relative flex items-center justify-center rounded-full transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:perspective(980px)_rotateX(var(--rx))_rotateY(var(--ry))]"
      style={
        {
          "--mx": "50%",
          "--my": "50%",
          "--rx": "0deg",
          "--ry": "0deg",
          "--shadow-x": "0px",
          "--shadow-y": "0px",
        } as CSSProperties
      }
      onMouseEnter={(event) => updatePointerEffect(event.clientX, event.clientY)}
      onMouseMove={(event) => updatePointerEffect(event.clientX, event.clientY)}
      onMouseLeave={resetPointerEffect}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[8%] rounded-full transition-all duration-200"
        style={{
          boxShadow:
            "calc(var(--shadow-x) * 0.95) calc(var(--shadow-y) * 1.3) 34px rgba(0,0,0,0.52), 0 14px 32px rgba(0,0,0,0.34)",
        }}
      />
      <Image
        src={src}
        alt={alt}
        width={176}
        height={176}
        unoptimized
        className="relative z-[1] h-[176px] w-[176px] select-none"
      />
    </div>
  );
}

export default function UsdAccountList() {
  return (
    <section
      id="usd-account-list"
      className="w-full bg-black py-[var(--spacing-section)] desktop:py-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="flex flex-col items-center">
          <div className="flex w-full flex-wrap justify-center gap-x-[32px] gap-y-[var(--space-48)]">
            {ACCOUNTS.map((account) => (
              <div
                key={account.label}
                className="group flex flex-col items-center gap-[var(--space-16)]"
              >
                <AccountMedallion src={account.src} alt={account.alt} />
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[36px] border-white/[0.04] px-[var(--space-20)] text-[14px] font-normal text-white/40 transition-all duration-300 group-hover:border-white/[0.08] group-hover:text-white/55"
                >
                  <span className="flex items-center gap-[8px]">
                    <Image
                      src={account.flagSrc}
                      alt={account.flagAlt}
                      width={20}
                      height={20}
                      className="h-[20px] w-[20px] shrink-0"
                    />
                    <span>{account.label}</span>
                  </span>
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-[var(--space-48)] flex flex-col items-center text-center">
            <h2 className="type-h1 text-text-primary">Go beyond a USD account</h2>
            <p className="type-body-l mt-[var(--space-16)] max-w-[56ch] text-text-secondary">
              Receive, hold, and pay out across USD, EUR, GBP, AED, and SWIFT,
              all managed in one app. Operate like a global business without
              setting up banks in every country.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
