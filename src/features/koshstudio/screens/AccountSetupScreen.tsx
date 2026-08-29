"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { getSvgPath } from "figma-squircle";
import lottie, { type AnimationItem } from "lottie-web";
import Image from "next/image";
import Button from "@/components/ui/Button";
import emptyStateAnimationData from "../assets/usd-account-empty-state.json";

const ICON = {
  arrowLeft: "/figma-assets/koshstudio/account-profile/icons/arrow-left.svg",
  question: "/figma-assets/koshstudio/account-profile/icons/question.svg",
  feesCard: "/figma-assets/koshstudio/account-profile/icons/fees-card.svg",
  share: "/figma-assets/koshstudio/account-profile/icons/share.svg",
  moreDots: "/figma-assets/koshstudio/account-profile/icons/more-dots.svg",
  cellular: "/figma-assets/koshstudio/account-profile/icons/cellular.svg",
  wifi: "/figma-assets/koshstudio/account-profile/icons/wifi.svg",
  battery: "/figma-assets/koshstudio/account-profile/icons/battery.svg",
};

const SCREEN_WIDTH = 402;
const SCREEN_HEIGHT = 874;
const EDGE_BLUR_HEIGHT = 100;
const TOP_PROGRESSIVE_BLUR_LAYERS = [
  { blurFactor: 0.58, mask: "rgba(0,0,0,1) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,0) 28%" },
  { blurFactor: 0.44, mask: "rgba(0,0,0,0) 6%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 42%" },
  { blurFactor: 0.32, mask: "rgba(0,0,0,0) 14%, rgba(0,0,0,1) 24%, rgba(0,0,0,1) 38%, rgba(0,0,0,0) 50%" },
  { blurFactor: 0.22, mask: "rgba(0,0,0,0) 24%, rgba(0,0,0,1) 34%, rgba(0,0,0,1) 46%, rgba(0,0,0,0) 58%" },
  { blurFactor: 0.15, mask: "rgba(0,0,0,0) 34%, rgba(0,0,0,1) 44%, rgba(0,0,0,1) 56%, rgba(0,0,0,0) 68%" },
  { blurFactor: 0.09, mask: "rgba(0,0,0,0) 46%, rgba(0,0,0,1) 56%, rgba(0,0,0,1) 66%, rgba(0,0,0,0) 78%" },
  { blurFactor: 0.05, mask: "rgba(0,0,0,0) 58%, rgba(0,0,0,1) 68%, rgba(0,0,0,1) 76%, rgba(0,0,0,0) 88%" },
] as const;

type AccountSetupData = {
  title: string;
  backdropFlagSrc: string;
  titleFlagSrc: string;
};

function buildMaskedStyle(maskStops: string, flip = false) {
  const direction = flip ? "to top" : "to bottom";
  return {
    maskImage: `linear-gradient(${direction}, ${maskStops})`,
    WebkitMaskImage: `linear-gradient(${direction}, ${maskStops})`,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "0 0",
    WebkitMaskPosition: "0 0",
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
  } as const;
}

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
      className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-[20px] pt-[62px]"
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
      <Button
        variant="secondary"
        size="icon"
        aria-label="Help"
        data-debug-name="HeaderHelpButton"
        data-debug-group="button"
        className="pointer-events-auto h-[44px] w-[44px] rounded-full"
      >
        <Image src={ICON.question} alt="" width={10} height={15} className="object-contain" />
      </Button>
    </div>
  );
}

function ScrollBackdrop({ backdropFlagSrc }: { backdropFlagSrc: string }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[320px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 z-0 h-[236px] w-[236px] overflow-hidden rounded-full"
        style={{
          filter: "blur(125px) saturate(100%) brightness(100%)",
          transform: "translate(-50%, -32px)",
        }}
      >
        <Image
          src={backdropFlagSrc}
          alt=""
          width={236}
          height={236}
          className="h-full w-full"
          priority
        />
      </div>
    </>
  );
}

function ScrollEdgeEffect({
  blurRadius,
  height = EDGE_BLUR_HEIGHT,
  offset = 0,
}: {
  blurRadius: number;
  height?: number;
  offset?: number;
}) {
  const overlayMaskStyle = buildMaskedStyle(
    "rgba(0,0,0,1) 0%, rgba(0,0,0,0.84) 20%, rgba(0,0,0,0.42) 52%, rgba(0,0,0,0.10) 76%, rgba(0,0,0,0) 100%"
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[15]"
      style={{ height, top: offset }}
      data-debug-name="ScrollEdgeEffect"
      data-debug-group="chrome"
    >
      {TOP_PROGRESSIVE_BLUR_LAYERS.map((layer, index) => (
        <div
          key={layer.blurFactor}
          className="absolute inset-0"
          style={{
            background: "rgba(255,255,255,0.004)",
            backdropFilter: `blur(${Math.max(1, blurRadius * layer.blurFactor)}px) saturate(1.15)`,
            WebkitBackdropFilter: `blur(${Math.max(1, blurRadius * layer.blurFactor)}px) saturate(1.15)`,
            zIndex: index,
            ...buildMaskedStyle(layer.mask),
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.12) 28%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 78%, rgba(0,0,0,0) 100%)",
          zIndex: 20,
          ...overlayMaskStyle,
        }}
      />
    </div>
  );
}

function BottomScrollEdgeEffect({
  blurRadius,
  height = EDGE_BLUR_HEIGHT,
  offset = 0,
}: {
  blurRadius: number;
  height?: number;
  offset?: number;
}) {
  const overlayMaskStyle = buildMaskedStyle(
    "rgba(0,0,0,1) 0%, rgba(0,0,0,0.84) 20%, rgba(0,0,0,0.42) 52%, rgba(0,0,0,0.10) 76%, rgba(0,0,0,0) 100%",
    true,
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[15]"
      style={{ height, bottom: offset }}
      data-debug-name="BottomScrollEdgeEffect"
      data-debug-group="chrome"
    >
      {TOP_PROGRESSIVE_BLUR_LAYERS.map((layer, index) => (
        <div
          key={layer.blurFactor}
          className="absolute inset-0"
          style={{
            background: "rgba(255,255,255,0.004)",
            backdropFilter: `blur(${Math.max(1, blurRadius * layer.blurFactor)}px) saturate(1.15)`,
            WebkitBackdropFilter: `blur(${Math.max(1, blurRadius * layer.blurFactor)}px) saturate(1.15)`,
            zIndex: index,
            ...buildMaskedStyle(layer.mask, true),
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.12) 28%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 78%, rgba(0,0,0,0) 100%)",
          zIndex: 20,
          ...overlayMaskStyle,
        }}
      />
    </div>
  );
}

function BankProfileTitle({ title, flagSrc }: { title: string; flagSrc: string }) {
  return (
    <div
      data-debug-name="BankProfileTitle"
      data-debug-group="title"
      className="relative flex flex-col items-center gap-[9px]"
    >
      <div className="relative h-[32px] w-[32px] overflow-hidden rounded-full">
        <Image src={flagSrc} alt="" width={32} height={32} className="block h-full w-full" />
      </div>
      <p className="text-center text-[16px] font-medium leading-[24px] text-white">{title}</p>
    </div>
  );
}

function BankBuildingIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M16.8557 2.45642L24.5002 6.27869V9.33337H25.6663V11.6664H24.5002V23.3334H25.6663V25.6664H2.33325V23.3334H3.50024V11.6664H2.33325V9.33337H3.50024V6.27869L11.3909 2.33337H16.6086L16.8557 2.45642ZM5.83325 23.3334H9.33325V11.6664H5.83325V23.3334ZM5.83325 7.72107V9.33337H11.6663V23.3334H16.3333V9.33337H22.1672V7.72107L16.0579 4.66638H11.9426L5.83325 7.72107ZM18.6663 23.3334H22.1663L22.1672 11.6664H18.6663V23.3334ZM16.3333 9.33337H11.6663V7.00037H16.3333V9.33337Z"
        fill="white"
      />
    </svg>
  );
}

function SetupStateCard() {
  return (
    <div
      data-debug-name="SetupStateCard"
      data-debug-group="card"
      className="flex w-full flex-col items-center gap-[20px] rounded-[20px] bg-white/[0.08] px-[20px] py-[40px]"
    >
      <div className="relative flex h-[64px] w-[64px] items-center justify-center rounded-full bg-white/[0.08]">
        <div
          aria-hidden
          className="absolute inset-[18px] rounded-full blur-[15px]"
          style={{ background: "rgba(255,255,255,0.18)" }}
        />
        <BankBuildingIcon className="relative h-[28px] w-[28px]" />
      </div>
      <div className="flex w-full flex-col items-center text-center">
        <p className="max-w-[282px] text-[18px] font-semibold leading-[24px] text-white">
          We&apos;re setting up your bank account.
        </p>
        <p className="mt-[8px] text-[14px] leading-[20px] text-white/45">
          This usually takes few minutes
          <br />
          We&apos;ll notify you as soon as it&apos;s ready.
        </p>
      </div>
    </div>
  );
}

function FeesAndLimitsRow() {
  return (
    <div
      data-debug-name="FeesAndLimitsRow"
      data-debug-group="row"
      className="flex h-[52px] w-full items-center gap-[12px] rounded-[16px] bg-white/[0.08] px-[16px]"
    >
      <Image
        src={ICON.feesCard}
        alt=""
        width={18}
        height={16}
        className="shrink-0 object-contain"
        style={{ width: 18, height: 16 }}
      />
      <p className="flex-1 text-[15px] font-medium leading-[24px] text-white">Fees and limits</p>
      <Image
        src="/figma-assets/koshstudio/account-profile/icons/chevron-right.svg"
        alt=""
        width={6}
        height={11}
        className="shrink-0 rotate-180 object-contain"
        style={{ width: 6, height: 11 }}
      />
    </div>
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

function EmptyTransactions() {
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
        <div className="absolute inset-x-0 bottom-[52px] flex flex-col items-center px-[58px]">
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

function Footer() {
  return (
    <div
      data-debug-name="Footer"
      data-debug-group="chrome"
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-[16px] pb-[36px] pt-[4px]"
    >
      <Button
        variant="secondary"
        size="md"
        data-debug-name="DownloadDetailsButton"
        data-debug-group="button"
        className="pointer-events-auto h-[48px] min-h-[48px] rounded-full"
      >
        Download Details
      </Button>
      <div className="flex items-center gap-[12px]">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Share"
          data-debug-name="ShareButton"
          data-debug-group="button"
          className="pointer-events-auto rounded-full"
        >
          <Image src={ICON.share} alt="" width={18} height={22} className="object-contain" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="More options"
          data-debug-name="MoreButton"
          data-debug-group="button"
          className="pointer-events-auto rounded-full"
        >
          <Image src={ICON.moreDots} alt="" width={20} height={4} className="object-contain" />
        </Button>
      </div>
    </div>
  );
}

export default function AccountSetupScreen({
  className = "",
  blurRadius = 36,
  data,
  cornerRadius = 44,
  cornerSmoothing = true,
  topEdgeHeight = EDGE_BLUR_HEIGHT,
  topEdgeOffset = 0,
  bottomEdgeHeight = EDGE_BLUR_HEIGHT,
  bottomEdgeOffset = 0,
}: {
  className?: string;
  blurRadius?: number;
  data: AccountSetupData;
  cornerRadius?: number;
  cornerSmoothing?: boolean;
  topEdgeHeight?: number;
  topEdgeOffset?: number;
  bottomEdgeHeight?: number;
  bottomEdgeOffset?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
        background: "rgb(0,0,0)",
        ...cornerStyle,
        isolation: "isolate",
      }}
      data-node-id="3603:27958"
      data-debug-name="AccountSetupScreen"
      data-debug-group="screen"
    >
      <div
        className="absolute inset-0"
        style={{
          ...cornerStyle,
          overflow: "hidden",
        }}
      >
        <div aria-hidden className="absolute inset-0 z-0" style={{ background: "rgb(0,0,0)" }} />
        <ScrollBackdrop backdropFlagSrc={data.backdropFlagSrc} />

        <div
          ref={scrollRef}
          className="koshstudio-scroll-hide absolute inset-0 z-10"
          style={{
            overflowY: "scroll",
            paddingTop: 152,
            paddingBottom: 140,
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          <div className="px-[20px]">
            <div className="flex flex-col items-center gap-[24px]">
              <BankProfileTitle title={data.title} flagSrc={data.titleFlagSrc} />
              <div className="flex w-full flex-col gap-[4px]">
                <SetupStateCard />
                <FeesAndLimitsRow />
              </div>
              <EmptyTransactions />
            </div>
          </div>
        </div>
      </div>

      <ScrollEdgeEffect blurRadius={blurRadius} height={topEdgeHeight} offset={topEdgeOffset} />
      <BottomScrollEdgeEffect
        blurRadius={blurRadius}
        height={bottomEdgeHeight}
        offset={bottomEdgeOffset}
      />
      <Header />
      <Footer />
      <StatusBar />
    </div>
  );
}
