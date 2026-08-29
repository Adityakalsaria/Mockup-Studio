"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    title: "Expense Automation",
    description:
      "KOSH automatically tags spend, spots unusual activity, and prepares reports that sync with your accounting tools. No more chasing receipts.",
    image: "/images/features/expense-automation.png",
  },
  {
    title: "Invoicing & Payment Links",
    description:
      "Generate and send one-time or recurring invoices, track payment status, and sync automatically with your accounting workflows.",
    image: "/images/features/invoicing-payment-links.png",
  },
  {
    title: "1:1 Support",
    description:
      "Get direct access to our team through a private 1:1 Telegram or Slack channel. Fast, personal, and always on.",
    image: "/images/features/1-1-supports.png",
  },
  {
    title: "Regulated Partners",
    description:
      "We work with regulated partners and chartered accountants worldwide to help your business stay compliant.",
    image: "/images/features/regulated-partners.webp",
  },
  {
    title: "Smart Savings",
    description:
      "Set savings goals, automate deposits, and earn competitive yields on idle balances. All from one dashboard.",
    image: "/images/features/saving-space.webp",
  },
  {
    title: "Investing",
    description:
      "Access curated investment products, from fixed-income instruments to digital assets, directly through your KOSH account.",
    image: "/images/features/invest.webp",
  },
];

/*
 * 3 visible cards + 2 gaps = 1436px
 * card = (1436 - 2×16) / 3 ≈ 468px
 */
const GAP = 16;
const CONTAINER = 1436;
const CARD_W = (CONTAINER - 2 * GAP) / 3;
const STEP = CARD_W + GAP;
const MAX_INDEX = FEATURES.length - 3;

/* ------------------------------------------------------------------ */
/*  Arrow icon                                                          */
/* ------------------------------------------------------------------ */

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={direction === "left" ? "rotate-180" : ""}
    >
      <path
        d="M4.167 10h11.666M10.833 5L15.833 10l-5 5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                        */
/* ------------------------------------------------------------------ */

export default function FutureSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Live offset during drag (null = use snapped position)
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);

  const clampIdx = (v: number) => Math.max(0, Math.min(v, MAX_INDEX));
  const clampPx = (v: number) => Math.max(0, Math.min(v, MAX_INDEX * STEP));

  /* Snap to nearest card index and clear drag state */
  const snap = useCallback((pxOffset: number) => {
    const idx = clampIdx(Math.round(pxOffset / STEP));
    setCurrentIndex(idx);
    setDragOffset(null);
  }, []);

  /* Button controls — always clear dragOffset so they take effect */
  const goTo = useCallback((dir: "left" | "right") => {
    setDragOffset(null);
    setCurrentIndex((prev) => clampIdx(dir === "left" ? prev - 1 : prev + 1));
  }, []);

  /* ---- Mouse / touch drag ---- */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartOffset.current = currentIndex * STEP;
      setDragOffset(dragStartOffset.current);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [currentIndex],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = dragStartX.current - e.clientX;
    setDragOffset(clampPx(dragStartOffset.current + delta));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragOffset !== null) snap(dragOffset);
  }, [dragOffset, snap]);

  /* ---- Keyboard arrow navigation ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo("left");
      else if (e.key === "ArrowRight") goTo("right");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goTo]);

  /* ---- Horizontal wheel / trackpad ---- */
  const wheelAccum = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wheelBase = useRef(0);

  useEffect(() => {
    const el = trackRef.current?.parentElement;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const dx =
        Math.abs(e.deltaX) > Math.abs(e.deltaY)
          ? e.deltaX
          : e.shiftKey
            ? e.deltaY
            : 0;
      if (dx === 0) return;
      e.preventDefault();

      // On first wheel event of a gesture, capture the current snapped position
      if (wheelAccum.current === 0) {
        wheelBase.current = currentIndex * STEP;
      }
      wheelAccum.current += dx;

      // Live feedback — move track immediately (no transition)
      setDragOffset(clampPx(wheelBase.current + wheelAccum.current));

      // Debounce snap after gesture ends
      clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        const finalOffset = clampPx(wheelBase.current + wheelAccum.current);
        wheelAccum.current = 0;
        snap(finalOffset);
      }, 120);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(wheelTimer.current);
    };
  }, [currentIndex, snap]);

  const offset = dragOffset !== null ? dragOffset : currentIndex * STEP;
  const isAnimating = dragOffset === null;

  return (
    <section id="future-section" className="relative z-10 laptop:-mt-[200vh]">
      {/* Top gradient (desktop only) */}
      <div
        className="hidden laptop:block h-[400px]"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent, black)" }}
      />

      <div className="bg-black overflow-x-clip">
        <div className="py-[var(--spacing-section)]">
          {/* Heading */}
          <div className="mx-auto max-w-[var(--layout-content-max)] px-[var(--space-24)]">
            <h2 className="mx-auto max-w-[870px] text-left type-h1 text-text-primary tablet:text-center">
              Everything your bank can't do
            </h2>
            <p className="mx-auto mt-[var(--space-16)] max-w-[870px] text-left type-body-l text-text-secondary tablet:text-center">
              Automation, invoicing, smart savings, and real-time controls. All in one app built for how you actually work.
            </p>
          </div>

          {/* Carousel — Desktop: drag/wheel controlled */}
          <div
            className="mx-auto mt-[var(--space-56)] hidden max-w-[var(--layout-content-max)] px-[var(--space-24)] overflow-visible select-none tablet:block"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ touchAction: "pan-y" }}
          >
            <div
              ref={trackRef}
              className={isAnimating ? "flex transition-transform duration-500 ease-out" : "flex"}
              style={{
                columnGap: `${GAP}px`,
                transform: `translateX(-${offset}px)`,
                cursor: isDragging.current ? "grabbing" : "grab",
              }}
            >
              {FEATURES.map((feat) => (
                <div
                  key={feat.title}
                  className="shrink-0 pointer-events-none"
                  style={{ width: `min(${CARD_W}px, 55dvh)` }}
                >
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)]">
                    <Image
                      src={feat.image}
                      alt={feat.title}
                      width={686}
                      height={686}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <h3 className="type-h4 text-text-primary mt-[var(--space-40)]">
                    {feat.title}
                  </h3>
                  <p className="type-body-m text-text-secondary mt-[var(--space-8)]">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel — Mobile: horizontal scroll snap, 80% width cards */}
          <div className="mt-[var(--space-56)] flex gap-[var(--space-16)] overflow-x-auto snap-x snap-mandatory scrollbar-hide tablet:hidden" style={{ scrollPaddingInline: "var(--layout-page-gutter)" }}>
            {FEATURES.map((feat, i) => (
              <div
                key={feat.title}
                className={`w-[80vw] shrink-0 snap-start ${i === 0 ? "ml-[var(--layout-page-gutter)]" : ""} ${i === FEATURES.length - 1 ? "mr-[var(--layout-page-gutter)]" : ""}`}
              >
                <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)]">
                  <Image
                    src={feat.image}
                    alt={feat.title}
                    width={686}
                    height={686}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="type-h4 text-text-primary mt-[var(--space-40)]">
                  {feat.title}
                </h3>
                <p className="type-body-m text-text-secondary mt-[var(--space-8)]">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination — desktop only */}
          <div className="mx-auto hidden max-w-[var(--layout-content-max)] px-[var(--space-24)] mt-[var(--space-40)] tablet:flex items-center justify-center gap-[var(--space-16)]">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Previous"
              onClick={() => goTo("left")}
              disabled={currentIndex === 0}
            >
              <ArrowIcon direction="left" />
            </Button>

            <div className="flex h-12 items-center gap-2 rounded-full bg-[rgba(39,39,39,0.64)] backdrop-blur-[7.5px] px-4">
              {Array.from({ length: MAX_INDEX + 1 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => { setDragOffset(null); setCurrentIndex(i); }}
                  className={`h-2 w-2 rounded-full border-0 p-0 cursor-pointer transition-colors hover:bg-white/40 ${
                    i === currentIndex ? "bg-white/60" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="secondary"
              size="icon"
              aria-label="Next"
              onClick={() => goTo("right")}
              disabled={currentIndex === MAX_INDEX}
            >
              <ArrowIcon direction="right" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom gradient: black → transparent (desktop only) — reveals BusinessCTA behind */}
      <div
        className="hidden laptop:block h-[400px]"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, black, transparent)" }}
      />
    </section>
  );
}
