"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import { useOpenAccountModal } from "@/components/modals/OpenAccountModal";
import FloatingCta from "@/components/ui/FloatingCta";
import FloatingQRCode from "@/components/ui/FloatingQRCode";
import UsdHeroSection from "@/components/sections/UsdHeroSection";
import {
  DEFAULT_NAMED_USD_GLASS_SETTINGS,
} from "@/components/sections/KeyFeatures";
import {
  DEFAULT_TESTIMONIAL_VIDEO_SETTINGS,
} from "@/components/sections/Testimonial";

const UsdValueStrip = dynamic(() => import("@/components/sections/UsdValueStrip"));
const KeyFeatures = dynamic(() => import("@/components/sections/KeyFeatures"));
const PowerfulFeatures = dynamic(() => import("@/components/sections/PowerfulFeatures"));
const UsdAccountList = dynamic(() => import("@/components/sections/UsdAccountList"));
const ListOfUsers = dynamic(() => import("@/components/sections/ListOfUsers"));
const StepsToGetUsdAccount = dynamic(() => import("@/components/sections/StepsToGetUsdAccount"));
const MoreThanUsdAccountSection = dynamic(() => import("@/components/sections/MoreThanUsdAccountSection"));
const Testimonial = dynamic(() => import("@/components/sections/Testimonial"));
const UsdCtaSection = dynamic(() => import("@/components/sections/UsdCtaSection"));

function NavbarWithModal() {
  const { open } = useOpenAccountModal();
  return <Navbar onCreateAccountClick={open} />;
}
const FAQsSection = dynamic(() => import("@/components/sections/FAQsSection"));
const FooterSection = dynamic(() => import("@/components/sections/FooterSection"));

const IS_DEV = process.env.NODE_ENV === "development";

function GridOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <div className="layout-content ds-page-gutter h-full">
        <div className="mx-auto hidden h-full w-full max-w-[554px] grid-cols-2 gap-x-[var(--space-48)] tablet:grid laptop:hidden">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`mobile-grid-${index}`}
              className="h-full border-x border-[#FF0000]/[0.08] bg-[#FF0000]/[0.12]"
            />
          ))}
        </div>

        <div className="mx-auto hidden h-full w-full max-w-[944px] grid-cols-4 gap-x-[32px] laptop:grid desktop:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`laptop-grid-${index}`}
              className="h-full border-x border-[#FF0000]/[0.08] bg-[#FF0000]/[0.12]"
            />
          ))}
        </div>

        <div className="hidden h-full w-full desktop:grid desktop:grid-cols-12 desktop:gap-x-[32px]">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={`desktop-grid-${index}`}
              className="h-full border-x border-[#FF0000]/[0.08] bg-[#FF0000]/[0.12]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewportSizeBadge() {
  const [size, setSize] = useState({ w: 0, h: 0, container: 0 });

  useEffect(() => {
    const measure = () => {
      const container = document.querySelector<HTMLElement>(".layout-content");
      const rect = container?.getBoundingClientRect();
      setSize({
        w: window.innerWidth,
        h: window.innerHeight,
        container: rect ? Math.round(rect.width) : 0,
      });
    };

    measure();
    window.addEventListener("resize", measure);

    // Also react to layout changes (fonts loading, etc.)
    const container = document.querySelector<HTMLElement>(".layout-content");
    const ro = container ? new ResizeObserver(measure) : null;
    if (container && ro) ro.observe(container);

    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, []);

  return (
    <div data-inspector-chrome className="fixed left-[max(16px,env(safe-area-inset-left))] top-[16px] z-[9999] flex flex-col gap-[2px] rounded-[8px] border border-white/10 bg-[rgba(22,22,22,0.78)] px-[10px] py-[6px] font-mono text-[11px] leading-none text-white/80 backdrop-blur-[8px]">
      <span>
        <span className="text-white/40">vp</span> {size.w} × {size.h}
      </span>
      <span>
        <span className="text-white/40">ct</span> {size.container}
      </span>
    </div>
  );
}

function DevToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className="inline-flex min-h-[44px] items-center gap-[12px] rounded-[999px] border border-white/10 bg-[rgba(22,22,22,0.78)] px-[14px] py-[8px] text-left text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-[20px] transition-colors hover:bg-[rgba(28,28,28,0.86)]"
    >
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold leading-[15px]">{label}</span>
        <span className="text-[11px] leading-[13px] text-white/45">
          {enabled ? "On" : "Off"}
        </span>
      </span>
      <span
        aria-hidden
        className={`relative ml-[2px] h-[26px] w-[44px] rounded-full border border-white/10 transition-all duration-200 ${
          enabled
            ? "bg-[#34C759] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-[1px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
            enabled ? "translate-x-[19px]" : "translate-x-[1px]"
          }`}
        />
      </span>
    </button>
  );
}

function ElementInspector({ active }: { active: boolean }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [label, setLabel] = useState<string>("");
  const [locked, setLocked] = useState(false);
  const [lockedEl, setLockedEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const describe = (el: HTMLElement) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const comp = el.closest<HTMLElement>("[data-component]")?.dataset.component;
      const cls = Array.from(el.classList).slice(0, 4).join(".");
      const clsStr = cls ? `.${cls}` : "";
      const compStr = comp && !el.closest(`#${el.id || "__"}`) ? ` ◂ <${comp}>` : comp ? ` ◂ <${comp}>` : "";
      return `${tag}${id}${clsStr}${compStr}`;
    };

    const isInspectorChrome = (el: Element | null) => {
      if (!el) return true;
      return !!(el as HTMLElement).closest?.("[data-inspector-chrome]");
    };

    const handleMove = (e: MouseEvent) => {
      if (locked) return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el || isInspectorChrome(el)) return;
      setRect(el.getBoundingClientRect());
      setLabel(describe(el));
    };

    const handleClick = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el || isInspectorChrome(el)) return;
      e.preventDefault();
      e.stopPropagation();
      if (locked && lockedEl === el) {
        setLocked(false);
        setLockedEl(null);
        return;
      }
      setLocked(true);
      setLockedEl(el);
      setRect(el.getBoundingClientRect());
      setLabel(describe(el));
    };

    const handleScrollOrResize = () => {
      if (locked && lockedEl) {
        setRect(lockedEl.getBoundingClientRect());
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocked(false);
        setLockedEl(null);
        setRect(null);
        setLabel("");
      }
    };

    window.addEventListener("mousemove", handleMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousemove", handleMove, true);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("keydown", handleKey);
    };
  }, [active, locked, lockedEl]);

  if (!active || !rect) return null;

  return (
    <div data-inspector-chrome className="pointer-events-none fixed inset-0 z-[80]">
      <div
        className="absolute border-[2px]"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderColor: locked ? "#34C759" : "#FF3B30",
          boxShadow: locked ? "0 0 0 1px rgba(52,199,89,0.35)" : "0 0 0 1px rgba(255,59,48,0.3)",
        }}
      />
      <div
        className="absolute max-w-[420px] truncate rounded-[6px] px-[8px] py-[4px] font-mono text-[11px] leading-[14px] text-white shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
        style={{
          top: Math.max(4, rect.top - 22),
          left: Math.max(4, rect.left),
          background: locked ? "#34C759" : "#FF3B30",
        }}
      >
        {label}
        {locked ? "  ·  click again or Esc to unlock" : ""}
      </div>
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="relative z-[1] hidden w-full bg-black tablet:block">
      <div className="layout-content ds-page-gutter py-[20px] tablet:py-[24px] desktop:py-[28px]">
        <div
          aria-hidden
          className="h-[1px] w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--color-divider) 0, var(--color-divider) 4px, transparent 4px, transparent 8px)",
          }}
        />
      </div>
    </div>
  );
}

export default function UsdAccountListPreviewClient({
  heroFromLabel = "anywhere",
}: {
  heroFromLabel?: string;
}) {
  const [isGridEnabled, setIsGridEnabled] = useState(false);
  const [isOutlinesEnabled, setIsOutlinesEnabled] = useState(false);

  return (
    <main
      className={`relative min-h-screen bg-black ${isOutlinesEnabled ? "dev-outlines" : ""}`}
    >
      {IS_DEV ? (
        <>
          <style jsx global>{`
            .dev-outlines *,
            .dev-outlines *::before,
            .dev-outlines *::after {
              outline: 1px solid rgba(255, 255, 255, 0.12);
              outline-offset: -1px;
            }
            .dev-outlines article,
            .dev-outlines header,
            .dev-outlines footer,
            .dev-outlines nav,
            .dev-outlines aside {
              outline: 1px dashed rgba(255, 100, 200, 0.45);
              outline-offset: -1px;
            }
            .dev-outlines .layout-content {
              outline: 1px dashed rgba(255, 200, 0, 0.6);
              outline-offset: -1px;
            }
            .dev-outlines section {
              outline: 1px dashed rgba(0, 200, 255, 0.6);
              outline-offset: -1px;
            }
          `}</style>
          <div data-inspector-chrome className="fixed right-[max(16px,env(safe-area-inset-right))] top-[16px] z-[9999] hidden flex-col gap-[8px] tablet:flex">
            <DevToggle
              label="Grid Overlay"
              enabled={isGridEnabled}
              onToggle={() => setIsGridEnabled((value) => !value)}
            />
            <DevToggle
              label="Outlines"
              enabled={isOutlinesEnabled}
              onToggle={() => setIsOutlinesEnabled((value) => !value)}
            />
          </div>
          {isGridEnabled ? <GridOverlay /> : null}
          <ElementInspector active={isOutlinesEnabled} />
          <ViewportSizeBadge />
        </>
      ) : null}

      <NavbarWithModal />

      <UsdHeroSection fromLabel={heroFromLabel} />
      <SectionDivider />
      <UsdValueStrip />
      <SectionDivider />
      <KeyFeatures namedUsdGlassSettings={DEFAULT_NAMED_USD_GLASS_SETTINGS} />
      <PowerfulFeatures />
      <ListOfUsers />
      <SectionDivider />
      <UsdAccountList />
      <StepsToGetUsdAccount />
      <Testimonial videoSettings={DEFAULT_TESTIMONIAL_VIDEO_SETTINGS} />
      <MoreThanUsdAccountSection />
      <UsdCtaSection />
      <FAQsSection />
      <FooterSection />
      <FloatingCta />
      <FloatingQRCode />
    </main>
  );
}
