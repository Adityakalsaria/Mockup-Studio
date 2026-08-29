"use client";

import {
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type ButtonVariant = "secondary" | "primary" | "prominent" | "highlighted";
type ButtonSize = "sm" | "md" | "icon";

type ButtonAsButton = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never;
};

type ButtonAsLink = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  disabled?: boolean;
};

type ButtonProps = (ButtonAsButton | ButtonAsLink) & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "py-[6px] px-[var(--space-12)] min-h-[36px]",
  md: "py-[var(--space-8)] px-[var(--space-16)] min-h-[44px]",
  icon: "h-12 w-12 p-0",
};

/* ── Canonical material mapping ── */
const variantStyles: Record<
  ButtonVariant,
  {
    surface: string;
    color: string;
    glowOpacity: number;
    borderOpacity: number;
  }
> = {
  secondary: {
    surface: "rgba(39,39,39,0.52)",
    color: "var(--color-white)",
    glowOpacity: 0.35,
    borderOpacity: 0.3,
  },
  primary: {
    surface: "rgba(255,255,255,0.75)",
    color: "var(--color-black)",
    glowOpacity: 1,
    borderOpacity: 1,
  },
  prominent: {
    surface: "color-mix(in srgb, var(--color-accent) 75%, transparent)",
    color: "var(--color-white)",
    glowOpacity: 0.5,
    borderOpacity: 0.8,
  },
  highlighted: {
    surface: "rgba(39,39,39,0.52)",
    color: "var(--color-white)",
    glowOpacity: 0.35,
    borderOpacity: 1,
  },
};

function isPressKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function Button({
  variant = "secondary",
  size = "md",
  iconLeft,
  iconRight,
  className = "",
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const rafRef = useRef<number>(0);
  const tone = variantStyles[variant];
  const isLink = "href" in props && !!props.href;

  const applyMaterialGlow = (
    target: HTMLElement,
    clientX: number,
    clientY: number,
    pointerType: "touch" | "mouse"
  ) => {
    if (disabled) {
      return;
    }

    const overlay = target.querySelector<HTMLElement>("[data-button-glow-overlay]");
    if (!overlay) {
      return;
    }

    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    const baseSize = Math.max(rect.width, rect.height);
    const sizeMultiplier = pointerType === "touch" ? 1.18 : 0.92;
    const glowSize = Math.round(baseSize * sizeMultiplier);

    overlay.style.background = `radial-gradient(circle ${glowSize}px at ${x}% ${y}%, var(--material-interactive-glow-core, rgba(255, 255, 255, 0.88)) 0%, var(--material-interactive-glow-edge, rgba(255, 255, 255, 0.52)) 34%, rgba(255, 255, 255, 0) 72%)`;
    overlay.style.opacity = String(tone.glowOpacity);
  };

  const clearMaterialGlow = (target: HTMLElement) => {
    const overlay = target.querySelector<HTMLElement>("[data-button-glow-overlay]");
    if (!overlay) {
      return;
    }
    overlay.style.opacity = "0";
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    const pointerType = event.pointerType === "touch" ? "touch" : "mouse";
    applyMaterialGlow(event.currentTarget, event.clientX, event.clientY, pointerType);
    if (!isLink) {
      (props as ButtonAsButton).onPointerEnter?.(event as ReactPointerEvent<HTMLButtonElement>);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const clientX = event.clientX;
    const clientY = event.clientY;
    const pointerType = event.pointerType === "touch" ? "touch" : "mouse";
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      applyMaterialGlow(target, clientX, clientY, pointerType);
    });
    if (!isLink) {
      (props as ButtonAsButton).onPointerMove?.(event as ReactPointerEvent<HTMLButtonElement>);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!disabled) {
      setIsPressed(true);
    }
    const pointerType = event.pointerType === "touch" ? "touch" : "mouse";
    applyMaterialGlow(event.currentTarget, event.clientX, event.clientY, pointerType);
    if (!isLink) {
      (props as ButtonAsButton).onPointerDown?.(event as ReactPointerEvent<HTMLButtonElement>);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    setIsPressed(false);
    if (!isLink) {
      (props as ButtonAsButton).onPointerUp?.(event as ReactPointerEvent<HTMLButtonElement>);
    }
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    setIsPressed(false);
    clearMaterialGlow(event.currentTarget);
    if (!isLink) {
      (props as ButtonAsButton).onPointerLeave?.(event as ReactPointerEvent<HTMLButtonElement>);
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    setIsPressed(false);
    clearMaterialGlow(event.currentTarget);
    if (!isLink) {
      (props as ButtonAsButton).onPointerCancel?.(event as ReactPointerEvent<HTMLButtonElement>);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!disabled && isPressKey(event.key)) {
      setIsPressed(true);
    }
    if (!isLink) {
      (props as ButtonAsButton).onKeyDown?.(event as ReactKeyboardEvent<HTMLButtonElement>);
    }
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (isPressKey(event.key)) {
      setIsPressed(false);
    }
    if (!isLink) {
      (props as ButtonAsButton).onKeyUp?.(event as ReactKeyboardEvent<HTMLButtonElement>);
    }
  };

  const elementStyle: CSSProperties = {
    background: tone.surface,
    color: tone.color,
    backdropFilter: "blur(7.5px)",
    WebkitBackdropFilter: "blur(7.5px)",
    ...(disabled ? { opacity: 0.45 } : {}),
    ...style,
  };

  const hasDisplayOverride = /\b(hidden|block|inline-flex|flex|grid)\b/.test(className);
  const displayClass = hasDisplayOverride ? "" : "inline-flex";

  const sharedClassName = `btn-base type-action relative ${displayClass} items-center justify-center whitespace-nowrap rounded-[var(--radius-lg)] border border-transparent ${sizeStyles[size]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${isPressed && !disabled ? "btn-pressed" : ""} ${disabled ? "pointer-events-none" : ""} ${className}`;

  const innerContent = (
    <>
      {/* Border — rotating conic for highlighted, static gradient for others */}
      {variant === "highlighted" ? (
        <span aria-hidden className="btn-border-spin-wrapper pointer-events-none">
          <span className="btn-border-spin-ring" />
        </span>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-1px] rounded-[inherit]"
          style={{
            padding: "1px",
            background: `linear-gradient(${size === "icon" ? "150deg" : "170deg"}, #fff 10%, rgba(0,0,0,0.11) 50%, #fff 90%)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            mixBlendMode: "overlay",
            opacity: tone.borderOpacity,
          }}
        />
      )}
      <span
        data-button-glow-overlay
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200"
        style={{ mixBlendMode: "overlay" }}
      />
      <span className="relative z-10 inline-flex items-center gap-[6px]">
        {iconLeft}
        {children}
        {iconRight}
      </span>
    </>
  );

  const sharedHandlers = {
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerMove,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    onPointerCancel: handlePointerCancel,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
  };

  if (isLink) {
    const { href, ...linkRest } = props as ButtonAsLink;
    const isExternal = href.startsWith("http");

    return (
      <a
        href={href}
        className={sharedClassName}
        style={elementStyle}
        aria-disabled={disabled || undefined}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...(sharedHandlers as unknown as Record<string, React.EventHandler<never>>)}
        {...linkRest}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <button
      className={sharedClassName}
      style={elementStyle}
      disabled={disabled}
      {...(sharedHandlers as unknown as Record<string, React.EventHandler<never>>)}
      {...(props as ButtonAsButton)}
    >
      {innerContent}
    </button>
  );
}
