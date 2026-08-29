"use client";

import { useRef, useCallback, type ReactNode } from "react";

export default function GlassCard({
  children,
  className = "",
  contentClassName = "",
  disableInteractionGlow = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  disableInteractionGlow?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glowRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current || !glowRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      glowRef.current.style.opacity = "1";
      glowRef.current.style.background = `radial-gradient(320px circle at ${x}px ${y}px, rgba(255,255,255,0.06) 0%, transparent 70%)`;
    });
  }, []);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (!glowRef.current) return;
    glowRef.current.style.opacity = "0";
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={disableInteractionGlow ? undefined : handleMove}
      onPointerLeave={disableInteractionGlow ? undefined : handleLeave}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: "var(--material-glass-surface-dark)" }}
    >
      {!disableInteractionGlow ? (
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300"
        />
      ) : null}
      {/* Content */}
      <div className={`relative z-[1] ${contentClassName}`}>{children}</div>
    </div>
  );
}
