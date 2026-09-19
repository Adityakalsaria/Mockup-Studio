import { Button, ChevronIcon, Glyph } from "@/design/ui";

const ICONS = "/figma-assets/mockup-studio/icons";

/**
 * A link on the studio's selected-pill material, laid out like a device row:
 * glyph, label, chevron.
 */
export function Cta({
  href,
  children,
  icon = "iphone",
  height,
  chevron = true,
  dark = false,
}: {
  href: string;
  children: string;
  icon?: string | null;
  height?: number;
  chevron?: boolean;
  /** On a black card, where the full glass is what reads. */
  dark?: boolean;
}) {
  return (
    <Button href={href} height={height} flat={!dark}>
      <span className="flex items-center gap-[var(--mo-space-3)] px-[var(--mo-space-3)]">
        {icon ? (
          <Glyph>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ICONS}/${icon}.svg`} width={20} height={20} alt="" />
          </Glyph>
        ) : null}
        <span className="whitespace-nowrap">{children}</span>
        {chevron ? (
          <Glyph muted>
            <ChevronIcon />
          </Glyph>
        ) : null}
      </span>
    </Button>
  );
}
