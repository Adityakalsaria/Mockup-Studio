"use client";

import { useMemo, type CSSProperties } from "react";

import { getSvgPath } from "figma-squircle";
import Image from "next/image";
import Button from "@/components/ui/Button";

const ICON = {
  arrowLeft: "/figma-assets/koshstudio/account-profile/icons/arrow-left.svg",
  bank: "/figma-assets/koshstudio/account-profile/icons/bank-avatar.svg",
  check: "/figma-assets/koshstudio/account-profile/icons/check.svg",
  cellular: "/figma-assets/koshstudio/account-profile/icons/cellular.svg",
  wifi: "/figma-assets/koshstudio/account-profile/icons/wifi.svg",
  battery: "/figma-assets/koshstudio/account-profile/icons/battery.svg",
};

const SCREEN_WIDTH = 402;
const SCREEN_HEIGHT = 874;

export type BankSelectionVariantId = "usd" | "eur" | "aed" | "swift" | "gbp";

type AccountRow = {
  id: BankSelectionVariantId;
  title: string;
  subtitle: string;
  flagSrc: string;
  fee: number;
};

const ACCOUNT_ROWS: readonly AccountRow[] = [
  {
    id: "gbp",
    title: "GBP Account",
    subtitle: "Receive GBP payments",
    flagSrc: "/figma-assets/usd-account-list/gbp-flag.svg",
    fee: 5,
  },
  {
    id: "swift",
    title: "SWIFT Account",
    subtitle: "Receive SWIFT payments",
    flagSrc: "/figma-assets/usd-account-list/us-flag.svg",
    fee: 15,
  },
  {
    id: "aed",
    title: "AED Account",
    subtitle: "Local IBAN for UAE payments",
    flagSrc: "/figma-assets/usd-account-list/aed-flag.svg",
    fee: 12,
  },
  {
    id: "usd",
    title: "USD Account",
    subtitle: "Get paid via ACH & Wire",
    flagSrc: "/figma-assets/usd-account-list/us-flag.svg",
    fee: 10,
  },
  {
    id: "eur",
    title: "EURO Account",
    subtitle: "Get an IBAN for EU payments",
    flagSrc: "/figma-assets/usd-account-list/eur-flag.svg",
    fee: 8,
  },
] as const;

function StatusBar() {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-[62px]"
      data-debug-name="StatusBar"
      data-debug-group="chrome"
    >
      <span
        className="absolute left-[56px] top-[30px] text-center text-[17px] leading-[22px] text-white"
        style={{
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", sans-serif',
          fontWeight: 590,
          fontVariationSettings: '"wdth" 100',
        }}
      >
        9:41
      </span>

      <div className="absolute right-[37px] top-[33px] flex items-center gap-[7px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICON.cellular} alt="" className="block h-[12.226px] w-[19.2px]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICON.wifi} alt="" className="block h-[12.328px] w-[17.142px]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICON.battery} alt="" className="block h-[13px] w-[27.328px]" />
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div
      data-debug-name="Header"
      data-debug-group="chrome"
      className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex h-[116px] items-end px-[20px] pb-[10px]"
    >
      <Button
        variant="secondary"
        size="icon"
        aria-label="Back"
        data-debug-name="HeaderBackButton"
        data-debug-group="button"
        className="pointer-events-auto h-[44px] w-[44px] rounded-full"
      >
        <Image src={ICON.arrowLeft} alt="" width={11} height={18} className="object-contain" />
      </Button>
      <p
        className="absolute left-1/2 -translate-x-1/2 text-[16px] font-medium leading-[24px] text-white"
        style={{ bottom: 20 }}
        data-debug-name="HeaderTitle"
        data-debug-group="title"
      >
        {title}
      </p>
    </div>
  );
}

function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <div
      className="flex h-[24px] shrink-0 items-center"
      aria-hidden
    >
      <div
        className={`relative flex h-[24px] w-[24px] items-center justify-center rounded-full ${
          selected ? "bg-[#2f97ff]" : "bg-white/10"
        }`}
      >
        {selected ? (
          <Image src={ICON.check} alt="" width={12} height={11} className="block" />
        ) : null}
      </div>
    </div>
  );
}

function AccountListRow({
  row,
  selected,
  onToggle,
}: {
  row: AccountRow;
  selected: boolean;
  onToggle?: (id: BankSelectionVariantId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle?.(row.id)}
      data-debug-name="AccountListRow"
      data-debug-group="card"
      className={`relative flex w-full items-center gap-[20px] rounded-[20px] bg-white/[0.08] p-[20px] text-left outline-none transition-colors focus:outline-none ${
        selected ? "border border-[#2f97ff]" : "border border-transparent"
      }`}
    >
      <SelectionDot selected={selected} />
      <div className="flex w-[198px] shrink-0 flex-col items-start gap-[4px]">
        <p className="w-full text-[16px] font-medium leading-[24px] text-white">{row.title}</p>
        <p className="w-full text-[14px] leading-[20px] text-white/45">{row.subtitle}</p>
      </div>
      <div className="absolute left-[308px] top-1/2 h-[32px] w-[32px] -translate-y-1/2 overflow-hidden rounded-full">
        <Image src={row.flagSrc} alt="" width={32} height={32} className="block h-full w-full" />
      </div>
    </button>
  );
}

function FeeRow({ priceText }: { priceText: string }) {
  return (
    <div
      data-debug-name="FeeRow"
      data-debug-group="row"
      className="flex w-full items-center justify-between gap-[20px] px-[20px] py-[16px]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-[8px]">
        <div className="relative h-[24px] w-[24px] shrink-0">
          <Image
            src={ICON.bank}
            alt=""
            width={20}
            height={20}
            className="absolute left-1/2 top-1/2 h-[20px] w-[20px] -translate-x-1/2 -translate-y-1/2 opacity-45"
          />
        </div>
        <p className="truncate text-[15px] font-medium leading-[24px] text-white/45">
          Account opening fee
        </p>
      </div>
      <p
        key={priceText}
        className="shrink-0 whitespace-nowrap text-[15px] font-medium leading-[24px] text-white/65"
      >
        {priceText.split("").map((char, i) => (
          <span
            key={`${i}-${char}`}
            className="koshstudio-digit-rise"
            style={{ animationDelay: `${Math.min(i * 28, 280)}ms` }}
          >
            {char}
          </span>
        ))}
      </p>
    </div>
  );
}

function Footer({ priceText }: { priceText: string }) {
  return (
    <div
      data-debug-name="Footer"
      data-debug-group="chrome"
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center px-[20px] pb-[36px]"
    >
      <FeeRow priceText={priceText} />
      <Button
        variant="primary"
        size="md"
        className="pointer-events-auto flex min-h-[52px] w-full"
        style={{ borderRadius: 100 }}
      >
        Create a virtual account
      </Button>
    </div>
  );
}

export default function BankSelectionScreen({
  className = "",
  selectedVariantIds,
  onToggleVariant,
  title = "Open your account",
  cornerRadius = 44,
  cornerSmoothing = true,
}: {
  className?: string;
  selectedVariantIds: ReadonlyArray<BankSelectionVariantId>;
  onToggleVariant?: (id: BankSelectionVariantId) => void;
  title?: string;
  cornerRadius?: number;
  cornerSmoothing?: boolean;
}) {
  const selectedSet = new Set(selectedVariantIds);
  const totalFee = ACCOUNT_ROWS.reduce(
    (sum, row) => (selectedSet.has(row.id) ? sum + row.fee : sum),
    0,
  );
  const priceText = `$${totalFee}`;
  const squirclePath = useMemo(() => {
    if (!cornerSmoothing) return null;
    return getSvgPath({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      cornerRadius,
      cornerSmoothing: 0.6,
    });
  }, [cornerRadius, cornerSmoothing]);

  const cornerStyle: CSSProperties = squirclePath
    ? {
        borderRadius: cornerRadius,
        clipPath: `path('${squirclePath}')`,
        WebkitClipPath: `path('${squirclePath}')`,
        transition:
          "border-radius 280ms cubic-bezier(0.32, 0.72, 0, 1), clip-path 280ms cubic-bezier(0.32, 0.72, 0, 1)",
      }
    : {
        borderRadius: cornerRadius,
        transition: "border-radius 280ms cubic-bezier(0.32, 0.72, 0, 1)",
      };

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%), rgb(0,0,0)",
        ...cornerStyle,
        isolation: "isolate",
      }}
      data-node-id="1062:1398"
      data-debug-name="BankSelectionScreen"
      data-debug-group="screen"
    >
      <div
        className="absolute inset-0 flex justify-center px-[20px]"
        style={{ paddingTop: 128 }}
      >
        <div className="flex w-full max-w-[362px] flex-col gap-[4px]">
          {ACCOUNT_ROWS.map((row) => (
            <AccountListRow
              key={row.id}
              row={row}
              selected={selectedSet.has(row.id)}
              onToggle={onToggleVariant}
            />
          ))}
        </div>
      </div>

      <Header title={title} />
      <Footer priceText={priceText} />
      <StatusBar />
    </div>
  );
}
