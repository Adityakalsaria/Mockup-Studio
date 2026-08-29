import type {
  AntiPatternRule,
  ColorTokenDoc,
  DesignCharterRule,
  FAQItem,
  MotionTokenDoc,
  OpacityStop,
  RadiusTokenDoc,
  SpacingTokenDoc,
  TypeScaleTokenDoc,
  ZIndexTokenDoc,
} from "@/features/design-system/types";

export const sectionNavigation = [
  { id: "charter", label: "Charter" },
  { id: "token-architecture", label: "Token Model" },
  { id: "colors", label: "Color" },
  { id: "typography", label: "Typography" },
  { id: "layout", label: "Layout" },
  { id: "components", label: "Components" },
  { id: "motion", label: "Motion" },
  { id: "accessibility", label: "A11y" },
  { id: "rules", label: "Rules" },
  { id: "faq", label: "FAQ" },
] as const;

export const charterRules: DesignCharterRule[] = [
  {
    title: "Token-first styling",
    intent: "All shared UI surfaces should be styled with semantic tokens.",
    details:
      "Hardcoded hex values and one-off spacing values are allowed only for animation math and temporary migration exceptions.",
  },
  {
    title: "Readable hierarchy",
    intent: "Content should expose clear information layers within one viewport.",
    details:
      "Display/heading/body roles must be obvious by scale, contrast, and spacing before decorative visuals are introduced.",
  },
  {
    title: "Motion with intent",
    intent: "Motion should support state change and orientation, not decoration.",
    details:
      "Prefer easing tokens, bounded durations, and interruptible transitions. Respect reduced motion.",
  },
  {
    title: "Systematic responsiveness",
    intent: "Every component should define small, medium, and large behavior.",
    details:
      "Responsive rules belong in the component spec itself, not as ad-hoc overrides in page sections.",
  },
];

export const whiteOpacityStops: OpacityStop[] = [
  { value: 2,  tailwind: "/[0.02]", usage: "Faintest tint", occurrences: 0 },
  { value: 4,  tailwind: "/[0.04]", usage: "Subtle table/card fills", occurrences: 3 },
  { value: 5,  tailwind: "/5",      usage: "Hover feedback", occurrences: 0 },
  { value: 6,  tailwind: "/[0.06]", usage: "Subtle dividers", occurrences: 13 },
  { value: 10, tailwind: "/10",     usage: "Borders, chip fills", occurrences: 5 },
  { value: 15, tailwind: "/15",     usage: "Stronger borders", occurrences: 0 },
  { value: 20, tailwind: "/20",     usage: "Muted labels", occurrences: 5 },
  { value: 25, tailwind: "/25",     usage: "Dim counts", occurrences: 0 },
  { value: 30, tailwind: "/30",     usage: "Low-emphasis labels", occurrences: 21 },
  { value: 40, tailwind: "/40",     usage: "Tertiary text, counts", occurrences: 1 },
  { value: 45, tailwind: "/45",     usage: "Subdued metadata", occurrences: 0 },
  { value: 50, tailwind: "/50",     usage: "Secondary descriptions", occurrences: 4 },
  { value: 55, tailwind: "/55",     usage: "Helper text", occurrences: 0 },
  { value: 60, tailwind: "/60",     usage: "Secondary text", occurrences: 60 },
  { value: 70, tailwind: "/70",     usage: "Category labels", occurrences: 2 },
  { value: 80, tailwind: "/80",     usage: "Strong secondary text", occurrences: 5 },
  { value: 85, tailwind: "/85",     usage: "Near-primary text", occurrences: 0 },
  { value: 90, tailwind: "/90",     usage: "High-emphasis text", occurrences: 0 },
  { value: 100, tailwind: "/100",   usage: "Pure white", occurrences: 0 },
];

export const blackOpacityStops: OpacityStop[] = [
  { value: 2,  tailwind: "/[0.02]", usage: "Subtle tinted backgrounds", occurrences: 3 },
  { value: 4,  tailwind: "/[0.04]", usage: "Glass surface borders", occurrences: 1 },
  { value: 10, tailwind: "/10",     usage: "Light borders on white surfaces", occurrences: 2 },
  { value: 15, tailwind: "/15",     usage: "Soft shadow edges", occurrences: 0 },
  { value: 25, tailwind: "/25",     usage: "Drop-shadow fills", occurrences: 1 },
  { value: 30, tailwind: "/30",     usage: "Heavy shadow fills", occurrences: 1 },
  { value: 40, tailwind: "/40",     usage: "Muted text on light backgrounds", occurrences: 1 },
  { value: 50, tailwind: "/50",     usage: "Secondary labels on light backgrounds", occurrences: 1 },
  { value: 55, tailwind: "/55",     usage: "Body text on light backgrounds", occurrences: 3 },
  { value: 60, tailwind: "/60",     usage: "Mobile overlay backdrop", occurrences: 1 },
  { value: 70, tailwind: "/70",     usage: "Heavy overlay backdrop", occurrences: 2 },
  { value: 80, tailwind: "/80",     usage: "Gradient overlays", occurrences: 1 },
  { value: 90, tailwind: "/90",     usage: "High-emphasis text on light backgrounds", occurrences: 0 },
  { value: 95, tailwind: "/95",     usage: "Near-opaque gradient endpoints", occurrences: 1 },
  { value: 100, tailwind: "/100",  usage: "Pure black", occurrences: 0 },
];

export const colorTokens: ColorTokenDoc[] = [
  // ── Base ──
  { name: "black",      value: "#000000", group: "base", usage: "Overlays and contrast anchors.", usageCount: 3 },
  { name: "white",      value: "#FFFFFF", group: "base", usage: "Text and inverse surfaces.", usageCount: 5 },
  { name: "background", value: "#08090A", group: "base", usage: "Page backgrounds, large sections.", usageCount: 1 },
  { name: "foreground", value: "#F7F9FC", group: "base", usage: "Headings, body text, key icons.", usageCount: 14 },
  // ── Text ──
  { name: "text-primary",      value: "rgba(255, 255, 255, 0.9)", displayValue: "white / 90%", group: "text", usage: "Headings and high-emphasis text on dark backgrounds.", usageCount: 58 },
  { name: "text-secondary",    value: "rgba(255, 255, 255, 0.6)", displayValue: "white / 60%", group: "text", usage: "Body copy, descriptions, and supporting text.", usageCount: 56 },
  { name: "text-muted",        value: "rgba(255, 255, 255, 0.4)", displayValue: "white / 40%", group: "text", usage: "Captions, disclaimers, and low-emphasis labels.", usageCount: 44 },
  { name: "text-primary-dark", value: "rgba(0, 0, 0, 0.9)", displayValue: "black / 90%", group: "text", usage: "Headings and high-emphasis text on light backgrounds.", usageCount: 0 },
  { name: "text-secondary-dark", value: "rgba(0, 0, 0, 0.6)", displayValue: "black / 60%", group: "text", usage: "Body copy and descriptions on light backgrounds.", usageCount: 0 },
  { name: "text-muted-dark",  value: "rgba(0, 0, 0, 0.4)", displayValue: "black / 40%", group: "text", usage: "Captions and low-emphasis labels on light backgrounds.", usageCount: 0 },
  { name: "text-link",        value: "#2563EB", displayValue: "var(--color-accent)", group: "text", usage: "Inline links and interactive text.", usageCount: 1 },
  // ── Surface & Brand ──
  { name: "border",           value: "#252B36", group: "surface", usage: "Dividers, card strokes, subtle separators.", usageCount: 8 },
  { name: "accent",           value: "#2563EB", group: "surface", usage: "Links, active indicators, conversion emphasis.", usageCount: 2 },
  // ── Button ──
  { name: "button-secondary-dark-bg",     value: "rgba(39, 39, 39, 0.64)", group: "button", usage: "Secondary CTA on dark sections.", usageCount: 8 },
  { name: "button-secondary-dark-border", value: "white (overlay blend)",   group: "button", usage: "Overlay-blended border for secondary dark button.", usageCount: 0 },
  { name: "button-secondary-light-bg",    value: "#ECEFF4CC",              group: "button", usage: "Secondary CTA on light sections.", usageCount: 2 },
  { name: "button-secondary-light-border", value: "#0000000A",             group: "button", usage: "Stroke for secondary light button.", usageCount: 2 },
  { name: "button-primary-dark-bg",       value: "#FFFFFF",                group: "button", usage: "Filled light button for dark themes.", usageCount: 1 },
  { name: "button-primary-dark-border",   value: "#FFFFFF0D",              group: "button", usage: "Border for primary button on dark backgrounds.", usageCount: 1 },
  { name: "button-primary-light-bg",      value: "#0B0D12",               group: "button", usage: "Filled dark button for light themes.", usageCount: 1 },
  { name: "button-primary-light-border",  value: "#0000000A",              group: "button", usage: "Border for primary button on light backgrounds.", usageCount: 1 },
  { name: "button-prominent-bg",          value: "#2563EB",               group: "button", usage: "High-emphasis conversion CTA.", usageCount: 2 },
  { name: "button-prominent-border",      value: "#2563EB33",              group: "button", usage: "Subtle edge for prominent filled button.", usageCount: 2 },
  // ── Header ──
  { name: "header-dark-start",        value: "rgba(0, 0, 0, 0.4)",    displayValue: "black / 40%", group: "header", usage: "Sticky header dark theme surface.", usageCount: 1 },
  { name: "header-dark-end",          value: "var(--color-black)",     displayValue: "var(--color-black)", group: "header", usage: "Sticky header dark theme surface.", usageCount: 1 },
  { name: "header-nav-active-light",  value: "var(--color-white)",     displayValue: "var(--color-white)", group: "header", usage: "Selected nav item on light header.", usageCount: 1 },
  { name: "header-nav-inactive-light", value: "rgba(255, 255, 255, 0.4)", displayValue: "white / 40%", group: "header", usage: "Unselected nav item on light header.", usageCount: 1 },
  // ── Material ──
  { name: "material-glass-surface",           value: "rgba(236, 236, 236, 0.62)", group: "material", usage: "Translucent glass card surfaces.", usageCount: 1 },
  { name: "material-glass-surface-dark",      value: "rgba(24, 24, 24, 0.62)",    group: "material", usage: "Glass surfaces on dark contexts.", usageCount: 1 },
  { name: "material-glass-border",            value: "rgba(0, 0, 0, 0.04)",       group: "material", usage: "Subtle border for glass surfaces.", usageCount: 1 },
  { name: "material-interactive-glow-core",   value: "rgba(255, 255, 255, 0.68)", group: "material", usage: "Center glow for interactive surfaces.", usageCount: 4 },
  { name: "material-interactive-glow-edge",   value: "rgba(255, 255, 255, 0.32)", group: "material", usage: "Edge falloff for interactive surfaces.", usageCount: 4 },
];

export const typeScaleTokens: TypeScaleTokenDoc[] = [
  {
    name: "Display",
    token: "--font-size-display",
    sample: "Designed for how money moves",
    fontName: "Saans",
    size: "64px",
    weight: "600",
    lineHeight: "70px",
    tracking: "-1.2px",
  },
  {
    name: "H1",
    token: "--font-size-h1",
    sample: "Designed for how money moves",
    fontName: "Saans",
    size: "48px",
    weight: "600",
    lineHeight: "54px",
    tracking: "-0.8px",
  },
  {
    name: "H2",
    token: "--font-size-h2",
    sample: "Section heading",
    fontName: "Saans",
    size: "36px",
    weight: "600",
    lineHeight: "42px",
    tracking: "-0.5px",
  },
  {
    name: "H3",
    token: "--font-size-h3",
    sample: "Sub-section heading",
    fontName: "Saans",
    size: "28px",
    weight: "600",
    lineHeight: "34px",
    tracking: "-0.2px",
  },
  {
    name: "H4",
    token: "--font-size-h4",
    sample: "Card heading",
    fontName: "Saans",
    size: "24px",
    weight: "600",
    lineHeight: "28px",
    tracking: "-0.2px",
  },
  {
    name: "H5",
    token: "--font-size-h5",
    sample: "Label heading",
    fontName: "Saans",
    size: "20px",
    weight: "600",
    lineHeight: "24px",
    tracking: "0px",
  },
  {
    name: "Body L",
    token: "--font-size-body-l",
    sample: "Supportive intro copy for hero and section leads.",
    fontName: "Saans",
    size: "20px",
    weight: "400",
    lineHeight: "30px",
    tracking: "0px",
  },
  {
    name: "Body M",
    token: "--font-size-body-m",
    sample: "Long-form paragraph copy and supporting product details.",
    fontName: "Saans",
    size: "16px",
    weight: "400",
    lineHeight: "24px",
    tracking: "0px",
  },
  {
    name: "Action",
    token: "--font-size-action",
    sample: "Get started",
    fontName: "Saans",
    size: "16px",
    weight: "500",
    lineHeight: "24px",
    tracking: "0px",
  },
  {
    name: "Micro",
    token: "--font-size-micro",
    sample: "Pills, helper labels, and compact metadata",
    fontName: "Saans",
    size: "14px",
    weight: "500",
    lineHeight: "21px",
    tracking: "0px",
  }
];

export const TYPOGRAPHY_BREAKPOINTS = [
  { label: "Mobile", range: "≤ 767px" },
  { label: "iPad", range: "768 – 1023px" },
  { label: "Laptop 14\"", range: "1024 – 1439px" },
  { label: "Laptop 16\"+", range: "≥ 1440px" },
] as const;

export const TYPOGRAPHY_RESPONSIVE: Array<{
  name: string;
  className: string;
  /** [mobile, iPad, laptop14, laptop16+] — null means same as desktop */
  sizes: Array<{ size: string; lineHeight: string } | null>;
  usageCount: number;
}> = [
  { name: "Display", className: "type-display", usageCount: 5, sizes: [
    { size: "40px", lineHeight: "48px" }, { size: "48px", lineHeight: "56px" },
    { size: "56px", lineHeight: "64px" }, { size: "64px", lineHeight: "70px" },
  ]},
  { name: "H1", className: "type-h1", usageCount: 20, sizes: [
    { size: "32px", lineHeight: "38px" }, { size: "36px", lineHeight: "42px" },
    { size: "42px", lineHeight: "48px" }, { size: "48px", lineHeight: "54px" },
  ]},
  { name: "H2", className: "type-h2", usageCount: 11, sizes: [
    { size: "30px", lineHeight: "36px" }, { size: "32px", lineHeight: "38px" },
    { size: "34px", lineHeight: "40px" }, { size: "36px", lineHeight: "42px" },
  ]},
  { name: "H3", className: "type-h3", usageCount: 10, sizes: [
    { size: "24px", lineHeight: "30px" }, { size: "26px", lineHeight: "32px" },
    { size: "28px", lineHeight: "34px" }, { size: "28px", lineHeight: "34px" },
  ]},
  { name: "H4", className: "type-h4", usageCount: 9, sizes: [
    { size: "20px", lineHeight: "26px" }, { size: "18px", lineHeight: "24px" },
    { size: "20px", lineHeight: "26px" }, { size: "24px", lineHeight: "28px" },
  ]},
  { name: "H5", className: "type-h5", usageCount: 1, sizes: [
    { size: "16px", lineHeight: "20px" }, { size: "20px", lineHeight: "24px" },
    { size: "20px", lineHeight: "24px" }, { size: "20px", lineHeight: "24px" },
  ]},
  { name: "Body L", className: "type-body-l", usageCount: 28, sizes: [
    { size: "16px", lineHeight: "24px" }, { size: "20px", lineHeight: "30px" },
    { size: "20px", lineHeight: "30px" }, { size: "20px", lineHeight: "30px" },
  ]},
  { name: "Body M", className: "type-body-m", usageCount: 65, sizes: [
    { size: "14px", lineHeight: "21px" }, { size: "16px", lineHeight: "24px" },
    { size: "16px", lineHeight: "24px" }, { size: "16px", lineHeight: "24px" },
  ]},
  { name: "Action", className: "type-action", usageCount: 11, sizes: [
    { size: "16px", lineHeight: "24px" }, { size: "16px", lineHeight: "24px" },
    { size: "16px", lineHeight: "24px" }, { size: "16px", lineHeight: "24px" },
  ]},
  { name: "Micro", className: "type-micro", usageCount: 65, sizes: [
    { size: "14px", lineHeight: "21px" }, { size: "14px", lineHeight: "21px" },
    { size: "14px", lineHeight: "21px" }, { size: "14px", lineHeight: "21px" },
  ]},
];

export const spacingScale = [
  0,
  4,
  8,
  12,
  16,
  20,
  24,
  32,
  40,
  48,
  56,
  64,
  72,
  80,
  96,
  112,
  128,
  160,
];

export const spacingTokens: SpacingTokenDoc[] = [
  { name: "4", token: "--space-4", value: "4px", usage: "Tight icon/text offsets.", group: "primitive", usageCount: 20 },
  { name: "8", token: "--space-8", value: "8px", usage: "Dense chips and compact stacks.", group: "primitive", usageCount: 47 },
  { name: "12", token: "--space-12", value: "12px", usage: "Small group spacing.", group: "primitive", usageCount: 36 },
  { name: "16", token: "--space-16", value: "16px", usage: "Compact default spacing.", group: "primitive", usageCount: 47 },
  { name: "20", token: "--space-20", value: "20px", usage: "Comfortable text and icon spacing.", group: "primitive", usageCount: 43 },
  { name: "24", token: "--space-24", value: "24px", usage: "Default card/content padding.", group: "primitive", usageCount: 31 },
  { name: "32", token: "--space-32", value: "32px", usage: "Grid gutters and larger paddings.", group: "primitive", usageCount: 44 },
  { name: "40", token: "--space-40", value: "40px", usage: "Medium stack spacing.", group: "primitive", usageCount: 18 },
  { name: "48", token: "--space-48", value: "48px", usage: "Large stack spacing.", group: "primitive", usageCount: 7 },
  { name: "56", token: "--space-56", value: "56px", usage: "Large content block spacing.", group: "primitive", usageCount: 8 },
  { name: "64", token: "--space-64", value: "64px", usage: "Major section internals.", group: "primitive", usageCount: 13 },
  { name: "80", token: "--space-80", value: "80px", usage: "Feature-to-feature spacing.", group: "primitive", usageCount: 1 },
  { name: "96", token: "--space-96", value: "96px", usage: "Substantial layout breathing room.", group: "primitive", usageCount: 2 },
  { name: "128", token: "--space-128", value: "128px", usage: "Large section separators.", group: "primitive", usageCount: 0 },
  { name: "160", token: "--space-160", value: "160px", usage: "Max hero-level spacing primitive.", group: "primitive", usageCount: 1 },
  { name: "2XS", token: "--spacing-2xs", value: "var(--space-8)", usage: "Tiny vertical rhythm steps.", group: "semantic", usageCount: 12 },
  { name: "XS", token: "--spacing-xs", value: "var(--space-12)", usage: "Compact component spacing.", group: "semantic", usageCount: 14 },
  { name: "SM", token: "--spacing-sm", value: "var(--space-16)", usage: "Small default spacing.", group: "semantic", usageCount: 29 },
  { name: "MD", token: "--spacing-md", value: "var(--space-24)", usage: "Default stack rhythm.", group: "semantic", usageCount: 13 },
  { name: "LG", token: "--spacing-lg", value: "var(--space-32)", usage: "Section block spacing.", group: "semantic", usageCount: 10 },
  { name: "XL", token: "--spacing-xl", value: "var(--space-48)", usage: "Major component spacing.", group: "semantic", usageCount: 1 },
  { name: "Grid Gutter", token: "--spacing-grid-gutter", value: "var(--space-32)", usage: "Horizontal/vertical gaps in multi-column layouts.", group: "layout", usageCount: 5 },
  { name: "Element", token: "--spacing-element", value: "clamp(16px, 1.2vw + 12px, 24px)", usage: "Element-level responsive spacing.", group: "layout", usageCount: 1 },
  { name: "Block", token: "--spacing-block", value: "clamp(32px, 2vw + 20px, 56px)", usage: "Block-level spacing between section groups.", group: "layout", usageCount: 3 },
  { name: "Section", token: "--spacing-section", value: "clamp(72px, 5vw + 40px, 120px)", usage: "Top/bottom spacing for full sections.", group: "layout", usageCount: 31 },
  { name: "Container Padding", token: "--container-padding", value: "clamp(16px, 4vw, 64px)", usage: "Horizontal page-safe padding.", group: "layout", usageCount: 1 },
  { name: "Container Max", token: "--container-max", value: "var(--layout-content-max)", usage: "Maximum website content width.", group: "layout", usageCount: 1 },
  { name: "Page Gutter", token: "--layout-page-gutter", value: "clamp(var(--spacing-sm), 4vw, var(--layout-page-gutter-desktop))", usage: "Responsive safe inline gutter used by landing sections.", group: "layout", usageCount: 18 },
];

export const layoutTokens = [
  { name: "Section", token: "--spacing-section", value: "clamp(72px, 5vw + 40px, 120px)" },
  { name: "Block", token: "--spacing-block", value: "clamp(32px, 2vw + 20px, 56px)" },
  { name: "Element", token: "--spacing-element", value: "clamp(16px, 1.2vw + 12px, 24px)" },
  { name: "Container Max", token: "--container-max", value: "var(--layout-content-max)" },
  { name: "Container Padding", token: "--container-padding", value: "clamp(16px, 4vw, 64px)" },
  {
    name: "Page Gutter",
    token: "--layout-page-gutter",
    value: "clamp(var(--spacing-sm), 4vw, var(--layout-page-gutter-desktop))",
  },
] as const;

export const radiusTokens: RadiusTokenDoc[] = [
  { name: "Small", value: "8px", usage: "Tags, compact chips" },
  { name: "Medium", value: "16px", usage: "Cards, panel containers" },
  { name: "Large", value: "24px", usage: "Dialogs, large cards" },
  { name: "Pill", value: "32px", usage: "Buttons and segmented controls" },
];

export const easingTokens: MotionTokenDoc[] = [
  {
    name: "Ease Out",
    token: "--ease-out",
    value: "cubic-bezier(0.16, 1, 0.3, 1)",
    usage: "Entrances and reveal transitions.",
  },
  {
    name: "Ease In Out",
    token: "--ease-in-out",
    value: "cubic-bezier(0.65, 0, 0.35, 1)",
    usage: "Symmetric transitions and layout changes.",
  },
  {
    name: "Ease Apple",
    token: "--ease-apple",
    value: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    usage: "General-purpose product motion.",
  },
];

export const durationTokens: MotionTokenDoc[] = [
  { name: "Fast", token: "--duration-fast", value: "0.2s", usage: "Hover and press feedback." },
  { name: "Normal", token: "--duration-normal", value: "0.4s", usage: "General UI transitions." },
  { name: "Slow", token: "--duration-slow", value: "0.8s", usage: "Section-level reveals." },
  { name: "Slower", token: "--duration-slower", value: "1.2s", usage: "Hero-grade storytelling motion." },
];

export const zIndexTokens: ZIndexTokenDoc[] = [
  { name: "behind", value: -1, usage: "Background ornaments" },
  { name: "base", value: 0, usage: "Default flow elements" },
  { name: "above", value: 10, usage: "Local overlays within section" },
  { name: "navbar", value: 100, usage: "Top navigation" },
  { name: "overlay", value: 200, usage: "Screen dimmers, global overlays" },
  { name: "modal", value: 300, usage: "Modal and forced-attention layers" },
];

export const antiPatternRules: AntiPatternRule[] = [
  {
    title: "Hardcoded colors in UI components",
    doRule: "Reference semantic tokens (`var(--color-*)`) in shared UI.",
    dontRule: "Do not add new raw `#hex` values to component classes.",
    reason: "Tokenized color mapping keeps theme parity and simplifies global updates.",
  },
  {
    title: "One-off container padding",
    doRule: "Use `Container` or `--container-padding` logic for page-level spacing.",
    dontRule: "Do not repeat custom `xl:px-[...]` values across sections.",
    reason: "Consistent safe zones prevent layout drift across screen sizes.",
  },
  {
    title: "Inline typography tuning by default",
    doRule: "Use typography tokens and shared heading/body utility patterns.",
    dontRule: "Avoid repeated per-element inline font settings unless absolutely needed.",
    reason: "Shared type utilities improve readability and reduce regressions.",
  },
  {
    title: "Unbounded motion",
    doRule: "Use motion tokens with bounded durations and reduced-motion fallback.",
    dontRule: "Do not hardcode long animations without interaction purpose.",
    reason: "Intentional motion improves usability and avoids visual fatigue.",
  },
];

export const designSystemFaq: FAQItem[] = [
  {
    question: "Why does Kosh use a token-first design system?",
    answer:
      "Token-first styling keeps visual consistency across sections and makes future theme updates predictable and low risk.",
  },
  {
    question: "When can I use hardcoded color or spacing values?",
    answer:
      "Only for temporary migration steps, animation math, or asset-driven visuals. Shared components should stay token-based.",
  },
  {
    question: "How do I document a new component?",
    answer:
      "Add purpose, anatomy, variants, states, interaction rules, accessibility notes, responsive behavior, and a concrete code usage snippet.",
  },
  {
    question: "How is this page useful for SEO and AI search?",
    answer:
      "The page uses explicit semantic structure, schema metadata, and machine-readable conventions so search engines and AI systems can index it clearly.",
  },
];
