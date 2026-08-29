"use client";

import { useEffect, useRef, useState } from "react";
import KoshLogo from "@/components/KoshLogo";

/**
 * The aspect menu. Free ratios first, then the store-ready pixel sizes.
 *
 * `ratio` is width / height and is what the canvas actually letterboxes to;
 * `null` means "take the whole workspace". The store entries carry the pixel
 * size only as a label — an export target is a resolution, but on screen it
 * is still just its ratio.
 */
export const RATIOS: Array<{ id: string; label: string; ratio: number | null }> = [
  { id: "fill", label: "Fill", ratio: null },
  { id: "21:9", label: "21:9", ratio: 21 / 9 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "2:3", label: "2:3", ratio: 2 / 3 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

export const STORE_RATIOS: Array<{
  id: string;
  label: string;
  size: string;
  ratio: number;
}> = [
  { id: "as-iphone", label: "App Store · iPhone", size: "1290 × 2796", ratio: 1290 / 2796 },
  { id: "as-ipad", label: "App Store · iPad", size: "2064 × 2752", ratio: 2064 / 2752 },
  { id: "as-mac", label: "App Store · Mac", size: "2880 × 1800", ratio: 2880 / 1800 },
  { id: "as-video-h", label: "App Store Video · Horizontal", size: "1920 × 1080", ratio: 16 / 9 },
  { id: "as-video-v", label: "App Store Video · Vertical", size: "1080 × 1920", ratio: 9 / 16 },
];

/** `null` for Fill, or an unknown id — both mean "don't constrain". */
export function getRatio(id: string): number | null {
  const free = RATIOS.find((r) => r.id === id);
  if (free) return free.ratio;
  return STORE_RATIOS.find((r) => r.id === id)?.ratio ?? null;
}

export function TopBar({
  theme,
  ratioId,
  onRatioChange,
  timelineOpen,
  onToggleTimeline,
  onExportPng,
  onExportVideo,
  canExportVideo,
  recordProgress,
}: {
  theme: "light" | "dark";
  ratioId: string;
  onRatioChange: (id: string) => void;
  timelineOpen: boolean;
  onToggleTimeline: () => void;
  onExportPng: () => void;
  onExportVideo: () => void;
  /** False with no video on the screen, or where the browser cannot record. */
  canExportVideo: boolean;
  /** 0..1 while recording, null when idle. */
  recordProgress: number | null;
}) {
  const active =
    RATIOS.find((r) => r.id === ratioId) ?? STORE_RATIOS.find((r) => r.id === ratioId);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const recording = recordProgress !== null;

  // Close on any click that is not inside the menu, and on Escape. Without
  // the first, the menu survives clicking straight into the canvas behind it.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className="flex h-[var(--ks-topbar-h)] w-full shrink-0 items-center gap-[4px] rounded-[var(--ks-r-panel)] border px-[12px]"
      style={{
        background: "var(--ks-surface)",
        borderColor: "var(--ks-line-strong)",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Ours, where the reference puts its own mark. */}
      <KoshLogo
        variant="icon-only"
        tone={theme === "dark" ? "light" : "dark"}
        width={22}
        height={22}
        className="mr-[8px] shrink-0"
      />

      {/* Centred independently of the flanks so it stays put as they change. */}
      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center">
        <label className="pointer-events-auto relative flex items-center">
          <span className="sr-only">Aspect ratio</span>
          <span
            className="ks-label flex h-[28px] items-center gap-[6px] rounded-[var(--ks-r-pill)] border px-[10px]"
            style={{ borderColor: "var(--ks-hairline)", color: "var(--ks-text-dim)" }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
              <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            {active?.label ?? "Fill"}
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <select
            value={ratioId}
            onChange={(event) => onRatioChange(event.currentTarget.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Aspect ratio"
          >
            {RATIOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
            <optgroup label="App Store">
              {STORE_RATIOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.size}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <div className="ml-auto flex items-center gap-[8px]">
        <button
          type="button"
          onClick={onToggleTimeline}
          aria-pressed={timelineOpen}
          className="ks-label flex h-[28px] items-center gap-[6px] rounded-[var(--ks-r-pill)] border px-[10px]"
          style={{
            borderColor: timelineOpen ? "var(--ks-accent-line)" : "var(--ks-hairline)",
            background: timelineOpen ? "var(--ks-accent-wash)" : "transparent",
            color: timelineOpen ? "var(--ks-accent)" : "var(--ks-text-dim)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M5 0.7 9.3 5 5 9.3 0.7 5Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
          Animate
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={recording}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="ks-label flex h-[28px] items-center gap-[6px] rounded-[var(--ks-r-pill)] border px-[12px] disabled:opacity-60"
            style={{ borderColor: "var(--ks-hairline)", color: "var(--ks-text)" }}
          >
            {recording ? `Recording ${Math.round((recordProgress ?? 0) * 100)}%` : "Export"}
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {menuOpen && !recording ? (
            <div
              role="menu"
              className="absolute right-0 top-[34px] z-20 flex w-[190px] flex-col gap-[2px] rounded-[var(--ks-r)] border p-[4px]"
              style={{
                background: "var(--ks-surface-solid)",
                borderColor: "var(--ks-line-strong)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
              }}
            >
              <ExportItem
                label="PNG image"
                hint="Current frame"
                onClick={() => {
                  setMenuOpen(false);
                  onExportPng();
                }}
              />
              <ExportItem
                label="MP4 video"
                // Saying why it is unavailable beats a greyed-out row that
                // looks broken — the fix is "load a video", not "try again".
                hint={canExportVideo ? "Animation or screen loop" : "Add keyframes or a video"}
                disabled={!canExportVideo}
                onClick={() => {
                  setMenuOpen(false);
                  onExportVideo();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ExportItem({
  label,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col items-start gap-[1px] rounded-[var(--ks-r-sm)] px-[8px] py-[6px] text-left transition-colors hover:bg-[var(--ks-row)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
    >
      <span className="ks-label" style={{ color: "var(--ks-text)" }}>
        {label}
      </span>
      <span className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>
        {hint}
      </span>
    </button>
  );
}
