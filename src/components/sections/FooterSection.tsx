"use client";

import React from "react";
import Image from "next/image";
import { useRef, useCallback, useState, useEffect } from "react";
import KoshLogo from "@/components/KoshLogo";
import { useCookieConsent } from "@/providers/CookieConsentProvider";
import GlassCard from "@/components/ui/GlassCard";
import { FeatureIcon } from "@/components/ui/FeatureIcons";
import { BankTabIcon, CardTabIcon, GiftTabIcon, SavingTabIcon, InvestTabIcon } from "@/components/sections/TabExplainer";


/* ─── Data ─── */

const TAB_ICON_MAP: Record<string, React.ComponentType> = {
  bank: BankTabIcon,
  card: CardTabIcon,
  saving: SavingTabIcon,
  invest: InvestTabIcon,
  ai: GiftTabIcon,
};

const OFFERINGS = [
  { icon: "bank", title: "USD Account", desc: "Open USD, EUR & AED accounts with SWIFT", href: "/usd-account" },
  { icon: "card", title: "Global Card", desc: "Earn globally. Spend globally.", href: "/" },
  { icon: "saving", title: "Savings", desc: "Earn up to 4% yield on your savings", href: "/" },
  { icon: "transfer", title: "Send and Receive", desc: "Stablecoin or Fiat, your choice", href: "/" },
  { icon: "invest", title: "Invest", desc: "A simple way to start investing", href: "/" },
  { icon: "ai", title: "Get Rewards", desc: "Earn rewards on every transaction", href: "/" },
] as const;

const TARGET_USERS = ["For Freelancers", "For Individuals", "For Businesses", "For Crypto Holders"];

const NAV_COLUMNS = [
  { heading: "Company", links: [{ label: "About", href: "#" }, { label: "Blog", href: "#" }, { label: "Career", href: "#" }, { label: "Media kit", href: "#" }] },
  { heading: "Program", links: [{ label: "Affiliation", href: "#" }, { label: "Referrals", href: "#" }, { label: "Rewards", href: "/rewards" }] },
  { heading: "Support", links: [{ label: "Helproom", href: "https://support.copperx.io/en/" }, { label: "Contact us", href: "#" }] },
];

const SOCIAL_ICONS = [
  { name: "X", src: "/figma-assets/footer/x.svg", href: "https://x.com/koshmoney" },
  { name: "Telegram", src: "/figma-assets/footer/telegram.svg", href: "https://t.me/+FzdtgOWSelMzNTk1" },
  { name: "YouTube", src: "/figma-assets/footer/youtube.svg", href: "https://www.youtube.com/@kosh_money" },
  { name: "Instagram", src: "/figma-assets/footer/instagram.svg", href: "https://www.instagram.com/koshmoney" },
  { name: "Facebook", src: "/figma-assets/footer/facebook.svg", href: "https://www.facebook.com/koshmoney" },
  { name: "LinkedIn", src: "/figma-assets/footer/linkedin.svg", href: "https://www.linkedin.com/company/koshmoney" },
];

const LEGAL_LINKS = ["Risk Disclosure", "Privacy Policy", "E-Sign Consent", "Terms & Conditions", "Cookie Preferences"];

const GLASS_CARD_CLS = "rounded-[var(--radius-lg)] backdrop-blur-[7.5px] p-[var(--space-32)]";
const FOOTER_CARD_CLS = "rounded-[24px] bg-[rgba(39,39,39,0.52)] backdrop-blur-[7.5px] p-[var(--space-32)]";

/* ─── KOSH path (shared for stroke + clip) ─── */
const KOSH_PATH =
  "M523.018 0.5C549.363 0.500023 573.718 5.15854 596.076 14.4814H596.075C618.424 23.4683 637.776 36.2839 654.127 52.9287L655.68 54.4668C671.612 70.4536 683.941 89.2522 692.668 110.857L693.103 111.904C702.157 133.932 706.681 158.049 706.681 184.251C706.681 210.869 702.012 235.501 692.669 258.141L692.668 258.14C683.66 280.442 670.814 299.919 654.13 316.565C637.778 332.88 618.426 345.697 596.076 355.017L596.07 355.019C573.713 364.008 549.36 368.5 523.018 368.5C496.343 368.5 471.658 364.008 448.969 355.02L448.961 355.017C426.61 345.697 407.091 332.713 390.407 316.067C373.724 299.421 360.712 279.945 351.371 257.645L351.367 257.637C342.358 234.999 337.856 210.535 337.856 184.251C337.856 157.967 342.359 133.668 351.368 111.361L351.371 111.355C360.712 89.0546 373.724 69.5787 390.407 52.9326C407.091 36.2861 426.611 23.4683 448.963 14.4805C471.653 5.15825 496.34 0.5 523.018 0.5ZM910.278 0.5C936.62 0.5 959.816 4.99181 979.855 13.9893C999.894 22.9865 1015.77 35.8226 1027.47 52.501C1039.51 68.855 1046.03 88.3713 1047.03 111.028L1047.05 111.55H970.25L970.176 111.14C968.204 100.322 962.125 90.6263 951.881 82.0537L951.873 82.0479C941.673 73.1844 927.828 68.7256 910.278 68.7256C895.362 68.7256 883.658 71.5377 875.117 77.1094C866.945 82.657 862.866 90.4656 862.866 100.593C862.866 109.761 865.977 116.743 872.158 121.612C878.75 126.543 887.17 130.501 897.435 133.475L951.835 148.413L951.841 148.415C969.175 153.404 985.179 159.891 999.854 167.877C1014.57 175.886 1026.44 187.067 1035.47 201.413C1044.52 215.795 1049.02 235.154 1049.02 259.443C1049.02 281.114 1043.34 300.139 1031.97 316.497C1020.93 332.847 1005.38 345.517 985.346 354.513C965.304 363.511 941.608 368.002 914.271 368.002C886.591 368.002 862.056 362.678 840.683 352.015C819.312 341.353 802.275 326.355 789.581 307.024L789.578 307.02C777.215 287.682 770.373 265.022 769.038 239.053L769.011 238.527H845.852L845.896 238.979C847.547 256.117 854.809 270.611 867.696 282.48C880.575 294.01 896.091 299.776 914.271 299.776C930.842 299.776 944.039 296.304 953.911 289.409C964.105 282.19 969.17 272.876 969.17 261.436C969.17 251.279 965.565 243.294 958.373 237.423L958.363 237.414C951.105 231.16 942.021 226.377 931.096 223.073V223.072L877.207 208.137V208.138C860.202 203.48 844.526 197.158 830.182 189.17L830.174 189.165V189.164C815.797 180.824 804.258 169.646 795.563 155.633C786.849 141.587 782.513 123.394 782.513 101.091C782.513 81.4042 788.033 64.0366 799.079 49.0068C810.116 33.9909 825.159 22.1545 844.192 13.4922L844.195 13.4902C863.567 4.82581 885.598 0.500005 910.278 0.5ZM78.8574 4.4834V147.077L204.75 4.65234L204.899 4.4834H310.064L309.305 5.32031L146.717 184.238L321.271 363.668L322.096 364.517H221.393L221.247 364.375L78.8574 226.472V364.517H0.5V4.4834H78.8574ZM1211.91 4.4834V144.412H1358.14V4.4834H1436.5V364.517H1358.14V212.637H1211.91V364.517H1133.55V4.4834H1211.91ZM522.519 68.7256C501.977 68.7256 483.773 73.8472 467.89 84.082L467.888 84.084C452.33 93.9922 440.079 107.7 431.133 125.221L431.131 125.224C422.189 142.406 417.712 162.077 417.712 184.251C417.712 206.423 422.189 226.261 431.131 243.776L431.979 245.377C440.845 261.819 452.816 274.997 467.894 284.92C483.775 294.821 501.978 299.776 522.519 299.776C542.729 299.776 560.6 294.819 576.15 284.916C592.045 274.673 604.463 260.963 613.407 243.776C622.349 226.261 626.826 206.423 626.826 184.251C626.826 162.077 622.349 142.406 613.407 125.224L613.405 125.221C604.461 107.703 592.044 93.9948 576.154 84.0859L576.145 84.0801C560.595 73.8471 542.725 68.7256 522.519 68.7256Z";

function KoshWatermark() {
  const svgRef = useRef<SVGSVGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const rafRef = useRef<number>(0);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!svgRef.current || !glowRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!svgRef.current || !glowRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 1437;
      const y = ((clientY - rect.top) / rect.height) * 369;
      glowRef.current.setAttribute("cx", String(x));
      glowRef.current.setAttribute("cy", String(y));
      glowRef.current.style.opacity = "1";
    });
  }, []);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (!glowRef.current) return;
    glowRef.current.style.opacity = "0";
  }, []);

  return (
    <div
      className="layout-content ds-page-gutter pt-[var(--spacing-section)] overflow-hidden"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <svg
        ref={svgRef}
        width="1437"
        height="369"
        viewBox="0 0 1437 369"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="kosh-stroke-grad" x1="865.951" y1="367.534" x2="870.93" y2="0.97" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0" />
            <stop offset="1" stopColor="white" stopOpacity="0.28" />
          </linearGradient>
          <clipPath id="kosh-clip">
            <path d={KOSH_PATH} />
          </clipPath>
          <radialGradient id="kosh-glow" cx="0.5" cy="0.5" r="0.5" gradientUnits="objectBoundingBox">
            <stop stopColor="white" stopOpacity="0.15" />
            <stop offset="0.6" stopColor="white" stopOpacity="0.04" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Glow clipped inside KOSH letters */}
        <g clipPath="url(#kosh-clip)">
          <circle
            ref={glowRef}
            r="250"
            fill="url(#kosh-glow)"
            style={{ opacity: 0, transition: "opacity 0.3s ease" }}
          />
        </g>

        {/* Stroke outline */}
        <path d={KOSH_PATH} stroke="url(#kosh-stroke-grad)" />
      </svg>
    </div>
  );
}

/* ─── Component ─── */

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
] as const;

function LanguageSelector() {
  const [lang, setLang] = useState("en");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kosh-language");
    if (stored) setLang(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const currentLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? "English";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="type-micro text-text-muted transition-colors hover:text-white/60 flex items-center gap-[6px] cursor-pointer"
        aria-expanded={open}
        aria-label="Select language"
      >
        <Image src="/globe.svg" alt="" width={14} height={14} className="opacity-60" />
        {currentLabel}
      </button>

      <div
        className={`absolute rounded-[16px] bottom-full mb-2 left-0 min-w-[160px] p-1.5 transition-[opacity,transform] duration-200 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-1 pointer-events-none"
        }`}
        style={{
          background: "rgba(39, 39, 39, 0.52)",
          backdropFilter: "blur(7.5px)",
          WebkitBackdropFilter: "blur(7.5px)",
        }}
      >
        {/* Gradient border */}
        <span aria-hidden className="glass-border" />
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => {
              setLang(l.code);
              localStorage.setItem("kosh-language", l.code);
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-[6px] type-micro transition-colors cursor-pointer ${
              lang === l.code ? "text-white bg-white/[0.08]" : "text-white/70 hover:bg-white/[0.06]"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CookiePreferencesButton() {
  const { requestShowBanner } = useCookieConsent();
  return (
    <button
      onClick={requestShowBanner}
      className="type-micro text-text-muted transition-colors hover:text-white/60"
    >
      Cookie Preferences
    </button>
  );
}

export default function FooterSection() {
  return (
    <footer id="footer" aria-label="Footer" className="relative w-full bg-black overflow-hidden">
      {/* ── Zone 1: Download App CTA ── */}
      <div className="layout-content ds-page-gutter py-[var(--spacing-section)]">
        <div className="flex flex-col items-center text-center">
          {/* Pillars video with bottom fade */}
          <div className="relative mx-auto h-[400px] w-[400px] overflow-hidden mb-[var(--space-32)]">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="h-[400px] w-[400px] scale-[1.3] object-contain"
            >
              <source src="/figma-assets/final-cta/cta-preview-optimized.mp4" type="video/mp4" />
            </video>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[65%]"
              style={{
                background: "linear-gradient(to top, #000000 0%, #000000 20%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.4) 70%, transparent 100%)",
              }}
            />
          </div>

            <h2 className="type-h1 text-text-primary">
              The global financial account
              <br />
              <span className="text-text-muted">Download KOSH</span>
            </h2>

            {/* Store badges */}
            <div className="flex items-center gap-[12px] mt-[var(--space-32)]">
              <a href="https://testflight.apple.com/join/qJPVHJKq" target="_blank" rel="noopener noreferrer" aria-label="Download on the App Store" data-event="footer_download_appstore">
                <Image
                  src="/figma-assets/footer/Appstore.svg"
                  alt="App Store"
                  width={120}
                  height={40}
                />
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.koshmoney.app&hl=en_US" target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play" data-event="footer_download_playstore">
                <Image
                  src="/figma-assets/footer/Playstore.svg"
                  alt="Google Play"
                  width={120}
                  height={40}
                />
              </a>
            </div>
          </div>
        </div>
      {/* ── Zone 2: Offering Cards ── */}
      <div className="layout-content ds-page-gutter">
        <div className="grid grid-cols-2 tablet:grid-cols-3 laptop:grid-cols-6 gap-[var(--space-4)]">
          {OFFERINGS.map((o) => (
            <a
              key={o.title}
              href={o.href}
              data-event={`footer_offering_${o.title.toLowerCase().replace(/\s+/g, "_")}`}
              className="group block"
            >
              <div
                className={`${FOOTER_CARD_CLS} relative h-full flex flex-col overflow-hidden transition-colors duration-200 group-hover:bg-[rgba(56,56,56,0.72)]`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 32%, transparent 64%)",
                  }}
                />
                <div className="relative">
                  {TAB_ICON_MAP[o.icon] ? React.createElement(TAB_ICON_MAP[o.icon]) : <FeatureIcon name={o.icon} />}
                </div>
                <div className="relative mt-[var(--space-40)]">
                  <p className="type-action text-text-primary">{o.title}</p>
                  <p className="type-body-m text-text-muted mt-[var(--space-8)]">{o.desc}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Zone 3: Navigation Stack ── */}
      <div className="layout-content ds-page-gutter mt-[var(--space-4)]">
        <div className="flex flex-col gap-[var(--space-4)] desktop:flex-row">
          {/* Left — Target users */}
          <div className="flex-1 py-[var(--space-32)] desktop:max-w-[716px]">
            <div className="flex flex-col gap-[var(--space-16)]">
              {TARGET_USERS.map((user) => (
                <a key={user} href="#" className="type-h4 text-text-primary transition-opacity hover:opacity-70">
                  {user}
                </a>
              ))}
            </div>
          </div>

          {/* Right — Nav columns */}
          <div className="flex flex-col gap-[var(--space-4)] tablet:flex-row tablet:flex-1">
            {NAV_COLUMNS.map((col) => (
              <div key={col.heading} className="rounded-[var(--radius-lg)] py-[var(--space-32)] px-0 tablet:p-[var(--space-32)] flex-1 flex flex-col gap-[var(--space-20)]">
                <p className="type-action text-text-primary">{col.heading}</p>
                <ul className="flex flex-col gap-[14px]">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="type-body-m text-text-muted transition-colors hover:text-white/60"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Zone 4: Logo + Social Icons Row ── */}
      <div className="layout-content ds-page-gutter py-[var(--space-32)]">
        <div className="flex flex-col gap-[var(--space-24)] tablet:flex-row tablet:items-center tablet:justify-between">
          <div className="hidden tablet:flex items-center gap-[var(--space-24)]">
            <KoshLogo color="#ffffff" />
            <LanguageSelector />
          </div>
          <div className="flex items-center gap-[25px]">
            {SOCIAL_ICONS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                aria-label={s.name}
                className="transition-opacity hover:opacity-70"
                {...(s.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <Image src={s.src} alt={s.name} width={24} height={24} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Zone 5: KOSH Watermark with hover glow ── */}
      <KoshWatermark />

      {/* ── Zone 6: Footer Note / Legal ── */}
      <div className="layout-content ds-page-gutter pb-[var(--spacing-section)] mt-[var(--space-32)]">
        <div className="flex flex-col gap-[29px]">
          {/* Top row */}
          <div className="flex flex-col gap-[var(--space-16)] tablet:flex-row tablet:items-center tablet:justify-between">
            <div className="flex items-center gap-[16px]">
              <p className="type-micro text-text-muted">&copy; {new Date().getFullYear()} KOSH</p>
            </div>
            <div className="flex flex-wrap items-center gap-[21px]">
              {LEGAL_LINKS.map((link) =>
                link === "Cookie Preferences" ? (
                  <CookiePreferencesButton key={link} />
                ) : (
                  <a key={link} href="#" className="type-micro text-text-muted transition-colors hover:text-white/60">
                    {link}
                  </a>
                )
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="type-micro text-text-muted leading-relaxed">
            Piers Technology Inc is a financial technology company, not a bank or a money services business. Certain services are provided by our licensed partners across the globe. By creating your account on KOSH, you agree to our terms and conditions, our partners&apos; terms, to all applicable laws and regulations, and agree that you are responsible for compliance with any and all applicable local laws.
          </p>
        </div>
      </div>
    </footer>
  );
}
