"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

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

/**
 * The aspect selector, floating in the top-right of the stage.
 *
 * It has now been in three places. A centred top bar, which cost the canvas a
 * whole strip of height to show three controls and a lot of empty space. Then
 * a row at the head of the Shot panel, which fixed the height but filed the
 * frame under the same heading as the lens and the background — and the frame
 * is not a property of the shot in that sense, it is the shape of the thing
 * the shot is being composed inside.
 *
 * So: on the stage, against the edge it actually describes, opposite the
 * history chip. Intrinsic width rather than the panel row's full width, since
 * out here nothing sets the measure for it.
 */
export function AspectSelect({
  ratioId,
  onRatioChange,
}: {
  ratioId: string;
  onRatioChange: (id: string) => void;
}) {
  const active =
    RATIOS.find((r) => r.id === ratioId) ?? STORE_RATIOS.find((r) => r.id === ratioId);

  return (
    /* 32 tall to match the history chip across the stage: 28 of button plus
       its 2 of padding on each side. */
    <label className="ks-stage-chip relative flex h-[32px] items-center gap-[12px] pl-[12px] pr-[10px]">
      <span className="ks-label" style={{ color: "var(--ks-text-dim)" }}>
        Frame
      </span>
      <span className="ks-label flex items-center gap-[8px]" style={{ color: "var(--ks-ctl-text)" }}>
        {active?.label ?? "Fill"}
        <Icon name="chevronDown" />
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
  );
}

/**
 * Export, pinned to the foot of the right panel.
 *
 * The menu opens UPWARD, which the top-bar version did not have to think
 * about: from the bottom of a full-height panel there is nothing below it to
 * open into.
 */
export function ExportMenu({
  onExportPng,
  onExportVideo,
  canExportVideo,
  recordProgress,
}: {
  onExportPng: () => void;
  onExportVideo: () => void;
  /** False with no video on the screen, or where the browser cannot record. */
  canExportVideo: boolean;
  /** 0..1 while recording, null when idle. */
  recordProgress: number | null;
}) {
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={recording}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="ks-press ks-label flex h-[var(--ks-row-h)] w-full items-center justify-center gap-[8px] rounded-[var(--ks-r)] disabled:opacity-60"
        style={{ background: "var(--ks-accent-wash)", color: "var(--ks-accent)" }}
      >
        {recording ? `Recording ${Math.round((recordProgress ?? 0) * 100)}%` : "Export"}
        <Icon name="chevronUp" />
      </button>

      {menuOpen && !recording ? (
        <div
          role="menu"
          className="ks-menu absolute bottom-[calc(var(--ks-row-h)+6px)] right-0 z-20 flex w-full flex-col gap-[2px] rounded-[var(--ks-r-menu)] border p-[4px]"
          style={{
            background: "var(--ks-surface-solid)",
            borderColor: "var(--ks-line-strong)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
            // Grows from the button below it, not from its own middle. The
            // menu is anchored to that control, and scaling from the centre
            // severs the only visual cue saying which control opened it.
            transformOrigin: "bottom center",
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
      // A menu row is a container, not a control: a real radius rather than
      // the capsule the control tokens now carry, which gave each row ends
      // wider than the words inside it.
      className="ks-press flex w-full flex-col items-start gap-[2px] rounded-[var(--ks-r-menu-item)] pl-[12px] pr-[12px] py-[8px] text-left hover:bg-[var(--ks-row)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
    >
      {/* 13/18 with an 11px subtitle — the macOS menu size, not the iOS one.
          iOS sets menu titles at 17 because the whole system is scaled for a
          phone held at arm's length; borrowed into a desktop panel whose every
          other label is 13, it reads as another app's menu pasted in. */}
      <span
        style={{
          fontSize: 13,
          lineHeight: "18px",
          letterSpacing: "-0.08px",
          fontWeight: 510,
          color: "var(--ks-text)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          lineHeight: "15px",
          letterSpacing: "-0.04px",
          color: "var(--ks-text-muted)",
        }}
      >
        {hint}
      </span>
    </button>
  );
}
