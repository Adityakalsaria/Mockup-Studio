"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { getSvgPath } from "figma-squircle";
import Image from "next/image";
import Button from "@/components/ui/Button";

const ICON = {
  copy: "/figma-assets/koshstudio/account-profile/icons/copy.svg",
  chevronRight: "/figma-assets/koshstudio/account-profile/icons/chevron-right.svg",
  share: "/figma-assets/koshstudio/account-profile/icons/share.svg",
  moreDots: "/figma-assets/koshstudio/account-profile/icons/more-dots.svg",
  arrowLeft: "/figma-assets/koshstudio/account-profile/icons/arrow-left.svg",
  question: "/figma-assets/koshstudio/account-profile/icons/question.svg",
  feesCard: "/figma-assets/koshstudio/account-profile/icons/fees-card.svg",
  cellular: "/figma-assets/koshstudio/account-profile/icons/cellular.svg",
  wifi: "/figma-assets/koshstudio/account-profile/icons/wifi.svg",
  battery: "/figma-assets/koshstudio/account-profile/icons/battery.svg",
  bankAvatar: "/figma-assets/koshstudio/account-profile/icons/bank-avatar.svg",
  statusPending: "/figma-assets/koshstudio/account-profile/icons/status-pending.svg",
  statusFailed: "/figma-assets/koshstudio/account-profile/icons/status-failed.svg",
  statusFailedX: "/figma-assets/koshstudio/account-profile/icons/status-failed-x.svg",
  flag24: "/figma-assets/koshstudio/account-profile/icons/flag-24.svg",
  flag32: "/figma-assets/koshstudio/account-profile/icons/flag-32.svg",
  franklin: "/figma-assets/koshstudio/account-profile/icons/franklin.png",
  cross: "/figma-assets/koshstudio/account-profile/icons/cross.svg",
  check: "/figma-assets/koshstudio/account-profile/icons/check.svg",
};

// Served from public/ rather than lottie.host so the studio runs with no
// network dependency.
const EMPTY_LOTTIE_SRC = "/lottie/account-empty-state.lottie";

const SCREEN_WIDTH = 402;
const SCREEN_HEIGHT = 874;
const CONTENT_TOP_SPACER = 60;
const TITLE_TO_CARD_GAP = 24;
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

type BankRow = { label: string; value: string };
type AccountProfileData = {
  title: string;
  description: string;
  titleFlagSrc: string;
  backdropFlagSrc: string;
  artworkSrc: string;
  bankRows: BankRow[];
  transactions?: Transaction[];
};

function StatusBar() {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-[62px]"
      data-node-id="172:5662"
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
        <img
          src={ICON.cellular}
          alt=""
          className="block h-[12.226px] w-[19.2px]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ICON.wifi}
          alt=""
          className="block h-[12.328px] w-[17.142px]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ICON.battery}
          alt=""
          className="block h-[13px] w-[27.328px]"
        />
      </div>
    </div>
  );
}

function Header({ onOpenHelp }: { onOpenHelp: () => void }) {
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
        onClick={onOpenHelp}
        className="pointer-events-auto h-[44px] w-[44px] rounded-full"
      >
        <Image src={ICON.question} alt="" width={10} height={15} className="object-contain" />
      </Button>
    </div>
  );
}

type FeeRow = { label: string; sublabel?: string; value: string };

const FEES_AND_LIMITS_SECTIONS: Array<{
  title: string;
  subtitle: string;
  rows: FeeRow[];
}> = [
  {
    title: "Limits",
    subtitle: "Additional information may be required for higher-value transfers",
    rows: [
      { label: "From your own account", value: "No Limits" },
      { label: "From individuals", value: "Up to $4000" },
      { label: "From Business", value: "No limit" },
      {
        label: "From payroll platforms",
        sublabel: "Upwork, Gusto, Fiverr, or any",
        value: "No limit",
      },
    ],
  },
  {
    title: "Fees",
    subtitle: "Below are the fees associated US Bank account",
    rows: [
      { label: "Base", value: "0.5%" },
      { label: "ACH Incoming", sublabel: "Bank Charges", value: "$0.5" },
      { label: "ACH Push Incoming", sublabel: "Bank Charges", value: "$1" },
      { label: "Wire Incoming", sublabel: "Bank Charges", value: "$10" },
      { label: "ACH Returned", sublabel: "Bank Charges", value: "$6" },
      { label: "Wire Returned", sublabel: "Bank Charges", value: "$50" },
    ],
  },
];

function FeesAndLimitsSheet({
  open,
  onClose,
  artworkSrc,
  sheetRef,
}: {
  open: boolean;
  onClose: () => void;
  artworkSrc: string;
  sheetRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Sheet is non-draggable — slides in/out only on state change.
  const sheetTransform = open ? "translateY(0)" : "translateY(110%)";
  const sheetTransition = "transform 520ms cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 460ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Limits and fees"
        className="absolute left-0 right-0 z-50 select-none"
        style={{
          top: 60,
          bottom: 0,
          transform: sheetTransform,
          transition: sheetTransition,
        }}
      >
        <div
          className="relative h-full overflow-hidden rounded-t-[34px]"
          style={{ background: "#1e1e1e" }}
        >
          {/* Sticky header — grabber + title + close button */}
          <div className="absolute left-0 right-0 top-0 z-20 flex flex-col items-center pb-[10px]">
            <div className="flex h-[16px] items-start pt-[5px]">
              <div
                aria-hidden
                className="h-[5px] w-[36px] rounded-full"
                style={{ background: "#333", mixBlendMode: "plus-lighter" }}
              />
            </div>
            <div className="relative flex w-full items-center justify-between px-[20px] pt-[2px]">
              <span className="h-[44px] w-[44px]" />
              <p className="absolute left-1/2 top-[10px] -translate-x-1/2 text-[16px] font-medium leading-[24px] text-white">
                Limits and fees
              </p>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Close"
                onClick={onClose}
                className="h-[44px] w-[44px] rounded-full"
              >
                <Image
                  src={ICON.cross}
                  alt=""
                  width={14}
                  height={14}
                  className="object-contain"
                />
              </Button>
            </div>
          </div>

          {/* Scrollable body */}
          <div
            data-fees-sheet-scroll
            className="koshstudio-scroll-hide absolute inset-0 z-0 overflow-y-auto px-[20px]"
            style={{
              paddingTop: 86,
              paddingBottom: 24,
              touchAction: "pan-y",
              overscrollBehavior: "contain",
            }}
            onWheel={(event) => {
              // Stop the wheel event before it reaches the screen's
              // onWheel handler so the browser's native scroll on this
              // element actually runs.
              event.stopPropagation();
            }}
            onTouchMove={(event) => event.stopPropagation()}
          >
            <div className="flex w-full flex-col gap-[10px]">
              {FEES_AND_LIMITS_SECTIONS.map((section) => (
                <FeesSectionCard
                  key={section.title}
                  section={section}
                  artworkSrc={artworkSrc}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FeesSectionCard({
  section,
  artworkSrc,
}: {
  section: { title: string; subtitle: string; rows: FeeRow[] };
  artworkSrc: string;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-[20px] bg-white/[0.08]">
      <div className="relative w-full bg-white/[0.08] px-[20px] py-[20px]">
        <p className="text-[16px] font-medium leading-[24px] text-white">
          {section.title}
        </p>
        <p className="w-[213px] text-[14px] leading-[20px] text-white/65">
          {section.subtitle}
        </p>
        <AccountArtworkOverlay artworkSrc={artworkSrc} fillHeight />
      </div>
      <div className="flex w-full flex-col">
        {section.rows.map((row) => (
          <div
            key={row.label}
            className="flex w-full items-center gap-[12px] px-[16px]"
          >
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-[2px] py-[12px]">
              <p className="whitespace-nowrap text-[15px] font-medium leading-[24px] text-white/65">
                {row.label}
              </p>
              {row.sublabel ? (
                <p className="whitespace-nowrap text-[14px] font-medium leading-[20px] text-white/45">
                  {row.sublabel}
                </p>
              ) : null}
            </div>
            <p className="whitespace-nowrap text-[15px] font-medium leading-[24px] text-white">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// More-options popover menu — glass-styled, opens above the footer "•••"
// button. Three iOS-system-menu items.
// ────────────────────────────────────────────────────────────────────────────

function MoreOptionsMenu({
  open,
  onClose,
  onDownloadStatement,
  onOpenFees,
  menuRef,
}: {
  open: boolean;
  onClose: () => void;
  onDownloadStatement: () => void;
  onOpenFees: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const items: Array<{ label: string; onClick?: () => void }> = [
    { label: "Download Bank Statement", onClick: onDownloadStatement },
    { label: "Know your fees and limit", onClick: onOpenFees },
    { label: "Learn about Partner" },
  ];

  // Menu has fixed dimensions so we can pre-compute a Figma-flavored
  // squircle clip-path. Per Figma: 254 × 152 with 16px padding on all
  // sides, leaving 222 × 120 of inner content (3 × 40px rows).
  const MENU_WIDTH = 254;
  const MENU_HEIGHT = 152;
  const squirclePath = useMemo(
    () =>
      getSvgPath({
        width: MENU_WIDTH,
        height: MENU_HEIGHT,
        cornerRadius: 34,
        cornerSmoothing: 0.6,
      }),
    [],
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-hidden={!open}
      className="absolute z-50 select-none"
      style={{
        right: 16,
        bottom: 92,
        transformOrigin: "bottom right",
        // Spring-out / spring-back curve so the menu pops out of the
        // button with a tiny overshoot and settles. Translate Y nudges
        // the popover down a few pixels in its closed state so the
        // outward motion reads as "rising up" out of the button.
        transform: open
          ? "scale(1) translateY(0)"
          : "scale(0.6) translateY(12px)",
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
        // Slight overshoot on open (back-out), snappy close so dismissing
        // by clicking outside feels instant rather than dragging out.
        transition: open
          ? "transform 380ms cubic-bezier(0.34, 1.45, 0.64, 1), visibility 0ms linear 0ms"
          : "transform 100ms cubic-bezier(0.4, 0, 1, 1), visibility 0ms linear 100ms",
        willChange: "transform",
      }}
    >
      <div
        className="relative"
        style={{
          width: MENU_WIDTH,
          height: MENU_HEIGHT,
          // Canonical "Material Dark Subtle" — low-opacity dark glass for
          // understated overlays. Surface 28% alpha, 7.5px blur, with a
          // 155° linear-gradient inner border (white-bright at top-left,
          // softening toward bottom-right) approximated via two inset
          // shadows. Squircle clip-path keeps the continuous corner.
          background: "rgba(39, 39, 39, 0.28)",
          backdropFilter: "blur(7.5px)",
          WebkitBackdropFilter: "blur(7.5px)",
          borderRadius: 34,
          clipPath: `path('${squirclePath}')`,
          WebkitClipPath: `path('${squirclePath}')`,
          boxShadow:
            "inset 1px 1px 0 rgba(255,255,255,0.32), inset -1px -1px 0 rgba(255,255,255,0.04)",
          filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.45))",
          willChange: "backdrop-filter, transform",
        }}
      >
        <div
          // Re-mount on each open so the staggered fade-up replays.
          key={open ? "open" : "closed"}
          className="flex flex-col px-[16px] py-[16px]"
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                onClose();
                item.onClick?.();
              }}
              className="koshstudio-menu-item koshstudio-fade-up flex h-[40px] w-full items-center px-[12px] text-left text-[15px] leading-[20px] text-white outline-none focus:outline-none"
              style={{ animationDelay: `${80 + index * 50}ms` }}
            >
              <span className="relative z-[1]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Download-statement sheet — bottom sheet with radio-style options
// ────────────────────────────────────────────────────────────────────────────

const STATEMENT_PERIODS: Array<{ id: string; label: string; trailing?: string }> = [
  { id: "7-days", label: "Last 7 Days" },
  { id: "current-month", label: "Current month", trailing: "JAN" },
  { id: "last-month", label: "Last month", trailing: "DEC" },
  { id: "3-months", label: "Past 3 months", trailing: "SEPT - DEC" },
  { id: "6-months", label: "Past 6 months", trailing: "JULY - DEC" },
  { id: "past-year", label: "Past year", trailing: "2025" },
];

function DownloadStatementSheet({
  open,
  onClose,
  sheetRef,
}: {
  open: boolean;
  onClose: () => void;
  sheetRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [selectedId, setSelectedId] = useState<string>(
    STATEMENT_PERIODS[0]?.id ?? "",
  );
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);

  useEffect(() => {
    if (open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = e.clientY - dragStartYRef.current;
    setDragY(delta > 0 ? delta : delta * 0.25);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignored
    }
    if (dragY > 120) onClose();
    setDragY(0);
  };

  const sheetTransform = open ? `translateY(${dragY}px)` : "translateY(110%)";
  const sheetTransition = isDragging
    ? "none"
    : "transform 520ms cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 460ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Download Statement"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="absolute bottom-0 left-0 right-0 z-50 select-none touch-none px-[6px] pb-[36px]"
        style={{
          transform: sheetTransform,
          transition: sheetTransition,
        }}
      >
        <div
          className="relative overflow-hidden rounded-[34px]"
          style={{ background: "#1e1e1e" }}
        >
          {/* Grabber */}
          <div className="flex justify-center pt-[5px]">
            <div
              aria-hidden
              className="h-[5px] w-[36px] rounded-full"
              style={{ background: "#333", mixBlendMode: "plus-lighter" }}
            />
          </div>

          {/* Title + description */}
          <div className="flex flex-col gap-[4px] px-[60px] pt-[24px] text-center">
            <p className="text-[20px] font-semibold leading-[28px] text-white">
              Download Statement
            </p>
            <p className="text-[14px] leading-[20px] text-white/65">
              Choose the statement period you want to download
            </p>
          </div>

          {/* Options list */}
          <div className="px-[20px] pt-[32px]">
            <div className="flex w-full flex-col rounded-[16px] bg-white/[0.08]">
              {STATEMENT_PERIODS.map((period) => {
                const isSelected = selectedId === period.id;
                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setSelectedId(period.id)}
                    className="flex w-full items-center gap-[12px] px-[16px] text-left outline-none focus:outline-none"
                  >
                    <span
                      aria-hidden
                      className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: isSelected
                          ? "#2F97FF"
                          : "rgba(255,255,255,0.12)",
                      }}
                    >
                      {isSelected ? (
                        <Image
                          src={ICON.check}
                          alt=""
                          width={12}
                          height={9}
                          className="object-contain"
                        />
                      ) : null}
                    </span>
                    <span className="flex h-[52px] flex-1 items-center text-[15px] font-medium leading-[24px] text-white/65">
                      {period.label}
                    </span>
                    {period.trailing ? (
                      <span className="text-[15px] font-medium leading-[24px] text-white">
                        {period.trailing}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-[12px] px-[20px] pb-[20px] pt-[32px]">
            <Button
              type="button"
              variant="prominent"
              size="md"
              onClick={onClose}
              className="flex min-h-[52px] w-full rounded-[32px]"
            >
              Download Statement
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="flex min-h-[52px] w-full rounded-[32px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function HelpSheet({
  open,
  onClose,
  title,
  description,
  sheetRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  sheetRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Drag-to-dismiss state. The sheet is grabbed anywhere on its surface
  // and follows the pointer's Y delta. On release we either snap back
  // to the open position or trigger onClose if dragged past threshold.
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragLastYRef = useRef(0);

  // Reset drag offset whenever the sheet re-opens so a previous drag
  // doesn't carry through.
  useEffect(() => {
    if (open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    // Don't hijack drag when the user actually meant to press a Button
    // (close X, primary Close pill).
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragLastYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    dragLastYRef.current = e.clientY;
    const delta = e.clientY - dragStartYRef.current;
    // Allow downward drag; rubber-band slightly when dragged up.
    setDragY(delta > 0 ? delta : delta * 0.25);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // releasePointerCapture can throw if pointer was already released
    }
    // Past threshold (120px) → dismiss. Otherwise snap back.
    if (dragY > 120) {
      onClose();
    }
    setDragY(0);
  };

  const sheetTransform = open
    ? `translateY(${dragY}px)`
    : "translateY(110%)";
  const sheetTransition = isDragging
    ? "none"
    : "transform 520ms cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <>
      {/* Dim backdrop — fades in/out alongside the sheet's slide.
          Tap-anywhere closes the sheet. */}
      <div
        aria-hidden
        className="absolute inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 460ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={onClose}
      />

      {/* Sheet — slides up from the bottom on a smooth out-expo curve. The
          entire sheet surface is also a drag handle: press anywhere
          (except a Button), drag down, and release past 120px to dismiss.
          Released earlier and the sheet springs back. */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="absolute bottom-0 left-0 right-0 z-50 touch-none select-none px-[6px] pb-[36px]"
        style={{
          transform: sheetTransform,
          transition: sheetTransition,
        }}
      >
        <div
          className="relative overflow-hidden rounded-[32px]"
          style={{ background: "#1e1e1e" }}
        >
          {/* Decorative big "?" watermark in the top-right corner */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-[114px] w-[118px] overflow-hidden"
          >
            <div
              className="absolute -top-[14px] left-0 h-[128px] w-[128px] rounded-full"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <div
              className="absolute top-[7px] size-[85.333px]"
              style={{ left: "calc(50% - 37.5px)" }}
            >
              <div
                className="absolute"
                style={{
                  inset: "18.42% 32.44% 20.83% 27.7%",
                  background: "#1E1E1E",
                  WebkitMaskImage: `url(${ICON.question})`,
                  maskImage: `url(${ICON.question})`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              />
            </div>
          </div>

          {/* Header — grabber + close button */}
          <div className="relative flex flex-col items-center px-[20px] pb-[12px]">
            <div className="flex h-[16px] items-start pt-[5px]">
              <div
                aria-hidden
                className="h-[5px] w-[36px] rounded-full"
                style={{ background: "#333", mixBlendMode: "plus-lighter" }}
              />
            </div>
            <div className="flex w-full items-center justify-between pt-[2px]">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Close"
                onClick={onClose}
                className="h-[44px] w-[44px] rounded-full"
              >
                <Image
                  src={ICON.cross}
                  alt=""
                  width={14}
                  height={14}
                  className="object-contain"
                />
              </Button>
              <span className="h-[44px] w-[44px]" />
            </div>
          </div>

          {/* Main content */}
          <div className="flex w-full flex-col items-center gap-[8px] px-[20px] pb-[20px]">
            <div className="flex w-full flex-col items-center gap-[20px] pt-[12px] pb-[64px]">
              {/* Centered question icon — linear gradient from red at the
                  bottom fading to a soft white wash at the top. */}
              <div className="relative size-[36px]">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(to top, #FF292C 0%, rgba(255,255,255,0.14) 100%)",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src={ICON.question}
                    alt=""
                    width={10}
                    height={15}
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="flex w-full flex-col items-center gap-[4px] text-center">
                <p
                  key={title}
                  className="koshstudio-fade-up w-full text-[16px] font-medium leading-[24px] text-white"
                >
                  {title}
                </p>
                <p
                  key={description}
                  className="koshstudio-fade-up w-full text-[14px] leading-[20px] text-white/45"
                  style={{ animationDelay: "60ms" }}
                >
                  {description}
                </p>
              </div>
            </div>

            {/* Close action button — canonical primary Button (white pill) */}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onClose}
              className="flex w-[350px] min-h-[48px] rounded-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function ScreenContent({
  data,
  onOpenFees,
}: {
  data: AccountProfileData;
  onOpenFees?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center px-[20px]"
      style={{ gap: TITLE_TO_CARD_GAP }}
    >
      <div className="w-full shrink-0" style={{ height: CONTENT_TOP_SPACER }} aria-hidden />
      <BankProfileTitle title={data.title} flagSrc={data.titleFlagSrc} />
      <div className="flex w-full flex-col gap-[4px]">
        <AccountInformationCard
          description={data.description}
          artworkSrc={data.artworkSrc}
          rows={data.bankRows}
        />
        <FeesAndLimitsRow onClick={onOpenFees} />
      </div>
      <TransactionsList
        transactions={data.transactions ?? DEFAULT_TRANSACTIONS}
        badgeIcon={{ src: data.titleFlagSrc, width: 16, height: 16 }}
      />
    </div>
  );
}

function buildMaskedStyle(maskStops: string, flip = false) {
  // Reverse the gradient direction with `to top` instead of rotating the
  // whole element — rotate() interacts badly with backdrop-filter under a
  // clip-path parent and produces a horizontal "drag" smear at the corners.
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

export function ScrollEdgeEffect({
  blurRadius,
  height = EDGE_BLUR_HEIGHT,
  offset = 0,
  topRadius = 0,
}: {
  blurRadius: number;
  height?: number;
  offset?: number;
  topRadius?: number;
}) {
  const overlayMaskStyle = buildMaskedStyle(
    "rgba(0,0,0,1) 0%, rgba(0,0,0,0.84) 20%, rgba(0,0,0,0.42) 52%, rgba(0,0,0,0.10) 76%, rgba(0,0,0,0) 100%"
  );

  // The screen's squircle clip-path normally clips this for the main UI.
  // For sheets (which use plain border-radius corners) pass `topRadius`
  // and the band self-clips to those corners.
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[15]"
      style={{
        height,
        top: offset,
        borderTopLeftRadius: topRadius || undefined,
        borderTopRightRadius: topRadius || undefined,
        overflow: topRadius ? "hidden" : undefined,
      }}
      data-node-id="1:7200"
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
          background: "linear-gradient(to bottom, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.12) 28%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 78%, rgba(0,0,0,0) 100%)",
          zIndex: 20,
          ...overlayMaskStyle,
        }}
      />
    </div>
  );
}

export function BottomScrollEdgeEffect({
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
    true
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
          background: "linear-gradient(to top, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.12) 28%, rgba(0,0,0,0.06) 58%, rgba(0,0,0,0.02) 78%, rgba(0,0,0,0) 100%)",
          zIndex: 20,
          ...overlayMaskStyle,
        }}
      />
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

function BankProfileTitle({
  title,
  flagSrc,
}: {
  title: string;
  flagSrc: string;
}) {
  return (
    <div
      data-debug-name="BankProfileTitle"
      data-debug-group="title"
      className="relative flex flex-col items-center gap-[9px]"
    >
      <div
        key={flagSrc}
        className="koshstudio-cross-fade relative h-[32px] w-[32px] overflow-hidden rounded-full"
      >
        <Image src={flagSrc} alt="" width={32} height={32} className="h-full w-full" />
      </div>
      <p
        key={title}
        className="koshstudio-fade-up text-center text-[16px] font-medium leading-[24px] text-white"
      >
        {title}
      </p>
    </div>
  );
}

function AccountArtworkOverlay({
  artworkSrc,
  fillHeight = false,
}: {
  artworkSrc: string;
  fillHeight?: boolean;
}) {
  // Landscape currency-bill artwork (EUR/AED/GBP/etc) all share the
  // `header-artwork` filename suffix and should fill the overlay flush.
  // The franklin.png portrait fallback uses a -72px top offset.
  const isPreCroppedArtwork = artworkSrc.includes("header-artwork");

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute right-0 top-0 w-[186px] overflow-hidden mix-blend-screen ${
        fillHeight ? "bottom-0" : "h-[80px]"
      }`}
      style={{
        WebkitMaskImage:
          "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 100%)",
        maskImage:
          "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={artworkSrc}
        src={artworkSrc}
        alt=""
        width={186}
        height={isPreCroppedArtwork ? 80 : 224}
        className="koshstudio-cross-fade absolute right-0"
        draggable={false}
        style={{
          width: 186,
          height: isPreCroppedArtwork ? (fillHeight ? "100%" : 80) : "auto",
          top: isPreCroppedArtwork ? 0 : -72,
          opacity: 0.85,
          objectFit: fillHeight ? "cover" : undefined,
        }}
      />
    </div>
  );
}

function CopyValueButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value);
      }}
      className="shrink-0 p-[6px] text-white/45 transition-opacity duration-200 hover:opacity-100 focus:outline-none focus-visible:opacity-100 active:opacity-80"
    >
      <Image
        src={ICON.copy}
        alt=""
        width={12}
        height={14}
        className="object-contain opacity-100"
      />
    </button>
  );
}

function BankDetailRow({
  row,
  rowIndex = 0,
}: {
  row: BankRow;
  rowIndex?: number;
}) {
  // Stagger between rows: each row's chars start `rowIndex * 70ms` after
  // the previous row's first char. Per-char stagger inside the row stays
  // capped at 500ms so the long Bank Address doesn't drag.
  const rowOffsetMs = rowIndex * 70;
  return (
    <div
      data-debug-name="BankDetailRow"
      data-debug-group="row"
      className="flex w-full items-center gap-[4px]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <p className="w-full text-[11px] font-medium uppercase leading-[16px] tracking-[0.55px] text-white/30">
          {row.label}
        </p>
        <p
          key={row.value}
          className="w-full text-[16px] font-medium leading-[24px] text-white"
        >
          {row.value.split("").map((char, i) => (
            <span
              key={`${i}-${char}`}
              className="koshstudio-digit-rise"
              style={{
                animationDelay: `${rowOffsetMs + Math.min(i * 28, 500)}ms`,
              }}
            >
              {char === " " ? " " : char}
            </span>
          ))}
        </p>
      </div>
      <CopyValueButton value={row.value} label={row.label} />
    </div>
  );
}

function AccountInformationCard({
  description,
  artworkSrc,
  rows,
}: {
  description: string;
  artworkSrc: string;
  rows: BankRow[];
}) {
  return (
    <div
      data-debug-name="AccountInformationCard"
      data-debug-group="card"
      className="relative w-full overflow-hidden rounded-[20px] bg-white/[0.08]"
    >
      <div className="relative w-full bg-white/[0.08] px-[20px] py-[20px]">
        <p
          key={description}
          className="koshstudio-fade-up w-[213px] text-[14px] leading-[20px] text-white/65"
        >
          {description}
        </p>
        <AccountArtworkOverlay artworkSrc={artworkSrc} />
      </div>
      <div className="flex flex-col gap-[20px] px-[20px] py-[20px]">
        {rows.map((row, index) => (
          <BankDetailRow key={row.label} row={row} rowIndex={index} />
        ))}
      </div>
    </div>
  );
}

function FeesAndLimitsRow({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-debug-name="FeesAndLimitsRow"
      data-debug-group="row"
      className="flex w-full items-center gap-[12px] rounded-[16px] bg-white/[0.08] px-[16px] py-[14px] text-left outline-none transition-opacity hover:opacity-90 focus-visible:opacity-90 active:opacity-80"
    >
      <Image
        src={ICON.feesCard}
        alt=""
        width={18}
        height={16}
        className="shrink-0 object-contain"
        style={{ width: 18, height: 16 }}
      />
      <p className="flex-1 text-[15px] font-medium leading-[24px] text-white">
        Fees and limits
      </p>
      <Image
        src={ICON.chevronRight}
        alt=""
        width={6}
        height={11}
        className="shrink-0 rotate-180 object-contain"
        style={{ width: 6, height: 11 }}
      />
    </button>
  );
}

export type TransactionStatus = "pending" | "failed" | "cancelled" | "success";

export type Transaction = {
  id: string;
  title: string;
  date: string;
  amount: string; // "<dollars>.<cents>"
  status: TransactionStatus;
};

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: "ixy-agency", title: "From IXY Agency", date: "2026-11-04 11:45", amount: "95.00", status: "pending" },
  { id: "steave-koni", title: "From STEAVE KONI", date: "2026-08-04 14:30", amount: "8000.00", status: "success" },
  { id: "stripe-payout", title: "From Stripe Inc.", date: "2026-08-02 09:12", amount: "1240.00", status: "success" },
  { id: "wire-pending", title: "Wire from MERCURY LLC", date: "2026-07-30 18:04", amount: "560.00", status: "pending" },
  { id: "freelancer", title: "From Daria K.", date: "2026-07-25 11:08", amount: "475.50", status: "success" },
  { id: "client-rev", title: "From CLOUDPATH", date: "2026-07-20 15:22", amount: "3200.00", status: "success" },
  { id: "subscription", title: "From Notion Labs", date: "2026-07-18 06:30", amount: "48.00", status: "pending" },
  { id: "konstantin", title: "From KONSTANTIN P.", date: "2026-07-12 13:55", amount: "210.00", status: "success" },
];

function StatusBadge({ status }: { status: TransactionStatus }) {
  if (status === "success") return null;
  return (
    <div className="absolute -bottom-[2px] -right-[2px] h-[16px] w-[16px] overflow-hidden rounded-full ring-2 ring-black">
      {status === "pending" ? (
        <Image
          src={ICON.statusPending}
          alt=""
          width={16}
          height={16}
          className="block h-full w-full animate-spin motion-reduce:animate-none"
          style={{ animationDuration: "1.4s" }}
        />
      ) : (
        <>
          <Image src={ICON.statusFailed} alt="" width={16} height={16} className="block h-full w-full" />
          <div className="absolute" style={{ inset: "31.25%" }}>
            <Image
              src={ICON.statusFailedX}
              alt=""
              width={6}
              height={6}
              className="block h-full w-full"
            />
          </div>
        </>
      )}
    </div>
  );
}

function TransactionBadge({
  status,
  badgeIcon,
}: {
  status: TransactionStatus;
  badgeIcon?: { src: string; width: number; height: number };
}) {
  if (badgeIcon) {
    return (
      <div className="absolute -bottom-[3px] -right-[3px] flex h-[20px] w-[20px] items-center justify-center overflow-hidden rounded-full border-[2px] border-black bg-black shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
        <Image
          src={badgeIcon.src}
          alt=""
          width={badgeIcon.width}
          height={badgeIcon.height}
          className="h-full w-full rounded-full object-cover"
        />
      </div>
    );
  }

  return <StatusBadge status={status} />;
}

function TransactionRow({
  tx,
  icon,
  badgeIcon,
  amountPrefix = "",
}: {
  tx: Transaction;
  icon: { src: string; width: number; height: number };
  badgeIcon?: { src: string; width: number; height: number };
  amountPrefix?: string;
}) {
  const [dollars, cents] = tx.amount.split(".");
  const dollarsDisplay = `${amountPrefix}$${dollars}`;

  return (
    <div
      data-debug-name="TransactionRow"
      data-debug-group="row"
      className="flex h-[68px] w-full items-center gap-[12px] px-[16px]"
    >
      <div className="relative h-[44px] w-[44px] shrink-0">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white/[0.08]">
          <Image
            src={icon.src}
            alt=""
            width={icon.width}
            height={icon.height}
            className="object-contain"
            style={{ width: icon.width, height: icon.height }}
          />
        </div>
        <TransactionBadge status={tx.status} badgeIcon={badgeIcon} />
      </div>

      <div className="flex min-w-0 flex-1 items-start gap-[12px]">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[2px]">
          <p className="whitespace-nowrap text-[15px] font-medium leading-[24px] text-white">
            {tx.title}
          </p>
          <div className="flex items-center gap-[8px]">
            {tx.status === "failed" ? (
              <p className="whitespace-nowrap text-[14px] font-medium leading-[20px] text-[#FF292C]">
                Failed
              </p>
            ) : null}
            <p className="whitespace-nowrap text-[14px] font-medium leading-[20px] text-white/45">
              {tx.date}
            </p>
          </div>
        </div>
        <div className="whitespace-nowrap text-right text-[15px] font-medium leading-[24px]">
          <span className="overflow-hidden text-white">
            {dollarsDisplay.split("").map((char, i) => (
              <span
                key={`${tx.id}-d-${i}`}
                className="koshstudio-digit-rise"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {char}
              </span>
            ))}
          </span>
          <span className="text-white/45">
            {`.${cents}`.split("").map((char, i) => (
              <span
                key={`${tx.id}-c-${i}`}
                className="koshstudio-digit-rise"
                style={{
                  animationDelay: `${(dollarsDisplay.length + i) * 35}ms`,
                }}
              >
                {char}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_TRANSACTION_ICON = {
  src: ICON.bankAvatar,
  width: 20,
  height: 20,
} as const;

function TransactionsEndMarker() {
  return (
    <div className="flex w-full items-center gap-[10px] px-[16px] pb-[4px] pt-[14px]">
      <div className="h-px flex-1 bg-white/[0.08]" />
      <p className="shrink-0 text-[12px] font-medium uppercase tracking-[0.2em] text-white/32">
        The End
      </p>
      <div className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

export function TransactionsList({
  transactions,
  icon = DEFAULT_TRANSACTION_ICON,
  badgeIcon,
  amountPrefix = "",
}: {
  transactions: Transaction[];
  icon?: { src: string; width: number; height: number };
  badgeIcon?: { src: string; width: number; height: number };
  amountPrefix?: string;
}) {
  const visibleTransactions = transactions.filter(
    (tx) => tx.status !== "failed" && tx.status !== "cancelled",
  );

  return (
    <div
      data-debug-name="TransactionsList"
      data-debug-group="title"
      className="flex w-full flex-col gap-[8px]"
    >
      <p className="text-[15px] font-medium leading-[24px] text-white">Transactions</p>
      <div className="-mx-[16px] flex w-[calc(100%+32px)] flex-col">
        {visibleTransactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            icon={icon}
            badgeIcon={badgeIcon}
            amountPrefix={amountPrefix}
          />
        ))}
        {visibleTransactions.length > 0 ? <TransactionsEndMarker /> : null}
      </div>
    </div>
  );
}

// Kept for the empty state — flip to this when there are no transactions.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EmptyTransactions() {
  return (
    <div className="flex w-full flex-col gap-[8px]">
      <p className="text-[15px] font-medium leading-[24px] text-white">Transactions</p>
      <div className="relative flex h-[220px] w-full flex-col items-center justify-end px-[58px]">
        <div className="relative flex w-[245px] flex-col items-center gap-[5px]">
          <div className="relative h-[80px] w-[220px]">
            <DotLottieReact
              src={EMPTY_LOTTIE_SRC}
              autoplay
              loop
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <div className="flex w-full flex-col items-center gap-[4px] text-center">
            <p className="text-[14px] font-medium leading-[20px] tracking-[0.14px] text-white">
              You haven&rsquo;t received any payment yet
            </p>
            <p className="w-[223px] text-[12px] leading-[16px] text-white/45">
              Start accepting payment with Virtual US bank account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ onOpenMore }: { onOpenMore: () => void }) {
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
          onClick={onOpenMore}
          className="pointer-events-auto rounded-full"
        >
          <Image src={ICON.moreDots} alt="" width={20} height={4} className="object-contain" />
        </Button>
      </div>
    </div>
  );
}

export default function AccountProfileScreen({
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
  data: AccountProfileData;
  cornerRadius?: number;
  cornerSmoothing?: boolean;
  topEdgeHeight?: number;
  topEdgeOffset?: number;
  bottomEdgeHeight?: number;
  bottomEdgeOffset?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feesOpen, setFeesOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [statementSheetOpen, setStatementSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const feesSheetRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const statementSheetRef = useRef<HTMLDivElement>(null);

  // While any sheet is open, a click anywhere outside that sheet
  // (anywhere on the page — backdrop, the canvas around the screen,
  // the right panel) dismisses it. Listening on document so we catch
  // clicks beyond the screen's clip-path.
  useEffect(() => {
    if (!helpOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!sheetRef.current) return;
      if (sheetRef.current.contains(event.target as Node)) return;
      setHelpOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [helpOpen]);

  useEffect(() => {
    if (!feesOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!feesSheetRef.current) return;
      if (feesSheetRef.current.contains(event.target as Node)) return;
      setFeesOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [feesOpen]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!moreMenuRef.current) return;
      if (moreMenuRef.current.contains(event.target as Node)) return;
      setMoreMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!statementSheetOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!statementSheetRef.current) return;
      if (statementSheetRef.current.contains(event.target as Node)) return;
      setStatementSheetOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [statementSheetOpen]);

  // When smoothing is on, generate a Figma-flavored squircle SVG path and
  // apply it via clip-path. clip-path drives BOTH the visible boundary and
  // the overflow clip simultaneously, so the painted edge and the content
  // clip can never disagree the way they do with `corner-shape: squircle`
  // (which only affects paint, not overflow). When off, plain border-radius.
  const squirclePath = useMemo(() => {
    if (!cornerSmoothing) return null;
    return getSvgPath({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      cornerRadius,
      cornerSmoothing: 0.6, // 0..1 — Figma's iOS-equivalent default is ~0.6
    });
  }, [cornerSmoothing, cornerRadius]);

  const cornerStyle: React.CSSProperties = squirclePath
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
      data-node-id="11192:20761"
      data-debug-name="AccountProfileScreen"
      data-debug-group="screen"
      onWheel={(event) => {
        // Any sheet open → freeze the screen scroll. But the fees sheet
        // has its own internal scroll body — let wheel events that
        // originated inside it scroll natively instead of suppressing.
        if (helpOpen || feesOpen || statementSheetOpen) {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-fees-sheet-scroll]")) {
            return;
          }
          event.preventDefault();
          return;
        }
        const node = scrollRef.current;
        if (!node) return;
        if (node.scrollHeight <= node.clientHeight) return;

        event.preventDefault();
        node.scrollTop += event.deltaY;
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          ...cornerStyle,
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{ background: "rgb(0,0,0)" }}
        />
        <ScrollBackdrop backdropFlagSrc={data.backdropFlagSrc} />

        <div
          ref={scrollRef}
          className="koshstudio-scroll-hide absolute inset-0 z-10"
          style={{
            overflowY: "scroll",
            paddingTop: 92,
            paddingBottom: 140,
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          <ScreenContent data={data} onOpenFees={() => setFeesOpen(true)} />
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
      <Header onOpenHelp={() => setHelpOpen(true)} />
      <Footer onOpenMore={() => setMoreMenuOpen(true)} />
      <StatusBar />
      <HelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={data.title}
        description={data.description}
        sheetRef={sheetRef}
      />
      <FeesAndLimitsSheet
        open={feesOpen}
        onClose={() => setFeesOpen(false)}
        artworkSrc={data.artworkSrc}
        sheetRef={feesSheetRef}
      />
      <MoreOptionsMenu
        open={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        onDownloadStatement={() => setStatementSheetOpen(true)}
        onOpenFees={() => setFeesOpen(true)}
        menuRef={moreMenuRef}
      />
      <DownloadStatementSheet
        open={statementSheetOpen}
        onClose={() => setStatementSheetOpen(false)}
        sheetRef={statementSheetRef}
      />
    </div>
  );
}
