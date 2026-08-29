"use client";

/**
 * OpenAccountModal
 * ────────────────
 * Reusable "Open an account" modal used by every account-creation CTA on
 * the site. Two views:
 *
 *   1. "choose"     — side-by-side Individual / Business cards
 *   2. "individual" — morphs the Individual card into a download card with
 *                     QR code + App Store / Play Store badges
 *
 * Mount pattern
 *   <OpenAccountModalProvider>...</OpenAccountModalProvider>
 * at the root layout so every client component can call
 *   const { open } = useOpenAccountModal();
 *
 * All copy, URLs, images, and the avatar can be overridden at the provider
 * level. Defaults point at the live KOSH assets.
 *
 * Accessibility
 *   • role="dialog" + aria-modal
 *   • aria-labelledby bound to a hidden H2 that matches the visible title
 *   • Focus is trapped inside the dialog while open, and the element that
 *     opened the modal receives focus back on close.
 *   • Escape + backdrop click both close.
 *
 * Performance
 *   • Modal DOM only mounts while `isRenderable` (no cost when closed).
 *   • Backdrop is promoted to its own GPU layer via transform: translateZ(0)
 *     so backdrop-filter is pre-computed and doesn't lag on open.
 *   • Content layers use fixed pixel sizes so they don't reflow during the
 *     layout morph.
 *   • All handlers memoized with useCallback; merged config memoized.
 */

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Button from "@/components/ui/Button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BREAKPOINT_MEDIA } from "@/lib/breakpoints";

// ─── Types ──────────────────────────────────────────────────────────────────

type ModalView = "choose" | "individual";

export interface ChooseCardContent {
  title: string;
  description: string;
}

export interface BusinessCardContent extends ChooseCardContent {
  /** URL that opens in a new tab when the Business card is clicked. */
  signupUrl: string;
}

export interface DownloadViewContent {
  title: string;
  description: string;
  qrSrc: string;
  qrAlt: string;
  appStoreUrl: string;
  appStoreBadgeSrc: string;
  playStoreUrl: string;
  playStoreBadgeSrc: string;
}

export interface OpenAccountModalConfig {
  individual?: Partial<ChooseCardContent>;
  business?: Partial<BusinessCardContent>;
  downloadView?: Partial<DownloadViewContent>;
  /** Path to the avatar image used on both cards. */
  avatarSrc?: string;
}

interface OpenAccountModalContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  individual: {
    title: "I'm Individual",
    description: "For freelancers, remote workers, and creators.",
  },
  business: {
    title: "I'm Business",
    description: "For startups, agencies, and registered businesses.",
    signupUrl:
      "https://payout.copperx.io/auth/register?utm_source=website&utm_medium=open_account_modal&utm_campaign=business",
  },
  downloadView: {
    title: "Download the KOSH App",
    description: "Individual accounts open in minutes through the mobile app.",
    qrSrc: "/images/qr-code.svg",
    qrAlt: "QR code to download the KOSH mobile app",
    appStoreUrl: "https://testflight.apple.com/join/qJPVHJKq",
    appStoreBadgeSrc: "/figma-assets/footer/Appstore.svg",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=com.koshmoney.app&hl=en_US",
    playStoreBadgeSrc: "/figma-assets/footer/Playstore.svg",
  },
  avatarSrc: "/figma-assets/open-account-modal/avatar.png",
} satisfies {
  individual: ChooseCardContent;
  business: BusinessCardContent;
  downloadView: DownloadViewContent;
  avatarSrc: string;
};

// ─── Layout + animation constants ───────────────────────────────────────────

const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 500;
const CARD_GAP = 16;
const SMALL_CARD_WIDTH = (FRAME_WIDTH - CARD_GAP) / 2; // 312
const SMALL_CARD_HEIGHT = 340;
const SMALL_CARD_TOP = (FRAME_HEIGHT - SMALL_CARD_HEIGHT) / 2; // 80

const MOBILE_CARD_HEIGHT = 240;
const MOBILE_CARD_TOP_INDIVIDUAL =
  (FRAME_HEIGHT - (MOBILE_CARD_HEIGHT * 2 + CARD_GAP)) / 2;
const MOBILE_CARD_TOP_BUSINESS =
  MOBILE_CARD_TOP_INDIVIDUAL + MOBILE_CARD_HEIGHT + CARD_GAP;

const MODAL_ENTER_EXIT_MS = 460;
const CONTENT_FADE_MS = 150;
const MORPH_MS = 320;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const MORPH_DELAY_MS = CONTENT_FADE_MS;
const NEW_CONTENT_DELAY_MS = CONTENT_FADE_MS + MORPH_MS;

const CARD_SHADOW =
  "0 30px 64px -16px rgba(0, 0, 0, 0.65), 0 10px 28px -8px rgba(0, 0, 0, 0.4)";
const AVATAR_MASK =
  "linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%)";

// Selector used by the focus trap — any interactive, non-disabled element
// that can legitimately receive focus inside the dialog.
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ─── Context + hook ─────────────────────────────────────────────────────────

const OpenAccountModalContext =
  createContext<OpenAccountModalContextValue | null>(null);

export function useOpenAccountModal(): OpenAccountModalContextValue {
  const ctx = useContext(OpenAccountModalContext);
  if (!ctx) {
    throw new Error(
      "useOpenAccountModal must be used inside <OpenAccountModalProvider>"
    );
  }
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function OpenAccountModalProvider({
  children,
  individual: individualOverride,
  business: businessOverride,
  downloadView: downloadViewOverride,
  avatarSrc: avatarSrcOverride,
}: { children: ReactNode } & OpenAccountModalConfig) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const contextValue = useMemo<OpenAccountModalContextValue>(
    () => ({ open, close, isOpen }),
    [open, close, isOpen]
  );

  // Merge defaults with caller overrides. Memoized so identical props don't
  // re-build the config object on every render.
  const resolvedConfig = useMemo(
    () => ({
      individual: { ...DEFAULT_CONFIG.individual, ...individualOverride },
      business: { ...DEFAULT_CONFIG.business, ...businessOverride },
      downloadView: { ...DEFAULT_CONFIG.downloadView, ...downloadViewOverride },
      avatarSrc: avatarSrcOverride ?? DEFAULT_CONFIG.avatarSrc,
    }),
    [
      individualOverride,
      businessOverride,
      downloadViewOverride,
      avatarSrcOverride,
    ]
  );

  return (
    <OpenAccountModalContext.Provider value={contextValue}>
      {children}
      <OpenAccountModal
        isOpen={isOpen}
        onClose={close}
        config={resolvedConfig}
      />
    </OpenAccountModalContext.Provider>
  );
}

// ─── Modal component ────────────────────────────────────────────────────────

interface OpenAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    individual: ChooseCardContent;
    business: BusinessCardContent;
    downloadView: DownloadViewContent;
    avatarSrc: string;
  };
}

function OpenAccountModal({ isOpen, onClose, config }: OpenAccountModalProps) {
  const isLaptop = useMediaQuery(BREAKPOINT_MEDIA.laptopUp);

  // Two-phase mount so the initial "hidden" paint commits before the
  // opacity/scale transition starts (without this, the enter animation
  // is skipped because React batches the initial mount with the visible state).
  const [isRenderable, setIsRenderable] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [view, setView] = useState<ModalView>("choose");
  const [isIndividualHovered, setIsIndividualHovered] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // ── Lifecycle: mount / unmount driven by isOpen ──
  useEffect(() => {
    if (isOpen) {
      setIsRenderable(true);
      return;
    }
    setIsShowing(false);
    const timeout = window.setTimeout(() => {
      setIsRenderable(false);
      setView("choose");
    }, MODAL_ENTER_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  // ── Lifecycle: trigger enter animation one paint after mount ──
  useEffect(() => {
    if (!isRenderable || !isOpen) return;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setIsShowing(true));
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [isRenderable, isOpen]);

  // ── Scroll lock + Escape + focus save/restore ──
  useEffect(() => {
    if (!isOpen) return;

    // Save current focus to return it on close.
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab") {
        trapFocus(event, dialogRef.current);
      }
    };
    window.addEventListener("keydown", handleKey);

    // Cross-browser scroll lock (iOS-safe): fix body, restore on close.
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: htmlEl.style.overflow,
      bodyPosition: bodyEl.style.position,
      bodyTop: bodyEl.style.top,
      bodyWidth: bodyEl.style.width,
      bodyOverflow: bodyEl.style.overflow,
    };

    htmlEl.style.overflow = "hidden";
    bodyEl.style.position = "fixed";
    bodyEl.style.top = `-${scrollY}px`;
    bodyEl.style.width = "100%";
    bodyEl.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      htmlEl.style.overflow = previous.htmlOverflow;
      bodyEl.style.position = previous.bodyPosition;
      bodyEl.style.top = previous.bodyTop;
      bodyEl.style.width = previous.bodyWidth;
      bodyEl.style.overflow = previous.bodyOverflow;
      window.scrollTo(0, scrollY);
      // Restore focus to the element that triggered the modal.
      previousActiveElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  // ── Lifecycle: auto-focus the first actionable element on show/view change ──
  useEffect(() => {
    if (!isShowing) return;
    const node = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    node?.focus();
  }, [isShowing, view]);

  // ── Handlers ──
  const handleSelectIndividual = useCallback(() => setView("individual"), []);
  const handleBack = useCallback(() => setView("choose"), []);
  const handleSelectBusiness = useCallback(() => {
    if (typeof window !== "undefined") {
      window.open(config.business.signupUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  }, [config.business.signupUrl, onClose]);

  const isExpanded = view === "individual";

  // ── Style memos (stable when relevant inputs don't change) ──
  const morphCardStyle = useMemo<CSSProperties>(() => {
    if (isLaptop) {
      return {
        position: "absolute",
        left: 0,
        top: isExpanded ? 0 : SMALL_CARD_TOP,
        width: isExpanded ? FRAME_WIDTH : SMALL_CARD_WIDTH,
        height: isExpanded ? FRAME_HEIGHT : SMALL_CARD_HEIGHT,
        boxShadow: CARD_SHADOW,
        transitionProperty: "top, width, height",
        transitionDuration: `${MORPH_MS}ms`,
        transitionTimingFunction: EASE,
        transitionDelay: `${MORPH_DELAY_MS}ms`,
        willChange: "top, width, height",
      };
    }
    return {
      position: "absolute",
      left: 0,
      right: 0,
      top: isExpanded ? 0 : MOBILE_CARD_TOP_INDIVIDUAL,
      height: isExpanded ? FRAME_HEIGHT : MOBILE_CARD_HEIGHT,
      boxShadow: CARD_SHADOW,
      transitionProperty: "top, height",
      transitionDuration: `${MORPH_MS}ms`,
      transitionTimingFunction: EASE,
      transitionDelay: `${MORPH_DELAY_MS}ms`,
      willChange: "top, height",
    };
  }, [isLaptop, isExpanded]);

  const businessCardStyle = useMemo<CSSProperties>(() => {
    const base: CSSProperties = {
      position: "absolute",
      opacity: isExpanded ? 0 : 1,
      pointerEvents: isExpanded ? "none" : "auto",
      transitionProperty: "opacity",
      transitionDuration: `${CONTENT_FADE_MS}ms`,
      transitionTimingFunction: EASE,
      transitionDelay: isExpanded ? "0ms" : `${NEW_CONTENT_DELAY_MS}ms`,
      boxShadow: CARD_SHADOW,
    };
    return isLaptop
      ? {
          ...base,
          top: SMALL_CARD_TOP,
          right: 0,
          width: SMALL_CARD_WIDTH,
          height: SMALL_CARD_HEIGHT,
        }
      : {
          ...base,
          top: MOBILE_CARD_TOP_BUSINESS,
          left: 0,
          right: 0,
          height: MOBILE_CARD_HEIGHT,
        };
  }, [isLaptop, isExpanded]);

  const chooseContentStyle = useMemo<CSSProperties>(() => {
    const base: CSSProperties = {
      position: "absolute",
      left: 0,
      top: 0,
      opacity: isExpanded ? 0 : 1,
      transform: isExpanded ? "translateY(-8px)" : "translateY(0)",
      pointerEvents: isExpanded ? "none" : "auto",
      transitionProperty: "opacity, transform",
      transitionDuration: `${CONTENT_FADE_MS}ms`,
      transitionTimingFunction: EASE,
      transitionDelay: isExpanded ? "0ms" : `${NEW_CONTENT_DELAY_MS}ms`,
      willChange: "opacity, transform",
    };
    return isLaptop
      ? { ...base, width: SMALL_CARD_WIDTH, height: SMALL_CARD_HEIGHT }
      : { ...base, right: 0, height: MOBILE_CARD_HEIGHT };
  }, [isLaptop, isExpanded]);

  const downloadContentStyle = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: FRAME_HEIGHT,
      opacity: isExpanded ? 1 : 0,
      transform: isExpanded ? "translateY(0)" : "translateY(8px)",
      pointerEvents: isExpanded ? "auto" : "none",
      transitionProperty: "opacity, transform",
      transitionDuration: `${CONTENT_FADE_MS}ms`,
      transitionTimingFunction: EASE,
      transitionDelay: isExpanded ? `${NEW_CONTENT_DELAY_MS}ms` : "0ms",
      willChange: "opacity, transform",
    }),
    [isExpanded]
  );

  if (!isRenderable) return null;

  const titleId = "open-account-modal-title";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-[var(--space-24)]"
    >
      {/* Hidden title for screen readers. Always points at the current view's title. */}
      <h2 id={titleId} className="sr-only">
        {isExpanded ? config.downloadView.title : "Open an account"}
      </h2>

      {/* Backdrop — own GPU layer so backdrop-filter is pre-computed */}
      <div
        aria-hidden
        style={{
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: "opacity",
          WebkitBackdropFilter: "blur(8px)",
          backdropFilter: "blur(8px)",
        }}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-[${MODAL_ENTER_EXIT_MS}ms] ease-out ${
          isShowing ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Enter/exit wrapper — drives opacity + lift + zoom */}
      <div
        className={`relative w-full max-w-[640px] transition-all duration-[${MODAL_ENTER_EXIT_MS}ms] ease-out ${
          isShowing
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-[20px] scale-[0.96]"
        }`}
      >
        <div className="relative w-full" style={{ height: FRAME_HEIGHT }}>
          {/* Business card (fades in place; no transform so no stacking context) */}
          <div
            style={businessCardStyle}
            onClick={stopPropagation}
            className="group overflow-hidden rounded-[32px] border border-white/[0.08] bg-[rgba(22,22,22,0.72)] backdrop-blur-[24px] transition-colors duration-200 hover:border-white/[0.16] hover:bg-[rgba(32,32,32,0.78)]"
          >
            <button
              type="button"
              onClick={handleSelectBusiness}
              data-event="modal_select_business"
              className="flex h-full w-full flex-col items-center justify-center gap-[var(--space-16)] px-[var(--space-32)] py-[var(--space-32)] text-center"
            >
              <ChromeAvatar src={config.avatarSrc} />
              <div>
                <h3 className="text-[22px] font-semibold leading-[28px] text-white">
                  {config.business.title}
                </h3>
                <p className="mt-[var(--space-8)] text-[14px] leading-[20px] text-white/60">
                  {config.business.description}
                </p>
              </div>
            </button>
          </div>

          {/* Morphing Individual → Download card */}
          <div
            style={morphCardStyle}
            onClick={stopPropagation}
            onPointerEnter={() => setIsIndividualHovered(true)}
            onPointerLeave={() => setIsIndividualHovered(false)}
            className={`overflow-hidden rounded-[32px] border backdrop-blur-[24px] transition-colors duration-200 ${
              !isExpanded && isIndividualHovered
                ? "border-white/[0.16] bg-[rgba(32,32,32,0.78)]"
                : "border-white/[0.08] bg-[rgba(22,22,22,0.72)]"
            }`}
          >
            {/* Choose content (small) — fixed size at top-left of the morphing card */}
            <button
              type="button"
              onClick={handleSelectIndividual}
              aria-hidden={isExpanded}
              tabIndex={isExpanded ? -1 : 0}
              data-event="modal_select_individual"
              style={chooseContentStyle}
              className="flex flex-col items-center justify-center gap-[var(--space-16)] p-[var(--space-24)] text-center"
            >
              <ChromeAvatar src={config.avatarSrc} />
              <div>
                <h3 className="text-[22px] font-semibold leading-[28px] text-white">
                  {config.individual.title}
                </h3>
                <p className="mt-[var(--space-8)] text-[14px] leading-[20px] text-white/60">
                  {config.individual.description}
                </p>
              </div>
            </button>

            {/* Download content (full card) */}
            <div
              aria-hidden={!isExpanded}
              style={downloadContentStyle}
              className="flex flex-col gap-[40px] p-[40px]"
            >
              <div className="absolute left-[40px] top-[40px]">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleBack}
                  aria-label="Back to account type selection"
                  tabIndex={isExpanded ? 0 : -1}
                  data-event="modal_back"
                >
                  <BackArrowIcon />
                </Button>
              </div>

              <div className="text-center">
                <h3 className="text-[26px] font-semibold leading-[32px] text-white">
                  {config.downloadView.title}
                </h3>
                <p className="mx-auto mt-[var(--space-8)] max-w-[440px] text-[14px] leading-[20px] text-white/60">
                  {config.downloadView.description}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <Image
                  src={config.downloadView.qrSrc}
                  alt={config.downloadView.qrAlt}
                  width={220}
                  height={220}
                  className="h-[220px] w-[220px] rounded-[20px]"
                />
              </div>

              <div className="flex items-center justify-center gap-[12px]">
                <a
                  href={config.downloadView.appStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download on the App Store"
                  data-event="modal_download_appstore"
                >
                  <Image
                    src={config.downloadView.appStoreBadgeSrc}
                    alt="Download on the App Store"
                    width={120}
                    height={40}
                  />
                </a>
                <a
                  href={config.downloadView.playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get it on Google Play"
                  data-event="modal_download_playstore"
                >
                  <Image
                    src={config.downloadView.playStoreBadgeSrc}
                    alt="Get it on Google Play"
                    width={120}
                    height={40}
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stopPropagation(event: React.MouseEvent) {
  event.stopPropagation();
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);

  if (focusable.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (active === last || !container.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }
}

// ─── Visual primitives ──────────────────────────────────────────────────────

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12 H5 M11 6 L5 12 L11 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChromeAvatar({ src }: { src: string }) {
  return (
    <div
      aria-hidden
      className="h-[140px] w-[140px] bg-center bg-no-repeat bg-contain"
      style={{
        backgroundImage: `url('${src}')`,
        WebkitMaskImage: AVATAR_MASK,
        maskImage: AVATAR_MASK,
      }}
    />
  );
}
