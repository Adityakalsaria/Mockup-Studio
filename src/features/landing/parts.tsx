import type { ReactNode } from "react";

const ICONS = "/figma-assets/mockup-studio/icons";

/** One of the studio's own icons, at any size. */
export function Ic({ name, size = 20 }: { name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${ICONS}/${name}.svg`} width={size} height={size} alt="" />;
}

/** The dotted ground of the studio's canvas. */
export const DOTS =
  "bg-[#f6f6f7] bg-[radial-gradient(circle,rgb(0_0_0/0.16)_1px,transparent_1.3px)] [background-size:22px_22px]";

/** A frosted grey pill of text over an image. */
export function GlassPill({ children, icon, className = "" }: { children: ReactNode; icon?: string; className?: string }) {
  return (
    <p
      className={`inline-flex h-[34px] items-center gap-[8px] whitespace-nowrap rounded-full bg-black/35 px-[14px] text-[14px] text-white shadow-[0_10px_24px_-10px_rgb(0_0_0/0.4)] backdrop-blur-xl ${className}`}
    >
      {icon ? <Ic name={icon} size={16} /> : null}
      {children}
    </p>
  );
}

/**
 * A section's opening block, as the design sets it: a small navy label, a
 * 40px semibold headline, and a grey lead.
 */
export function SectionHead({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-[11.7px] ${className}`}>
      {eyebrow ? <p className="text-[18px] leading-[24.48px] tracking-[-0.13px] text-[#2e3a5b]">{eyebrow}</p> : null}
      <h2 className="text-[32px] font-semibold leading-[1.2] tracking-[-1.2px] text-[#282228] laptop:text-[40px] laptop:leading-[48px]">{title}</h2>
      {children ? <p className="max-w-[707px] text-[20px] leading-[27.2px] tracking-[-0.2px] text-[rgba(40,34,40,0.65)]">{children}</p> : null}
    </div>
  );
}

/** The 986px column every section of the design sits in. */
export const COLUMN = "w-[986px] max-w-full px-5 min-[1040px]:px-0";
