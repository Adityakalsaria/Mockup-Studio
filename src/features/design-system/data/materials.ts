import type { MaterialPatternDoc } from "@/features/design-system/types";

/* ── Canonical materials (from Figma node 852:5153) ── */
export const canonicalMaterials: MaterialPatternDoc[] = [
  {
    name: "Material Prominent",
    description: "Accent-tinted glass surface for prominent actions and hero elements.",
    surface: "color-mix(in srgb, var(--color-accent) 75%, transparent)",
    blur: "7.5px",
    border: "1px linear-gradient(155deg, #fff 39%, rgba(0,0,0,0.11) 54%, #fff 79%) overlay",
    radius: "24px",
    usedIn: ["Figma canonical"],
    variant: "prominent",
  },
  {
    name: "Material Light",
    description: "White glass surface for light-mode or high-contrast contexts.",
    surface: "rgba(255, 255, 255, 0.75)",
    blur: "7.5px",
    border: "1px linear-gradient(155deg, #fff 39%, rgba(0,0,0,0.11) 54%, #fff 79%) overlay",
    radius: "24px",
    usedIn: ["Figma canonical"],
    variant: "light",
  },
  {
    name: "Material Dark Subtle",
    description: "Low-opacity dark glass for understated overlays and secondary surfaces.",
    surface: "rgba(39, 39, 39, 0.28)",
    blur: "7.5px",
    border: "1px linear-gradient(155deg, #fff 39%, rgba(0,0,0,0.11) 54%, #fff 79%) overlay",
    radius: "24px",
    usedIn: ["Figma canonical"],
    variant: "dark-subtle",
  },
  {
    name: "Material Dark",
    description: "Standard dark glass surface for cards, panels, and modals.",
    surface: "rgba(39, 39, 39, 0.52)",
    blur: "7.5px",
    border: "1px linear-gradient(155deg, #fff 39%, rgba(0,0,0,0.11) 54%, #fff 79%) overlay",
    radius: "24px",
    usedIn: ["Figma canonical"],
    variant: "dark",
  },
];

/* ── Current ad-hoc patterns (kept for audit / migration reference) ── */
export const materialPatterns: MaterialPatternDoc[] = [
  {
    name: "Glass Dark",
    description: "Primary dark glass surface for card components.",
    surface: "rgba(24,24,24,0.62)",
    blur: "15px",
    border: "none",
    radius: "24px",
    usedIn: ["GlassCard"],
  },
  {
    name: "Frosted Pill",
    description: "Compact dark frosted pill for inline labels.",
    surface: "rgba(39,39,39,0.64)",
    blur: "7.5px",
    border: "none",
    radius: "9999px",
    usedIn: ["FutureSection pill"],
  },
];
