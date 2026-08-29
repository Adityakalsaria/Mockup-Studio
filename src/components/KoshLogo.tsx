import Image from "next/image";

export type KoshLogoVariant =
  | "kosh"
  | "business"
  | "card"
  | "personal"
  | "rewards"
  | "icon-only";
type KoshLogoTone = "dark" | "light";

interface KoshLogoProps {
  variant?: KoshLogoVariant;
  tone?: KoshLogoTone;
  color?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

const LOGO_ASSETS: Record<KoshLogoVariant, { src: string; width: number; height: number }> = {
  kosh: { src: "/logos/kosh/kosh.svg", width: 140, height: 32 },
  business: { src: "/logos/kosh/kosh-business.svg", width: 317, height: 32 },
  card: { src: "/logos/kosh/kosh-card.svg", width: 244, height: 32 },
  personal: { src: "/logos/kosh/kosh-personal.svg", width: 334, height: 32 },
  rewards: { src: "/logos/kosh/kosh-rewards.svg", width: 317, height: 32 },
  "icon-only": { src: "/logos/kosh/icon-only.svg", width: 32, height: 32 },
};

function inferToneFromColor(color: string | undefined): KoshLogoTone {
  if (!color) return "dark";

  const normalized = color.trim().toLowerCase();
  if (
    normalized === "white" ||
    normalized === "#fff" ||
    normalized === "#ffffff" ||
    normalized.includes("foreground")
  ) {
    return "light";
  }

  return "dark";
}

export default function KoshLogo({
  variant = "kosh",
  tone,
  color,
  className,
  width,
  height,
  priority = false,
}: KoshLogoProps) {
  const asset = LOGO_ASSETS[variant];
  const resolvedTone = tone ?? inferToneFromColor(color);

  return (
    <Image
      src={asset.src}
      alt={variant === "icon-only" ? "Kosh icon" : "Kosh logo"}
      width={width ?? asset.width}
      height={height ?? asset.height}
      className={className}
      priority={priority}
      style={resolvedTone === "light" ? { filter: "brightness(0) saturate(100%) invert(1)" } : undefined}
    />
  );
}
