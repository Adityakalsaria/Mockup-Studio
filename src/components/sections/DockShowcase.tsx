"use client";

import { useState, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

// ────────────────────────────────────────────
// Icon components
// ────────────────────────────────────────────

function WalletIcon({ active }: { active: boolean }) {
  const color = active ? "#3B82F6" : "#525252";
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2" stroke={color} strokeWidth="1.5" />
      <circle cx="17" cy="13" r="1.25" fill={color} />
    </svg>
  );
}

function BankIcon({ active }: { active: boolean }) {
  const color = active ? "#3B82F6" : "#525252";
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21h18M4 21V10m16 11V10M12 3L2 10h20L12 3z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 21v-6h3v6m2 0v-6h3v6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CardIcon({ active }: { active: boolean }) {
  const color = active ? "#3B82F6" : "#525252";
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M2 10h20" stroke={color} strokeWidth="1.5" />
      <path d="M6 16h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GiftIcon({ active }: { active: boolean }) {
  const color = active ? "#3B82F6" : "#525252";
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="13" rx="1" stroke={color} strokeWidth="1.5" />
      <path d="M12 8v13M3 12h18" stroke={color} strokeWidth="1.5" />
      <path
        d="M12 8c-1-3-5-4-5-1s5 1 5 1m0 0c1-3 5-4 5-1s-5 1-5 1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ────────────────────────────────────────────
// Dock item data
// ────────────────────────────────────────────

const DOCK_ITEMS = [
  {
    label: "Wallet",
    description:
      "See your total balance, track recent transactions, and take action in seconds.",
    Icon: WalletIcon,
  },
  {
    label: "Virtual Accounts",
    description:
      "Receive USD transfers via ACH or Wire. Share your details, track incoming payments.",
    Icon: BankIcon,
  },
  {
    label: "Card",
    description:
      "Pay for AI tools, subscriptions, cloud services, and everyday essentials directly with your crypto.",
    Icon: CardIcon,
  },
  {
    label: "Rewards",
    description:
      "See your total balance, track recent transactions, and take action in seconds.",
    Icon: GiftIcon,
  },
];

// ────────────────────────────────────────────
// Connector line geometry
// ────────────────────────────────────────────

// SVG viewBox width matches the design-system content area at xl (1440 - 208*2 = 1024).
// Phone (800px max) is centered: left edge = (1024 - 800) / 2 = 112.
// Nav icons sit at 1/8, 3/8, 5/8, 7/8 of phone width from phone left edge.
const SVG_W = 1024;
const PHONE_LEFT = (SVG_W - 800) / 2;
const ICON_XS = [0, 1, 2, 3].map(
  (i) => PHONE_LEFT + (800 * (2 * i + 1)) / 8
);
// Column centers at 1/8, 3/8, 5/8, 7/8 of content width.
const COL_XS = [0, 1, 2, 3].map((i) => (SVG_W * (2 * i + 1)) / 8);

const SVG_HEIGHT = 100;
const TURN_Y = 40;
const CORNER_R = 16;

function connectorPath(iconX: number, colX: number): string {
  const r = CORNER_R;
  const ty = TURN_Y;

  if (Math.abs(colX - iconX) < r * 2) {
    return `M ${iconX} 0 L ${colX} ${SVG_HEIGHT}`;
  }

  if (colX < iconX) {
    // Column is to the left — L turns left
    return [
      `M ${iconX} 0`,
      `L ${iconX} ${ty - r}`,
      `Q ${iconX} ${ty} ${iconX - r} ${ty}`,
      `L ${colX + r} ${ty}`,
      `Q ${colX} ${ty} ${colX} ${ty + r}`,
      `L ${colX} ${SVG_HEIGHT}`,
    ].join(" ");
  }

  // Column is to the right — L turns right
  return [
    `M ${iconX} 0`,
    `L ${iconX} ${ty - r}`,
    `Q ${iconX} ${ty} ${iconX + r} ${ty}`,
    `L ${colX - r} ${ty}`,
    `Q ${colX} ${ty} ${colX} ${ty + r}`,
    `L ${colX} ${SVG_HEIGHT}`,
  ].join(" ");
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function DockShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync with TabBarOverlay hover events
  useEffect(() => {
    const handler = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index;
      if (typeof idx === "number") setActiveIndex(idx);
    };
    window.addEventListener("dock-tab-hover", handler);
    return () => window.removeEventListener("dock-tab-hover", handler);
  }, []);

  // GSAP scroll-triggered entrance animation
  useGSAP(
    () => {
      if (!contentRef.current) return;

      // Staggered fade-up for feature columns
      gsap.from("[data-dock-col]", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power4.out",
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top 85%",
        },
      });

      // Connector SVG draw-in
      gsap.from("[data-dock-connectors]", {
        opacity: 0,
        duration: 0.6,
        delay: 0.3,
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top 85%",
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="dock-showcase"
      className="relative bg-black"
      style={{
        /* Pull up into the Features section's dead black space (the white-
           space portion of the sequence image, masked by the black gradient).
           This closes the gap so connectors + columns appear right after
           the phone from the CanvasSequence. */
        marginTop: "clamp(-550px, -40vw, -250px)",
        zIndex: 2,
      }}
    >
      {/* ── Connectors + feature columns ── */}
      <div ref={contentRef} className="relative mx-auto max-w-[var(--container-max)] ds-page-gutter">
        {/* SVG connector lines (desktop only) */}
        <div
          className="relative hidden laptop:block"
          data-dock-connectors
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_HEIGHT}`}
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{ height: SVG_HEIGHT }}
          >
            {DOCK_ITEMS.map((_, i) => {
              const d = connectorPath(ICON_XS[i], COL_XS[i]);
              const isActive = activeIndex === i;
              return (
                <g
                  key={i}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transition: `opacity var(--duration-normal) var(--ease-apple)`,
                  }}
                >
                  {/* Dashed gray L-shaped path */}
                  <path
                    d={d}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                  {/* Blue accent at the icon connection point */}
                  <circle cx={ICON_XS[i]} cy={0} r={3.5} fill="var(--color-accent)" />
                  <line
                    x1={ICON_XS[i]}
                    y1={0}
                    x2={ICON_XS[i]}
                    y2={24}
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Feature columns */}
        <div className="grid grid-cols-1 gap-[var(--space-32)] pt-[var(--spacing-md)] pb-[var(--space-96)] tablet:grid-cols-2 laptop:grid-cols-4 laptop:gap-[var(--space-40)] laptop:pt-0">
          {DOCK_ITEMS.map((item, i) => (
            <div
              key={item.label}
              data-dock-col
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => setActiveIndex(i)}
              className="flex cursor-default flex-col gap-[var(--spacing-2xs)]"
            >
              {/* Icon visible on mobile/tablet */}
              <div className="mb-[var(--spacing-2xs)] laptop:hidden">
                <item.Icon active={activeIndex === i} />
              </div>

              <h3
                className="type-h3 transition-colors"
                style={{
                  color: activeIndex === i
                    ? "var(--color-foreground)"
                    : "var(--color-text-muted)",
                  transitionDuration: "var(--duration-fast)",
                }}
              >
                {item.label}
              </h3>
              <p
                className="type-body-m transition-colors"
                style={{
                  color: activeIndex === i
                    ? "var(--color-text-muted)"
                    : "var(--color-border)",
                  transitionDuration: "var(--duration-fast)",
                  fontFeatureSettings: "'lnum' 1, 'pnum' 1",
                }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
