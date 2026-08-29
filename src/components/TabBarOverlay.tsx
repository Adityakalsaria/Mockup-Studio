"use client";

import { useState, useCallback, useEffect } from "react";

// ────────────────────────────────────────────
// Tab bar icon components — matched to Figma node 147:19080
// ────────────────────────────────────────────

const INACTIVE_COLOR = "rgba(255,255,255,0.55)";
const ACTIVE_COLOR = "#3B82F6";

/** KOSH brand logo — actual SVG from Figma (icon/28/kosh-tab) */
function KoshLogoIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 13H20V18C20 19.1046 19.1046 20 18 20H12.6797L8.48047 17H11.9199L13.3203 18H18V15H7V20H2C0.895523 19.9999 3.90663e-05 19.1045 0 18V13H5V2H2V6.55176L3.01562 8H3V11.4619L0 7.18457V2C0 0.895488 0.895514 9.62339e-05 2 0H7V13ZM2 18H5V15H2V18Z"
        fill={color}
      />
      <path
        d="M18 0.00195312C19.1045 0.00195312 19.9999 0.897485 20 2.00195V7.59961L19.4736 7.88184L13.6816 11H9.46094L18 6.4043V2.00195H13.5977L9 10.5371V6.31836L12.4023 0.00195312H18Z"
        fill={color}
      />
    </svg>
  );
}

function BankTabIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;
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

function CardTabIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M2 10h20" stroke={color} strokeWidth="1.5" />
      <path d="M6 16h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GiftTabIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;
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

const TABS = [
  { label: "Wallet", Icon: KoshLogoIcon },
  { label: "Virtual Accounts", Icon: BankTabIcon },
  { label: "Card", Icon: CardTabIcon },
  { label: "Rewards", Icon: GiftTabIcon },
];

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function TabBarOverlay() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleHover = useCallback((index: number) => {
    setActiveIndex(index);
    window.dispatchEvent(
      new CustomEvent("dock-tab-hover", { detail: { index } })
    );
  }, []);

  // Bidirectional sync: listen for hover events from DockShowcase columns
  useEffect(() => {
    const handler = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index;
      if (typeof idx === "number") setActiveIndex(idx);
    };
    window.addEventListener("dock-col-hover", handler);
    return () => window.removeEventListener("dock-col-hover", handler);
  }, []);

  return (
    <div
      data-tab-bar-overlay
      className="absolute z-[3] flex items-center justify-center"
      style={{
        top: "44%",
        left: "12%",
        right: "12%",
        height: "5.5%",
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      {/* ── Apple Liquid Glass pill ── */}
      <div
        className="relative flex h-full w-full items-center justify-around"
        style={{ borderRadius: "296px" }}
      >
        {/* Glass background layers (matching Figma Liquid Glass effect) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: "296px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
            border: "0.5px solid rgba(255,255,255,0.12)",
            boxShadow:
              "inset 0 0.5px 0 0 rgba(255,255,255,0.08), 0 0 0 0.5px rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.25)",
          }}
        />

        {/* Tab buttons */}
        {TABS.map(({ label, Icon }, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={label}
              onMouseEnter={() => handleHover(i)}
              onClick={() => handleHover(i)}
              className="relative z-[1] flex items-center justify-center outline-none"
              style={{
                width: "clamp(36px, 4.5vw, 54px)",
                height: "clamp(36px, 4.5vw, 54px)",
                borderRadius: "100px",
                background: isActive
                  ? "rgba(120, 120, 128, 0.18)"
                  : "transparent",
                transition: `background var(--duration-fast) var(--ease-apple)`,
              }}
              aria-label={label}
            >
              <Icon active={isActive} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
