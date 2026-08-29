"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  blackOpacityStops,
  colorTokens,
  spacingTokens,
  typeScaleTokens,
  TYPOGRAPHY_BREAKPOINTS,
  TYPOGRAPHY_RESPONSIVE,
  whiteOpacityStops,
} from "@/features/design-system/data/foundations";
import {
  createTypographyVariableMap,
  hydrateTypographyTokensFromVariables,
  readDesignTokenOverrides,
  saveColorTokenOverride,
  saveTypographyTokenOverrides,
} from "@/lib/designTokenRuntime";
import Button from "@/components/ui/Button";
import ItemListCarousel from "@/components/sections/ItemListCarousel";
import Navbar from "@/components/layout/Navbar";
import UsdHeroSection from "@/components/sections/UsdHeroSection";
import KeyFeatures from "@/components/sections/KeyFeatures";
import KoshLogo, { type KoshLogoVariant } from "@/components/KoshLogo";
import ListOfUsers from "@/components/sections/ListOfUsers";
import PowerfulFeatures from "@/components/sections/PowerfulFeatures";
import Testimonial from "@/components/sections/Testimonial";
import StepsToGetUsdAccount from "@/components/sections/StepsToGetUsdAccount";
import MoreThanUsdAccountSection from "@/components/sections/MoreThanUsdAccountSection";
import UsdAccountList from "@/components/sections/UsdAccountList";
import BusinessCTASection from "@/components/sections/BusinessCTASection";
import FAQsSection from "@/components/sections/FAQsSection";
import FooterSection from "@/components/sections/FooterSection";
import CardRewardsFeatureList from "@/components/sections/CardRewardsFeatureList";
import CardBusinessSection from "@/components/sections/CardBusinessSection";
import { BREAKPOINT_PX } from "@/lib/breakpoints";
import { canonicalMaterials, materialPatterns } from "@/features/design-system/data/materials";
import type {
  ColorGroup,
  SpacingTokenDoc,
  TypeScaleTokenDoc,
} from "@/features/design-system/types";

const DEMO_CAROUSEL_ITEMS = [
  { title: "Card One", description: "First demo card for the ItemListCarousel template." },
  { title: "Card Two", description: "Second demo card showing scroll and drag behaviour." },
  { title: "Card Three", description: "Third demo card with dot and arrow pagination." },
  { title: "Card Four", description: "Fourth demo card to test overflow and snapping." },
  { title: "Card Five", description: "Fifth demo card to verify the full carousel cycle." },
] as const;

const navigationItems = [
  { id: "typography", label: "Typography", enabled: true },
  { id: "spacing", label: "Spacing", enabled: true },
  { id: "colors", label: "Colors", enabled: true },
  { id: "materials", label: "Materials", enabled: true },
  { id: "motion", label: "Motion", enabled: true },
  { id: "button", label: "Button", enabled: true },
  { id: "header", label: "Header", enabled: true },
  { id: "logo", label: "Logo", enabled: true },
  { id: "sections", label: "Sections", enabled: true },
  { id: "animations", label: "Animations", enabled: false },
] as const;

type ActiveSection =
  | "typography"
  | "spacing"
  | "colors"
  | "materials"
  | "motion"
  | "button"
  | "header"
  | "logo"
  | "sections";
type InlineEditableField = "size" | "weight" | "lineHeight" | "tracking";

interface DesignSystemPageProps {
  initialSection?: ActiveSection;
  sectionBasePath?: string;
}

const spacingGroupLabels: Record<SpacingTokenDoc["group"], string> = {
  primitive: "Primitive Spacing Scale",
  semantic: "Semantic Spacing Tokens",
  layout: "Layout & Container Spacing",
};


const colorGroupLabels: Record<ColorGroup, string> = {
  base: "Base",
  text: "Text",
  surface: "Surface & Brand",
  button: "Button",
  header: "Header",
  material: "Material",
};

const inlineFieldLabels: Record<InlineEditableField, string> = {
  size: "Font Size",
  weight: "Font Weight",
  lineHeight: "Line Height",
  tracking: "Letter Spacing",
};

const logoVariantDocs: Array<{ label: string; variant: KoshLogoVariant }> = [
  { label: "KOSH", variant: "kosh" },
  { label: "KOSH Personal", variant: "personal" },
  { label: "KOSH Business", variant: "business" },
  { label: "KOSH Card", variant: "card" },
  { label: "KOSH Rewards", variant: "rewards" },
  { label: "Icon Only", variant: "icon-only" },
];

function fontFamilyFor(): string {
  return "var(--font-sans)";
}

function displayValue(value: string): string {
  return value.trim().endsWith("px") ? value.trim().replace("px", "") : value.trim();
}

function typeClassNameFromToken(token: string): string {
  return token.startsWith("--font-size-")
    ? `type-${token.replace("--font-size-", "")}`
    : token;
}

function parsePixelNumber(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const numeric = trimmed.endsWith("px") ? trimmed.slice(0, -2) : trimmed;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPixelValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const normalized = Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
  return `${normalized}px`;
}

const defaultLineHeightByToken = new Map<string, number>();
for (const token of typeScaleTokens) {
  const parsed = parsePixelNumber(token.lineHeight);
  if (parsed !== null) {
    defaultLineHeightByToken.set(token.token, parsed);
  }
}

const spacingTokenValueByVar = new Map(
  spacingTokens.map((token) => [token.token, token.value])
);

function formatPxValue(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value)}px`;
}

function parseLengthToPx(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.endsWith("px")) {
    const parsed = Number(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (trimmed.endsWith("rem")) {
    const parsed = Number(trimmed.slice(0, -3));
    return Number.isFinite(parsed) ? parsed * 16 : null;
  }

  return null;
}

function evaluateLengthExpressionToPx(
  expression: string,
  viewportWidth: number
): number | null {
  const normalized = expression.replace(/\s+/g, "");
  const matches = [...normalized.matchAll(/([+-]?\d*\.?\d+)(px|rem|vw)/g)];

  if (matches.length === 0) {
    return null;
  }

  let total = 0;
  for (const match of matches) {
    const numeric = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(numeric)) {
      return null;
    }

    if (unit === "px") {
      total += numeric;
      continue;
    }

    if (unit === "rem") {
      total += numeric * 16;
      continue;
    }

    if (unit === "vw") {
      total += (numeric / 100) * viewportWidth;
      continue;
    }
  }

  return total;
}

function resolveSpacingToPixels(
  value: string,
  viewportWidth: number,
  depth = 0
): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (depth > 8) {
    return null;
  }

  const directPx = parseLengthToPx(trimmed);
  if (directPx !== null) {
    return directPx;
  }

  if (trimmed.startsWith("var(")) {
    const match = trimmed.match(/var\((--[^,\s)]+)/);
    if (!match) {
      return null;
    }

    const resolved = spacingTokenValueByVar.get(match[1]);
    if (!resolved) {
      return null;
    }

    return resolveSpacingToPixels(resolved, viewportWidth, depth + 1);
  }

  if (trimmed.startsWith("clamp(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(6, -1);
    const parts = inner.split(",").map((part) => part.trim());
    if (parts.length === 3) {
      const minPx = evaluateLengthExpressionToPx(parts[0], viewportWidth);
      const preferredPx = evaluateLengthExpressionToPx(parts[1], viewportWidth);
      const maxPx = evaluateLengthExpressionToPx(parts[2], viewportWidth);

      if (minPx !== null && preferredPx !== null && maxPx !== null) {
        return Math.min(Math.max(preferredPx, minPx), maxPx);
      }
    }
  }

  return null;
}

function normalizeInlineValue(
  field: InlineEditableField,
  value: string,
  options?: { defaultLineHeightPx?: number | null }
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (field === "weight") {
    const parsedWeight = Number(trimmed);
    if (!Number.isFinite(parsedWeight)) {
      return "";
    }

    const normalizedWeight = Math.round(parsedWeight);
    if (normalizedWeight < 100 || normalizedWeight > 900) {
      return "";
    }

    return normalizedWeight.toString();
  }

  if (field === "lineHeight" && trimmed.endsWith("%")) {
    const percent = Number(trimmed.slice(0, -1).trim());
    if (!Number.isFinite(percent)) {
      return "";
    }

    const base = options?.defaultLineHeightPx;
    if (!base || base <= 0) {
      return "";
    }

    return toPixelValue((base * percent) / 100);
  }

  return trimmed.endsWith("px") ? trimmed : `${trimmed}px`;
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }

  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const raw = prefixed.slice(1);
  const isValidLength = raw.length === 3 || raw.length === 4 || raw.length === 6 || raw.length === 8;
  if (!isValidLength || !/^[0-9A-F]+$/.test(raw)) {
    return null;
  }

  if (raw.length === 3 || raw.length === 4) {
    const expanded = raw
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
    return `#${expanded}`;
  }

  return `#${raw}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function setInteractiveGlow(
  surface: HTMLElement,
  clientX: number,
  clientY: number,
  pointerType: "touch" | "mouse"
) {
  const rect = surface.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
  const baseSize = Math.max(rect.width, rect.height);
  const sizeMultiplier = pointerType === "touch" ? 1.18 : 0.92;
  const glowSize = Math.round(baseSize * sizeMultiplier);
  const overlay = surface.querySelector<HTMLElement>("[data-interactive-glow-overlay]");
  if (!overlay) return;
  const maxOpacity = surface.getAttribute("data-glow-opacity") ?? "1";

  overlay.style.background = `radial-gradient(circle ${glowSize}px at ${x}% ${y}%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.52) 34%, rgba(255,255,255,0) 72%)`;
  overlay.style.opacity = maxOpacity;
}

function setInteractiveGlowFromPointer(event: PointerEvent<HTMLDivElement>) {
  const pointerType = event.pointerType === "touch" ? "touch" : "mouse";
  setInteractiveGlow(event.currentTarget, event.clientX, event.clientY, pointerType);
}

function setInteractiveGlowFromMouse(event: MouseEvent<HTMLDivElement>) {
  setInteractiveGlow(event.currentTarget, event.clientX, event.clientY, "mouse");
}

function clearInteractiveGlow(event: PointerEvent<HTMLDivElement>) {
  const overlay = event.currentTarget.querySelector<HTMLElement>(
    "[data-interactive-glow-overlay]"
  );
  if (overlay) {
    overlay.style.opacity = "0";
  }
}

function clearInteractiveGlowFromMouse(event: MouseEvent<HTMLDivElement>) {
  const overlay = event.currentTarget.querySelector<HTMLElement>(
    "[data-interactive-glow-overlay]"
  );
  if (overlay) {
    overlay.style.opacity = "0";
  }
}

const MOTION_LOADER_SMOOTH_CURVE = "cubic-bezier(0.32, 0, 0.18, 1)";
const motionLoaderCells = [
  { tone: "light" },
  { tone: "light" },
  { tone: "light" },
  { tone: "light" },
  { tone: "center" },
  { tone: "light" },
  { tone: "light" },
  { tone: "light" },
  { tone: "light" },
] as const;
const motionLoaderSymbols = ["$", "€", "£", "¥", "₹"] as const;
const motionLoaderOccupiedCells = [0, 1, 5, 6, 7] as const;
const MOTION_LOADER_FADE_MS = 1400;
const MOTION_LOADER_CELL_HOLD_MS = 2400;
const MOTION_LOADER_CELL_JITTER_MS = 900;

function pickRandomCurrency(exclude?: (typeof motionLoaderSymbols)[number]) {
  const availableSymbols = exclude
    ? motionLoaderSymbols.filter((symbol) => symbol !== exclude)
    : motionLoaderSymbols;
  const randomIndex = Math.floor(Math.random() * availableSymbols.length);
  return availableSymbols[randomIndex] ?? motionLoaderSymbols[0];
}

function MotionCurrencyCell({ cellIndex }: { cellIndex: number }) {
  const [currentSymbol, setCurrentSymbol] = useState<(typeof motionLoaderSymbols)[number]>(() =>
    motionLoaderSymbols[cellIndex % motionLoaderSymbols.length]
  );
  const [nextSymbol, setNextSymbol] = useState<(typeof motionLoaderSymbols)[number] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentSymbolRef = useRef(currentSymbol);

  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);

  useEffect(() => {
    let isActive = true;
    let changeTimeout: number | undefined;
    let completeTimeout: number | undefined;

    const scheduleSwap = (delay: number) => {
      changeTimeout = window.setTimeout(() => {
        if (!isActive) return;
        const incomingSymbol = pickRandomCurrency(currentSymbolRef.current);
        setNextSymbol(incomingSymbol);
        setIsTransitioning(true);

        completeTimeout = window.setTimeout(() => {
          if (!isActive) return;
          setCurrentSymbol(incomingSymbol);
          setNextSymbol(null);
          setIsTransitioning(false);

          const nextDelay =
            MOTION_LOADER_CELL_HOLD_MS + Math.random() * MOTION_LOADER_CELL_JITTER_MS;
          scheduleSwap(nextDelay);
        }, MOTION_LOADER_FADE_MS);
      }, delay);
    };

    scheduleSwap(600 + cellIndex * 320);

    return () => {
      isActive = false;
      if (changeTimeout !== undefined) window.clearTimeout(changeTimeout);
      if (completeTimeout !== undefined) window.clearTimeout(completeTimeout);
    };
  }, [cellIndex]);

  return (
    <>
      <span
        className={`motion-loader-symbol absolute inset-0 block select-none text-center text-[18px] font-light leading-[28px] text-[#B7B7B7] will-change-transform ${
          isTransitioning ? "opacity-0" : "opacity-[0.82]"
        }`}
      >
        {currentSymbol}
      </span>
      <span
        className={`motion-loader-symbol absolute inset-0 block select-none text-center text-[18px] font-light leading-[28px] text-[#B7B7B7] will-change-transform ${
          isTransitioning ? "opacity-[0.82]" : "opacity-0"
        }`}
      >
        {nextSymbol ?? currentSymbol}
      </span>
    </>
  );
}

function MotionLoaderDemo() {
  return (
    <div className="space-y-[var(--space-12)]">
      <div
        aria-label="Currency grid loader study"
        className="relative h-[128px] w-[128px] overflow-hidden rounded-[12px] border border-black/8 bg-[#F5F5F3] shadow-[0_14px_32px_rgba(0,0,0,0.08)]"
      >
        <div className="absolute left-1/2 top-1/2 h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-full w-full grid-cols-3 grid-rows-3">
            {motionLoaderCells.map((cell, index) => {
              const occupiedIndex = motionLoaderOccupiedCells.indexOf(
                index as (typeof motionLoaderOccupiedCells)[number]
              );

              return (
                <div
                  key={`cell-${index}`}
                  className={`relative flex h-[28px] w-[28px] items-center justify-center overflow-hidden border border-black/10 ${
                    cell.tone === "center" ? "bg-[#C8C8C8]" : "bg-[#F5F5F3]"
                  }`}
                >
                  {occupiedIndex >= 0 ? (
                    <span className="absolute inset-0">
                      <span
                        className="motion-loader-cell-pulse absolute inset-[1px] block rounded-[2px] bg-[#F5F5F3] will-change-transform"
                        style={{ animationDelay: `${occupiedIndex * 180}ms` }}
                      />
                    </span>
                  ) : null}
                  {occupiedIndex >= 0 ? (
                    <span className="relative z-[1] block h-full w-full">
                      <MotionCurrencyCell cellIndex={occupiedIndex} />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <span className="pointer-events-none absolute left-[28px] top-[28px] flex h-[28px] w-[28px] items-center justify-center">
            <span className="motion-loader-coin block h-[18px] w-[18px] rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.06)] will-change-transform" />
          </span>
        </div>
      </div>

      <div className="space-y-[2px]">
        <p className="type-micro text-white/32">Loader</p>
        <p className="type-micro text-white/50">Currency grid study with central coin pulse</p>
      </div>

      <style jsx>{`
        .motion-loader-symbol {
          transition: opacity ${MOTION_LOADER_FADE_MS}ms ${MOTION_LOADER_SMOOTH_CURVE};
        }

        .motion-loader-cell-pulse {
          animation: motion-loader-cell-pulse 2.8s ${MOTION_LOADER_SMOOTH_CURVE} infinite;
          transform: translate3d(0, 0, 0);
        }

        .motion-loader-coin {
          animation: motion-loader-coin-pulse 3.6s ${MOTION_LOADER_SMOOTH_CURVE} infinite;
          transform: translate3d(0, 0, 0);
        }

        @keyframes motion-loader-cell-pulse {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          16% {
            transform: translate3d(0, 0, 0) scale(1.08);
          }

          28% {
            transform: translate3d(0, 0, 0) scale(1.02);
          }
        }

        @keyframes motion-loader-coin-pulse {
          0%,
          20%,
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }

          10% {
            opacity: 0.98;
            transform: translate3d(0, 0, 0) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}

export default function DesignSystemPage({
  initialSection = "typography",
  sectionBasePath = "/website-system",
}: DesignSystemPageProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection);
  const [tokens, setTokens] = useState<TypeScaleTokenDoc[]>(() => {
    if (typeof window === "undefined") {
      return typeScaleTokens;
    }

    const persisted = readDesignTokenOverrides();
    if (!persisted) {
      return typeScaleTokens;
    }

    return hydrateTypographyTokensFromVariables(typeScaleTokens, persisted.variables);
  });
  const [inlineEdit, setInlineEdit] = useState<{
    index: number;
    field: InlineEditableField;
  } | null>(null);
  const [inlineDraft, setInlineDraft] = useState("");
  const [sampleEditIndex, setSampleEditIndex] = useState<number | null>(null);
  const [colorEditToken, setColorEditToken] = useState<string | null>(null);
  const [colorDraft, setColorDraft] = useState("");
  const [matBorderVisible, setMatBorderVisible] = useState<Record<number, boolean>>({});
  const [colorValues, setColorValues] = useState<Record<string, string>>(() => {
    const fallback = Object.fromEntries(colorTokens.map((token) => [token.name, token.value]));
    if (typeof window === "undefined") {
      return fallback;
    }

    const persisted = readDesignTokenOverrides();
    if (!persisted) {
      return fallback;
    }

    return Object.fromEntries(
      colorTokens.map((token) => [
        token.name,
        persisted.variables[`--color-${token.name}`] ?? token.value,
      ])
    );
  });
  const sampleEditRef = useRef<HTMLParagraphElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [, setSaveMessage] = useState<string>("");
  const spacingGroups = (
    ["primitive", "semantic", "layout"] as const
  ).map((group) => ({
    group,
    label: spacingGroupLabels[group],
    tokens: spacingTokens.filter((token) => token.group === group),
  }));
  const colorGroups = (["base", "text", "surface", "button", "header", "material"] as const).map((group) => ({
    group,
    label: colorGroupLabels[group],
    tokens: colorTokens.filter((t) => t.group === group),
  }));

  useEffect(() => {
    if (sampleEditIndex === null || !sampleEditRef.current) {
      return;
    }

    sampleEditRef.current.focus();
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(sampleEditRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [sampleEditIndex]);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const persisted = readDesignTokenOverrides();
    if (!persisted) {
      return;
    }

    setTokens((current) => hydrateTypographyTokensFromVariables(current, persisted.variables));
    setColorValues(
      Object.fromEntries(
        colorTokens.map((token) => [
          token.name,
          persisted.variables[`--color-${token.name}`] ?? token.value,
        ])
      )
    );
  }, []);

  const openInlineEditor = (
    event: MouseEvent<HTMLButtonElement>,
    index: number,
    field: InlineEditableField,
    value: string
  ) => {
    event.stopPropagation();
    if (isSaving) return;
    setSampleEditIndex(null);
    setInlineEdit({ index, field });
    setInlineDraft(displayValue(value));
    setSaveMessage("");
  };

  const closeInlineEditor = () => {
    setInlineEdit(null);
    setInlineDraft("");
  };

  const openSampleEditor = (index: number) => {
    if (isSaving) return;
    setInlineEdit(null);
    setInlineDraft("");
    setSampleEditIndex(index);
    setSaveMessage("");
  };

  const closeSampleEditor = () => {
    setSampleEditIndex(null);
  };

  const openColorEditor = (tokenName: string, value: string) => {
    if (isSaving) return;
    setInlineEdit(null);
    setInlineDraft("");
    setSampleEditIndex(null);
    setColorEditToken(tokenName);
    setColorDraft(value);
  };

  const closeColorEditor = () => {
    setColorEditToken(null);
    setColorDraft("");
  };

  const saveColorValue = (tokenName: string) => {
    const normalized = normalizeHexColor(colorDraft);
    if (!normalized) {
      closeColorEditor();
      return;
    }

    saveColorTokenOverride(tokenName, normalized);
    document.documentElement.style.setProperty(`--color-${tokenName}`, normalized);
    setColorValues((current) => ({ ...current, [tokenName]: normalized }));
    closeColorEditor();
  };

  const selectSection = (section: ActiveSection) => {
    if (section === activeSection) return;
    setActiveSection(section);
    closeInlineEditor();
    closeSampleEditor();
    closeColorEditor();
    setSaveMessage("");
  };

  const persistTypography = async (nextTokens: TypeScaleTokenDoc[]) => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/design-system/type-scale", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokens: nextTokens }),
      });

      if (!response.ok) {
        throw new Error("Failed to save typography settings.");
      }

      const payload = (await response.json()) as { tokens: TypeScaleTokenDoc[] };
      setTokens(payload.tokens);
      saveTypographyTokenOverrides(payload.tokens);
      const runtimeVariables = createTypographyVariableMap(payload.tokens);
      const root = document.documentElement;
      for (const [name, value] of Object.entries(runtimeVariables)) {
        root.style.setProperty(name, value);
      }
      setSaveMessage("Saved to codebase.");
      return true;
    } catch {
      setSaveMessage("Unable to save. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveInlineValue = async (index: number, field: InlineEditableField) => {
    const token = tokens[index];
    const defaultLineHeightPx =
      defaultLineHeightByToken.get(token.token) ??
      parsePixelNumber(token.lineHeight) ??
      parsePixelNumber(token.size);
    const normalized = normalizeInlineValue(field, inlineDraft, {
      defaultLineHeightPx,
    });
    if (!normalized) {
      closeInlineEditor();
      return;
    }

    const nextTokens = [...tokens];
    nextTokens[index] = { ...nextTokens[index], [field]: normalized };
    const didSave = await persistTypography(nextTokens);
    if (didSave) {
      closeInlineEditor();
    }
  };

  const saveSampleValue = async (index: number, value: string) => {
    const normalized = value.trim();
    if (isSaving) {
      return;
    }

    if (!normalized) {
      setSaveMessage("Sample text cannot be empty.");
      return;
    }

    const nextTokens = [...tokens];
    nextTokens[index] = { ...nextTokens[index], sample: normalized };
    const didSave = await persistTypography(nextTokens);
    if (didSave) {
      closeSampleEditor();
    }
  };

  return (
    <div className="theme-dark h-screen bg-[#0a0a0a] text-white" style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <div className="flex h-full">
        <aside className="w-[250px] shrink-0 overflow-y-auto p-10">
          <nav>
            <ul className="space-y-[var(--spacing-sm)]">
              {navigationItems.map((item) => (
                <li key={item.label} className="flex items-start gap-[var(--space-8)]">
                  <span
                    className={`mt-[var(--space-4)] h-[var(--space-8)] w-[var(--space-8)] bg-white ${
                      activeSection === item.id ? "opacity-100" : "opacity-10"
                    }`}
                    aria-hidden
                  />
                  {item.enabled ? (
                    <Link
                      href={
                        item.id === "spacing"
                          ? `${sectionBasePath}/spacing`
                          : item.id === "colors"
                            ? `${sectionBasePath}/colors`
                            : item.id === "materials"
                              ? `${sectionBasePath}/materials`
                              : item.id === "motion"
                                ? `${sectionBasePath}/motion`
                              : item.id === "button"
                                ? `${sectionBasePath}/button`
                                : item.id === "header"
                                  ? `${sectionBasePath}/header`
                                  : item.id === "logo"
                                    ? `${sectionBasePath}/logo`
                                    : item.id === "sections"
                                      ? `${sectionBasePath}/sections`
                            : `${sectionBasePath}/typography`
                      }
                      onClick={() => selectSection(item.id as ActiveSection)}
                      className={`cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-normal leading-none ${
                        activeSection === item.id ? "opacity-100" : "opacity-55"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-[14px] font-normal leading-none opacity-30">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-[rgba(255,255,255,0.02)] m-5 ml-0">
          <div
            data-lenis-prevent
            tabIndex={0}
            className="hide-scrollbar h-full overflow-y-auto overscroll-contain px-10"
            onWheel={(event) => {
              event.stopPropagation();
            }}
          >
            {activeSection === "typography" ? (
              <div className="mx-auto w-full max-w-[720px] space-y-[var(--space-80)] pt-[40vh] pb-[40vh]">
                {tokens.map((token, index) => {
                  const isSampleEditing = sampleEditIndex === index;

                  return (
                    <article
                      key={token.token}
                      className="mx-auto w-full max-w-[820px] rounded-[10px] p-[var(--space-4)]"
                    >
                      <div className="flex flex-wrap items-center gap-[var(--space-8)]">
                        <p className="text-[14px] leading-none text-white/70">{token.name}</p>
                        <span className="text-[12px] leading-none text-white/45">
                          {typeClassNameFromToken(token.token)}
                        </span>
                      </div>
                      {isSampleEditing ? (
                        <p
                          ref={sampleEditRef}
                          contentEditable
                          suppressContentEditableWarning
                          title="Sample Text"
                          role="textbox"
                          aria-label="Sample Text"
                          onBlur={(event) =>
                            saveSampleValue(index, event.currentTarget.textContent ?? "")
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              closeSampleEditor();
                            }

                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                          }}
                          className="mt-[var(--spacing-sm)] block max-w-[780px] cursor-text text-white outline-none"
                          style={{
                            fontFamily: fontFamilyFor(),
                            fontSize: token.size,
                            fontWeight: Number(token.weight),
                            lineHeight: token.lineHeight,
                            letterSpacing: token.tracking,
                          }}
                        >
                          {token.sample}
                        </p>
                      ) : (
                        <button
                          type="button"
                          className="mt-[var(--spacing-sm)] block w-full max-w-[780px] cursor-text border-0 bg-transparent p-0 text-left text-white"
                          onClick={() => openSampleEditor(index)}
                          style={{
                            fontFamily: fontFamilyFor(),
                            fontSize: token.size,
                            fontWeight: Number(token.weight),
                            lineHeight: token.lineHeight,
                            letterSpacing: token.tracking,
                          }}
                        >
                          {token.sample}
                        </button>
                      )}
                      <div className="mt-[var(--spacing-sm)] flex flex-wrap items-center gap-[var(--space-8)] text-[14px] leading-none text-white/90">
                        <span>Saans</span>
                        {(
                          [
                            {
                              field: "size",
                              label: inlineFieldLabels.size,
                              value: token.size,
                            },
                            {
                              field: "weight",
                              label: inlineFieldLabels.weight,
                              value: token.weight,
                            },
                            {
                              field: "lineHeight",
                              label: inlineFieldLabels.lineHeight,
                              value: token.lineHeight,
                            },
                            {
                              field: "tracking",
                              label: inlineFieldLabels.tracking,
                              value: token.tracking,
                            },
                          ] satisfies Array<{
                            field: InlineEditableField;
                            label: string;
                            value: string;
                          }>
                        ).map((meta) => {
                          const isInlineEditing =
                            inlineEdit?.index === index && inlineEdit.field === meta.field;

                          return (
                            <div key={`${token.token}-${meta.field}`} className="group relative">
                              {isInlineEditing ? (
                                <input
                                  autoFocus
                                  value={inlineDraft}
                                  title={meta.label}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) => setInlineDraft(event.target.value)}
                                  onBlur={() => saveInlineValue(index, meta.field)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      event.currentTarget.blur();
                                    }

                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      closeInlineEditor();
                                    }
                                  }}
                                  className="h-[var(--space-24)] w-[var(--space-56)] rounded-[43px] border border-white/15 bg-white/10 px-[var(--space-8)] py-[var(--space-4)] text-center text-[14px] leading-none text-white outline-none"
                                />
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    title={meta.label}
                                    className="inline-flex h-[var(--space-24)] w-[var(--space-56)] cursor-text items-center justify-center rounded-[43px] border border-transparent px-[var(--space-8)] py-[var(--space-4)] text-center text-[14px] leading-none text-white hover:bg-white/[0.05]"
                                    onClick={(event) =>
                                      openInlineEditor(event, index, meta.field, meta.value)
                                    }
                                  >
                                    {displayValue(meta.value)}
                                  </button>
                                  <span className="pointer-events-none absolute left-1/2 top-full mt-[var(--space-4)] -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-white px-[var(--space-8)] py-[var(--space-4)] text-[11px] text-black opacity-0 group-hover:opacity-100">
                                    {meta.label}
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}

                {/* Responsive Sizes reference table */}
                <section className="mt-[var(--space-64)]">
                  <p className="type-micro mb-[var(--space-16)] text-white/50">
                    Responsive Sizes
                  </p>
                  <div className="overflow-x-auto rounded-[12px] border border-white/10 bg-white/[0.04]">
                    <table className="w-full text-[14px] text-white">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-white/50">
                          <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">
                            Scale
                          </th>
                          <th className="px-[var(--space-16)] py-[var(--space-12)] text-right font-medium">
                            Used
                          </th>
                          {TYPOGRAPHY_BREAKPOINTS.map((bp) => (
                            <th
                              key={bp.label}
                              className="px-[var(--space-16)] py-[var(--space-12)] font-medium"
                            >
                              <span className="block">{bp.label}</span>
                              <span className="block text-[12px] font-normal text-white/30">
                                {bp.range}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TYPOGRAPHY_RESPONSIVE.map((row) => (
                          <tr
                            key={row.name}
                            className="border-b border-white/5 last:border-0"
                          >
                            <td className="px-[var(--space-16)] py-[var(--space-8)] font-medium text-white/80">
                              {row.name}
                            </td>
                            <td className="px-[var(--space-16)] py-[var(--space-8)] text-right tabular-nums text-white/40">
                              {row.usageCount}
                            </td>
                            {row.sizes.map((s, i) => (
                              <td
                                key={i}
                                className="px-[var(--space-16)] py-[var(--space-8)] tabular-nums text-white/60"
                              >
                                {s
                                  ? `${s.size} / ${s.lineHeight}`
                                  : "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : activeSection === "spacing" ? (
              <div className="mx-auto w-full max-w-[720px] space-y-[var(--space-64)] pt-[35vh] pb-[35vh]">
                <section className="rounded-[12px] border border-white/10 bg-white/[0.04] p-[var(--space-20)]">
                  <p className="type-micro text-white/50">Breakpoint contract</p>
                  <div className="mt-[var(--space-12)] flex flex-wrap items-center gap-[var(--space-8)]">
                    <span className="type-micro rounded-[999px] border border-white/10 bg-white/10 px-[var(--space-12)] py-[var(--space-4)] text-white/85">
                      Mobile {BREAKPOINT_PX.mobile}px
                    </span>
                    <span className="type-micro rounded-[999px] border border-white/10 bg-white/10 px-[var(--space-12)] py-[var(--space-4)] text-white/85">
                      Tablet {BREAKPOINT_PX.tablet}px
                    </span>
                    <span className="type-micro rounded-[999px] border border-white/10 bg-white/10 px-[var(--space-12)] py-[var(--space-4)] text-white/85">
                      Laptop {BREAKPOINT_PX.laptop}px
                    </span>
                    <span className="type-micro rounded-[999px] border border-white/10 bg-white/10 px-[var(--space-12)] py-[var(--space-4)] text-white/85">
                      Desktop {BREAKPOINT_PX.desktop}px
                    </span>
                  </div>
                </section>
                {spacingGroups.map((group) => (
                  <section key={group.group}>
                    <p className="type-micro mb-[var(--space-16)] text-white/50">
                      {group.label}
                    </p>
                    <div className="overflow-x-auto rounded-[12px] border border-white/10 bg-white/[0.04]">
                      <table className="w-full text-[14px] text-white">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-white/50">
                            <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">
                              Variable
                            </th>
                            <th className="px-[var(--space-16)] py-[var(--space-12)] text-right font-medium">
                              Used
                            </th>
                            {TYPOGRAPHY_BREAKPOINTS.map((bp) => (
                              <th
                                key={bp.label}
                                className="px-[var(--space-16)] py-[var(--space-12)] font-medium"
                              >
                                <span className="block">{bp.label}</span>
                                <span className="block text-[12px] font-normal text-white/30">
                                  {bp.range}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.tokens.map((token) => {
                            const mobilePx = resolveSpacingToPixels(token.value, BREAKPOINT_PX.mobile);
                            const tabletPx = resolveSpacingToPixels(token.value, BREAKPOINT_PX.tablet);
                            const laptopPx = resolveSpacingToPixels(token.value, BREAKPOINT_PX.laptop);
                            const desktopPx = resolveSpacingToPixels(token.value, BREAKPOINT_PX.desktop);
                            return (
                              <tr
                                key={token.token}
                                className="border-b border-white/5 last:border-0"
                              >
                                <td className="px-[var(--space-16)] py-[var(--space-8)] font-medium text-white/80">
                                  {token.token}
                                </td>
                                <td className="px-[var(--space-16)] py-[var(--space-8)] text-right tabular-nums text-white/40">
                                  {token.usageCount}
                                </td>
                                <td className="px-[var(--space-16)] py-[var(--space-8)] tabular-nums text-white/60">
                                  {formatPxValue(mobilePx)}
                                </td>
                                <td className="px-[var(--space-16)] py-[var(--space-8)] tabular-nums text-white/60">
                                  {formatPxValue(tabletPx)}
                                </td>
                                <td className="px-[var(--space-16)] py-[var(--space-8)] tabular-nums text-white/60">
                                  {formatPxValue(laptopPx)}
                                </td>
                                <td className="px-[var(--space-16)] py-[var(--space-8)] tabular-nums text-white/60">
                                  {formatPxValue(desktopPx)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            ) : activeSection === "colors" ? (
              <div className="mx-auto w-full max-w-[720px] space-y-[var(--space-64)] pt-[35vh] pb-[35vh]">
                {/* ── Opacity System ── */}
                <section className="space-y-[var(--space-24)]">
                  <header className="space-y-[var(--space-8)]">
                    <h2 className="type-h2 text-white">Opacity System</h2>
                    <p className="type-micro text-white/55">
                      Most color in this codebase is <code className="rounded bg-white/10 px-[6px] py-[2px] text-white/80">white</code> or <code className="rounded bg-white/10 px-[6px] py-[2px] text-white/80">black</code> at
                      a Tailwind opacity modifier. This is the primary system — 193 occurrences
                      vs 74 token references.
                    </p>
                  </header>

                  {/* White opacity table */}
                  <div className="space-y-[var(--space-8)]">
                    <p className="type-micro text-white/60">white at opacity stops</p>
                    <div className="overflow-x-auto rounded-[12px] border border-white/10 bg-white/[0.04]">
                      <table className="w-full text-[14px] text-white">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-white/50">
                            <th className="w-[40px] px-[var(--space-12)] py-[var(--space-12)]" />
                            <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Opacity</th>
                            <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Tailwind</th>
                            <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Usage</th>
                            <th className="px-[var(--space-16)] py-[var(--space-12)] text-right font-medium">Used</th>
                          </tr>
                        </thead>
                        <tbody>
                          {whiteOpacityStops.map((stop) => (
                            <tr key={stop.value} className="border-b border-white/5 last:border-0">
                              <td className="px-[var(--space-12)] py-[var(--space-8)]">
                                <div
                                  className="h-[24px] w-[24px] rounded-[6px] border border-white/10"
                                  style={{ background: `rgba(255, 255, 255, ${stop.value / 100})` }}
                                />
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)] tabular-nums text-white/80">
                                {stop.value}%
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)]">
                                <code className="text-[13px] text-white/60">white{stop.tailwind}</code>
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)] text-white/50">
                                {stop.usage}
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)] text-right tabular-nums text-white/40">
                                {stop.occurrences}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Black opacity table */}
                  <div className="space-y-[var(--space-8)]">
                    <p className="type-micro text-white/60">black at opacity stops</p>
                    <div className="overflow-x-auto rounded-[12px] border border-white/10 bg-white/[0.04]">
                      <table className="w-full text-[14px] text-white">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-white/50">
                            <th className="w-[40px] px-[var(--space-12)] py-[var(--space-12)]" />
                            <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Opacity</th>
                            <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Tailwind</th>
                            <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Usage</th>
                            <th className="px-[var(--space-16)] py-[var(--space-12)] text-right font-medium">Used</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blackOpacityStops.map((stop) => (
                            <tr key={stop.value} className="border-b border-white/5 last:border-0">
                              <td className="px-[var(--space-12)] py-[var(--space-8)]">
                                <div
                                  className="h-[24px] w-[24px] rounded-[6px] border border-white/10"
                                  style={{ background: `rgba(0, 0, 0, ${stop.value / 100})` }}
                                />
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)] tabular-nums text-white/80">
                                {stop.value}%
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)]">
                                <code className="text-[13px] text-white/60">black{stop.tailwind}</code>
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)] text-white/50">
                                {stop.usage}
                              </td>
                              <td className="px-[var(--space-16)] py-[var(--space-8)] text-right tabular-nums text-white/40">
                                {stop.occurrences}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pattern example */}
                  <div className="rounded-[12px] border border-white/10 bg-white/[0.04] px-[var(--space-16)] py-[var(--space-12)]">
                    <p className="type-micro text-white/40">Common pattern</p>
                    <code className="mt-[var(--space-4)] block text-[13px] text-white/70">
                      text-white/60 &nbsp; bg-white/10 &nbsp; border-white/[0.06]
                    </code>
                  </div>
                </section>

                {/* ── Token Table ── */}
                <section className="space-y-[var(--space-24)]">
                  <header className="space-y-[var(--space-8)]">
                    <h2 className="type-h2 text-white">Color Tokens</h2>
                    <p className="type-micro text-white/55">
                      CSS custom properties defined in globals.css. Click any value to edit live.
                    </p>
                  </header>

                  {colorGroups.map((cg) => (
                    <section key={cg.group} className="mb-[var(--space-24)]">
                      <div className="mb-[var(--space-8)] flex items-center justify-between">
                        <p className="type-action text-white/70">{cg.label}</p>
                        <span className="type-micro text-white/40">{cg.tokens.length} tokens</span>
                      </div>
                      <div className="overflow-x-auto rounded-[12px] border border-white/10 bg-white/[0.04]">
                        <table className="w-full text-[14px] text-white">
                          <thead>
                            <tr className="border-b border-white/10 text-left text-white/50">
                              <th className="w-[40px] px-[var(--space-12)] py-[var(--space-12)]" />
                              <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Variable</th>
                              <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Value</th>
                              <th className="px-[var(--space-16)] py-[var(--space-12)] text-right font-medium">Used</th>
                              <th className="px-[var(--space-16)] py-[var(--space-12)] font-medium">Usage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cg.tokens.map((token) => {
                              const resolvedValue = colorValues[token.name] ?? token.value;
                              const isColorEditing = colorEditToken === token.name;

                              return (
                                <tr key={token.name} className="border-b border-white/5 last:border-0">
                                  <td className="px-[var(--space-12)] py-[var(--space-8)]">
                                    <div
                                      className="h-[24px] w-[24px] rounded-[6px] border border-white/10"
                                      style={{ background: resolvedValue }}
                                      aria-label={`${token.name} color swatch`}
                                    />
                                  </td>
                                  <td className="px-[var(--space-16)] py-[var(--space-8)] font-medium text-white/80">
                                    {`--color-${token.name}`}
                                  </td>
                                  <td className="px-[var(--space-16)] py-[var(--space-8)]">
                                    {isColorEditing ? (
                                      <input
                                        autoFocus
                                        value={colorDraft}
                                        title={`Hex for ${token.name}`}
                                        onChange={(event) => setColorDraft(event.target.value)}
                                        onBlur={() => saveColorValue(token.name)}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            saveColorValue(token.name);
                                          }
                                          if (event.key === "Escape") {
                                            event.preventDefault();
                                            closeColorEditor();
                                          }
                                        }}
                                        className="h-[var(--space-24)] w-[140px] rounded-[43px] border border-white/15 bg-white/10 px-[var(--space-8)] py-[var(--space-4)] text-[12px] font-semibold leading-none tracking-[0.06em] text-white outline-none"
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        className="inline-flex h-[var(--space-24)] items-center rounded-[43px] border border-transparent px-[var(--space-8)] py-[var(--space-4)] text-[12px] font-semibold leading-none tracking-[0.06em] text-white/60 hover:bg-white/[0.05]"
                                        onClick={() => openColorEditor(token.name, resolvedValue)}
                                      >
                                        {token.displayValue ?? resolvedValue}
                                      </button>
                                    )}
                                  </td>
                                  <td className={`px-[var(--space-16)] py-[var(--space-8)] text-right tabular-nums ${token.usageCount === 0 ? "text-white/25" : "text-white/40"}`}>
                                    {token.usageCount}
                                  </td>
                                  <td className="px-[var(--space-16)] py-[var(--space-8)] text-white/50">
                                    {token.usage}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                </section>
              </div>
            ) : activeSection === "materials" ? (
              <div className="mx-auto w-full max-w-[1280px] px-[var(--space-24)] pt-[18vh] pb-[35vh]">
                {/* ── All Materials ── */}
                <section className="mb-[80px]">
                  <header className="mb-[var(--space-48)] space-y-[var(--space-12)]">
                    <h2 className="type-h2 text-white">Materials</h2>
                    <p className="type-body-m max-w-[560px] text-white/50">
                      All glass, frosted, and blurred surface materials used across the site.
                    </p>
                  </header>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                    {[...canonicalMaterials, ...materialPatterns].map((mat, i) => {
                      const isPill = mat.radius === "9999px";
                      const isHeaderBar = mat.radius === "0px";
                      const previewRadius = isPill ? "9999px" : isHeaderBar ? "0" : mat.radius;
                      const isLight = "variant" in mat && mat.variant === "light";
                      const isCanonical = i < canonicalMaterials.length;
                      const showBorder = isCanonical ? matBorderVisible[i] !== false : false;

                      const backdropImages = [
                        "/images/offering-card.png",
                        "/images/offering-wallet.png",
                        "/images/offering-virtual-account.png",
                        "/images/features/saving-space.webp",
                        "/images/features/invest.webp",
                      ];
                      const bgImage = backdropImages[i % backdropImages.length];

                      return (
                        <article
                          key={mat.name}
                          className="group relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0a0a0a]"
                        >
                          {/* ── Preview ── */}
                          <div
                            className="relative flex items-center justify-center overflow-hidden p-[24px]"
                            style={{ aspectRatio: "4/3", backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
                          >
                            <div
                              className="relative z-10 flex items-center justify-center overflow-hidden"
                              style={
                                {
                                  width: isPill ? "auto" : isHeaderBar ? "88%" : "100%",
                                  height: isPill ? "auto" : isHeaderBar ? "52px" : "100%",
                                  padding: isPill ? "10px 32px" : undefined,
                                  background: mat.surface,
                                  backdropFilter: `blur(${mat.blur})`,
                                  WebkitBackdropFilter: `blur(${mat.blur})`,
                                  borderRadius: previewRadius,
                                  touchAction: "none",
                                } as CSSProperties
                              }
                              data-glow-opacity={isLight ? "0.85" : "0.35"}
                              onPointerEnter={setInteractiveGlowFromPointer}
                              onPointerMove={setInteractiveGlowFromPointer}
                              onPointerDown={setInteractiveGlowFromPointer}
                              onPointerLeave={clearInteractiveGlow}
                              onPointerCancel={clearInteractiveGlow}
                              onMouseEnter={setInteractiveGlowFromMouse}
                              onMouseMove={setInteractiveGlowFromMouse}
                              onMouseLeave={clearInteractiveGlowFromMouse}
                            >
                              {/* Gradient border overlay (canonical only) */}
                              {isCanonical && showBorder && (
                                <div
                                  className="pointer-events-none absolute inset-0"
                                  style={{
                                    borderRadius: previewRadius,
                                    padding: "1px",
                                    background: "linear-gradient(155deg, #fff 30%, rgba(0,0,0,0.11) 50%, #fff 70%)",
                                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                                    WebkitMaskComposite: "xor",
                                    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                                    maskComposite: "exclude",
                                    mixBlendMode: "overlay",
                                    ...(!isLight && ("variant" in mat && mat.variant !== "prominent") && { opacity: 0.3 }),
                                  } as CSSProperties}
                                />
                              )}
                              {/* Non-canonical border */}
                              {!isCanonical && mat.border !== "none" && (
                                <div className="absolute inset-0" style={{ border: mat.border, borderRadius: previewRadius }} />
                              )}
                              {/* Mouse-tracking glow overlay */}
                              <div
                                data-interactive-glow-overlay
                                className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                                style={{ borderRadius: previewRadius, mixBlendMode: "overlay", background: "none", opacity: 0 }}
                              />
                              <span className={`relative z-10 select-none text-[13px] font-semibold tracking-[0.01em] ${isLight ? "text-black/40" : "text-white/50"}`}>
                                {mat.name}
                              </span>
                            </div>
                          </div>

                          {/* ── Info area ── */}
                          <div className="border-t border-white/[0.06] px-[20px] py-[18px]">
                            <div className="mb-[12px] flex items-start justify-between gap-[8px]">
                              <div>
                                <h3 className="text-[15px] font-semibold leading-[20px] tracking-[-0.01em] text-white">
                                  {mat.name}
                                </h3>
                                <p className="mt-[4px] text-[12px] leading-[17px] text-white/40">
                                  {mat.description}
                                </p>
                              </div>
                              {isCanonical && (
                                <span className="shrink-0 rounded-full bg-blue-500/15 px-[8px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] text-blue-400">
                                  Figma
                                </span>
                              )}
                            </div>

                            {/* Border toggle (canonical only) */}
                            {isCanonical && (
                              <div className="mb-[12px] flex items-center justify-between">
                                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/25">Border</span>
                                <button
                                  type="button"
                                  onClick={() => setMatBorderVisible((prev) => ({ ...prev, [i]: !showBorder }))}
                                  className={`relative h-[18px] w-[32px] rounded-full transition-colors duration-200 ${showBorder ? "bg-white/25" : "bg-white/10"}`}
                                >
                                  <div
                                    className="absolute top-[3px] h-[12px] w-[12px] rounded-full bg-white transition-[left] duration-200"
                                    style={{ left: showBorder ? 17 : 3 }}
                                  />
                                </button>
                              </div>
                            )}

                            <div className="space-y-[6px]">
                              {([
                                ["surface", mat.surface],
                                ["blur", mat.blur],
                                ["border", mat.border],
                                ["radius", mat.radius],
                              ] as const).map(([label, value]) => (
                                <div key={label} className="flex items-baseline gap-[8px]">
                                  <span className="w-[52px] shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-white/25">
                                    {label}
                                  </span>
                                  <span className="truncate font-mono text-[11px] leading-[16px] text-white/55">
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-[14px] flex flex-wrap gap-[6px]">
                              {mat.usedIn.map((comp) => (
                                <span
                                  key={comp}
                                  className="rounded-[6px] bg-white/[0.05] px-[8px] py-[3px] text-[10px] font-medium leading-[14px] tracking-[0.02em] text-white/40"
                                >
                                  {comp}
                                </span>
                              ))}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

              </div>
            ) : activeSection === "header" ? (
              <div className="mx-auto flex w-full flex-col gap-[var(--space-48)] px-[var(--space-16)] pt-[8vh] pb-[16vh]">
                {[
                  { label: "Mobile", width: 390, height: 400 },
                  { label: "Tablet", width: 768, height: 400 },
                  { label: "Small Laptop", width: 1280, height: 80 },
                  { label: "Desktop", width: 1440, height: 80 },
                ].map(({ label, width, height }) => (
                  <div key={label} className="space-y-[var(--space-12)]">
                    <p className="type-micro text-white/55 px-[var(--space-8)]">
                      {label} <span className="text-white/30">{width}px</span>
                    </p>
                    <div
                      className="rounded-[20px] border border-white/10"
                      style={{ maxWidth: `${width}px` }}
                    >
                      <iframe
                        src="/website-system/header/frame"
                        title={`Header at ${label} (${width}px)`}
                        style={{ width: `${width}px`, height: `${height}px`, border: "none", display: "block" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeSection === "sections" ? (
              <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[var(--space-80)] px-[var(--space-16)] pt-[12vh] pb-[24vh] sm:px-[var(--space-24)]">
                <section className="space-y-[var(--space-32)]">
                  <div className="text-center mx-auto max-w-[80%] tablet:max-w-[50%]">
                    <h1 className="type-h1 text-white">ItemListCarousel</h1>
                    <p className="type-body-l mt-[var(--space-20)] text-white/60">
                      Drag, wheel-scroll, or use the arrows and dots to navigate between cards.
                    </p>
                  </div>

                  <ItemListCarousel
                    items={DEMO_CAROUSEL_ITEMS}
                    keyExtractor={(item) => item.title}
                    renderItem={(item) => (
                      <>
                        <div className="aspect-square rounded-[var(--radius-lg)] border border-white/[0.06] bg-white/[0.04]" />
                        <h3 className="type-h4 mt-[var(--space-40)] text-white">
                          {item.title}
                        </h3>
                        <p className="type-body-m mt-[var(--space-8)] text-white/60">
                          {item.description}
                        </p>
                      </>
                    )}
                  />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Hero section</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      USD account hero section preview.
                    </p>
                  </div>

                  <Navbar />
                  <UsdHeroSection />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Key features</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Figma-driven key features comparison section preview.
                    </p>
                  </div>

                  <KeyFeatures />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Powerful features</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Figma-driven global payments features section preview.
                    </p>
                  </div>

                  <PowerfulFeatures />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Offerings</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Card rewards and benefits section preview.
                    </p>
                  </div>

                  <CardRewardsFeatureList />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Card bussiness section</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Business-focused card CTA section preview from Figma.
                    </p>
                  </div>

                  <CardBusinessSection />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">USD account list</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Placeholder preview added to the sections gallery. This will be replaced with
                      the final Figma-driven component.
                    </p>
                  </div>

                  <UsdAccountList />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">List of users</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Placeholder preview added for the next section component.
                    </p>
                  </div>

                  <ListOfUsers />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Steps to get USD account</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Figma-driven onboarding section preview.
                    </p>
                  </div>

                  <StepsToGetUsdAccount />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">More than USD account</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Closing CTA stage placeholder for the final background asset.
                    </p>
                  </div>

                  <MoreThanUsdAccountSection />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Testimonial</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Figma-driven testimonial section preview.
                    </p>
                  </div>

                  <Testimonial />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Business CTA</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Existing landing-page CTA section preview.
                    </p>
                  </div>

                  <BusinessCTASection />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">FAQs</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Existing landing-page FAQ section preview.
                    </p>
                  </div>

                  <FAQsSection />
                </section>

                <section className="space-y-[var(--space-24)]">
                  <div className="mx-auto max-w-[720px] text-center">
                    <h2 className="type-h2 text-white">Footer</h2>
                    <p className="type-body-l mt-[var(--space-16)] text-white/60">
                      Existing landing-page footer/download section preview.
                    </p>
                  </div>

                  <FooterSection />
                </section>
              </div>
            ) : activeSection === "logo" ? (
              <div className="mx-auto w-full max-w-[1100px] space-y-[var(--space-24)] pt-[18vh] pb-[24vh]">
                <section className="overflow-hidden rounded-[14px] border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <section className="space-y-[var(--space-16)] bg-white px-[var(--space-24)] py-[var(--space-24)] sm:px-[var(--space-32)] sm:py-[var(--space-32)]">
                      <p className="text-[16px] font-medium leading-[24px] text-black">Light bg</p>
                      <div className="space-y-[var(--space-12)]">
                        {logoVariantDocs.map((logo) => (
                          <article
                            key={`logo-light-${logo.variant}`}
                            className="rounded-[12px] border border-black/10 px-[var(--space-16)] py-[var(--space-16)]"
                          >
                            <p className="type-micro mb-[var(--space-12)] text-black/50">
                              {logo.label}
                            </p>
                            <KoshLogo variant={logo.variant} tone="dark" />
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-[var(--space-16)] bg-[#050505] px-[var(--space-24)] py-[var(--space-24)] sm:px-[var(--space-32)] sm:py-[var(--space-32)]">
                      <p className="text-[16px] font-medium leading-[24px] text-white">Dark bg</p>
                      <div className="space-y-[var(--space-12)]">
                        {logoVariantDocs.map((logo) => (
                          <article
                            key={`logo-dark-${logo.variant}`}
                            className="rounded-[12px] border border-white/10 px-[var(--space-16)] py-[var(--space-16)]"
                          >
                            <p className="type-micro mb-[var(--space-12)] text-white/55">
                              {logo.label}
                            </p>
                            <KoshLogo variant={logo.variant} tone="light" />
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>
                </section>
              </div>
            ) : activeSection === "motion" ? (
              <div className="mx-auto w-full max-w-[980px] space-y-[var(--space-24)] pt-[18vh] pb-[24vh]">
                <section>
                  <p className="type-micro mb-[var(--space-16)] text-white/45">Motion</p>
                  <h2 className="type-h2 text-white">Motion References</h2>
                  <p className="type-body-l mt-[var(--space-16)] max-w-[720px] text-white/60">
                    Use this section for animation principles, Lottie references, timing curves,
                    interaction behavior, and motion implementation notes across the website system.
                  </p>
                  <div className="mt-[var(--space-32)]">
                    <MotionLoaderDemo />
                  </div>
                </section>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[980px] pt-[18vh] pb-[24vh]">
                <div className="flex flex-col gap-[40px]">
                  {/* Secondary */}
                  <div>
                    <p className="type-micro mb-[var(--space-16)] text-white/45">Secondary</p>
                    <div className="flex items-center gap-[40px]">
                      <Button variant="secondary" size="icon" aria-label="Arrow">
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </Button>
                      <Button variant="secondary" iconLeft={<svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}>
                        Download App
                      </Button>
                      <Button variant="secondary">
                        Download App
                      </Button>
                    </div>
                  </div>

                  {/* Primary */}
                  <div>
                    <p className="type-micro mb-[var(--space-16)] text-white/45">Primary</p>
                    <div className="flex items-center gap-[40px]">
                      <Button variant="primary" size="icon" aria-label="Arrow">
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </Button>
                      <Button variant="primary" iconLeft={<svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}>
                        Create Account
                      </Button>
                      <Button variant="primary">
                        Create Account
                      </Button>
                    </div>
                  </div>

                  {/* Prominent */}
                  <div>
                    <p className="type-micro mb-[var(--space-16)] text-white/45">Prominent</p>
                    <div className="flex items-center gap-[40px]">
                      <Button variant="prominent" size="icon" aria-label="Arrow">
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </Button>
                      <Button variant="prominent" iconLeft={<svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}>
                        Create Account
                      </Button>
                      <Button variant="prominent">
                        Create Account
                      </Button>
                    </div>
                  </div>

                  {/* Highlighted */}
                  <div>
                    <p className="type-micro mb-[var(--space-16)] text-white/45">Highlighted</p>
                    <div className="flex items-center gap-[40px]">
                      <Button variant="highlighted" size="icon" aria-label="Arrow">
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </Button>
                      <Button variant="highlighted" iconLeft={<svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M10.833 5L15.833 10l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}>
                        Create Account
                      </Button>
                      <Button variant="highlighted">
                        Create Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </section>
      </div>
    </div>
  );
}
