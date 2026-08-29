"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { getSvgPath } from "figma-squircle";
import lottie, { type AnimationItem } from "lottie-web";
import Image from "next/image";
import Button from "@/components/ui/Button";
import emptyStateAnimationData from "../assets/usd-account-empty-state.json";
import {
  BottomScrollEdgeEffect,
  ScrollEdgeEffect,
  TransactionsList,
  type Transaction,
} from "./AccountProfileScreen";

const ICON = {
  cellular: "/figma-assets/koshstudio/account-profile/icons/cellular.svg",
  wifi: "/figma-assets/koshstudio/account-profile/icons/wifi.svg",
  battery: "/figma-assets/koshstudio/account-profile/icons/battery.svg",
  cardArt: "/figma-assets/koshstudio/card-screen/card-art.svg",
  visaLogo: "/figma-assets/koshstudio/card-screen/visa-logo.svg",
  koshIcon: "/figma-assets/koshstudio/card-screen/kosh-icon.svg",
  avatar: "/figma-assets/koshstudio/card-screen/avatar.jpg",
  headerCard: "/figma-assets/koshstudio/card-screen/header-card.svg",
  tabKosh: "/figma-assets/koshstudio/card-screen/tab-kosh.svg",
  tabBank: "/figma-assets/koshstudio/card-screen/tab-bank.svg",
  tabCard: "/figma-assets/koshstudio/card-screen/tab-card.svg",
  tabGift: "/figma-assets/koshstudio/card-screen/tab-gift.svg",
  actionPlus: "/figma-assets/koshstudio/card-screen/action-plus.svg",
  actionCard: "/figma-assets/koshstudio/card-screen/action-card.svg",
  actionLock: "/figma-assets/koshstudio/card-screen/action-lock.svg",
  actionLimit: "/figma-assets/koshstudio/card-screen/action-limit.svg",
  actionCross: "/figma-assets/koshstudio/card-screen/action-cross.svg",
};

const SCREEN_WIDTH = 402;
const SCREEN_HEIGHT = 874;
const EDGE_BLUR_HEIGHT = 100;

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

function Header() {
  return (
    <div
      data-debug-name="Header"
      data-debug-group="chrome"
      className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex h-[116px] items-end justify-between px-[20px] pb-[10px]"
    >
      <Button
        variant="secondary"
        size="icon"
        aria-label="Profile"
        data-debug-name="HeaderProfileButton"
        data-debug-group="button"
        className="pointer-events-auto h-[44px] w-[44px] rounded-full p-0"
      >
        <span className="block h-[36px] w-[36px] overflow-hidden rounded-full">
          <Image
            src={ICON.avatar}
            alt=""
            width={72}
            height={72}
            className="h-full w-full object-cover"
          />
        </span>
      </Button>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Card menu"
        data-debug-name="HeaderCardButton"
        data-debug-group="button"
        className="pointer-events-auto h-[44px] w-[44px] rounded-full"
      >
        <Image src={ICON.headerCard} alt="" width={18} height={16} className="block h-[16px] w-[18px]" />
      </Button>
    </div>
  );
}

function CardBalance({ value = "0" }: { value?: string }) {
  const [wholePart, decimalPartRaw] = value.split(".");
  const decimalPart = (decimalPartRaw ?? "00").padEnd(2, "0").slice(0, 2);
  return (
    <div
      data-debug-name="CardBalance"
      data-debug-group="card"
      className="flex w-full flex-col items-center gap-[4px]"
    >
      <p className="text-[14px] font-medium leading-[20px] text-white/45">Your Card Balance</p>
      <p className="leading-none tracking-[-0.4px]">
        <span className="text-[40px] font-medium leading-none text-white">${wholePart}</span>
        <span className="text-[40px] font-medium leading-none text-white/30">.{decimalPart}</span>
      </p>
    </div>
  );
}

function CardArtwork() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });
  const rafRef = useRef<number>(0);

  const updatePointer = (clientX: number, clientY: number) => {
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPointer({ x, y, active: true });
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 0) return;
    updatePointer(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    cancelAnimationFrame(rafRef.current);
    setPointer((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-debug-name="CardArtwork"
      data-debug-group="card"
      className="relative h-[229px] w-[360px] overflow-hidden rounded-[12px] bg-black ring-1 ring-inset ring-white/10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none"
        style={{
          backgroundImage: `url('${ICON.cardArt}')`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: pointer.active ? 1 : 0,
          transition: "opacity 280ms cubic-bezier(0.32, 0.72, 0, 1)",
          background: `radial-gradient(180px circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.08), rgba(255,255,255,0.015) 55%, transparent 78%)`,
          mixBlendMode: "plus-lighter",
        }}
      />
      <div className="absolute left-[14px] top-[14px]">
        <Image
          src={ICON.visaLogo}
          alt="Visa"
          width={73}
          height={42}
          className="block h-auto w-[73px]"
        />
      </div>
      <div className="absolute right-[14px] top-[14px] flex h-[26px] w-[26px] items-center justify-center">
        <Image
          src={ICON.koshIcon}
          alt=""
          width={24}
          height={24}
          className="h-[24px] w-[24px]"
        />
      </div>
      <p className="absolute bottom-[20px] left-[18px] text-[11px] font-medium uppercase leading-[16px] tracking-[0.55px] text-white/40">
        DAILY USE&nbsp;&nbsp;|&nbsp;&nbsp;** 1292
      </p>
    </div>
  );
}

function ActionButton({
  iconSrc,
  iconWidth,
  iconHeight,
  label,
  variant = "secondary",
}: {
  iconSrc: string;
  iconWidth: number;
  iconHeight: number;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const buttonVariant = variant === "primary" ? "prominent" : "secondary";
  return (
    <Button
      variant={buttonVariant}
      size="sm"
      className="flex shrink-0"
      style={{
        borderRadius: 20,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 6,
        paddingBottom: 6,
        minHeight: 36,
      }}
    >
      <span className="flex items-center">
        <span className="flex h-[20px] w-[20px] items-center justify-center">
          <Image
            src={iconSrc}
            alt=""
            width={iconWidth}
            height={iconHeight}
            className="block"
            style={{ width: iconWidth, height: iconHeight }}
          />
        </span>
        <span className="px-[4px] text-[15px] font-medium leading-[24px] whitespace-nowrap">
          {label}
        </span>
      </span>
    </Button>
  );
}

function ActionButtonsRow() {
  return (
    <div
      data-debug-name="ActionButtonsRow"
      data-debug-group="row"
      className="koshstudio-scroll-hide -my-[12px] w-full overflow-x-auto py-[12px]"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="inline-flex items-center gap-[8px]">
        <span aria-hidden className="block w-[20px] shrink-0" />
        <ActionButton iconSrc={ICON.actionPlus} iconWidth={12} iconHeight={12} label="Top up" variant="primary" />
        <ActionButton iconSrc={ICON.actionCard} iconWidth={16} iconHeight={12} label="Card Details" />
        <ActionButton iconSrc={ICON.actionLock} iconWidth={12} iconHeight={14.75} label="Freeze" />
        <ActionButton iconSrc={ICON.actionLimit} iconWidth={13.5} iconHeight={13.5} label="Limit" />
        <ActionButton iconSrc={ICON.actionCross} iconWidth={9.55} iconHeight={9.55} label="Cancel" />
        <span aria-hidden className="block w-[20px] shrink-0" />
      </div>
    </div>
  );
}

function EmptyStateAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animation: AnimationItem = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: emptyStateAnimationData,
    });

    return () => animation.destroy();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 top-1/2 h-[54px] w-[51px] -translate-x-1/2 -translate-y-1/2"
    />
  );
}

function EmptyTransactionSkeletonRow({ width = 131 }: { width?: number }) {
  return (
    <div className="flex w-full items-start justify-between py-[16px]">
      <div className="flex items-center gap-[14px]">
        <div className="h-[40px] w-[40px] rounded-full bg-white/[0.05]" />
        <div className="flex flex-col gap-[12px]">
          <div className="h-[12px] rounded-[8px] bg-white/[0.12]" style={{ width }} />
          <div className="h-[10px] w-[57px] rounded-[5px] bg-white/[0.12]" />
        </div>
      </div>
      <div className="h-[12px] w-[59px] rounded-[8px] bg-white/[0.12]" />
    </div>
  );
}

function TransactionsEmpty() {
  return (
    <div
      data-debug-name="TransactionsEmptyState"
      data-debug-group="title"
      className="flex w-full flex-col gap-[8px]"
    >
      <p className="text-[15px] font-medium leading-[24px] text-white">Transactions</p>
      <div className="relative h-[220px] w-full overflow-hidden">
        <div className="absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0.72)_52%,rgba(0,0,0,0)_100%)]">
          <EmptyTransactionSkeletonRow />
          <EmptyTransactionSkeletonRow width={118} />
          <EmptyTransactionSkeletonRow width={126} />
        </div>
        <div className="absolute inset-x-0 bottom-[12px] flex flex-col items-center px-[58px]">
          <div className="relative flex w-[245px] flex-col items-center gap-[16px]">
            <div className="relative h-[54px] w-[51px]">
              <EmptyStateAnimation />
            </div>
            <div className="flex w-full flex-col items-center gap-[4px] text-center">
              <p className="text-[14px] font-medium leading-[20px] tracking-[0.14px] text-white">
                You haven&apos;t received any payment yet
              </p>
              <p className="w-[223px] text-[12px] leading-[16px] text-white/45">
                Start accepting payment with Virtual US bank account
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type TabIconConfig = {
  src: string;
  width: number;
  height: number;
};

const TAB_ITEMS: ReadonlyArray<{ icon: TabIconConfig; active: boolean }> = [
  { icon: { src: ICON.tabKosh, width: 20, height: 20 }, active: false },
  { icon: { src: ICON.tabBank, width: 22, height: 20.86 }, active: false },
  { icon: { src: ICON.tabCard, width: 22, height: 20 }, active: true },
  { icon: { src: ICON.tabGift, width: 20, height: 21 }, active: false },
];

function TabBar() {
  return (
    <div
      data-debug-name="TabBar"
      data-debug-group="chrome"
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex items-start justify-center px-[25px] pb-[25px] pt-[16px]"
    >
      <div className="pointer-events-auto relative flex w-full items-center justify-center">
        <div
          aria-hidden
          className="btn-base absolute -inset-[4px] rounded-[1000px] border border-transparent"
          style={{
            background: "rgba(39,39,39,0.52)",
            backdropFilter: "blur(7.5px)",
            WebkitBackdropFilter: "blur(7.5px)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[4px] rounded-[1000px]"
          style={{
            padding: "1px",
            background:
              "linear-gradient(170deg, #fff 10%, rgba(0,0,0,0.11) 50%, #fff 90%)",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            mixBlendMode: "overlay",
            opacity: 0.3,
          }}
        />
        <div className="relative grid w-full grid-cols-4">
          {TAB_ITEMS.map(({ icon, active }, i) => (
            <button
              type="button"
              key={i}
              className="relative flex flex-col items-center justify-center px-[8px] py-[13px] outline-none focus:outline-none"
            >
              {active ? (
                <div
                  aria-hidden
                  className="absolute inset-x-[2px] inset-y-0 rounded-[100px] bg-white/[0.12]"
                />
              ) : null}
              <span className="relative flex h-[28px] w-[28px] items-center justify-center opacity-100">
                <Image
                  src={icon.src}
                  alt=""
                  width={icon.width}
                  height={icon.height}
                  className="block"
                  style={{ width: icon.width, height: icon.height }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CardScreen({
  className = "",
  cornerRadius = 44,
  cornerSmoothing = true,
  transactions = [],
  blurRadius = 20,
  topEdgeHeight = EDGE_BLUR_HEIGHT,
  topEdgeOffset = 0,
  bottomEdgeHeight = EDGE_BLUR_HEIGHT,
  bottomEdgeOffset = 0,
}: {
  className?: string;
  cornerRadius?: number;
  cornerSmoothing?: boolean;
  transactions?: Transaction[];
  blurRadius?: number;
  topEdgeHeight?: number;
  topEdgeOffset?: number;
  bottomEdgeHeight?: number;
  bottomEdgeOffset?: number;
}) {
  const hasTransactions = transactions.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setScrollTop] = useState(0);
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
      data-node-id="744:3630"
      data-debug-name="CardScreen"
      data-debug-group="screen"
      onWheel={(event) => {
        const node = scrollRef.current;
        if (!node) return;
        if (node.scrollHeight <= node.clientHeight) return;
        event.preventDefault();
        node.scrollTop += event.deltaY;
      }}
    >
      <div
        ref={scrollRef}
        className="koshstudio-scroll-hide absolute inset-0 z-10"
        onScroll={(event) => {
          setScrollTop(event.currentTarget.scrollTop);
        }}
        style={{
          overflowY: "scroll",
          paddingTop: 128,
          paddingBottom: 140,
          scrollbarWidth: "none",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        <div className="flex flex-col items-center gap-[24px]">
          <div className="w-full shrink-0 px-[20px]">
            <CardBalance value="312.25" />
          </div>
          <div className="shrink-0 px-[20px]">
            <CardArtwork />
          </div>
          <div className="w-full shrink-0">
            <ActionButtonsRow />
          </div>
          <div className="w-full shrink-0 px-[20px]">
            {hasTransactions ? (
              <TransactionsList
                transactions={transactions}
                icon={{ src: ICON.headerCard, width: 18, height: 16 }}
                amountPrefix="-"
              />
            ) : (
              <TransactionsEmpty />
            )}
          </div>
        </div>
      </div>

      <ScrollEdgeEffect
        blurRadius={blurRadius}
        height={topEdgeHeight}
        offset={topEdgeOffset}
      />
      <BottomScrollEdgeEffect
        blurRadius={blurRadius}
        height={bottomEdgeHeight}
        offset={bottomEdgeOffset}
      />
      <Header />
      <TabBar />
      <StatusBar />
    </div>
  );
}
