"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { shotSrc } from "./shots";

const ICONS = "/figma-assets/mockup-studio/icons";

/** A studio icon at the size the chrome draws it. */
export function Ic({ name, size = 20 }: { name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${ICONS}/${name}.svg`} width={size} height={size} alt="" />;
}

/** The dotted ground of the studio's canvas, for a showcase to sit on. */
export const DOTS =
  "bg-[#f6f6f7] bg-[radial-gradient(circle,rgb(0_0_0/0.16)_1px,transparent_1.3px)] [background-size:22px_22px]";

/** The shadow a card floating over the canvas casts: a hairline, a near shadow and a long soft one. */
const FLOAT = "0 0 0 1px rgb(0 0 0 / 0.05), 0 2px 6px rgb(0 0 0 / 0.06), 0 28px 48px -16px rgb(0 0 0 / 0.28)";

/**
 * An image card floating on the canvas, the way an artboard shows its assets: a
 * filename above it, a size badge over its corner, its own soft shadow.
 */
export function FloatCard({
  shot,
  alt,
  name,
  size,
  className = "",
  style,
  fit = "cover",
  children,
}: {
  shot: string;
  alt: string;
  /** The file's name, set small above the card. */
  name?: string;
  /** "W 1200  H 1600" -- the badge over the top-left corner. */
  size?: [number, number];
  className?: string;
  style?: CSSProperties;
  fit?: "cover" | "contain";
  children?: ReactNode;
}) {
  return (
    <figure className={`relative ${className}`} style={style}>
      {size ? (
        <div className="absolute -top-[30px] left-0 z-[2]">
          <SizeBadge w={size[0]} h={size[1]} />
        </div>
      ) : null}
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-white" style={{ boxShadow: FLOAT }}>
        {name ? (
          <p className="type-caption flex h-[32px] shrink-0 items-center bg-[#f1f1f2] px-[var(--space-12)] text-text-secondary-dark">{name}</p>
        ) : null}
        <div className="relative min-h-0 flex-1">
          <Image
            unoptimized
            src={shotSrc(shot)}
            alt={alt}
            fill
            sizes="(min-width: 1260px) 600px, 90vw"
            className={fit === "cover" ? "object-cover" : "object-contain"}
          />
          {children}
        </div>
      </div>
    </figure>
  );
}

/** "W 219  H 395.14", the tiny measurement pill an artboard puts over an asset. */
export function SizeBadge({ w, h }: { w: number; h: number }) {
  return (
    <p className="type-caption inline-flex h-[22px] items-center gap-[6px] rounded-full bg-black/35 px-[10px] text-[11px] text-white backdrop-blur-md">
      <span className="opacity-60">W</span>
      {w}
      <span className="opacity-60">H</span>
      {h}
    </p>
  );
}

/** A frosted pill of text over an image, for a state or a verb. */
export function GlassPill({ children, icon, className = "", style }: { children: ReactNode; icon?: string; className?: string; style?: CSSProperties }) {
  return (
    <p
      className={`type-caption inline-flex h-[34px] items-center gap-[8px] whitespace-nowrap rounded-full bg-black/35 px-[14px] text-white shadow-[0_10px_24px_-10px_rgb(0_0_0/0.4)] backdrop-blur-xl ${className}`}
      style={style}
    >
      {icon ? <Ic name={icon} size={16} /> : null}
      {children}
    </p>
  );
}

/** A column of round frosted buttons, the actions an artboard hangs beside an asset. */
export function ActionStack({ icons, className = "" }: { icons: string[]; className?: string }) {
  return (
    <div className={`flex flex-col gap-[var(--space-8)] ${className}`}>
      {icons.map((name) => (
        <span key={name} className="grid h-[38px] w-[38px] place-items-center rounded-full bg-black/25 shadow-[0_8px_20px_-8px_rgb(0_0_0/0.35)] backdrop-blur-xl [&_img]:invert">
          <Ic name={name} />
        </span>
      ))}
    </div>
  );
}
