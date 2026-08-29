"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import KoshLogo from "@/components/KoshLogo";
import Button from "@/components/ui/Button";
import PlatformStoreIcon, { IosIcon, AndroidIcon } from "@/components/ui/PlatformStoreIcon";

const menuItems = [
  { label: "USD Account", href: "/usd-account", external: false },
  { label: "Global Card", href: "/global-card", external: false },
  { label: "Payments", href: "/payments", external: false },
] as const;

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-80 shrink-0">
      <path d="M8 10.5L4.5 7L5.55 5.93L7.25 7.63V2H8.75V7.63L10.45 5.93L11.5 7L8 10.5Z" fill="currentColor" />
      <path d="M3 14V11H4.5V12.5H11.5V11H13V14H3Z" fill="currentColor" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-80 shrink-0">
      <path d="M5 3V4.5H3.5V12.5H11.5V11H13V14H2V3H5Z" fill="currentColor" />
      <path d="M7 2H14V9H12.5V4.56L6.78 10.28L5.72 9.22L11.44 3.5H7V2Z" fill="currentColor" />
    </svg>
  );
}

interface HeaderProps {
  transparent?: boolean;
  onCreateAccountClick?: () => void;
}

export default function Header({ transparent = false, onCreateAccountClick }: HeaderProps) {
  const [hoveredMenuLabel, setHoveredMenuLabel] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoDropdownOpen, setLogoDropdownOpen] = useState(false);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const logoDropdownRef = useRef<HTMLDivElement>(null);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!mobileMenuOpen && !logoDropdownOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobileMenu();
        setLogoDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileMenuOpen, logoDropdownOpen, closeMobileMenu]);

  // Close logo dropdown on click outside
  useEffect(() => {
    if (!logoDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (logoDropdownRef.current && !logoDropdownRef.current.contains(e.target as Node)) {
        setLogoDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [logoDropdownOpen]);

  return (
    <header className="relative w-full">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: transparent ? 0 : 1,
          background: "linear-gradient(0deg, var(--color-header-dark-start) 0%, var(--color-header-dark-end) 100%)",
          backdropFilter: transparent ? "none" : "blur(var(--effect-header-blur))",
          WebkitBackdropFilter: transparent ? "none" : "blur(var(--effect-header-blur))",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex h-[80px] w-full max-w-[var(--layout-content-max)] items-center justify-between ds-page-gutter">
        <div ref={logoDropdownRef} className="relative z-10">
          <Link
            href="/"
            aria-label="Kosh Home"
            className="relative z-10 flex h-[28px] w-[98px] shrink-0 items-center laptop:h-[40px] laptop:w-[140px]"
            onContextMenu={(e) => {
              e.preventDefault();
              setLogoDropdownOpen((prev) => !prev);
            }}
          >
            <KoshLogo variant="kosh" tone="light" priority />
          </Link>

          <div
            className={`absolute rounded-[16px] left-0 top-full mt-2 min-w-[200px] p-2 transition-[opacity,transform] duration-200 ${
              logoDropdownOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-1 pointer-events-none"
            }`}
            style={{
              background: "rgba(39, 39, 39, 0.52)",
              backdropFilter: "blur(7.5px)",
              WebkitBackdropFilter: "blur(7.5px)",
            }}
          >
            {/* Gradient border */}
            <span aria-hidden className="glass-border" />
            <a
              href="/logos/kosh/kosh.png"
              download
              className="flex items-center gap-3 p-3 rounded-[8px] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <DownloadIcon />
              <span className="type-body-m text-white/80">Download PNG</span>
            </a>
            <a
              href="/logos/kosh/kosh.svg"
              download
              className="flex items-center gap-3 p-3 rounded-[8px] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <DownloadIcon />
              <span className="type-body-m text-white/80">Download SVG</span>
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-[8px] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <ExternalLinkIcon />
              <span className="type-body-m text-white/80">Media Kit</span>
            </a>
          </div>
        </div>

        <nav
          className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-[var(--space-24)] laptop:flex"
          onMouseLeave={() => setHoveredMenuLabel(null)}
        >
          {menuItems.map((item) => {
            const isAnyMenuHovered = hoveredMenuLabel !== null;
            const isHoveredItem = hoveredMenuLabel === item.label;
            const inactive = "var(--color-header-nav-inactive-light)";
            const active = "var(--color-header-nav-active-light)";
            const labelColor = !isAnyMenuHovered || isHoveredItem ? active : inactive;

            const linkProps = {
              className: "type-action",
              style: { color: labelColor },
              onMouseEnter: () => setHoveredMenuLabel(item.label),
              onFocus: () => setHoveredMenuLabel(item.label),
              onBlur: () => setHoveredMenuLabel(null),
            };

            return item.external ? (
              <a key={item.label} {...linkProps} href={item.href} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} {...linkProps} href={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 flex h-[40px] items-center justify-end gap-[var(--space-8)] laptop:gap-[var(--space-16)]">
          <div
            className="relative"
            onMouseEnter={() => setDownloadDropdownOpen(true)}
            onMouseLeave={() => setDownloadDropdownOpen(false)}
          >
            <Button variant="secondary" iconLeft={<PlatformStoreIcon />} href="#footer">
              <span className="laptop:hidden">Get KOSH</span>
              <span className="hidden laptop:inline">Download App</span>
            </Button>

            {/* Invisible bridge to cover gap between button and dropdown */}
            <div className="absolute right-0 top-full h-3 w-full" />

            <div
              className={`absolute right-0 top-full mt-3 rounded-[12px] p-1.5 transition-[opacity,transform] duration-200 ${
                downloadDropdownOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-1 pointer-events-none"
              }`}
              style={{
                width: "max-content",
                background: "var(--color-button-secondary-dark-bg)",
                backdropFilter: "blur(var(--material-glass-blur))",
                WebkitBackdropFilter: "blur(var(--material-glass-blur))",
              }}
            >
              <span aria-hidden className="glass-border" />
              <a
                href="https://testflight.apple.com/join/qJPVHJKq"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 whitespace-nowrap px-2.5 py-2 rounded-[6px] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <IosIcon className="size-4 shrink-0" />
                <span className="type-micro text-white/80">Download for iOS - Testflight</span>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.koshmoney.app&hl=en_US"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 whitespace-nowrap px-2.5 py-2 rounded-[6px] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <AndroidIcon className="size-4 shrink-0" />
                <span className="type-micro text-white/80">Download for Android Beta</span>
              </a>
            </div>
          </div>
          {onCreateAccountClick ? (
            <Button
              variant="primary"
              className="hidden laptop:inline-flex"
              onClick={onCreateAccountClick}
              data-event="header_create_account"
            >
              Create Account
            </Button>
          ) : (
            <Button
              variant="primary"
              className="hidden laptop:inline-flex"
              href="https://payout.copperx.io/auth/register?utm_source=website&utm_medium=header&utm_campaign=signup"
              data-event="header_create_account"
            >
              Create Account
            </Button>
          )}
          {/* Mobile menu toggle */}
          <Button
            variant="secondary"
            className="laptop:hidden !px-0 !size-[44px] !rounded-full"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {mobileMenuOpen ? (
                <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4Z" fill="currentColor" />
              ) : (
                <path d="M15 18H9V16H15V18ZM18 13H6V11H18V13ZM20 8H4V6H20V8Z" fill="currentColor" />
              )}
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-[200] laptop:hidden transition-opacity duration-300 ${mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" onClick={closeMobileMenu} />

        {/* Glass menu panel */}
        <div
          className={`absolute right-4 top-[88px] w-[calc(100%-32px)] max-w-[360px] rounded-[16px] p-6 transition-all duration-300 ${mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
          style={{
            background: "var(--color-button-secondary-dark-bg)",
            backdropFilter: "blur(var(--material-glass-blur))",
            WebkitBackdropFilter: "blur(var(--material-glass-blur))",
          }}
        >
          {/* Gradient border */}
          <span aria-hidden className="glass-border-strong" />

          <nav className="relative flex flex-col gap-2">
            {menuItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-action rounded-[12px] px-4 py-3 text-white transition-colors hover:bg-white/10"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="type-action rounded-[12px] px-4 py-3 text-white transition-colors hover:bg-white/10"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              )
            )}

            <div className="my-2 h-px bg-white/10" />

            {onCreateAccountClick ? (
              <Button
                variant="primary"
                onClick={() => {
                  closeMobileMenu();
                  onCreateAccountClick();
                }}
                className="w-full justify-center"
                data-event="mobile_menu_create_account"
              >
                Create Account
              </Button>
            ) : (
              <Button
                variant="primary"
                href="https://payout.copperx.io/auth/register?utm_source=website&utm_medium=mobile_menu&utm_campaign=signup"
                className="w-full justify-center"
                data-event="mobile_menu_create_account"
              >
                Create Account
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
