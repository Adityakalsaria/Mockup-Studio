"use client";

import type { Shot } from "./shots";

/**
 * The shot strip — stage one of the timeline, in the place ultramock puts its
 * track list.
 *
 * Deliberately a strip and not a ruler: with no time model yet, drawing a
 * timeline with a playhead would promise scrubbing that does not exist. It
 * shows what a shot IS (a saved camera and lens) and lets you move between
 * them, which is the part that is real today. Stage two turns each chip into a
 * clip with a duration and adds the ruler under it.
 */
export default function ShotStrip({
  shots,
  activeShotId,
  onAdd,
  onSelect,
  onUpdate,
  onRemove,
}: {
  shots: Shot[];
  activeShotId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex w-full items-center gap-[var(--space-8)] overflow-x-auto px-[var(--space-24)] py-[var(--space-12)]">
      <span className="shrink-0 text-[12px] font-medium uppercase tracking-[0.55px] text-white/45">
        Shots
      </span>

      {shots.map((shot, index) => {
        const isActive = shot.id === activeShotId;
        return (
          <div
            key={shot.id}
            className={`group flex shrink-0 items-center gap-[var(--space-8)] rounded-[10px] border px-[var(--space-12)] py-[6px] transition-colors ${
              isActive
                ? "border-white/60 bg-white/[0.10]"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(shot.id)}
              className="text-[12px] font-medium leading-[16px] text-white/85"
              aria-pressed={isActive}
            >
              {index + 1}. {shot.label}
            </button>

            {/* Re-capture in place, so refining a shot is not delete-and-re-add. */}
            <button
              type="button"
              onClick={() => onUpdate(shot.id)}
              title="Update this shot to the current view"
              className="text-[11px] uppercase tracking-[0.4px] text-white/35 transition-colors hover:text-white"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => onRemove(shot.id)}
              aria-label={`Remove ${shot.label}`}
              className="text-[14px] leading-none text-white/30 transition-colors hover:text-white"
            >
              &times;
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-[10px] border border-dashed border-white/20 px-[var(--space-12)] py-[6px] text-[12px] font-medium leading-[16px] text-white/60 transition-colors hover:border-white/40 hover:text-white"
      >
        + Add shot
      </button>

      {shots.length === 0 ? (
        <span className="shrink-0 text-[12px] leading-[16px] text-white/30">
          Save the current camera and blur as a shot.
        </span>
      ) : null}
    </div>
  );
}
