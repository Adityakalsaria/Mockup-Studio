"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toCanvas, toJpeg, toPng } from "html-to-image";
import { HexColorPicker } from "react-colorful";
import PhoneStage3D from "./PhoneStage3D";
import type { StageCapture } from "./PhoneStage3D";
import { useScreenTexture } from "./useScreenTexture";
import {
  BLUR_MODES,
  DEFAULT_BLUR,
  applyMode,
  type BlurMode,
  type BlurSettings,
} from "./blurStyles";
import { CAMERA_PRESETS } from "./cameraPresets";
import { createShot, shotToState, type Shot } from "./shots";
import ShotStrip from "./ShotStrip";

// The size the screen React tree is authored against. Kept in step with
// SCREEN_NATIVE_* in PhoneStage3D — the texture is rasterised at this size and
// then mapped onto whatever the model's screen mesh actually measures.
const SCREEN_TEXTURE_WIDTH = 402;
const SCREEN_TEXTURE_HEIGHT = 874;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function compositeWebGLOntoBase(
  exportNode: HTMLElement,
  baseDataUrl: string,
  webgl: { dataUrl: string; rect: DOMRect },
): Promise<string | null> {
  try {
    const baseImg = await loadImage(baseDataUrl);
    const webglImg = await loadImage(webgl.dataUrl);
    const baseRect = exportNode.getBoundingClientRect();
    if (baseRect.width === 0 || baseRect.height === 0) return null;
    const pixelRatio = baseImg.width / baseRect.width;

    const canvas = document.createElement("canvas");
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(baseImg, 0, 0);

    const dx = (webgl.rect.left - baseRect.left) * pixelRatio;
    const dy = (webgl.rect.top - baseRect.top) * pixelRatio;
    const dw = webgl.rect.width * pixelRatio;
    const dh = webgl.rect.height * pixelRatio;
    ctx.drawImage(webglImg, dx, dy, dw, dh);

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to composite WebGL snapshot", error);
    return null;
  }
}

import KoshLogo from "@/components/KoshLogo";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { DEFAULT_FLOW_ID, FLOW_GROUPS, SCREEN_PRESETS } from "./config";
import AccountProfileScreen, {
  type Transaction,
  type TransactionStatus,
} from "./screens/AccountProfileScreen";
import AccountSetupScreen from "./screens/AccountSetupScreen";
import BankSelectionScreen, {
  type BankSelectionVariantId,
} from "./screens/BankSelectionScreen";
import CardScreen from "./screens/CardScreen";

const TRANSACTION_TITLE_POOL = [
  "From IXY Agency",
  "From Stripe Inc.",
  "From STEAVE KONI",
  "Wire from MERCURY LLC",
  "ACME Vendor refund",
  "From Daria K.",
  "From CLOUDPATH",
  "From Notion Labs",
  "From KONSTANTIN P.",
  "Card payment",
  "From Vercel",
  "Refund from Linear",
  "Apple Pay payout",
  "From Riya Malhotra",
  "From Daniel Mercer",
  "Wire from BlueRock LLC",
  "From Jin Oh",
  "From Maria Santos",
  "From OpenAI",
  "Stripe payout",
  "From Anthropic",
  "Refund from Replit",
  "From Luciana M.",
  "From Aditya Kalsaria",
  "Wire from NOVA Capital",
  "From Figma",
  "From GitHub",
  "From CHASE BANK",
  "Refund from Amazon",
  "From Patreon",
];

function pickRandom<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)] as T;
}

function randomStatus(): TransactionStatus {
  const r = Math.random();
  if (r < 0.72) return "success";
  return "pending";
}

function randomAmount(): string {
  const dollars = 5 + Math.floor(Math.random() * 11995);
  const r = Math.random();
  const cents = r < 0.5 ? "00" : r < 0.85 ? "50" : String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${dollars}.${cents}`;
}

function randomDateString(index: number): string {
  // Step backwards in time by 2..6 days per index from the latest tx,
  // anchored loosely at late 2026 so the list reads chronologically.
  const totalDaysBack = index * (2 + Math.floor(Math.random() * 5));
  const month = Math.max(1, 12 - Math.floor(totalDaysBack / 28));
  const day = Math.max(1, 28 - (totalDaysBack % 28));
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function generateTransactions(count = 10): Transaction[] {
  const usedTitles = new Set<string>();
  const list: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    let title = pickRandom(TRANSACTION_TITLE_POOL);
    let attempts = 0;
    while (usedTitles.has(title) && attempts < 8) {
      title = pickRandom(TRANSACTION_TITLE_POOL);
      attempts++;
    }
    usedTitles.add(title);
    list.push({
      id: `tx-${i}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      date: randomDateString(i),
      amount: randomAmount(),
      status: randomStatus(),
    });
  }
  return list;
}

const DEFAULT_ACCOUNT_TRANSACTION_COUNT = 28;

const CARD_TRANSACTION_TITLE_POOL = [
  "Netflix",
  "Spotify Premium",
  "Apple Music",
  "Disney+",
  "YouTube Premium",
  "Adobe Creative Cloud",
  "Notion Workspace",
  "Figma Professional",
  "GitHub Copilot",
  "Linear",
  "Vercel Pro",
  "ChatGPT Plus",
  "Claude Pro",
  "Cursor IDE",
  "Slack",
  "Zoom Pro",
  "Dropbox Plus",
  "Google One",
  "iCloud+",
  "1Password",
  "Raycast Pro",
  "Starbucks",
  "Chipotle",
  "Whole Foods",
  "Trader Joe's",
  "Sweetgreen",
  "Uber Eats",
  "DoorDash",
  "Amazon",
  "Walmart",
  "Target",
  "CVS Pharmacy",
  "Uber",
  "Lyft",
  "Shell Gas",
  "Costco",
  "Domino's Pizza",
  "Apple Store",
  "Best Buy",
  "Local Cafe",
];

function randomCardAmount(): string {
  const dollars = Math.floor(Math.random() * 101);
  const r = Math.random();
  const cents =
    r < 0.35
      ? "99"
      : r < 0.55
        ? "00"
        : r < 0.75
          ? "49"
          : String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${dollars}.${cents}`;
}

function generateCardTransactions(count = 10): Transaction[] {
  const usedTitles = new Set<string>();
  const list: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    let title = pickRandom(CARD_TRANSACTION_TITLE_POOL);
    let attempts = 0;
    while (usedTitles.has(title) && attempts < 8) {
      title = pickRandom(CARD_TRANSACTION_TITLE_POOL);
      attempts++;
    }
    usedTitles.add(title);
    list.push({
      id: `card-tx-${i}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      date: randomDateString(i),
      amount: randomCardAmount(),
      status: randomStatus(),
    });
  }
  return list;
}

const DEFAULT_CARD_TRANSACTIONS: Transaction[] = [
  { id: "card-netflix", title: "Netflix", date: "2026-11-04 11:45", amount: "15.99", status: "success" },
  { id: "card-spotify", title: "Spotify Premium", date: "2026-08-04 14:30", amount: "9.99", status: "success" },
  { id: "card-starbucks", title: "Starbucks", date: "2026-08-02 09:12", amount: "6.75", status: "success" },
  { id: "card-uber-eats", title: "Uber Eats", date: "2026-07-30 18:04", amount: "32.50", status: "success" },
  { id: "card-amazon", title: "Amazon", date: "2026-07-25 11:08", amount: "47.99", status: "success" },
  { id: "card-figma", title: "Figma Professional", date: "2026-07-20 15:22", amount: "15.00", status: "pending" },
  { id: "card-chipotle", title: "Chipotle", date: "2026-07-18 06:30", amount: "12.45", status: "success" },
  { id: "card-github", title: "GitHub Copilot", date: "2026-07-12 13:55", amount: "10.00", status: "success" },
];

const SCREEN_NATIVE_WIDTH = 402;
const SCREEN_NATIVE_HEIGHT = 874;
const LOCKED_SCREEN_MASK_SCALE = 1.02;
const LOCKED_SCREEN_MASK_CORNER_RADIUS = 30;

const RAIL_PREVIEW_BLACK = "/figma-assets/mockup-studio/rails/black.png";
const RAIL_PREVIEW_COSMIC_ORANGE = "/figma-assets/mockup-studio/rails/cosmic-orange.png";

const RAIL_OPTIONS = [
  {
    id: "black",
    label: "Black",
    previewSrc: RAIL_PREVIEW_BLACK,
    previewLayout: {
      width: 450,
      height: 920,
      left: -24,
      top: -23,
    },
    screenBounds: {
      leftPct: 5.333,
      topPct: 2.5,
      widthPct: 89.333,
      heightPct: 95.0,
    },
    screenInset: {
      x: 1.4,
      y: 1.8,
    },
  },
  {
    id: "cosmic-orange",
    label: "Cosmic orange",
    previewSrc: RAIL_PREVIEW_COSMIC_ORANGE,
    previewLayout: {
      width: 450,
      height: 920,
      left: -24,
      top: -23,
    },
    screenBounds: {
      leftPct: 5.333,
      topPct: 2.5,
      widthPct: 89.333,
      heightPct: 95.0,
    },
    screenInset: {
      x: 1.4,
      y: 1.8,
    },
  },
] as const;

const PHONE_SIZE_OPTIONS = [
  { id: "small", label: "Small", heightPct: 55 },
  { id: "medium", label: "Medium", heightPct: 75 },
  { id: "large", label: "Large", heightPct: 95 },
] as const;

const CANVAS_BACKGROUND_OPTIONS = [
  {
    id: "solid",
    label: "Solid color",
    description: "Clean single-tone backdrop",
  },
  {
    id: "dots",
    label: "Grey dots",
    description: "Subtle dotted texture on charcoal",
  },
  {
    id: "gradient",
    label: "Linear gradient",
    description: "Top-to-bottom two-tone gradient",
  },
  {
    id: "custom",
    label: "Custom image",
    description: "Upload a background from your device",
  },
] as const;

const BACKGROUND_THUMB_GAP = 14;
const BACKGROUND_THUMB_RADIUS = 12;
const SOLID_COLOR_SLIDER_GRADIENT =
  "linear-gradient(90deg, hsl(0 92% 58%) 0%, hsl(30 92% 58%) 8%, hsl(60 92% 58%) 16%, hsl(90 92% 48%) 24%, hsl(120 92% 46%) 32%, hsl(150 92% 48%) 40%, hsl(180 92% 48%) 48%, hsl(210 92% 58%) 56%, hsl(240 92% 62%) 64%, hsl(270 92% 64%) 72%, hsl(300 92% 64%) 84%, hsl(330 92% 62%) 92%, hsl(360 92% 58%) 100%)";
const GRAYSCALE_SLIDER_GRADIENT =
  "linear-gradient(90deg, rgb(12,12,12) 0%, rgb(255,255,255) 100%)";
const DEFAULT_SOLID_BACKGROUND_HUE = 18;
const DEFAULT_SOLID_BACKGROUND_GRAYSCALE = 68;

// Preset corner-radius levels — span sharp → fully pill-shaped at the extremes
// (200px ≈ half the 402px screen width, so the long edges go round).
const CORNER_RADIUS_LEVELS = [0, 12, 22, 34, 44, 55, 72, 96, 128, 200] as const;

// Locked scroll-edge-effect dimensions — tuned so the progressive blur
// blends cleanly past the screen's squircle corners. Hidden from the panel.
const LOCKED_TOP_EDGE_HEIGHT = 140;
const LOCKED_TOP_EDGE_OFFSET = -30;
const LOCKED_BOTTOM_EDGE_HEIGHT = 140;
const LOCKED_BOTTOM_EDGE_OFFSET = -30;

const FIXED_BLUR_RADIUS = 20;


const ACCOUNT_VARIANTS = {
  usd: {
    id: "usd",
    label: "USD",
    title: "Virtual USD account",
    description: "This account is only to receive ACH and Wire payments",
    flagSrc: "/figma-assets/usd-account-list/us-flag.svg",
    artworkSrc: "/figma-assets/mockup-studio/account-profile/icons/franklin.png",
    bankAddress: "1801 Main St., Kansas City, MO 64108",
  },
  eur: {
    id: "eur",
    label: "EUR",
    title: "Virtual EUR account",
    description: "This account is only to receive SEPA and Wire payments",
    flagSrc: "/figma-assets/usd-account-list/eur-flag.svg",
    artworkSrc: "/figma-assets/mockup-studio/account-profile/eur-header-artwork-v3.png",
    bankAddress: "2 Grand Canal Square, Dublin D02 A342, Ireland",
  },
  aed: {
    id: "aed",
    label: "AED",
    title: "Virtual AED account",
    description: "This account is only to receive UAE local transfers",
    flagSrc: "/figma-assets/usd-account-list/aed-flag.svg",
    artworkSrc: "/figma-assets/mockup-studio/account-profile/aed-header-artwork.png",
    bankAddress: "Sheikh Zayed Road, Trade Centre, Dubai, UAE",
  },
  gbp: {
    id: "gbp",
    label: "GBP",
    title: "Virtual GBP account",
    description: "This account is only to receive Faster Payments and CHAPS",
    flagSrc: "/figma-assets/usd-account-list/gbp-flag.svg",
    artworkSrc: "/figma-assets/mockup-studio/account-profile/gbp-header-artwork-v2.png",
    bankAddress: "1 Churchill Place, Canary Wharf, London E14 5HP, UK",
  },
  swift: {
    id: "swift",
    label: "SWIFT",
    title: "Virtual SWIFT account",
    description: "This account is only to receive international SWIFT payments",
    flagSrc: "/figma-assets/usd-account-list/swift-flag.svg",
    artworkSrc: "/figma-assets/mockup-studio/account-profile/franklin.png",
    bankAddress: "25 Cabot Square, Canary Wharf, London E14 4QA, UK",
  },
} as const;

const ACCOUNT_FIELD_PRESETS = {
  usd: [
    { accountNumber: "217822907921", routingNumber: "101019203", accountName: "Aditya kalsaria" },
    { accountNumber: "541982364110", routingNumber: "092442118", accountName: "Riya Malhotra" },
    { accountNumber: "884270136592", routingNumber: "064109887", accountName: "Daniel Mercer" },
  ],
  eur: [
    { accountNumber: "778214560903", routingNumber: "101901244", accountName: "Luca Moretti" },
    { accountNumber: "662540198734", routingNumber: "204412088", accountName: "Amelie Laurent" },
    { accountNumber: "905621347880", routingNumber: "330821104", accountName: "Jonas Richter" },
  ],
  aed: [
    { accountNumber: "044302187655", routingNumber: "AEABDH00102", accountName: "Sara Al Mansoori" },
    { accountNumber: "088714220301", routingNumber: "AEEMI00229", accountName: "Khalid Al Maktoum" },
    { accountNumber: "012365879431", routingNumber: "AENBKD00088", accountName: "Mariam Al Hashimi" },
  ],
  gbp: [
    { accountNumber: "20143788", routingNumber: "20-00-00", accountName: "Oliver Bennett" },
    { accountNumber: "44091234", routingNumber: "12-08-66", accountName: "Charlotte Hughes" },
    { accountNumber: "70512288", routingNumber: "60-83-71", accountName: "James Whitfield" },
  ],
  swift: [
    { accountNumber: "BE71096123456769", routingNumber: "KOSHGB22XXX", accountName: "Aditya kalsaria" },
    { accountNumber: "DE89370400440532013000", routingNumber: "KOSHDEFFXXX", accountName: "Aanya Verma" },
    { accountNumber: "GB29NWBK60161331926819", routingNumber: "KOSHGB22XXX", accountName: "Diego Ramos" },
  ],
} as const;

function SceneTree({
  selectedFlowId,
  onSelectFlow,
  customScreenSrc,
  onCustomScreenUpload,
  onClearCustomScreen,
  onSelectPreset,
}: {
  selectedFlowId: string;
  onSelectFlow: (id: string) => void;
  customScreenSrc: string | null;
  onCustomScreenUpload: (file: File) => void;
  onClearCustomScreen: () => void;
  onSelectPreset: (src: string) => void;
}) {
  return (
    <GlassCard
      disableInteractionGlow
      className="h-full w-full shrink-0 rounded-[16px] bg-[#141414]"
      contentClassName="h-full"
    >
      <div className="flex h-full flex-col px-[var(--space-16)] py-[var(--space-20)]">
        <div className="flex items-center px-[8px] pb-[var(--space-32)]">
          <KoshLogo tone="light" width={120} height={28} priority />
        </div>
        <nav
          aria-label="Flows"
          data-lenis-prevent
          className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto"
        >
          {FLOW_GROUPS.flatMap((group) => group.items).map((item) => {
            const isActive = selectedFlowId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectFlow(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center rounded-[8px] px-[var(--space-8)] py-[8px] text-left outline-none transition-colors focus:outline-none focus-visible:outline-none ${
                  isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                }`}
              >
                <span
                  className={`text-[13px] font-medium leading-[20px] tracking-[-0.05px] ${
                    isActive ? "text-white" : "text-white/55"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
          {SCREEN_PRESETS.length > 0 ? (
            <div className="flex flex-col gap-[var(--space-8)]">
              <p className="px-[var(--space-8)] pb-[2px] text-[11px] font-semibold uppercase leading-[14px] tracking-[0.6px] text-white/40">
                Presets
              </p>
              <div className="grid grid-cols-3 gap-[var(--space-8)] px-[var(--space-8)]">
                {SCREEN_PRESETS.map((preset) => {
                  const isSelected = customScreenSrc === preset.src;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset.src)}
                      aria-label={preset.label}
                      aria-pressed={isSelected}
                      className={`relative aspect-square w-full overflow-hidden rounded-[10px] border outline-none transition-colors ${
                        isSelected
                          ? "border-white/60"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.src}
                        alt=""
                        className="pointer-events-none h-full w-full select-none object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-[var(--space-8)]">
            <p className="px-[var(--space-8)] pb-[2px] text-[11px] font-semibold uppercase leading-[14px] tracking-[0.6px] text-white/40">
              Custom screen
            </p>
            {customScreenSrc ? (
              <div className="flex items-center gap-[var(--space-8)] rounded-[10px] border border-white/10 bg-white/[0.04] p-[var(--space-8)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customScreenSrc}
                  alt=""
                  className="h-[40px] w-[40px] shrink-0 rounded-[6px] object-cover"
                />
                <div className="min-w-0 flex-1" />
                <button
                  type="button"
                  onClick={onClearCustomScreen}
                  className="shrink-0 rounded-[8px] bg-white/[0.06] px-[var(--space-8)] py-[6px] text-[12px] font-medium leading-[16px] text-white/70 outline-none transition-colors hover:bg-white/[0.10]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex h-[36px] w-full cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-white/15 bg-white/[0.02] text-[13px] font-medium leading-[20px] text-white/70 outline-none transition-colors hover:border-white/25 hover:bg-white/[0.04]">
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    onCustomScreenUpload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </nav>
      </div>
    </GlassCard>
  );
}

type RailId = (typeof RAIL_OPTIONS)[number]["id"];
type RailOption = (typeof RAIL_OPTIONS)[number];
type SizeId = (typeof PHONE_SIZE_OPTIONS)[number]["id"];
type AccountVariantId = keyof typeof ACCOUNT_VARIANTS;
type CanvasBackgroundId = (typeof CANVAS_BACKGROUND_OPTIONS)[number]["id"];
type ControlsView = "edit" | "backgrounds";
type SolidBackgroundMode = "spectrum" | "grayscale" | "hex";

const CANVAS_ALIGNMENT_VALUES = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
] as const;
type CanvasAlignment = (typeof CANVAS_ALIGNMENT_VALUES)[number];

const CANVAS_ASPECT_RATIO_OPTIONS = [
  { id: "fit", label: "Fit", ratio: null as number | null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
] as const;
type CanvasAspectRatio = (typeof CANVAS_ASPECT_RATIO_OPTIONS)[number]["id"];

const DOWNLOAD_FORMAT_OPTIONS = [
  { id: "png", label: "PNG", mime: "image/png", extension: "png" },
  { id: "jpg", label: "JPG", mime: "image/jpeg", extension: "jpg" },
  { id: "webp", label: "WebP", mime: "image/webp", extension: "webp" },
] as const;
type DownloadFormat = (typeof DOWNLOAD_FORMAT_OPTIONS)[number]["id"];

function alignmentToFlexClasses(alignment: CanvasAlignment) {
  const [vertical, horizontal] = alignment.split("-") as [
    "top" | "middle" | "bottom",
    "left" | "center" | "right",
  ];
  const items =
    vertical === "top" ? "items-start" : vertical === "bottom" ? "items-end" : "items-center";
  const justify =
    horizontal === "left"
      ? "justify-start"
      : horizontal === "right"
        ? "justify-end"
        : "justify-center";
  return `${items} ${justify}`;
}

function solidBackgroundColorFromHue(hue: number) {
  return `hsl(${Math.min(360, Math.max(0, hue))} 92% 58%)`;
}

function solidBackgroundColorFromGrayscale(value: number) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const channel = Math.round((clampedValue / 100) * 255);
  return `rgb(${channel}, ${channel}, ${channel})`;
}

const DEFAULT_SOLID_BACKGROUND_HEX = "#0A0A0A";
const EDIT_FIXED_BACKGROUND_COLOR = "#0A0A0A";
const DEFAULT_DOTS_BACKGROUND_COLOR = "#111111";
const DEFAULT_DOTS_COLOR = "#383838";
const DEFAULT_GRADIENT_TOP_COLOR = "#1A1A1A";
const DEFAULT_GRADIENT_BOTTOM_COLOR = "#050505";

const SHADOW_DIRECTIONS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "off",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
type ShadowDirection = (typeof SHADOW_DIRECTIONS)[number];
const SHADOW_OFFSET = 24;
const SHADOW_BLUR = 30;
const SHADOW_COLOR = "rgba(0,0,0,0.95)";

function shadowOffsetFor(direction: ShadowDirection): { ox: number; oy: number } | null {
  if (direction === "off") return null;
  const [vertical, horizontal] = direction.split("-") as [
    "top" | "middle" | "bottom",
    "left" | "center" | "right",
  ];
  const ox = horizontal === "left" ? -SHADOW_OFFSET : horizontal === "right" ? SHADOW_OFFSET : 0;
  const oy = vertical === "top" ? -SHADOW_OFFSET : vertical === "bottom" ? SHADOW_OFFSET : 0;
  return { ox, oy };
}

function shadowFilterValueFor(direction: ShadowDirection): string | undefined {
  const offset = shadowOffsetFor(direction);
  if (!offset) return undefined;
  return `brightness(0) drop-shadow(${offset.ox}px ${offset.oy}px ${SHADOW_BLUR}px ${SHADOW_COLOR}) drop-shadow(${offset.ox / 2}px ${offset.oy / 2}px ${SHADOW_BLUR / 2}px ${SHADOW_COLOR})`;
}

function shadowBoxValueFor(direction: ShadowDirection): string | undefined {
  const offset = shadowOffsetFor(direction);
  if (!offset) return undefined;
  return `${offset.ox}px ${offset.oy}px ${SHADOW_BLUR}px -8px ${SHADOW_COLOR}`;
}

const WATERMARK_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "off",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];
const WATERMARK_INSET = 64;

function normalizeHexInput(raw: string) {
  return raw.trim().replace(/^#/, "").toUpperCase();
}

function isValidHexBody(body: string) {
  return /^[0-9A-F]{6}$/.test(body) || /^[0-9A-F]{3}$/.test(body);
}

function expandHexBody(body: string) {
  if (body.length === 3) {
    return body
      .split("")
      .map((ch) => `${ch}${ch}`)
      .join("");
  }
  return body;
}

function solidBackgroundColorFromHex(hex: string) {
  const body = normalizeHexInput(hex);
  if (!isValidHexBody(body)) return DEFAULT_SOLID_BACKGROUND_HEX;
  return `#${expandHexBody(body)}`;
}

const FLOW_EDIT_OPTIONS: Record<
  string,
  {
    showRandomizeFields: boolean;
    showRandomizeTransactions: boolean;
    showAccountVariantPicker: boolean;
    showCardTransactionsToggle: boolean;
  }
> = {
  "virtual-account-profile-page": {
    showRandomizeFields: true,
    showRandomizeTransactions: true,
    showAccountVariantPicker: true,
    showCardTransactionsToggle: false,
  },
  "virtual-account-selection": {
    showRandomizeFields: false,
    showRandomizeTransactions: false,
    showAccountVariantPicker: true,
    showCardTransactionsToggle: false,
  },
  "virtual-account-bank-selection": {
    showRandomizeFields: false,
    showRandomizeTransactions: false,
    showAccountVariantPicker: false,
    showCardTransactionsToggle: false,
  },
  "card-screen": {
    showRandomizeFields: false,
    showRandomizeTransactions: true,
    showAccountVariantPicker: false,
    showCardTransactionsToggle: true,
  },
};

function BackgroundPreview({
  id,
  customBackgroundSrc,
  solidBackgroundColor,
  dotsBackgroundColor,
  dotsColor,
  gradientTopColor,
  gradientBottomColor,
}: {
  id: CanvasBackgroundId;
  customBackgroundSrc: string | null;
  solidBackgroundColor: string;
  dotsBackgroundColor: string;
  dotsColor: string;
  gradientTopColor: string;
  gradientBottomColor: string;
}) {
  if (id === "solid") {
    return (
      <div
        className="h-full w-full"
        style={{
          background: solidBackgroundColor,
        }}
      />
    );
  }

  if (id === "dots") {
    return (
      <div
        className="h-full w-full"
        style={{
          backgroundColor: dotsBackgroundColor,
          backgroundImage: `radial-gradient(circle, ${dotsColor} 1px, transparent 1.2px), linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)`,
          backgroundSize: "10px 10px, 100% 100%",
          backgroundPosition: "0 0, 0 0",
        }}
      />
    );
  }

  if (id === "gradient") {
    return (
      <div
        className="h-full w-full"
        style={{
          background: `linear-gradient(180deg, ${gradientTopColor} 0%, ${gradientBottomColor} 100%)`,
        }}
      />
    );
  }

  if (customBackgroundSrc) {
    return (
      <div
        className="h-full w-full bg-center bg-cover"
        style={{ backgroundImage: `url(${customBackgroundSrc})` }}
      />
    );
  }

  return <div className="h-full w-full bg-white/[0.03]" />;
}

function BackgroundOptionThumb({
  option,
  selected,
  customBackgroundSrc,
  solidBackgroundColor,
  dotsBackgroundColor,
  dotsColor,
  gradientTopColor,
  gradientBottomColor,
  onClick,
}: {
  option: (typeof CANVAS_BACKGROUND_OPTIONS)[number];
  selected: boolean;
  customBackgroundSrc: string | null;
  solidBackgroundColor: string;
  dotsBackgroundColor: string;
  dotsColor: string;
  gradientTopColor: string;
  gradientBottomColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative aspect-square w-full overflow-hidden bg-white/[0.04] outline-none transition-colors ${
        selected ? "border border-[#2C2C2C]" : "border border-transparent"
      }`}
      style={{
        borderRadius: `${BACKGROUND_THUMB_RADIUS}px`,
      }}
    >
      <BackgroundPreview
        id={option.id}
        customBackgroundSrc={customBackgroundSrc}
        solidBackgroundColor={solidBackgroundColor}
        dotsBackgroundColor={dotsBackgroundColor}
        dotsColor={dotsColor}
        gradientTopColor={gradientTopColor}
        gradientBottomColor={gradientBottomColor}
      />
      {option.id === "custom" && !customBackgroundSrc ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/18">
          <span className="text-[11px] font-medium leading-[16px] text-white/58">Upload</span>
        </div>
      ) : null}
    </button>
  );
}

function SolidColorPicker({
  selectedSolidBackgroundHex,
  onSelectSolidBackgroundHex,
}: {
  selectedSolidBackgroundHex: string;
  onSelectSolidBackgroundHex: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-8)] pt-[4px]">
      <HexInputField
        label="BG"
        value={selectedSolidBackgroundHex}
        onChange={onSelectSolidBackgroundHex}
      />
    </div>
  );
}

function HexInputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string>(() => value.replace(/^#/, ""));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const POPOVER_WIDTH = 244;

  useEffect(() => {
    setDraft(value.replace(/^#/, ""));
  }, [value]);

  useEffect(() => {
    if (!pickerOpen) return;
    const updatePos = () => {
      const swatch = swatchRef.current;
      if (!swatch) return;
      const rect = swatch.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - POPOVER_WIDTH - 8,
      );
      setPopoverPos({ left, top: rect.bottom + 8 });
    };
    updatePos();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && wrapperRef.current?.contains(target)) return;
      if (target && popoverRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [pickerOpen]);

  const resolved = solidBackgroundColorFromHex(value);

  return (
    <div
      ref={wrapperRef}
      className="relative flex h-[40px] w-full items-center gap-[var(--space-8)] rounded-[20px] bg-white/[0.06] px-[6px]"
    >
      <button
        ref={swatchRef}
        type="button"
        onClick={() => setPickerOpen((prev) => !prev)}
        aria-expanded={pickerOpen}
        aria-label={`${label} color picker`}
        className="h-[28px] w-[28px] shrink-0 cursor-pointer rounded-full border border-white/15 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-white/40"
        style={{ background: resolved }}
      />
      {pickerOpen && popoverPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              className="rounded-[16px] border border-white/10 bg-[#1A1A1A] p-[var(--space-12)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65)]"
              role="dialog"
              aria-label={`${label} color`}
              style={{
                position: "fixed",
                left: popoverPos.left,
                top: popoverPos.top,
                width: POPOVER_WIDTH,
                zIndex: 9999,
              }}
            >
              <HexColorPicker
                color={resolved}
                onChange={(next) => onChange(next.toUpperCase())}
                className="mockup-studio-color-picker"
              />
            </div>,
            document.body,
          )
        : null}
      <span className="text-[11px] font-medium uppercase leading-[14px] tracking-[0.5px] text-white/45">
        {label}
      </span>
      <span className="text-[13px] font-medium leading-[20px] text-white/40">#</span>
      <input
        type="text"
        inputMode="text"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="characters"
        maxLength={7}
        value={draft}
        onChange={(event) => {
          const next = normalizeHexInput(event.currentTarget.value).slice(0, 6);
          setDraft(next);
          if (/^[0-9A-F]{6}$/.test(next)) {
            onChange(`#${next}`);
          }
        }}
        onBlur={() => {
          if (/^[0-9A-F]{3}$/.test(draft)) {
            const expanded = expandHexBody(draft);
            setDraft(expanded);
            onChange(`#${expanded}`);
            return;
          }
          if (!/^[0-9A-F]{6}$/.test(draft)) {
            setDraft(value.replace(/^#/, ""));
          }
        }}
        placeholder="000000"
        aria-label={`${label} hex color`}
        className="flex-1 bg-transparent text-[13px] font-medium leading-[20px] tracking-[0.04em] text-white placeholder:text-white/30 outline-none"
      />
    </div>
  );
}

function DotsColorPicker({
  dotsBackgroundColor,
  dotsColor,
  onDotsBackgroundColorChange,
  onDotsColorChange,
}: {
  dotsBackgroundColor: string;
  dotsColor: string;
  onDotsBackgroundColorChange: (value: string) => void;
  onDotsColorChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-8)]">
      <HexInputField
        label="BG"
        value={dotsBackgroundColor}
        onChange={onDotsBackgroundColorChange}
      />
      <HexInputField
        label="Dot"
        value={dotsColor}
        onChange={onDotsColorChange}
      />
    </div>
  );
}

function GradientColorPicker({
  gradientTopColor,
  gradientBottomColor,
  onGradientTopColorChange,
  onGradientBottomColorChange,
}: {
  gradientTopColor: string;
  gradientBottomColor: string;
  onGradientTopColorChange: (value: string) => void;
  onGradientBottomColorChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-8)]">
      <HexInputField
        label="Top"
        value={gradientTopColor}
        onChange={onGradientTopColorChange}
      />
      <HexInputField
        label="Bot"
        value={gradientBottomColor}
        onChange={onGradientBottomColorChange}
      />
    </div>
  );
}

function RailOptionThumb({
  rail,
  selected,
  onClick,
}: {
  rail: RailOption | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative aspect-square w-full overflow-hidden bg-white/[0.04] outline-none transition-colors ${
        selected ? "border border-[#2C2C2C]" : "border border-transparent"
      }`}
      style={{ borderRadius: `${BACKGROUND_THUMB_RADIUS}px` }}
    >
      {rail ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          alt={rail.label}
          src={rail.previewSrc}
          draggable={false}
          className="pointer-events-none absolute inset-0 m-auto h-[78%] w-auto select-none object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-[11px] font-medium leading-[16px] text-white/58">None</span>
        </div>
      )}
    </button>
  );
}

function AlignmentSelector({
  alignment,
  onChange,
}: {
  alignment: CanvasAlignment;
  onChange: (value: CanvasAlignment) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-8)]">
      <span className="text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
        Alignment
      </span>
      <div className="rounded-[12px] border border-white/10 bg-white/[0.03] p-[var(--space-8)]">
        <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-[2px]">
          {CANVAS_ALIGNMENT_VALUES.map((position) => {
            const selected = position === alignment;
            return (
              <button
                key={position}
                type="button"
                onClick={() => onChange(position)}
                aria-label={position.replace("-", " ")}
                aria-pressed={selected}
                className="flex items-center justify-center rounded-[6px] outline-none transition-colors hover:bg-white/[0.04]"
              >
                {selected ? (
                  <span className="flex flex-col items-center gap-[2px]">
                    <span className="block h-[2px] w-[10px] rounded-full bg-white" />
                    <span className="block h-[2px] w-[12px] rounded-full bg-white" />
                    <span className="block h-[2px] w-[10px] rounded-full bg-white" />
                  </span>
                ) : (
                  <span className="block h-[3px] w-[3px] rounded-full bg-white/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LayoutSelector({
  aspectRatio,
  onChange,
}: {
  aspectRatio: CanvasAspectRatio;
  onChange: (value: CanvasAspectRatio) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-8)]">
      <span className="text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
        Layout
      </span>
      <div className="flex h-[36px] w-full items-center gap-[4px] rounded-[100px] bg-white/[0.08] p-[4px]">
        {CANVAS_ASPECT_RATIO_OPTIONS.map((option) => {
          const isSelected = option.id === aspectRatio;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`relative flex h-full min-w-0 flex-1 items-center justify-center rounded-[20px] text-[13px] font-medium leading-[20px] outline-none transition-colors ${
                isSelected ? "text-white" : "text-white/45"
              }`}
            >
              {isSelected ? (
                <span className="absolute inset-0 rounded-[20px] bg-black" />
              ) : null}
              <span className="relative z-[1]">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
  resettable,
  resetValue,
  decimals,
  labelWidth,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  suffix?: string;
  resettable?: boolean;
  resetValue?: number;
  /** Fixed decimal places for the readout. Integers when absent. */
  decimals?: number;
  /** Widened for the blur panel, whose labels are words not axes. */
  labelWidth?: number;
}) {
  const range = max - min;
  const clampPct = (n: number) => Math.max(0, Math.min(100, n));
  const fillPct = clampPct(((value - min) / range) * 100);

  return (
    <div className="flex w-full items-center gap-[var(--space-8)]">
      <span
        className="shrink-0 text-[10px] font-medium uppercase leading-[14px] tracking-[0.5px] text-white/45"
        style={{ width: labelWidth ?? 28 }}
      >
        {label}
      </span>
      <div className="relative flex flex-1 flex-col">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          onDoubleClick={() => {
            if (resettable && resetValue !== undefined) onChange(resetValue);
          }}
          className="mockup-studio-thin-range w-full"
          style={
            { "--fill-pct": `${fillPct}%` } as React.CSSProperties
          }
        />
        <div className="pointer-events-none mt-[6px] flex w-full justify-between px-[var(--space-8)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-[3px] w-[3px] rounded-full bg-white/25"
            />
          ))}
        </div>
      </div>
      <span className="w-[40px] shrink-0 text-right text-[12px] font-medium leading-[16px] tabular-nums text-white/65">
        {decimals === undefined ? value : value.toFixed(decimals)}
        {suffix ?? ""}
      </span>
    </div>
  );
}

function TransformSelector({
  offsetX,
  offsetY,
  scale,
  rotation,
  rotateX,
  rotateY,
  is3DEnabled,
  onOffsetXChange,
  onOffsetYChange,
  onScaleChange,
  onRotationChange,
  onRotateXChange,
  onRotateYChange,
  onIs3DEnabledChange,
  onReset,
}: {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  rotateX: number;
  rotateY: number;
  is3DEnabled: boolean;
  onOffsetXChange: (next: number) => void;
  onOffsetYChange: (next: number) => void;
  onScaleChange: (next: number) => void;
  onRotationChange: (next: number) => void;
  onRotateXChange: (next: number) => void;
  onRotateYChange: (next: number) => void;
  onIs3DEnabledChange: (next: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-16)]">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => onIs3DEnabledChange(!is3DEnabled)}
          aria-pressed={is3DEnabled}
          className="flex items-center gap-[var(--space-8)] outline-none"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.4px] text-white/45">
            3D
          </span>
          <span
            className={`relative h-[16px] w-[28px] rounded-[100px] transition-colors ${
              is3DEnabled ? "bg-white" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-[2px] h-[12px] w-[12px] rounded-full transition-all ${
                is3DEnabled ? "left-[14px] bg-black" : "left-[2px] bg-white"
              }`}
            />
          </span>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-medium uppercase tracking-[0.4px] text-white/45 outline-none transition-colors hover:text-white/80"
        >
          Reset
        </button>
      </div>
      <div className="flex w-full flex-col gap-[var(--space-16)]">
        <SliderRow
          label="X"
          min={-200}
          max={200}
          step={1}
          value={offsetX}
          onChange={onOffsetXChange}
          suffix="px"
          resettable
          resetValue={0}
        />
        <SliderRow
          label="Y"
          min={-200}
          max={200}
          step={1}
          value={offsetY}
          onChange={onOffsetYChange}
          suffix="px"
          resettable
          resetValue={0}
        />
        <SliderRow
          label="S"
          min={50}
          max={150}
          step={1}
          value={scale}
          onChange={onScaleChange}
          suffix="%"
          resettable
          resetValue={100}
        />
        {is3DEnabled ? (
          <>
            <SliderRow
              label="RX"
              min={-180}
              max={180}
              step={1}
              value={rotateX}
              onChange={onRotateXChange}
              suffix="°"
              resettable
              resetValue={0}
            />
            <SliderRow
              label="RY"
              min={-180}
              max={180}
              step={1}
              value={rotateY}
              onChange={onRotateYChange}
              suffix="°"
              resettable
              resetValue={0}
            />
          </>
        ) : null}
        <SliderRow
          label={is3DEnabled ? "RZ" : "R"}
          min={is3DEnabled ? -180 : -45}
          max={is3DEnabled ? 180 : 45}
          step={1}
          value={rotation}
          onChange={onRotationChange}
          suffix="°"
          resettable
          resetValue={0}
        />
      </div>
    </div>
  );
}

function WatermarkSelector({
  position,
  onChange,
}: {
  position: WatermarkPosition;
  onChange: (value: WatermarkPosition) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-8)]">
      <span className="text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
        Watermark
      </span>
      <div className="rounded-[12px] border border-white/10 bg-white/[0.03] p-[var(--space-8)]">
        <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-[2px]">
          {WATERMARK_POSITIONS.map((slot) => {
            const selected = slot === position;
            const isOffCell = slot === "off";
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onChange(slot)}
                aria-label={slot.replace("-", " ")}
                aria-pressed={selected}
                className="flex items-center justify-center rounded-[6px] outline-none transition-colors hover:bg-white/[0.04]"
              >
                {selected ? (
                  isOffCell ? (
                    <span className="text-[10px] font-medium uppercase tracking-[0.4px] text-white/65">
                      Off
                    </span>
                  ) : (
                    <span className="block h-[8px] w-[14px] rounded-[2px] bg-white" />
                  )
                ) : isOffCell ? (
                  <span className="text-[10px] font-medium uppercase tracking-[0.4px] text-white/30">
                    Off
                  </span>
                ) : (
                  <span className="block h-[3px] w-[3px] rounded-full bg-white/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShadowSelector({
  direction,
  onChange,
}: {
  direction: ShadowDirection;
  onChange: (value: ShadowDirection) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-8)]">
      <span className="text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
        Shadow
      </span>
      <div className="rounded-[12px] border border-white/10 bg-white/[0.03] p-[var(--space-8)]">
        <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-[2px]">
          {SHADOW_DIRECTIONS.map((slot) => {
            const selected = slot === direction;
            const isOffCell = slot === "off";
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onChange(slot)}
                aria-label={slot.replace("-", " ")}
                aria-pressed={selected}
                className="flex items-center justify-center rounded-[6px] outline-none transition-colors hover:bg-white/[0.04]"
              >
                {selected ? (
                  isOffCell ? (
                    <span className="text-[10px] font-medium uppercase tracking-[0.4px] text-white/65">
                      Off
                    </span>
                  ) : (
                    <span
                      className="block h-[8px] w-[8px] rounded-full bg-white"
                      style={{ boxShadow: "0 0 6px 2px rgba(255,255,255,0.35)" }}
                    />
                  )
                ) : isOffCell ? (
                  <span className="text-[10px] font-medium uppercase tracking-[0.4px] text-white/30">
                    Off
                  </span>
                ) : (
                  <span className="block h-[3px] w-[3px] rounded-full bg-white/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CanvasWatermark({ position }: { position: WatermarkPosition }) {
  if (position === "off") return null;
  const [vertical, horizontal] = position.split("-") as [
    "top" | "middle" | "bottom",
    "left" | "center" | "right",
  ];
  const style: React.CSSProperties = {
    position: "absolute",
    opacity: 0.7,
    pointerEvents: "none",
    zIndex: 30,
  };
  const transforms: string[] = [];
  if (vertical === "top") style.top = WATERMARK_INSET;
  else if (vertical === "bottom") style.bottom = WATERMARK_INSET;
  else {
    style.top = "50%";
    transforms.push("translateY(-50%)");
  }
  if (horizontal === "left") style.left = WATERMARK_INSET;
  else if (horizontal === "right") style.right = WATERMARK_INSET;
  else {
    style.left = "50%";
    transforms.push("translateX(-50%)");
  }
  if (transforms.length) style.transform = transforms.join(" ");
  return (
    <div style={style} aria-hidden>
      <KoshLogo tone="light" width={140} height={32} priority />
    </div>
  );
}

function AccordionSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex h-[36px] w-full items-center justify-between px-[var(--space-8)] outline-none transition-colors hover:bg-white/[0.03] rounded-[8px]"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-white/55">
          {title}
        </span>
        <span
          aria-hidden
          className={`flex h-[16px] w-[16px] items-center justify-center text-white/45 transition-transform duration-200 ${
            expanded ? "rotate-180" : "rotate-0"
          }`}
        >
          <svg viewBox="0 0 10 6" width={10} height={6} fill="none">
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out ${
          expanded
            ? "mt-[var(--space-12)] grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

type AccordionSectionId =
  | "phone"
  | "background"
  | "alignment"
  | "transform"
  | "blur"
  | "effects"
  | "export";

/**
 * The focus point for the radial blur, picked directly rather than through a
 * pair of X/Y sliders. Two sliders describe a position; a pad IS one, and
 * choosing where the eye should land is a spatial decision.
 */
function FocusPad({
  x,
  y,
  onChange,
}: {
  x: number;
  y: number;
  onChange: (nx: number, ny: number) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);

  const pick = (clientX: number, clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    onChange(
      clamp01((clientX - rect.left) / rect.width),
      clamp01((clientY - rect.top) / rect.height),
    );
  };

  // Pointer capture keeps the drag alive when the cursor leaves the pad,
  // so flicking focus to a corner does not drop halfway there.
  const handleDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pick(event.clientX, event.clientY);
  };
  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    pick(event.clientX, event.clientY);
  };

  const nudge = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = map[event.key];
    if (!delta) return;
    event.preventDefault();
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    onChange(clamp01(x + delta[0]), clamp01(y + delta[1]));
  };

  return (
    <div className="flex w-full items-start gap-[var(--space-8)]">
      <span className="mt-[4px] w-[76px] shrink-0 text-[10px] font-medium uppercase leading-[14px] tracking-[0.5px] text-white/45">
        Focus position
      </span>
      <div
        ref={padRef}
        role="slider"
        tabIndex={0}
        aria-label="Focus position"
        aria-valuetext={`${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onKeyDown={nudge}
        className="relative h-[68px] flex-1 cursor-crosshair rounded-[var(--radius-sm)] border border-white/[0.08] bg-white/[0.04] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      >
        {/* Centre guides, so "middle" is findable without hunting. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/[0.06]" />
        <span
          className="pointer-events-none absolute h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The lens. Mode first, then only the parameters that mode actually has —
 * a tilt shift has an angle and a scan, a radial has a focus point, and
 * showing all of them at once would imply the dead ones do something.
 */
function BlurPanel({
  blur,
  onChange,
}: {
  blur: BlurSettings;
  onChange: (next: BlurSettings) => void;
}) {
  const set = (patch: Partial<BlurSettings>) => onChange({ ...blur, ...patch });

  return (
    <div className="flex w-full flex-col gap-[var(--space-12)] pt-[2px]">
      <div className="flex w-full items-center gap-[var(--space-8)]">
        <span className="w-[76px] shrink-0 text-[10px] font-medium uppercase leading-[14px] tracking-[0.5px] text-white/45">
          Mode
        </span>
        <select
          value={blur.mode}
          onChange={(event) =>
            onChange(applyMode(blur, event.currentTarget.value as BlurMode))
          }
          aria-label="Blur mode"
          className="h-[28px] flex-1 cursor-pointer rounded-[var(--radius-sm)] border border-white/[0.08] bg-white/[0.06] px-[var(--space-8)] text-[12px] font-medium text-white/85 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        >
          {BLUR_MODES.map((mode) => (
            <option key={mode.id} value={mode.id} className="bg-[#141414]">
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {blur.mode !== "off" && (
        <>
          <SliderRow
            label="Strength"
            labelWidth={76}
            min={0}
            max={100}
            step={1}
            value={blur.strength}
            onChange={(next) => set({ strength: next })}
          />
          <SliderRow
            label="Focus size"
            labelWidth={76}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            value={blur.focusSize}
            onChange={(next) => set({ focusSize: next })}
          />
          <SliderRow
            label="Falloff"
            labelWidth={76}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            value={blur.falloff}
            onChange={(next) => set({ falloff: next })}
          />

          {blur.mode === "tilt-shift" && (
            <>
              <SliderRow
                label="Angle"
                labelWidth={76}
                min={0}
                max={360}
                step={1}
                suffix="°"
                value={blur.angle}
                onChange={(next) => set({ angle: next })}
              />
              <SliderRow
                label="Scan"
                labelWidth={76}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                value={blur.scan}
                onChange={(next) => set({ scan: next })}
              />
            </>
          )}

          {blur.mode === "radial" && (
            <FocusPad
              x={blur.focusX}
              y={blur.focusY}
              onChange={(nx, ny) => set({ focusX: nx, focusY: ny })}
            />
          )}

          <div className="flex w-full items-center gap-[var(--space-8)]">
            <span className="w-[76px] shrink-0 text-[10px] font-medium uppercase leading-[14px] tracking-[0.5px] text-white/45">
              Bokeh
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={blur.bokeh}
              aria-label="Bokeh"
              onClick={() => set({ bokeh: !blur.bokeh })}
              className={`relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors ${
                blur.bokeh ? "bg-white" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all ${
                  blur.bokeh ? "left-[16px] bg-black" : "left-[2px] bg-white/70"
                }`}
              />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RightControls({
  selectedFlowId,
  controlsView,
  onOpenBackgrounds,
  onCloseBackgrounds,
  selectedSizeId,
  onSelectSize,
  selectedAccountVariantId,
  onSelectAccountVariant,
  onRandomizeFields,
  onRandomizeTransactions,
  cornerRadius,
  onCornerRadiusChange,
  cornerSmoothing,
  onCornerSmoothingChange,
  cardTransactionsFilled,
  onCardTransactionsFilledChange,
  debugOutlines,
  onDebugOutlinesChange,
  selectedBackgroundId,
  customBackgroundSrc,
  selectedSolidBackgroundHue,
  selectedSolidBackgroundGrayscale,
  selectedSolidBackgroundHex,
  resolvedSolidBackgroundColor,
  onSelectBackground,
  onSelectSolidBackgroundHue,
  onSelectSolidBackgroundGrayscale,
  onSelectSolidBackgroundHex,
  onSelectCustomBackgroundFile,
  canvasAlignment,
  onCanvasAlignmentChange,
  canvasAspectRatio,
  onCanvasAspectRatioChange,
  selectedRailId,
  onSelectRailId,
  dotsBackgroundColor,
  dotsColor,
  onDotsBackgroundColorChange,
  onDotsColorChange,
  gradientTopColor,
  gradientBottomColor,
  onGradientTopColorChange,
  onGradientBottomColorChange,
  watermarkPosition,
  cameraMode,
  onCameraModeChange,
  onCameraPreset,
  blur,
  onBlurChange,
  onWatermarkPositionChange,
  shadowDirection,
  onShadowDirectionChange,
  phoneOffsetX,
  phoneOffsetY,
  phoneScale,
  phoneRotation,
  phoneRotateX,
  phoneRotateY,
  is3DEnabled,
  onPhoneOffsetXChange,
  onPhoneOffsetYChange,
  onPhoneScaleChange,
  onPhoneRotationChange,
  onPhoneRotateXChange,
  onPhoneRotateYChange,
  onIs3DEnabledChange,
  onPhoneTransformReset,
  onDownload,
  downloadFormat,
  onDownloadFormatChange,
}: {
  selectedFlowId: string;
  controlsView: ControlsView;
  onOpenBackgrounds: () => void;
  onCloseBackgrounds: () => void;
  selectedSizeId: SizeId;
  onSelectSize: (id: SizeId) => void;
  selectedAccountVariantId: AccountVariantId;
  onSelectAccountVariant: (id: AccountVariantId) => void;
  onRandomizeFields: () => void;
  onRandomizeTransactions: () => void;
  cornerRadius: number;
  onCornerRadiusChange: (next: number) => void;
  cornerSmoothing: boolean;
  onCornerSmoothingChange: (next: boolean) => void;
  cardTransactionsFilled: boolean;
  onCardTransactionsFilledChange: (next: boolean) => void;
  debugOutlines: boolean;
  onDebugOutlinesChange: (next: boolean) => void;
  selectedBackgroundId: CanvasBackgroundId;
  customBackgroundSrc: string | null;
  selectedSolidBackgroundHue: number;
  selectedSolidBackgroundGrayscale: number;
  selectedSolidBackgroundHex: string;
  resolvedSolidBackgroundColor: string;
  onSelectBackground: (id: CanvasBackgroundId) => void;
  onSelectSolidBackgroundHue: (value: number) => void;
  onSelectSolidBackgroundGrayscale: (value: number) => void;
  onSelectSolidBackgroundHex: (value: string) => void;
  onSelectCustomBackgroundFile: (file: File) => void;
  canvasAlignment: CanvasAlignment;
  onCanvasAlignmentChange: (value: CanvasAlignment) => void;
  canvasAspectRatio: CanvasAspectRatio;
  onCanvasAspectRatioChange: (value: CanvasAspectRatio) => void;
  selectedRailId: RailId | null;
  onSelectRailId: (id: RailId | null) => void;
  dotsBackgroundColor: string;
  dotsColor: string;
  onDotsBackgroundColorChange: (value: string) => void;
  onDotsColorChange: (value: string) => void;
  gradientTopColor: string;
  gradientBottomColor: string;
  onGradientTopColorChange: (value: string) => void;
  onGradientBottomColorChange: (value: string) => void;
  watermarkPosition: WatermarkPosition;
  cameraMode: "manual" | "presets";
  onCameraModeChange: (value: "manual" | "presets") => void;
  onCameraPreset: (id: string) => void;
  blur: BlurSettings;
  onBlurChange: (next: BlurSettings) => void;
  onWatermarkPositionChange: (value: WatermarkPosition) => void;
  shadowDirection: ShadowDirection;
  onShadowDirectionChange: (value: ShadowDirection) => void;
  phoneOffsetX: number;
  phoneOffsetY: number;
  phoneScale: number;
  phoneRotation: number;
  phoneRotateX: number;
  phoneRotateY: number;
  is3DEnabled: boolean;
  onPhoneOffsetXChange: (value: number) => void;
  onPhoneOffsetYChange: (value: number) => void;
  onPhoneScaleChange: (value: number) => void;
  onPhoneRotationChange: (value: number) => void;
  onPhoneRotateXChange: (value: number) => void;
  onPhoneRotateYChange: (value: number) => void;
  onIs3DEnabledChange: (value: boolean) => void;
  onPhoneTransformReset: () => void;
  onDownload: () => void;
  downloadFormat: DownloadFormat;
  onDownloadFormatChange: (value: DownloadFormat) => void;
}) {
  const customBackgroundInputRef = useRef<HTMLInputElement>(null);
  const [expandedSections, setExpandedSections] = useState<Set<AccordionSectionId>>(
    () => new Set(["phone"]),
  );
  const toggleSection = (id: AccordionSectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const isExpanded = (id: AccordionSectionId) => expandedSections.has(id);
  const editOptions = FLOW_EDIT_OPTIONS[selectedFlowId] ?? {
    showRandomizeFields: false,
    showRandomizeTransactions: false,
    showAccountVariantPicker: true,
    showCardTransactionsToggle: false,
  };

  const triggerCustomBackgroundPicker = () => {
    customBackgroundInputRef.current?.click();
  };
  const selectedSolidBackgroundColor = resolvedSolidBackgroundColor;

  return (
    <div className="flex h-full w-[410px] shrink-0 flex-col gap-[var(--space-16)]">
      <GlassCard
        disableInteractionGlow
        className="min-h-0 flex-1 rounded-[16px] bg-[#141414]"
      >
        <div className="flex h-full flex-col gap-[var(--space-20)] overflow-y-auto p-[var(--space-20)]">
          {controlsView === "edit" ? (
            <div className="flex w-full flex-col gap-[var(--space-20)]">
              {editOptions.showAccountVariantPicker ? (
                <div className="relative h-[36px] w-full">
                  <select
                    value={selectedAccountVariantId}
                    onChange={(e) =>
                      onSelectAccountVariant(e.target.value as AccountVariantId)
                    }
                    className="mockup-studio-select absolute inset-0 w-full appearance-none rounded-[10px] border border-white/10 bg-white/[0.04] pl-[12px] pr-[28px] text-[13px] font-medium leading-[20px] text-white outline-none"
                  >
                    {Object.values(ACCOUNT_VARIANTS).map((option) => (
                      <option key={option.id} value={option.id} className="bg-[#141414] text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-white/45"
                  >
                    <svg viewBox="0 0 10 6" width={10} height={6} fill="none">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              ) : null}

              {editOptions.showRandomizeFields || editOptions.showRandomizeTransactions ? (
                <div className="flex w-full flex-col gap-[var(--space-16)]">
                  {editOptions.showRandomizeFields ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex w-full min-w-0"
                      onClick={onRandomizeFields}
                    >
                      Randomize fields
                    </Button>
                  ) : null}

                  {editOptions.showRandomizeTransactions ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex w-full min-w-0"
                      onClick={onRandomizeTransactions}
                    >
                      Randomize transactions
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {editOptions.showCardTransactionsToggle ? (
                <button
                  type="button"
                  onClick={() => onCardTransactionsFilledChange(!cardTransactionsFilled)}
                  aria-pressed={cardTransactionsFilled}
                  className="flex h-[36px] w-full items-center justify-between rounded-[100px] bg-white/[0.08] px-[var(--space-16)] outline-none transition-colors"
                >
                  <span className="text-[13px] font-medium leading-[20px] text-white/65">
                    Show transactions
                  </span>
                  <span
                    className={`relative h-[18px] w-[32px] rounded-[100px] transition-colors ${
                      cardTransactionsFilled ? "bg-white" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all ${
                        cardTransactionsFilled ? "left-[16px] bg-black" : "left-[2px] bg-white"
                      }`}
                    />
                  </span>
                </button>
              ) : null}

              <div className="flex w-full flex-col gap-[var(--space-8)]">
                <span className="text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
                  Corner radius
                </span>
                <div className="flex h-[36px] w-full items-center gap-[4px] rounded-[100px] bg-white/[0.08] p-[4px]">
                  {CORNER_RADIUS_LEVELS.map((value) => {
                    const isSelected = cornerRadius === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onCornerRadiusChange(value)}
                        className={`relative flex h-full min-w-0 flex-1 items-center justify-center rounded-[20px] text-[13px] font-medium leading-[20px] outline-none transition-colors ${
                          isSelected ? "text-white" : "text-white/45"
                        }`}
                      >
                        {isSelected ? (
                          <span className="absolute inset-0 rounded-[20px] bg-black" />
                        ) : null}
                        <span className="relative z-[1]">{value}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onCornerSmoothingChange(!cornerSmoothing)}
                  aria-pressed={cornerSmoothing}
                  className="flex h-[36px] w-full items-center justify-between rounded-[100px] bg-white/[0.08] px-[var(--space-16)] outline-none transition-colors"
                >
                  <span className="text-[13px] font-medium leading-[20px] text-white/65">
                    Corner smoothing (iOS squircle)
                  </span>
                  <span
                    className={`relative h-[18px] w-[32px] rounded-[100px] transition-colors ${
                      cornerSmoothing ? "bg-white" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all ${
                        cornerSmoothing ? "left-[16px] bg-black" : "left-[2px] bg-white"
                      }`}
                    />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDebugOutlinesChange(!debugOutlines)}
                  aria-pressed={debugOutlines}
                  className="flex h-[36px] w-full items-center justify-between rounded-[100px] bg-white/[0.08] px-[var(--space-16)] outline-none transition-colors"
                >
                  <span className="text-[13px] font-medium leading-[20px] text-white/65">
                    Debug outlines
                  </span>
                  <span
                    className={`relative h-[18px] w-[32px] rounded-[100px] transition-colors ${
                      debugOutlines ? "bg-white" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all ${
                        debugOutlines ? "left-[16px] bg-black" : "left-[2px] bg-white"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-[var(--space-4)]">
              <AccordionSection
                title="Phone"
                expanded={isExpanded("phone")}
                onToggle={() => toggleSection("phone")}
              >
                <div className="flex w-full flex-col gap-[var(--space-12)] pt-[2px]">
                  <div className="flex w-full flex-col gap-[var(--space-8)]">
                    <span className="text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
                      Mobile rail
                    </span>
                    <div
                      className="grid w-full grid-cols-3"
                      style={{ gap: `${BACKGROUND_THUMB_GAP}px` }}
                    >
                      <RailOptionThumb
                        rail={null}
                        selected={selectedRailId === null}
                        onClick={() => onSelectRailId(null)}
                      />
                      {RAIL_OPTIONS.map((rail) => (
                        <RailOptionThumb
                          key={rail.id}
                          rail={rail}
                          selected={selectedRailId === rail.id}
                          onClick={() => onSelectRailId(rail.id)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex h-[36px] w-full items-center gap-[4px] overflow-hidden rounded-[100px] bg-white/[0.08] p-[4px]">
                    {PHONE_SIZE_OPTIONS.map((option) => {
                      const isSelected = selectedSizeId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onSelectSize(option.id)}
                          className={`relative flex h-full min-w-0 flex-1 items-center justify-center rounded-[20px] px-[var(--space-8)] py-[3px] text-center text-[15px] font-medium leading-[24px] outline-none transition-colors ${
                            isSelected ? "text-white" : "text-white/45"
                          }`}
                        >
                          {isSelected ? (
                            <span className="absolute inset-0 rounded-[20px] bg-black shadow-[0px_2px_20px_0px_rgba(0,0,0,0.06)]" />
                          ) : null}
                          <span className="relative z-[1]">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                title="Background"
                expanded={isExpanded("background")}
                onToggle={() => toggleSection("background")}
              >
                <div className="flex w-full flex-col gap-[var(--space-12)] pt-[2px]">
                  <div
                    className="grid w-full grid-cols-3"
                    style={{ gap: `${BACKGROUND_THUMB_GAP}px` }}
                  >
                    {CANVAS_BACKGROUND_OPTIONS.map((option) => (
                      <BackgroundOptionThumb
                        key={option.id}
                        option={option}
                        selected={selectedBackgroundId === option.id}
                        customBackgroundSrc={customBackgroundSrc}
                        solidBackgroundColor={selectedSolidBackgroundColor}
                        dotsBackgroundColor={dotsBackgroundColor}
                        dotsColor={dotsColor}
                        gradientTopColor={gradientTopColor}
                        gradientBottomColor={gradientBottomColor}
                        onClick={() => {
                          if (option.id === "custom") {
                            triggerCustomBackgroundPicker();
                            return;
                          }
                          onSelectBackground(option.id);
                        }}
                      />
                    ))}
                  </div>
                  {selectedBackgroundId === "solid" ? (
                    <SolidColorPicker
                      selectedSolidBackgroundHex={selectedSolidBackgroundHex}
                      onSelectSolidBackgroundHex={onSelectSolidBackgroundHex}
                    />
                  ) : null}
                  {selectedBackgroundId === "dots" ? (
                    <DotsColorPicker
                      dotsBackgroundColor={dotsBackgroundColor}
                      dotsColor={dotsColor}
                      onDotsBackgroundColorChange={onDotsBackgroundColorChange}
                      onDotsColorChange={onDotsColorChange}
                    />
                  ) : null}
                  {selectedBackgroundId === "gradient" ? (
                    <GradientColorPicker
                      gradientTopColor={gradientTopColor}
                      gradientBottomColor={gradientBottomColor}
                      onGradientTopColorChange={onGradientTopColorChange}
                      onGradientBottomColorChange={onGradientBottomColorChange}
                    />
                  ) : null}
                </div>
              </AccordionSection>

              <AccordionSection
                title="Alignment"
                expanded={isExpanded("alignment")}
                onToggle={() => toggleSection("alignment")}
              >
                <div className="flex w-full flex-col gap-[var(--space-12)] pt-[2px]">
                  <div className="w-full">
                    <AlignmentSelector
                      alignment={canvasAlignment}
                      onChange={onCanvasAlignmentChange}
                    />
                  </div>
                  <LayoutSelector
                    aspectRatio={canvasAspectRatio}
                    onChange={onCanvasAspectRatioChange}
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                title="Transform"
                expanded={isExpanded("transform")}
                onToggle={() => toggleSection("transform")}
              >
                {/* Manual | Presets, as ultramock splits its CAMERA panel.
                    Presets write the same state the sliders drive, so the
                    existing easing carries the phone there — a preset reads as
                    a move rather than a jump. */}
                <div className="flex w-full items-center gap-[4px] rounded-full bg-white/[0.06] p-[3px] pt-[3px]">
                  {(["manual", "presets"] as const).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => onCameraModeChange(mode)}
                      aria-pressed={cameraMode === mode}
                      className={`h-[26px] flex-1 rounded-full text-[12px] font-medium uppercase leading-[14px] tracking-[0.4px] transition-colors ${
                        cameraMode === mode
                          ? "bg-white text-black"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {cameraMode === "presets" ? (
                  <div className="grid grid-cols-2 gap-[var(--space-8)] pt-[var(--space-12)]">
                    {CAMERA_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => onCameraPreset(preset.id)}
                        className="h-[34px] rounded-[10px] bg-white/[0.06] text-[12px] font-medium uppercase leading-[14px] tracking-[0.4px] text-white/75 transition-colors hover:bg-white/[0.12] hover:text-white"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                ) : (
                <div className="pt-[2px]">
                  <TransformSelector
                    offsetX={phoneOffsetX}
                    offsetY={phoneOffsetY}
                    scale={phoneScale}
                    rotation={phoneRotation}
                    rotateX={phoneRotateX}
                    rotateY={phoneRotateY}
                    is3DEnabled={is3DEnabled}
                    onOffsetXChange={onPhoneOffsetXChange}
                    onOffsetYChange={onPhoneOffsetYChange}
                    onScaleChange={onPhoneScaleChange}
                    onRotationChange={onPhoneRotationChange}
                    onRotateXChange={onPhoneRotateXChange}
                    onRotateYChange={onPhoneRotateYChange}
                    onIs3DEnabledChange={onIs3DEnabledChange}
                    onReset={onPhoneTransformReset}
                  />
                </div>
                )}
              </AccordionSection>

              <AccordionSection
                title="Blur"
                expanded={isExpanded("blur")}
                onToggle={() => toggleSection("blur")}
              >
                <BlurPanel blur={blur} onChange={onBlurChange} />
              </AccordionSection>

              <AccordionSection
                title="Effects"
                expanded={isExpanded("effects")}
                onToggle={() => toggleSection("effects")}
              >
                <div className="flex w-full gap-[var(--space-8)] pt-[2px]">
                  <div className="min-w-0 flex-1">
                    <WatermarkSelector
                      position={watermarkPosition}
                      onChange={onWatermarkPositionChange}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <ShadowSelector
                      direction={shadowDirection}
                      onChange={onShadowDirectionChange}
                    />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                title="Export"
                expanded={isExpanded("export")}
                onToggle={() => toggleSection("export")}
              >
                <div className="flex w-full items-center justify-between pt-[2px]">
                  <span className="text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
                    Format
                  </span>
                  <div className="inline-flex items-center gap-[4px] rounded-full bg-white/[0.06] p-[3px]">
                    {DOWNLOAD_FORMAT_OPTIONS.map((option) => {
                      const isSelected = downloadFormat === option.id;
                      return (
                        <button
                          type="button"
                          key={option.id}
                          onClick={() => onDownloadFormatChange(option.id)}
                          aria-pressed={isSelected}
                          className={`h-[26px] rounded-full px-[var(--space-8)] text-[12px] font-medium leading-[14px] transition-colors ${
                            isSelected
                              ? "bg-white text-black"
                              : "text-white/70 hover:text-white"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </AccordionSection>

              <input
                ref={customBackgroundInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  onSelectCustomBackgroundFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          )}
        </div>
      </GlassCard>

      <div className="flex w-full gap-[var(--space-16)]">
        {controlsView === "edit" ? (
          <Button
            variant="primary"
            size="md"
            className="flex flex-1 min-w-0"
            onClick={onOpenBackgrounds}
          >
            Next
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              size="md"
              className="flex flex-1 min-w-0"
              onClick={onCloseBackgrounds}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex flex-1 min-w-0"
              onClick={onDownload}
            >
              Download
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function RatioContainer({
  ratio,
  children,
}: {
  ratio: number | null;
  children: React.ReactNode;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (ratio === null) {
      setSize(null);
      return;
    }
    const node = parentRef.current;
    if (!node) return;
    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const parentRatio = width / height;
      let nextWidth: number;
      let nextHeight: number;
      if (parentRatio > ratio) {
        nextHeight = height;
        nextWidth = height * ratio;
      } else {
        nextWidth = width;
        nextHeight = width / ratio;
      }
      setSize({ width: nextWidth, height: nextHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ratio]);

  return (
    <div ref={parentRef} className="flex h-full w-full items-center justify-center">
      <div
        className="relative"
        style={
          ratio === null
            ? { width: "100%", height: "100%" }
            : size
              ? { width: `${size.width}px`, height: `${size.height}px` }
              : { opacity: 0 }
        }
      >
        {children}
      </div>
    </div>
  );
}

function ScaledScreen({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const next = Math.min(width / SCREEN_NATIVE_WIDTH, height / SCREEN_NATIVE_HEIGHT);
      setScale(next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="relative h-full w-full">
      {scale > 0 ? (
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: SCREEN_NATIVE_WIDTH,
            height: SCREEN_NATIVE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: "center center",
            transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function CanvasBackgroundLayer({
  backgroundId,
  customBackgroundSrc,
  solidBackgroundColor,
  dotsBackgroundColor,
  dotsColor,
  gradientTopColor,
  gradientBottomColor,
}: {
  backgroundId: CanvasBackgroundId;
  customBackgroundSrc: string | null;
  solidBackgroundColor: string;
  dotsBackgroundColor: string;
  dotsColor: string;
  gradientTopColor: string;
  gradientBottomColor: string;
}) {
  return (
    <div
      aria-hidden
      data-canvas-background
      className="absolute inset-0 overflow-hidden rounded-[16px]"
    >
      {backgroundId === "solid" ? (
        <div
          className="absolute inset-0"
          style={{
            background: solidBackgroundColor,
          }}
        />
      ) : null}

      {backgroundId === "dots" ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: dotsBackgroundColor,
            backgroundImage: `radial-gradient(circle, ${dotsColor} 1px, transparent 1.2px), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)`,
            backgroundSize: "12px 12px, 100% 100%",
            backgroundPosition: "0 0, 0 0",
          }}
        />
      ) : null}

      {backgroundId === "gradient" ? (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${gradientTopColor} 0%, ${gradientBottomColor} 100%)`,
          }}
        />
      ) : null}

      {backgroundId === "custom" && customBackgroundSrc ? (
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${customBackgroundSrc})` }}
        />
      ) : null}
    </div>
  );
}

function Canvas({
  rail,
  heightPct,
  activeScreenId,
  blurRadius,
  accountData,
  onSelectAccountVariant,
  bankSelectionIds,
  onToggleBankSelection,
  cardTransactions,
  screenMaskScale,
  screenMaskCornerRadius,
  cornerRadius,
  cornerSmoothing,
  debugOutlines,
  topEdgeHeight,
  topEdgeOffset,
  bottomEdgeHeight,
  bottomEdgeOffset,
  backgroundId,
  customBackgroundSrc,
  solidBackgroundColor,
  dotsBackgroundColor,
  dotsColor,
  gradientTopColor,
  gradientBottomColor,
  watermarkPosition,
  shadowDirection,
  phoneTransform,
  is3DEnabled,
  phoneRotateX,
  phoneRotateY,
  phoneRotateZ,
  phoneOffsetXValue,
  phoneOffsetYValue,
  phoneScaleValue,
  webglCanvasRef,
  stageCaptureRef,
  blur,
  onPointerRotateDrag,
  alignment,
  aspectRatio,
  exportRef,
  customScreenSrc,
  customScreenCornerRadius,
}: {
  rail: RailOption | undefined;
  heightPct: number;
  activeScreenId: string | null;
  blurRadius: number;
  accountData: {
    title: string;
    description: string;
    titleFlagSrc: string;
    backdropFlagSrc: string;
    artworkSrc: string;
    bankRows: Array<{ label: string; value: string }>;
    transactions?: Transaction[];
    variantId: AccountVariantId;
  };
  onSelectAccountVariant: (id: AccountVariantId) => void;
  bankSelectionIds: ReadonlyArray<BankSelectionVariantId>;
  onToggleBankSelection: (id: BankSelectionVariantId) => void;
  cardTransactions: Transaction[];
  screenMaskScale: number;
  screenMaskCornerRadius: number;
  cornerRadius: number;
  cornerSmoothing: boolean;
  debugOutlines: boolean;
  topEdgeHeight: number;
  topEdgeOffset: number;
  bottomEdgeHeight: number;
  bottomEdgeOffset: number;
  backgroundId: CanvasBackgroundId;
  customBackgroundSrc: string | null;
  solidBackgroundColor: string;
  dotsBackgroundColor: string;
  dotsColor: string;
  gradientTopColor: string;
  gradientBottomColor: string;
  watermarkPosition: WatermarkPosition;
  shadowDirection: ShadowDirection;
  phoneTransform?: string;
  is3DEnabled: boolean;
  phoneRotateX: number;
  phoneRotateY: number;
  phoneRotateZ: number;
  phoneOffsetXValue: number;
  phoneOffsetYValue: number;
  phoneScaleValue: number;
  webglCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  stageCaptureRef?: React.MutableRefObject<StageCapture | null>;
  blur: BlurSettings;
  onPointerRotateDrag?: (delta: { dx: number; dy: number }) => void;
  alignment: CanvasAlignment;
  aspectRatio: CanvasAspectRatio;
  exportRef?: React.RefObject<HTMLDivElement | null>;
  customScreenSrc: string | null;
  customScreenCornerRadius: number;
}) {
  const railAspect = rail ? rail.previewLayout.width / rail.previewLayout.height : 1;
  const screenAspect = SCREEN_NATIVE_WIDTH / SCREEN_NATIVE_HEIGHT;
  const screenBounds = rail?.screenBounds;
  const screenInsetX = rail?.screenInset.x ?? 0;
  const screenInsetY = rail?.screenInset.y ?? 0;
  const baseScreenLeftPct =
    (screenBounds?.leftPct ?? 0) +
    ((screenInsetX / (rail?.previewLayout.width ?? SCREEN_NATIVE_WIDTH)) * 100);
  const baseScreenTopPct =
    (screenBounds?.topPct ?? 0) +
    ((screenInsetY / (rail?.previewLayout.height ?? SCREEN_NATIVE_HEIGHT)) * 100);
  const baseScreenWidthPct =
    (screenBounds?.widthPct ?? 100) -
    (((screenInsetX * 2) / (rail?.previewLayout.width ?? SCREEN_NATIVE_WIDTH)) * 100);
  const baseScreenHeightPct =
    (screenBounds?.heightPct ?? 100) -
    (((screenInsetY * 2) / (rail?.previewLayout.height ?? SCREEN_NATIVE_HEIGHT)) * 100);
  const screenWidthPct = baseScreenWidthPct * screenMaskScale;
  const screenHeightPct = baseScreenHeightPct * screenMaskScale;
  const screenLeftPct = baseScreenLeftPct - (screenWidthPct - baseScreenWidthPct) / 2;
  const screenTopPct = baseScreenTopPct - (screenHeightPct - baseScreenHeightPct) / 2;
  const screenRadiusXPct = (screenMaskCornerRadius / SCREEN_NATIVE_WIDTH) * 100;
  const screenRadiusYPct = (screenMaskCornerRadius / SCREEN_NATIVE_HEIGHT) * 100;
  const screenClassName = debugOutlines ? "mockup-studio-debug-outlines" : "";

  const screenNode = customScreenSrc ? (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        borderRadius: customScreenCornerRadius,
        ...(cornerSmoothing
          ? ({ cornerShape: "squircle" } as React.CSSProperties)
          : {}),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={customScreenSrc}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-cover"
      />
    </div>
  ) : activeScreenId === "virtual-account-selection" ? (
    <AccountSetupScreen
      blurRadius={blurRadius}
      data={accountData}
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      className={screenClassName}
      topEdgeHeight={topEdgeHeight}
      topEdgeOffset={topEdgeOffset}
      bottomEdgeHeight={bottomEdgeHeight}
      bottomEdgeOffset={bottomEdgeOffset}
    />
  ) : activeScreenId === "virtual-account-profile-page" ? (
    <AccountProfileScreen
      blurRadius={blurRadius}
      data={accountData}
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      className={screenClassName}
      topEdgeHeight={topEdgeHeight}
      topEdgeOffset={topEdgeOffset}
      bottomEdgeHeight={bottomEdgeHeight}
      bottomEdgeOffset={bottomEdgeOffset}
    />
  ) : activeScreenId === "virtual-account-bank-selection" ? (
    <BankSelectionScreen
      selectedVariantIds={bankSelectionIds}
      onToggleVariant={onToggleBankSelection}
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      className={screenClassName}
    />
  ) : activeScreenId === "card-screen" ? (
    <CardScreen
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      className={screenClassName}
      transactions={cardTransactions}
      blurRadius={blurRadius}
      topEdgeHeight={topEdgeHeight}
      topEdgeOffset={topEdgeOffset}
      bottomEdgeHeight={bottomEdgeHeight}
      bottomEdgeOffset={bottomEdgeOffset}
    />
  ) : null;

  // The screen goes into the 3D scene as a texture rather than as DOM floating
  // in front of the canvas. `screenSourceRef` points at the off-screen copy
  // rendered below; the hook watches it and re-rasterises when it changes.
  const screenSourceRef = useRef<HTMLDivElement | null>(null);
  // `customScreenSrc` covers both the uploaded mockup and the built-in
  // presets — both are images, so both take the direct path.
  const screenTexture = useScreenTexture(screenSourceRef, customScreenSrc);

  // The screen DOM, rendered off-screen at native size purely so it can be
  // rasterised into a texture.
  //
  // Portalled to <body> rather than rendered in place: in the tree it would sit
  // inside the export node, which is `overflow-hidden` and sits under
  // transformed ancestors — that clips it (a clipped element captures blank)
  // and would also put a stray second copy of the screen into every export.
  //
  // It has to be laid out for real; `display:none` captures nothing. So it is
  // pushed out of view instead, and `aria-hidden` keeps this duplicate out of
  // the accessibility tree.
  const screenSource =
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={screenSourceRef}
            aria-hidden
            style={{
              position: "fixed",
              left: -10000,
              top: 0,
              width: SCREEN_TEXTURE_WIDTH,
              height: SCREEN_TEXTURE_HEIGHT,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {screenNode}
          </div>,
          document.body,
        )
      : null;

  const aspectRatioOption = CANVAS_ASPECT_RATIO_OPTIONS.find((o) => o.id === aspectRatio);
  const aspectRatioValue = aspectRatioOption?.ratio ?? null;
  const alignmentClasses = alignmentToFlexClasses(alignment);

  return (
    <div className="relative min-w-0 flex-1 self-stretch overflow-hidden">
      <div className="h-full w-full p-[var(--space-24)]">
        <RatioContainer ratio={aspectRatioValue}>
          <div ref={exportRef} className="relative h-full w-full overflow-hidden">
          <CanvasBackgroundLayer
            backgroundId={backgroundId}
            customBackgroundSrc={customBackgroundSrc}
            solidBackgroundColor={solidBackgroundColor}
            dotsBackgroundColor={dotsBackgroundColor}
            dotsColor={dotsColor}
            gradientTopColor={gradientTopColor}
            gradientBottomColor={gradientBottomColor}
          />
          <CanvasWatermark position={watermarkPosition} />
          {screenSource}
          {rail || screenNode ? (
            <div
              data-phone-stage-3d
              className="absolute inset-0"
              style={{
                visibility: is3DEnabled ? "visible" : "hidden",
                pointerEvents: is3DEnabled ? "auto" : "none",
              }}
            >
              <PhoneStage3D
                rail={rail}
                screenTexture={screenTexture}
                blur={blur}
                rotateX={phoneRotateX}
                rotateY={phoneRotateY}
                rotateZ={phoneRotateZ}
                offsetX={phoneOffsetXValue}
                offsetY={phoneOffsetYValue}
                scale={phoneScaleValue}
                heightPct={heightPct}
                canvasRef={webglCanvasRef}
                captureRef={stageCaptureRef}
                onRotateDrag={onPointerRotateDrag}
              />
            </div>
          ) : null}
          <div
            className={`relative flex h-full w-full p-[var(--space-40)] ${alignmentClasses} ${
              is3DEnabled && (rail || screenNode) ? "hidden" : ""
            }`}
          >
        {rail || screenNode ? (
          <div
            className="relative"
            style={{
              height: `${heightPct}%`,
              aspectRatio: rail ? `${railAspect}` : `${screenAspect}`,
              transform: phoneTransform ?? "translate(0px, 0px) scale(1) rotate(0deg)",
              transformOrigin: "center center",
              transition:
                "transform 320ms cubic-bezier(0.32, 0.72, 0, 1), " +
                "height 320ms cubic-bezier(0.32, 0.72, 0, 1), " +
                "aspect-ratio 320ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {shadowDirection !== "off" && rail ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                aria-hidden
                alt=""
                src={rail.previewSrc}
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                style={{ filter: shadowFilterValueFor(shadowDirection) }}
              />
            ) : null}
            {shadowDirection !== "off" && !rail ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  borderRadius: "11% / 5%",
                  boxShadow: shadowBoxValueFor(shadowDirection),
                }}
              />
            ) : null}
            {screenNode ? (
              <div
                className="absolute overflow-hidden"
                style={{
                  left: rail ? `${screenLeftPct}%` : "0%",
                  top: rail ? `${screenTopPct}%` : "0%",
                  width: rail ? `${screenWidthPct}%` : "100%",
                  height: rail ? `${screenHeightPct}%` : "100%",
                  borderRadius: rail
                    ? `${screenRadiusXPct}% / ${screenRadiusYPct}%`
                    : "0",
                  transition:
                    "left 320ms cubic-bezier(0.32, 0.72, 0, 1), " +
                    "top 320ms cubic-bezier(0.32, 0.72, 0, 1), " +
                    "width 320ms cubic-bezier(0.32, 0.72, 0, 1), " +
                    "height 320ms cubic-bezier(0.32, 0.72, 0, 1), " +
                    "border-radius 320ms cubic-bezier(0.32, 0.72, 0, 1)",
                  ...(cornerSmoothing
                    ? ({ cornerShape: "squircle" } as React.CSSProperties)
                    : {}),
                }}
              >
                <ScaledScreen>{screenNode}</ScaledScreen>
              </div>
            ) : null}
            {rail ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt={rail.label}
                src={rail.previewSrc}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                draggable={false}
              />
            ) : null}
          </div>
        ) : null}
          </div>
          </div>
        </RatioContainer>
      </div>
    </div>
  );
}

export default function MockupStudioClient() {
  const [controlsView, setControlsView] = useState<ControlsView>("edit");
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("png");
  const [selectedSizeId, setSelectedSizeId] = useState<SizeId>("large");
  const [selectedBackgroundId, setSelectedBackgroundId] =
    useState<CanvasBackgroundId>("solid");
  const [selectedSolidBackgroundMode, setSelectedSolidBackgroundMode] =
    useState<SolidBackgroundMode>("hex");
  const [selectedSolidBackgroundHue, setSelectedSolidBackgroundHue] = useState<number>(
    DEFAULT_SOLID_BACKGROUND_HUE,
  );
  const [selectedSolidBackgroundGrayscale, setSelectedSolidBackgroundGrayscale] = useState<number>(
    DEFAULT_SOLID_BACKGROUND_GRAYSCALE,
  );
  const [selectedSolidBackgroundHex, setSelectedSolidBackgroundHex] = useState<string>(
    DEFAULT_SOLID_BACKGROUND_HEX,
  );
  const [customBackgroundSrc, setCustomBackgroundSrc] = useState<string | null>(null);
  const [customScreenSrc, setCustomScreenSrc] = useState<string | null>(null);
  const [customScreenCornerRadius, setCustomScreenCornerRadius] = useState<number>(96);
  const [dotsBackgroundColor, setDotsBackgroundColor] = useState<string>(
    DEFAULT_DOTS_BACKGROUND_COLOR,
  );
  const [dotsColor, setDotsColor] = useState<string>(DEFAULT_DOTS_COLOR);
  const [gradientTopColor, setGradientTopColor] = useState<string>(DEFAULT_GRADIENT_TOP_COLOR);
  const [gradientBottomColor, setGradientBottomColor] = useState<string>(
    DEFAULT_GRADIENT_BOTTOM_COLOR,
  );
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>("off");
  const [shadowDirection, setShadowDirection] = useState<ShadowDirection>("off");
  const [phoneOffsetX, setPhoneOffsetX] = useState<number>(0);
  const [phoneOffsetY, setPhoneOffsetY] = useState<number>(0);
  const [phoneScale, setPhoneScale] = useState<number>(100);
  const [phoneRotation, setPhoneRotation] = useState<number>(0);
  const [phoneRotateX, setPhoneRotateX] = useState<number>(0);
  const [phoneRotateY, setPhoneRotateY] = useState<number>(0);
  const [is3DEnabled, setIs3DEnabled] = useState<boolean>(false);
  // A camera preset writes the same state the sliders drive, so the transform
  // easing in PhoneStage3D carries the phone to it. Presets that only read
  // correctly in 3D turn the toggle on rather than silently doing nothing.
  const applyCameraPreset = (id: string) => {
    const preset = CAMERA_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (preset.requires3D) setIs3DEnabled(true);
    if (preset.id === "flat") setIs3DEnabled(false);
    setPhoneRotateX(preset.rotateX);
    setPhoneRotateY(preset.rotateY);
    setPhoneRotation(preset.rotateZ);
    setPhoneScale(preset.scale);
    setPhoneOffsetX(preset.offsetX);
    setPhoneOffsetY(preset.offsetY);
  };

  const resetPhoneTransform = () => {
    setPhoneOffsetX(0);
    setPhoneOffsetY(0);
    setPhoneScale(100);
    setPhoneRotation(0);
    setPhoneRotateX(0);
    setPhoneRotateY(0);
  };
  const [canvasAlignment, setCanvasAlignment] = useState<CanvasAlignment>("middle-center");
  const [canvasAspectRatio, setCanvasAspectRatio] = useState<CanvasAspectRatio>("fit");
  const [selectedRailId, setSelectedRailId] = useState<RailId | null>(null);
  const [accountVariantByFlow, setAccountVariantByFlow] = useState<
    Partial<Record<string, AccountVariantId>>
  >({});
  const [fieldPresetIndexByFlow, setFieldPresetIndexByFlow] = useState<
    Partial<Record<string, number>>
  >({});
  const [bankSelectionIds, setBankSelectionIds] = useState<
    ReadonlyArray<BankSelectionVariantId>
  >([]);
  const [selectedFlowId, setSelectedFlowId] = useState(DEFAULT_FLOW_ID);
  const selectedAccountVariantId: AccountVariantId =
    accountVariantByFlow[selectedFlowId] ?? "usd";
  const selectedFieldPresetIndex = fieldPresetIndexByFlow[selectedFlowId] ?? 0;
  const [transactions, setTransactions] = useState<Transaction[]>(
    () => generateTransactions(DEFAULT_ACCOUNT_TRANSACTION_COUNT),
  );
  const [cardTransactions, setCardTransactions] = useState<Transaction[]>(
    DEFAULT_CARD_TRANSACTIONS,
  );
  const [cardTransactionsFilled, setCardTransactionsFilled] = useState(false);
  const [cornerRadius, setCornerRadius] = useState<number>(55);
  const [cornerSmoothing, setCornerSmoothing] = useState(true);
  const [debugOutlines, setDebugOutlines] = useState(false);
  const canvasExportRef = useRef<HTMLDivElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageCaptureRef = useRef<StageCapture | null>(null);
  const [blur, setBlur] = useState<BlurSettings>(DEFAULT_BLUR);
  const [cameraMode, setCameraMode] = useState<"manual" | "presets">("manual");

  // ── Shots (timeline, stage one) ────────────────────────────────────────
  // A shot is a snapshot of the camera and lens. Stage two interpolates
  // between them over a duration; for now clicking one restores it.
  const [shots, setShots] = useState<Shot[]>([]);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);

  const currentShotState = () => ({
    rotateX: phoneRotateX,
    rotateY: phoneRotateY,
    rotateZ: phoneRotation,
    scale: phoneScale,
    offsetX: phoneOffsetX,
    offsetY: phoneOffsetY,
    blur,
    is3DEnabled,
  });

  const addShot = () => {
    const shot = createShot(currentShotState());
    setShots((prev) => [...prev, shot]);
    setActiveShotId(shot.id);
  };

  const applyShot = (id: string) => {
    const shot = shots.find((s) => s.id === id);
    if (!shot) return;
    const next = shotToState(shot);
    setPhoneRotateX(next.rotateX);
    setPhoneRotateY(next.rotateY);
    setPhoneRotation(next.rotateZ);
    setPhoneScale(next.scale);
    setPhoneOffsetX(next.offsetX);
    setPhoneOffsetY(next.offsetY);
    setBlur(next.blur);
    setIs3DEnabled(next.is3DEnabled);
    setActiveShotId(id);
  };

  // Re-capture in place, so refining a shot does not mean deleting and re-adding.
  const updateShot = (id: string) => {
    const next = currentShotState();
    setShots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...next } : s)),
    );
  };

  const removeShot = (id: string) => {
    setShots((prev) => prev.filter((s) => s.id !== id));
    setActiveShotId((prev) => (prev === id ? null : prev));
  };


  const handleDownload = async () => {
    const node = canvasExportRef.current;
    if (!node) return;

    const restores: Array<() => void> = [];
    const elements = node.querySelectorAll<HTMLElement>("*");

    elements.forEach((el) => {
      if (el.scrollTop > 0) {
        const firstChild = el.firstElementChild as HTMLElement | null;
        if (!firstChild) return;
        const prevMargin = firstChild.style.marginTop;
        const prevScrollTop = el.scrollTop;
        firstChild.style.marginTop = `${-prevScrollTop}px`;
        el.scrollTop = 0;
        restores.push(() => {
          firstChild.style.marginTop = prevMargin;
          el.scrollTop = prevScrollTop;
        });
      }
    });

    elements.forEach((el) => {
      const cs = window.getComputedStyle(el);
      const backdrop =
        cs.backdropFilter ||
        (cs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter;
      if (!backdrop || backdrop === "none") return;
      const bg = cs.backgroundColor;
      const match = bg.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
      );
      if (!match) return;
      const alpha = match[4] === undefined ? 1 : parseFloat(match[4]);
      if (alpha < 0.3 || alpha >= 0.92) return;
      if (el.classList.contains("btn-base")) return;
      const prevCssText = el.style.cssText;
      el.style.backgroundColor = `rgba(${match[1]}, ${match[2]}, ${match[3]}, 0.95)`;
      restores.push(() => {
        el.style.cssText = prevCssText;
      });
    });

    elements.forEach((el) => {
      const cs = window.getComputedStyle(el);
      const composite =
        (cs as unknown as { maskComposite?: string }).maskComposite ||
        (cs as unknown as { webkitMaskComposite?: string }).webkitMaskComposite ||
        "";
      const maskImage =
        (cs as unknown as { maskImage?: string }).maskImage ||
        (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage ||
        cs.mask ||
        "";
      const hasMaskComposite = /exclude|xor/i.test(composite);
      const gradientLayerCount = maskImage && maskImage !== "none"
        ? (maskImage.match(/linear-gradient\(|radial-gradient\(|conic-gradient\(/g) ?? []).length
        : 0;
      const hasMultipleMaskLayers = gradientLayerCount > 1;
      if (!hasMaskComposite && !hasMultipleMaskLayers) return;
      const prevCssText = el.style.cssText;
      el.style.display = "none";
      restores.push(() => {
        el.style.cssText = prevCssText;
      });
    });

    node.querySelectorAll<HTMLElement>(".btn-base").forEach((el) => {
      const prevCssText = el.style.cssText;

      const csOuter = window.getComputedStyle(el);
      if (csOuter.display === "inline-flex") {
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
      }

      el.querySelectorAll<HTMLElement>(":scope > span").forEach((span) => {
        const csSpan = window.getComputedStyle(span);
        if (csSpan.display === "inline-flex") {
          const prevSpanCssText = span.style.cssText;
          span.style.display = "flex";
          restores.push(() => {
            span.style.cssText = prevSpanCssText;
          });
        }
      });

      el.style.backdropFilter = "none";
      (el.style as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter =
        "none";

      const cs = window.getComputedStyle(el);
      const bg = cs.backgroundColor;
      const match = bg.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
      );
      const fillColor = match
        ? `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${
            match[4] === undefined || parseFloat(match[4]) < 0.92 ? "0.95" : match[4]
          })`
        : bg;

      const direction = el.offsetWidth <= el.offsetHeight + 4 ? "150deg" : "170deg";
      const ringGradient = `linear-gradient(${direction}, rgba(255,255,255,0.32) 10%, rgba(0,0,0,0.03) 50%, rgba(255,255,255,0.32) 90%)`;
      el.style.background = `linear-gradient(${fillColor}, ${fillColor}) padding-box, ${ringGradient} border-box`;
      el.style.borderColor = "transparent";
      el.style.borderStyle = "solid";
      el.style.borderWidth = "1px";

      restores.push(() => {
        el.style.cssText = prevCssText;
      });
    });

    try {
      // Inline external CSS background-image references. SVG backgrounds in
      // particular don't render reliably through html-to-image's foreignObject
      // pipeline, so we rasterize SVGs to PNG via a same-origin canvas first.
      // Non-SVG URLs fall back to a plain blob → data URI swap.
      const bgInlineCache = new Map<string, string>();
      const bgCandidates = Array.from(node.querySelectorAll<HTMLElement>("*"));
      for (const el of bgCandidates) {
        const cs = window.getComputedStyle(el);
        const bg = cs.backgroundImage;
        if (!bg || bg === "none") continue;
        const urlMatch = bg.match(
          /url\(["']?((?:https?:\/\/|\/)[^"')]+)["']?\)/,
        );
        if (!urlMatch) continue;
        const rawUrl = urlMatch[1];
        if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) continue;
        const isSvg = /\.svg($|\?)/i.test(rawUrl);
        const rect = el.getBoundingClientRect();
        const cacheKey = isSvg
          ? `${rawUrl}@${Math.round(rect.width)}x${Math.round(rect.height)}`
          : rawUrl;
        let dataUri = bgInlineCache.get(cacheKey);
        if (!dataUri) {
          try {
            if (isSvg && rect.width > 0 && rect.height > 0) {
              const res = await fetch(rawUrl);
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              const img = new Image();
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("svg image load failed"));
                img.src = blobUrl;
              });
              const pixelRatio = 3;
              const cw = Math.round(rect.width * pixelRatio);
              const ch = Math.round(rect.height * pixelRatio);
              const canvas = document.createElement("canvas");
              canvas.width = cw;
              canvas.height = ch;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, cw, ch);
                dataUri = canvas.toDataURL("image/png");
              }
              URL.revokeObjectURL(blobUrl);
            } else {
              const res = await fetch(rawUrl);
              const blob = await res.blob();
              dataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
              });
            }
            if (dataUri) bgInlineCache.set(cacheKey, dataUri);
          } catch {
            continue;
          }
        }
        if (!dataUri) continue;
        const prevCssText = el.style.cssText;
        el.style.backgroundImage = `url("${dataUri}")`;
        restores.push(() => {
          el.style.cssText = prevCssText;
        });
      }

      const images = Array.from(node.querySelectorAll<HTMLImageElement>("img"));

      const imgSrcRestores: Array<() => void> = [];
      images.forEach((img) => {
        const currentSrc = img.getAttribute("src") ?? "";
        const currentSrcset = img.getAttribute("srcset");
        const match = currentSrc.match(/^\/_next\/image\?url=([^&]+)/);
        if (match) {
          const originalUrl = decodeURIComponent(match[1]);
          img.setAttribute("src", originalUrl);
          if (currentSrcset) img.removeAttribute("srcset");
          imgSrcRestores.push(() => {
            img.setAttribute("src", currentSrc);
            if (currentSrcset) img.setAttribute("srcset", currentSrcset);
          });
        } else if (currentSrcset) {
          img.removeAttribute("srcset");
          imgSrcRestores.push(() => {
            img.setAttribute("srcset", currentSrcset);
          });
        }
      });
      restores.push(...imgSrcRestores);

      await Promise.all(
        images.map(async (img) => {
          if (!img.complete || img.naturalWidth === 0) {
            await new Promise<void>((resolve) => {
              const done = () => {
                img.removeEventListener("load", done);
                img.removeEventListener("error", done);
                resolve();
              };
              img.addEventListener("load", done);
              img.addEventListener("error", done);
              setTimeout(done, 2000);
            });
          }
          if (typeof img.decode === "function") {
            try {
              await img.decode();
            } catch {
              /* ignore decode errors */
            }
          }
        }),
      );
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Stand a captured still in for the live canvas during the DOM capture.
      //
      // html-to-image reads a <canvas> by calling toDataURL on it, and with
      // `preserveDrawingBuffer` off (and a demand-driven loop) there is no
      // guarantee anything is in the buffer by then. So the scene renders once
      // on request, at export resolution, and the result goes in as an <img>
      // that html-to-image can read like any other image.
      const webglCanvas = webglCanvasRef.current;
      if (is3DEnabled && webglCanvas && stageCaptureRef.current) {
        const shot = stageCaptureRef.current(3);
        if (shot) {
          const stand = document.createElement("img");
          stand.src = shot;
          // Match the canvas's own box exactly — the phone's position in the
          // composition is set by CSS, not by the image's intrinsic size.
          stand.style.cssText = webglCanvas.style.cssText;
          stand.className = webglCanvas.className;
          stand.style.width = `${webglCanvas.clientWidth}px`;
          stand.style.height = `${webglCanvas.clientHeight}px`;
          const parent = webglCanvas.parentElement;
          if (parent) {
            const prevCanvasDisplay = webglCanvas.style.display;
            webglCanvas.style.display = "none";
            parent.appendChild(stand);
            await stand.decode().catch(() => {});
            restores.push(() => {
              stand.remove();
              webglCanvas.style.display = prevCanvasDisplay;
            });
          }
        }
      }

      const formatOption =
        DOWNLOAD_FORMAT_OPTIONS.find((opt) => opt.id === downloadFormat) ??
        DOWNLOAD_FORMAT_OPTIONS[0];

      // PNG export = transparent background: hide the canvas background layer
      // for the duration of the capture, restore after. JPG and WebP keep the
      // background since JPG can't store alpha and the user explicitly chose
      // the with-background formats.
      if (formatOption.id === "png") {
        node
          .querySelectorAll<HTMLElement>("[data-canvas-background]")
          .forEach((el) => {
            const prevCssText = el.style.cssText;
            el.style.display = "none";
            restores.push(() => {
              el.style.cssText = prevCssText;
            });
          });
      }

      let dataUrl: string;
      if (formatOption.id === "jpg") {
        dataUrl = await toJpeg(node, { pixelRatio: 3, quality: 0.92 });
      } else if (formatOption.id === "webp") {
        const canvas = await toCanvas(node, { pixelRatio: 3 });
        dataUrl = canvas.toDataURL("image/webp", 0.92);
      } else {
        dataUrl = await toPng(node, {
          pixelRatio: 3,
          backgroundColor: undefined,
        });
      }

      const link = document.createElement("a");
      link.download = `mockup-studio-${Date.now()}.${formatOption.extension}`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("MockupStudio download failed", error);
    } finally {
      for (let i = restores.length - 1; i >= 0; i--) restores[i]();
    }
  };

  // When debug outlines are on, periodically write each tagged element's
  // native (transform-independent) dimensions to data-debug-size so the
  // CSS ::after label can render "<Name> WxH". offsetWidth/offsetHeight
  // ignore the parent's transform: scale(), giving us native screen px.
  useEffect(() => {
    if (!debugOutlines) return;
    let raf = 0;
    const measure = () => {
      const root = document.querySelector<HTMLElement>(".mockup-studio-debug-outlines");
      if (!root) return;
      const elements = root.querySelectorAll<HTMLElement>("[data-debug-name]");
      elements.forEach((el) => {
        el.setAttribute(
          "data-debug-size",
          `${Math.round(el.offsetWidth)}×${Math.round(el.offsetHeight)}`,
        );
      });
    };
    const tick = () => {
      measure();
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [debugOutlines]);
  const selectedRail: RailOption | undefined =
    RAIL_OPTIONS.find((option) => option.id === selectedRailId);
  const selectedSize =
    PHONE_SIZE_OPTIONS.find((option) => option.id === selectedSizeId) ?? PHONE_SIZE_OPTIONS[0];
  const selectedAccountVariant = ACCOUNT_VARIANTS[selectedAccountVariantId];
  const availableFieldPresets = ACCOUNT_FIELD_PRESETS[selectedAccountVariantId];
  const selectedFieldPreset =
    availableFieldPresets[selectedFieldPresetIndex % availableFieldPresets.length] ??
    availableFieldPresets[0];
  const accountData = {
    title: selectedAccountVariant.title,
    description: selectedAccountVariant.description,
    titleFlagSrc: selectedAccountVariant.flagSrc,
    backdropFlagSrc: selectedAccountVariant.flagSrc,
    artworkSrc: selectedAccountVariant.artworkSrc,
    bankRows: [
      { label: "Account number", value: selectedFieldPreset.accountNumber },
      { label: "Routing number", value: selectedFieldPreset.routingNumber },
      { label: "Account name", value: selectedFieldPreset.accountName },
      { label: "Bank Address", value: selectedAccountVariant.bankAddress },
    ],
    transactions,
    variantId: selectedAccountVariantId,
  };
  const activeScreenId =
    selectedFlowId === "virtual-account-profile-page" ||
    selectedFlowId === "virtual-account-selection" ||
    selectedFlowId === "virtual-account-bank-selection" ||
    selectedFlowId === "card-screen"
      ? selectedFlowId
      : null;
  const showBackgroundControls = controlsView === "backgrounds";
  const phoneTransform = showBackgroundControls
    ? `translate(${phoneOffsetX}px, ${phoneOffsetY}px) scale(${phoneScale / 100}) rotate(${phoneRotation}deg)`
    : undefined;
  const selectedSolidBackgroundColor =
    selectedSolidBackgroundMode === "hex"
      ? solidBackgroundColorFromHex(selectedSolidBackgroundHex)
      : selectedSolidBackgroundMode === "grayscale"
        ? solidBackgroundColorFromGrayscale(selectedSolidBackgroundGrayscale)
        : solidBackgroundColorFromHue(selectedSolidBackgroundHue);

  const editFixedLargeSize =
    PHONE_SIZE_OPTIONS.find((option) => option.id === "large") ?? PHONE_SIZE_OPTIONS[0];
  const canvasHeightPct = showBackgroundControls
    ? selectedSize.heightPct
    : editFixedLargeSize.heightPct;
  const canvasBackgroundId: CanvasBackgroundId = showBackgroundControls
    ? selectedBackgroundId
    : "solid";
  const canvasSolidBackgroundColor = showBackgroundControls
    ? selectedSolidBackgroundColor
    : EDIT_FIXED_BACKGROUND_COLOR;
  const canvasCustomBackgroundSrc = showBackgroundControls ? customBackgroundSrc : null;
  const canvasEffectiveAlignment: CanvasAlignment = showBackgroundControls
    ? canvasAlignment
    : "middle-center";
  const canvasEffectiveAspectRatio: CanvasAspectRatio = showBackgroundControls
    ? canvasAspectRatio
    : "fit";
  const canvasEffectiveRail: RailOption | undefined = showBackgroundControls
    ? selectedRail
    : undefined;

  return (
    <main className="h-screen overflow-hidden bg-[#050505] text-white">
      {debugOutlines ? (
        <style>{`
          /* Debug outline color cascade — set --debug-color on each tagged
             group; descendants inherit via CSS variable cascade and recolor
             both their outline and any nested label badge automatically. */
          .mockup-studio-debug-outlines { --debug-color: 255, 0, 153; }
          .mockup-studio-debug-outlines [data-debug-group="screen"] { --debug-color: 255, 80, 80; }
          .mockup-studio-debug-outlines [data-debug-group="chrome"] { --debug-color: 255, 165, 0; }
          .mockup-studio-debug-outlines [data-debug-group="card"]   { --debug-color: 80, 200, 120; }
          .mockup-studio-debug-outlines [data-debug-group="row"]    { --debug-color: 255, 220, 80; }
          .mockup-studio-debug-outlines [data-debug-group="title"]  { --debug-color: 200, 140, 255; }
          .mockup-studio-debug-outlines [data-debug-group="button"] { --debug-color: 120, 180, 255; }

          .mockup-studio-debug-outlines,
          .mockup-studio-debug-outlines * {
            outline: 1px solid rgba(var(--debug-color, 255, 0, 153), 0.85) !important;
            outline-offset: -1px !important;
          }
          .mockup-studio-debug-outlines [data-debug-name]::after {
            content: attr(data-debug-name) ' ' attr(data-debug-size);
            position: absolute;
            top: 0;
            left: 0;
            z-index: 999999;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 9px;
            line-height: 11px;
            padding: 1px 4px;
            background: rgba(var(--debug-color, 255, 0, 153), 0.95);
            color: white;
            white-space: nowrap;
            pointer-events: none;
            border-bottom-right-radius: 3px;
            letter-spacing: 0.2px;
          }
        `}</style>
      ) : null}
      <div className="hidden h-screen items-center justify-center px-[var(--space-24)] max-laptop:flex">
        <GlassCard
          disableInteractionGlow
          className="max-w-[560px] rounded-[24px] border border-white/8"
        >
          <div className="space-y-[var(--space-16)] px-[var(--space-24)] py-[var(--space-24)] text-center">
            <KoshLogo tone="light" width={132} height={28} priority className="mx-auto" />
            <p className="text-[15px] leading-[22px] text-white/58">
              MockupStudio layout is desktop-first for now.
            </p>
          </div>
        </GlassCard>
      </div>

      <div className="hidden h-full laptop:block">
        <div className="flex h-full w-full items-stretch bg-[#050505] p-[var(--space-8)]">
          <div
            className={`overflow-hidden transition-[width,opacity,transform,margin] duration-400 ease-out ${
              showBackgroundControls
                ? "mr-0 w-0 -translate-x-[18px] opacity-0"
                : "mr-0 w-[410px] translate-x-0 opacity-100"
            }`}
          >
            <SceneTree
              selectedFlowId={selectedFlowId}
              onSelectFlow={(id) => {
                setSelectedFlowId(id);
                setCustomScreenSrc(null);
              }}
              customScreenSrc={customScreenSrc}
              onCustomScreenUpload={(file) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result;
                  if (typeof result !== "string") return;
                  setCustomScreenSrc(result);
                };
                reader.readAsDataURL(file);
              }}
              onClearCustomScreen={() => setCustomScreenSrc(null)}
              onSelectPreset={(src) => setCustomScreenSrc(src)}
            />
          </div>
          <div
            className={`flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-[#0a0a0a] transition-[margin] duration-400 ease-out ${
              showBackgroundControls ? "ml-0 mr-[var(--space-12)]" : "mx-[var(--space-12)]"
            }`}
          >
            <div className="flex min-h-0 flex-1">
              <Canvas
                rail={canvasEffectiveRail}
                heightPct={canvasHeightPct}
                activeScreenId={activeScreenId}
                blurRadius={FIXED_BLUR_RADIUS}
                accountData={accountData}
                onSelectAccountVariant={(id) => {
                  setAccountVariantByFlow((prev) => ({ ...prev, [selectedFlowId]: id }));
                  setFieldPresetIndexByFlow((prev) => ({ ...prev, [selectedFlowId]: 0 }));
                }}
                bankSelectionIds={bankSelectionIds}
                onToggleBankSelection={(id) => {
                  setBankSelectionIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                  );
                }}
                cardTransactions={cardTransactionsFilled ? cardTransactions : []}
                screenMaskScale={LOCKED_SCREEN_MASK_SCALE}
                screenMaskCornerRadius={LOCKED_SCREEN_MASK_CORNER_RADIUS}
                cornerRadius={cornerRadius}
                cornerSmoothing={cornerSmoothing}
                debugOutlines={debugOutlines}
                topEdgeHeight={LOCKED_TOP_EDGE_HEIGHT}
                topEdgeOffset={LOCKED_TOP_EDGE_OFFSET}
                bottomEdgeHeight={LOCKED_BOTTOM_EDGE_HEIGHT}
                bottomEdgeOffset={LOCKED_BOTTOM_EDGE_OFFSET}
                backgroundId={canvasBackgroundId}
                customBackgroundSrc={canvasCustomBackgroundSrc}
                solidBackgroundColor={canvasSolidBackgroundColor}
                dotsBackgroundColor={dotsBackgroundColor}
                dotsColor={dotsColor}
                gradientTopColor={gradientTopColor}
                gradientBottomColor={gradientBottomColor}
                watermarkPosition={showBackgroundControls ? watermarkPosition : "off"}
                shadowDirection={showBackgroundControls ? shadowDirection : "off"}
                phoneTransform={phoneTransform}
                is3DEnabled={showBackgroundControls && is3DEnabled}
                phoneRotateX={phoneRotateX}
                phoneRotateY={phoneRotateY}
                phoneRotateZ={phoneRotation}
                phoneOffsetXValue={phoneOffsetX}
                phoneOffsetYValue={phoneOffsetY}
                phoneScaleValue={phoneScale}
                webglCanvasRef={webglCanvasRef}
                stageCaptureRef={stageCaptureRef}
                blur={blur}
                onPointerRotateDrag={({ dx, dy }) => {
                  setPhoneRotateY((prev) => Math.max(-180, Math.min(180, prev + dx * 0.5)));
                  setPhoneRotateX((prev) => Math.max(-180, Math.min(180, prev + dy * 0.5)));
                }}
                alignment={canvasEffectiveAlignment}
                aspectRatio={canvasEffectiveAspectRatio}
                exportRef={canvasExportRef}
                customScreenSrc={customScreenSrc}
                customScreenCornerRadius={customScreenCornerRadius}
              />
            </div>
            {/* Where ultramock puts its track list. Stage one shows shots as
                chips; stage two turns each into a clip with a duration and
                adds a ruler and playhead beneath. */}
            <div className="shrink-0 border-t border-white/[0.06]">
              <ShotStrip
                shots={shots}
                activeShotId={activeShotId}
                onAdd={addShot}
                onSelect={applyShot}
                onUpdate={updateShot}
                onRemove={removeShot}
              />
            </div>
          </div>
          <RightControls
                selectedFlowId={selectedFlowId}
                controlsView={controlsView}
                onOpenBackgrounds={() => setControlsView("backgrounds")}
                onCloseBackgrounds={() => setControlsView("edit")}
                selectedSizeId={selectedSizeId}
                onSelectSize={setSelectedSizeId}
                selectedAccountVariantId={selectedAccountVariantId}
                onSelectAccountVariant={(id) => {
                  setAccountVariantByFlow((prev) => ({ ...prev, [selectedFlowId]: id }));
                  setFieldPresetIndexByFlow((prev) => ({ ...prev, [selectedFlowId]: 0 }));
                }}
                onRandomizeFields={() => {
                  if (availableFieldPresets.length <= 1) return;
                  setFieldPresetIndexByFlow((prev) => {
                    const current = prev[selectedFlowId] ?? 0;
                    let next = current;
                    while (next === current) {
                      next = Math.floor(Math.random() * availableFieldPresets.length);
                    }
                    return { ...prev, [selectedFlowId]: next };
                  });
                }}
                onRandomizeTransactions={() => {
                  if (selectedFlowId === "card-screen") {
                    setCardTransactions(generateCardTransactions(10));
                  } else {
                    setTransactions(generateTransactions(DEFAULT_ACCOUNT_TRANSACTION_COUNT));
                  }
                }}
                cornerRadius={customScreenSrc ? customScreenCornerRadius : cornerRadius}
                onCornerRadiusChange={
                  customScreenSrc ? setCustomScreenCornerRadius : setCornerRadius
                }
                cornerSmoothing={cornerSmoothing}
                onCornerSmoothingChange={setCornerSmoothing}
                cardTransactionsFilled={cardTransactionsFilled}
                onCardTransactionsFilledChange={setCardTransactionsFilled}
                debugOutlines={debugOutlines}
                onDebugOutlinesChange={setDebugOutlines}
                selectedBackgroundId={selectedBackgroundId}
                customBackgroundSrc={customBackgroundSrc}
                selectedSolidBackgroundHue={selectedSolidBackgroundHue}
                selectedSolidBackgroundGrayscale={selectedSolidBackgroundGrayscale}
                selectedSolidBackgroundHex={selectedSolidBackgroundHex}
                resolvedSolidBackgroundColor={selectedSolidBackgroundColor}
                onSelectBackground={setSelectedBackgroundId}
                onSelectSolidBackgroundHue={(value) => {
                  setSelectedSolidBackgroundMode("spectrum");
                  setSelectedSolidBackgroundHue(value);
                }}
                onSelectSolidBackgroundGrayscale={(value) => {
                  setSelectedSolidBackgroundMode("grayscale");
                  setSelectedSolidBackgroundGrayscale(value);
                }}
                onSelectSolidBackgroundHex={(value) => {
                  setSelectedSolidBackgroundHex(value);
                  setSelectedSolidBackgroundMode("hex");
                }}
                onSelectCustomBackgroundFile={(file) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result;
                    if (typeof result !== "string") return;
                    setCustomBackgroundSrc(result);
                    setSelectedBackgroundId("custom");
                  };
                  reader.readAsDataURL(file);
                }}
                canvasAlignment={canvasAlignment}
                onCanvasAlignmentChange={setCanvasAlignment}
                canvasAspectRatio={canvasAspectRatio}
                onCanvasAspectRatioChange={setCanvasAspectRatio}
                selectedRailId={selectedRailId}
                onSelectRailId={setSelectedRailId}
                dotsBackgroundColor={dotsBackgroundColor}
                dotsColor={dotsColor}
                onDotsBackgroundColorChange={setDotsBackgroundColor}
                onDotsColorChange={setDotsColor}
                gradientTopColor={gradientTopColor}
                gradientBottomColor={gradientBottomColor}
                onGradientTopColorChange={setGradientTopColor}
                onGradientBottomColorChange={setGradientBottomColor}
                watermarkPosition={watermarkPosition}
                cameraMode={cameraMode}
                onCameraModeChange={setCameraMode}
                onCameraPreset={applyCameraPreset}
                blur={blur}
                onBlurChange={setBlur}
                onWatermarkPositionChange={setWatermarkPosition}
                shadowDirection={shadowDirection}
                onShadowDirectionChange={setShadowDirection}
                phoneOffsetX={phoneOffsetX}
                phoneOffsetY={phoneOffsetY}
                phoneScale={phoneScale}
                phoneRotation={phoneRotation}
                onPhoneOffsetXChange={setPhoneOffsetX}
                onPhoneOffsetYChange={setPhoneOffsetY}
                onPhoneScaleChange={setPhoneScale}
                onPhoneRotationChange={setPhoneRotation}
                phoneRotateX={phoneRotateX}
                phoneRotateY={phoneRotateY}
                is3DEnabled={is3DEnabled}
                onPhoneRotateXChange={setPhoneRotateX}
                onPhoneRotateYChange={setPhoneRotateY}
                onIs3DEnabledChange={setIs3DEnabled}
                onPhoneTransformReset={resetPhoneTransform}
                onDownload={handleDownload}
                downloadFormat={downloadFormat}
                onDownloadFormatChange={setDownloadFormat}
              />
        </div>
      </div>
    </main>
  );
}
