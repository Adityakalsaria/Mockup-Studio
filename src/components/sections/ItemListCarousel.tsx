"use client";

import { ReactNode, useRef, useState, useCallback, useEffect } from "react";
import Button from "@/components/ui/Button";

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
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ItemListCarouselProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  header?: ReactNode;
  visibleCount?: number;
  gap?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ItemListCarousel<T>({
  items,
  renderItem,
  keyExtractor,
  header,
  visibleCount = 3,
  gap = 16,
  className = "",
}: ItemListCarouselProps<T>) {
  /* Layout constants */
  const CONTAINER = 1436;
  const CARD_W = (CONTAINER - (visibleCount - 1) * gap) / visibleCount;
  const STEP = CARD_W + gap;
  const MAX_INDEX = Math.max(0, items.length - visibleCount);

  /* State */
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);

  const clampIdx = useCallback(
    (v: number) => Math.max(0, Math.min(v, MAX_INDEX)),
    [MAX_INDEX],
  );
  const clampPx = useCallback(
    (v: number) => Math.max(0, Math.min(v, MAX_INDEX * STEP)),
    [MAX_INDEX, STEP],
  );

  /* Snap to nearest card index and clear drag state */
  const snap = useCallback(
    (pxOffset: number) => {
      const idx = clampIdx(Math.round(pxOffset / STEP));
      setCurrentIndex(idx);
      setDragOffset(null);
    },
    [clampIdx, STEP],
  );

  /* Button controls */
  const goTo = useCallback(
    (dir: "left" | "right") => {
      setDragOffset(null);
      setCurrentIndex((prev) => clampIdx(dir === "left" ? prev - 1 : prev + 1));
    },
    [clampIdx],
  );

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
    [currentIndex, STEP],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      setDragOffset(clampPx(dragStartOffset.current + delta));
    },
    [clampPx],
  );

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragOffset !== null) snap(dragOffset);
  }, [dragOffset, snap]);

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

      if (wheelAccum.current === 0) {
        wheelBase.current = currentIndex * STEP;
      }
      wheelAccum.current += dx;

      setDragOffset(clampPx(wheelBase.current + wheelAccum.current));

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
  }, [currentIndex, snap, clampPx, STEP]);

  const offset = dragOffset !== null ? dragOffset : currentIndex * STEP;
  const isAnimating = dragOffset === null;

  return (
    <div className={`overflow-x-clip ${className}`}>
      <div className="py-[var(--spacing-section)]">
        {/* Header slot */}
        {header && (
          <div className="mx-auto max-w-[var(--layout-content-max)] px-[var(--space-24)]">
            {header}
          </div>
        )}

        {/* Desktop: drag/wheel carousel (hidden below tablet) */}
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
            className={
              isAnimating
                ? "flex transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)]"
                : "flex"
            }
            style={{
              columnGap: `${gap}px`,
              transform: `translateX(-${offset}px)`,
              cursor: isDragging.current ? "grabbing" : "grab",
            }}
          >
            {items.map((item, i) => (
              <div
                key={keyExtractor(item)}
                className="shrink-0 pointer-events-none"
                style={{ width: `${CARD_W}px` }}
              >
                {renderItem(item, i)}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: native snap scroll (hidden above tablet) */}
        <div
          className="mt-[var(--space-56)] flex gap-[var(--space-16)] overflow-x-auto snap-x snap-mandatory scrollbar-hide tablet:hidden"
          style={{ scrollPaddingInline: "var(--layout-page-gutter)" }}
        >
          {items.map((item, i) => (
            <div
              key={keyExtractor(item)}
              className={`w-[80vw] shrink-0 snap-start ${i === 0 ? "ml-[var(--layout-page-gutter)]" : ""} ${i === items.length - 1 ? "mr-[var(--layout-page-gutter)]" : ""}`}
            >
              {renderItem(item, i)}
            </div>
          ))}
        </div>

        {/* Pagination: arrows + dots (hidden below tablet) */}
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

          <div className="flex h-[var(--space-48)] items-center gap-[var(--space-8)] rounded-full bg-[var(--color-button-secondary-dark-bg)] backdrop-blur-[7.5px] px-[var(--space-16)]">
            {Array.from({ length: MAX_INDEX + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => {
                  setDragOffset(null);
                  setCurrentIndex(i);
                }}
                className={`size-[var(--space-8)] rounded-full border-0 p-0 cursor-pointer transition-colors ${
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
  );
}
