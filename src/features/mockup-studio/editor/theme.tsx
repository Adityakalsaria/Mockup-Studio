"use client";

/**
 * Editor chrome tokens, taken from the KOSH Figma layout
 * (KOSH-Marketing-design, node 1480:22177 "1920w light").
 *
 * Kept separate from the site tokens in globals.css because this is tool
 * chrome, not the brand surface: the marketing tokens describe glass, accent
 * gradients and a 16px body scale, none of which apply to a 290px column of
 * 10px numeric controls.
 *
 * Type is Saans, the project's own face, rather than the mono the mock was
 * drawn in. What survives the swap is the ROLE the mock gave its type —
 * small, uppercase, widely tracked — because that is what makes a dense
 * column of controls scan as instrument panel rather than as prose. Only the
 * face changed.
 *
 * Numeric readouts keep `font-variant-numeric: tabular-nums`. A proportional
 * face would otherwise reflow the value column on every digit while a value
 * is being scrubbed, and a readout that jitters as it counts is unreadable
 * at exactly the moment it matters.
 *
 * Measurements are the Figma frame's, not approximations:
 *   frame 1920x1200, container inset 14px
 *   canvas    inset 50px top / 290px right / 194px bottom
 *   timeline  194px tall, 10px below the canvas
 *   both panels rounded 16px, 1px rgba(0,0,0,0.15) border
 */
export const EDITOR_THEME_CSS = `
.ks {
  /* Light — the frame as drawn. */
  --ks-page: #E9E9E9;
  --ks-surface: rgba(255, 255, 255, 0.72);
  --ks-surface-solid: #FFFFFF;
  --ks-canvas: #F1F1F3;
  --ks-row: rgba(0, 0, 0, 0.03);
  --ks-row-hover: rgba(0, 0, 0, 0.06);
  --ks-row-strong: rgba(0, 0, 0, 0.04);
  --ks-line: rgba(0, 0, 0, 0.08);
  --ks-line-strong: rgba(0, 0, 0, 0.15);
  --ks-hairline: rgba(0, 0, 0, 0.1);

  /* Zinc, as the file uses it. */
  --ks-text: #18181B;
  --ks-text-strong: #3F3F46;
  --ks-text-dim: #52525C;
  --ks-text-muted: #71717B;
  --ks-text-faint: #9F9FA9;

  /* Control-row internals, taken literally from the frame. */
  --ks-ctl: rgba(0, 0, 0, 0.04);
  --ks-ctl-fill: rgba(0, 0, 0, 0.1);
  --ks-ctl-text: rgba(0, 0, 0, 0.6);
  --ks-badge: rgba(0, 0, 0, 0.08);
  /* The switch's off track, measured from Apple's kit (labels/tertiary).
     Much darker than our badge fill — a white knob needs it to read. */
  --ks-switch-off: rgba(60, 60, 67, 0.3);
  --ks-badge-text: rgba(0, 0, 0, 0.35);
  --ks-tab-active: rgba(255, 255, 255, 0.72);
  /* Segmented control, measured from Apple's kit: fills/tertiary for the
     track, a solid white selection. */
  --ks-seg-track: rgba(118, 118, 128, 0.12);
  --ks-seg-selected: #FFFFFF;
  --ks-tab-active-text: rgba(0, 0, 0, 0.9);
  --ks-tab-text: rgba(0, 0, 0, 0.35);

  --ks-track: rgba(0, 0, 0, 0.04);
  --ks-clip: rgba(0, 0, 0, 0.06);

  --ks-accent: #FD631F;
  --ks-accent-strong: rgba(253, 99, 31, 0.85);
  --ks-accent-line: rgba(253, 99, 31, 0.5);
  --ks-accent-wash: rgba(253, 99, 31, 0.14);
  --ks-accent-wash-soft: rgba(253, 99, 31, 0.1);
  --ks-accent-text: #FFFFFF;

  /* Ours, not the mock's. */
  --ks-font: var(--font-sans, var(--font-saans), system-ui, sans-serif);

  --ks-r-sm: 4px;
  --ks-r: 8px;
  --ks-r-pill: 12.8px;
  --ks-r-panel: 16px;

  /* Easing. The built-in CSS curves are too weak to read as intentional —
     the plain ease-out barely differs from linear over 200ms. These are the
     stronger variants: motion that leaves immediately and lands softly, which
     is what makes a control feel like it answered rather than caught up. */
  --ks-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ks-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

  /* Elevation, as iOS uses it on controls: a wide soft shadow for the drop,
     plus a tight dark one right under the edge. The second is what stops a
     raised element looking like it is floating a centimetre off the surface
     instead of resting a millimetre above it. */
  --ks-lift: 0 3px 8px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.16);
  --ks-lift-soft: 0 2px 6px rgba(0, 0, 0, 0.1), 0 1px 1px rgba(0, 0, 0, 0.08);

  --ks-gap: 14px;
  --ks-topbar-h: 50px;
  --ks-panel-w: 290px;
  --ks-timeline-h: 194px;
  --ks-row-h: 36px;
  --ks-row-gap: 6px;
  --ks-val-w: 52px;
  --ks-kf-w: 30px;
  --ks-reset-w: 22px;
  --ks-panel-pad: 16px;

  font-family: var(--ks-font);
  color: var(--ks-text);
  background: var(--ks-page);
}

.ks[data-ks-theme="dark"] {
  --ks-page: #0B0B0C;
  --ks-surface: rgba(24, 24, 27, 0.72);
  --ks-surface-solid: #18181B;
  --ks-canvas: #0D0D0E;
  --ks-row: rgba(255, 255, 255, 0.04);
  --ks-row-hover: rgba(255, 255, 255, 0.08);
  --ks-row-strong: rgba(255, 255, 255, 0.05);
  --ks-line: rgba(255, 255, 255, 0.08);
  --ks-line-strong: rgba(255, 255, 255, 0.14);
  --ks-hairline: rgba(255, 255, 255, 0.1);

  --ks-text: #F1F1F3;
  --ks-text-strong: #D4D4D8;
  --ks-text-dim: #A1A1AA;
  --ks-text-muted: #8A8A93;
  --ks-text-faint: #5E5E66;

  --ks-ctl: rgba(255, 255, 255, 0.05);
  --ks-ctl-fill: rgba(255, 255, 255, 0.12);
  --ks-ctl-text: rgba(255, 255, 255, 0.62);
  --ks-badge: rgba(255, 255, 255, 0.1);
  --ks-switch-off: rgba(120, 120, 128, 0.36);
  --ks-badge-text: rgba(255, 255, 255, 0.38);
  --ks-tab-active: rgba(255, 255, 255, 0.1);
  /* Dark: iOS raises the track's alpha and the selection becomes a lighter
     grey rather than white, which would glare against a dark panel. */
  --ks-seg-track: rgba(118, 118, 128, 0.24);
  --ks-seg-selected: #636366;
  --ks-tab-active-text: rgba(255, 255, 255, 0.92);
  --ks-tab-text: rgba(255, 255, 255, 0.38);

  --ks-track: rgba(255, 255, 255, 0.05);
  --ks-clip: rgba(255, 255, 255, 0.08);
}

/* Section headers and control labels. 10px mono, uppercase, wide tracking —
   one class because it is on nearly every element in the panel. */
.ks-label {
  font-size: 10px;
  line-height: 15px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-weight: 500;
}

/* Section titles track noticeably wider than control labels in the file. */
.ks-section-label {
  font-size: 10px;
  line-height: 15px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  font-weight: 400;
}

.ks-value {
  font-size: 11px;
  line-height: 16.5px;
  letter-spacing: 0.88px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.ks-micro {
  font-size: 9px;
  line-height: 12px;
  letter-spacing: 0.54px;
  text-transform: uppercase;
  font-weight: 500;
}

/* Scrub fields must not select text mid-drag, or the panel highlights the
   moment the pointer leaves the row. */
.ks-scrub {
  cursor: ew-resize;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

/* ---------------------------------------------------------------- PRESS --
   Feedback on pointer-DOWN, not on release.
   Waiting for the click to acknowledge a press is the single thing that makes
   an interface feel dead, and it is invisible in a screenshot — the control
   looks identical either way, and only feels wrong under a finger. 100ms out
   is below the threshold where the response reads as a separate event. */
.ks-press {
  transition: transform 100ms var(--ks-ease-out),
              background-color 120ms var(--ks-ease-out);
}
.ks-press:active {
  transform: scale(0.97);
}
/* Cards are large enough that 0.97 reads as a lurch; the bigger the surface,
   the smaller the scale needed to say the same thing. */
.ks-press-lg:active {
  transform: scale(0.985);
}

/* ------------------------------------------------------------- MATERIAL --
   Panels are the heavy structural layer, so they blur harder than a chip
   would and carry a real shadow. The bright top edge is light catching the
   near edge of a physical pane — without it a translucent panel reads as a
   flat tint rather than as a surface with thickness. */
.ks-material {
  position: relative;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
}
[data-ks-theme="dark"] .ks-material {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

/* The specular edge.
   A single inset highlight along the top is the cheap version and it reads as
   a drawn line. Real glass catches light unevenly around its rim: bright where
   the bevel faces the light, dark where it turns away. This is a gradient
   painted into a 1px ring by masking out everything but the border, which is
   the only way to get a border whose colour varies along its length. */
.ks-material::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.25) 22%,
    rgba(255, 255, 255, 0) 46%,
    rgba(255, 255, 255, 0.12) 74%,
    rgba(255, 255, 255, 0.55) 100%
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
}
[data-ks-theme="dark"] .ks-material::after {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.22) 0%,
    rgba(255, 255, 255, 0.06) 22%,
    rgba(255, 255, 255, 0) 46%,
    rgba(255, 255, 255, 0.04) 74%,
    rgba(255, 255, 255, 0.14) 100%
  );
}
@media (prefers-reduced-transparency: reduce) {
  .ks-material::after { display: none; }
}

/* Where scrolling content meets floating chrome, fade it out rather than
   ruling a line under it. A 1px divider says "two boxes"; the fade says the
   content continues underneath, which is what is actually happening. */
.ks-scroll-fade {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14px);
  mask-image: linear-gradient(to bottom, transparent 0, #000 14px);
}

.ks-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.ks-scroll::-webkit-scrollbar-thumb {
  background: var(--ks-line-strong);
  border-radius: 3px;
}
.ks-scroll::-webkit-scrollbar-track { background: transparent; }

/* Menus scale in from the control that opened them, not from the middle of
   themselves, so the link between button and panel is visible rather than
   implied. 0.96 rather than 0 because nothing in the world appears from
   nothing — even a deflated balloon has a shape. */
@keyframes ks-menu-in {
  from { opacity: 0; transform: scale(0.96) translateY(4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.ks-menu {
  animation: ks-menu-in 160ms var(--ks-ease-out);
}

/* ------------------------------------------------------- ACCESSIBILITY --
   Reduced motion is not "no feedback" — it is feedback without the
   vestibular part. The press keeps its colour change and loses its scale;
   nothing here slides or springs. */
@media (prefers-reduced-motion: reduce) {
  .ks-press,
  .ks-press-lg {
    transition: background-color 120ms linear;
  }
  .ks-press:active,
  .ks-press-lg:active {
    transform: none;
  }
  .ks-menu {
    animation: none;
  }
  .ks-tab-indicator {
    transition: none;
  }
}

/* Translucency is a preference, not a given. Frost the panels rather than
   removing the layer, so the hierarchy the material was carrying survives. */
@media (prefers-reduced-transparency: reduce) {
  .ks-material {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: var(--ks-surface-solid);
  }
}

@media (prefers-contrast: more) {
  .ks-material {
    background: var(--ks-surface-solid);
    border-color: var(--ks-text-dim);
  }
}
`;

export function EditorTheme() {
  return <style>{EDITOR_THEME_CSS}</style>;
}
