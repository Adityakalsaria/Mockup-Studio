"use client";

/**
 * Pick a surface up and put it somewhere else.
 *
 * Two callers with two coordinate spaces, which is the whole reason this is a
 * hook rather than two copies: the bench moves a panel inside a bounded field
 * and stores offsets in that field, while the chrome moves a popup across the
 * viewport and has to leave the flex cluster it was docked in to do it. Same
 * gesture, same clamping, same pickup — only the frame of reference differs,
 * and that is one argument.
 *
 * The surface stays exactly where the layout put it until the first drag: `pos`
 * is null and the caller renders no position at all. That matters more than it
 * sounds. A popup that jumps to a stored coordinate on open is a popup that has
 * forgotten where it belongs, and everything here is docked somewhere sensible
 * to begin with.
 */

import { useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";

/**
 * Marks the surface a handle moves.
 *
 * An attribute rather than a ref handed back from the hook. Nothing about the
 * ref was wrong, but the React Compiler treats a record containing one as
 * ref-like and every read of it during render as touching a ref mid-render —
 * which is what reading `drag.style` in JSX is. The DOM already knows which
 * element is which; asking it costs one `closest` per pointerdown, and the
 * handle is often the surface anyway.
 */
export const DRAG_SURFACE = "data-drag-surface";

export type Drag = {
  /** On whatever should start the drag: a header, a title bar, the whole thing. */
  handleProps: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
    onDoubleClick: () => void;
    style: CSSProperties;
  };
  /** Spread onto the surface. Empty until it has been moved. */
  style: CSSProperties;
  dragging: boolean;
  /** Back to where the layout had it. */
  reset: () => void;
};

export function useDrag(bounds?: RefObject<HTMLElement | null>): Drag {
  /** Resolved on pickup and held for the gesture. Written and read only in
      event handlers, never during render. */
  const node = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Where in the surface the grab landed, so it does not jump to its corner. */
  const grab = useRef({ x: 0, y: 0 });

  /* Plain functions, not `useCallback`: the React Compiler memoizes them
     itself and reported that it could not preserve hand-written ones here. */
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    /*
     * A press on something that does something is not a drag.
     *
     * Whole surfaces are handles here — a panel should be grabbable by any
     * empty part of itself, which is what anyone tries first — and that only
     * works if the controls inside it keep their presses. One rule covers
     * every one of them rather than a list of exceptions per panel: if the
     * press landed on a control, it belongs to the control.
     */
    if ((e.target as HTMLElement).closest('button, input, a, select, textarea, [role="button"], [role="slider"]')) {
      return;
    }
    // The handle may be the surface, or a title bar inside it.
    node.current =
      e.currentTarget.closest<HTMLElement>(`[${DRAG_SURFACE}]`) ?? e.currentTarget;
    const box = node.current.getBoundingClientRect();
    grab.current = { x: e.clientX - box.left, y: e.clientY - box.top };
    /*
     * The surface is committed to its CURRENT place before it moves at all.
     *
     * Until now it has been a flex item in a docked cluster; the first frame of
     * the drag takes it out of that flow, and without this it would be laid out
     * from the origin for one frame and jump. Measured, not assumed: it is
     * wherever the layout had actually put it.
     */
    const field = bounds?.current?.getBoundingClientRect();
    setPos(
      field
        ? { x: box.left - field.left, y: box.top - field.top }
        : { x: box.left, y: box.top },
    );
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      const box = node.current?.getBoundingClientRect();
      if (!box) return;
      const field = bounds?.current?.getBoundingClientRect();
      // Clamped so a surface can always be picked up again. Off the bottom of
      // the window with its header past the edge, it is gone for good.
      const limit = field
        ? { left: 0, top: 0, right: field.width - box.width, bottom: field.height - box.height }
        : {
            left: 0,
            top: 0,
            right: window.innerWidth - box.width,
            bottom: window.innerHeight - box.height,
          };
      const originX = field ? field.left : 0;
      const originY = field ? field.top : 0;
      setPos({
        x: Math.min(Math.max(e.clientX - originX - grab.current.x, limit.left), Math.max(limit.right, limit.left)),
        y: Math.min(Math.max(e.clientY - originY - grab.current.y, limit.top), Math.max(limit.bottom, limit.top)),
      });
  };

  const end = () => setDragging(false);
  const reset = () => setPos(null);

  return {
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      // A moved surface has no other way home, and the gesture is already the
      // one the gizmo uses for "put it back".
      onDoubleClick: reset,
      style: { touchAction: "none", cursor: dragging ? "grabbing" : "grab" },
    },
    style: pos
      ? bounds
        ? { left: pos.x, top: pos.y }
        : { position: "fixed", left: pos.x, top: pos.y, margin: 0, zIndex: 20 }
      : {},
    dragging,
    reset,
  };
}
