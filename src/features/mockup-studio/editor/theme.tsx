"use client";

import { createContext } from "react";

/**
 * Editor chrome tokens, taken from the KOSH Figma layout
 * (KOSH-Marketing-design, node 1480:22177 "1920w light").
 *
 * Kept separate from the site tokens in globals.css because this is tool
 * chrome, not the brand surface: the marketing tokens describe glass, accent
 * gradients and a 16px body scale, none of which apply to a 290px column of
 * 10px numeric controls.
 *
 * Type follows Apple's kit: 13px on 18px leading, sentence case, tracking
 * -0.08px, with weight rather than case carrying hierarchy.
 *
 * It was previously 10px uppercase on wide positive tracking — the vocabulary
 * of an instrument panel, chosen deliberately to make a dense column of
 * controls scan as a mixing desk rather than as prose. That reads as a
 * different KIND of software than the one being aimed at here: Apple labels
 * its controls in the same face and size you would read a sentence in, and no
 * amount of correct control geometry reads as Apple underneath shouty
 * micro-type. Uppercase now survives in exactly one place, the hex field,
 * where the content is a code rather than a word.
 *
 * Numeric readouts keep `font-variant-numeric: tabular-nums`. A proportional
 * face would otherwise reflow the value column on every digit while a value
 * is being scrubbed, and a readout that jitters as it counts is unreadable
 * at exactly the moment it matters.
 *
 * Measurements are the Figma frame's, not approximations:
 *   frame 1920x1200, container inset 14px
 *   canvas    inset 50px top / 290px right / 194px bottom
 *   timeline  194px tall, 10px  canvas
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
  /* The accent at full strength, not a wash of it. A 16% tint composited to
     #D6EAFF and a 28% one to #17395D in dark -- a dull navy that read as a
     disabled control rather than a filled one. An iOS slider fill IS the
     accent colour; the track behind it carries the contrast. */
  /* Knobs are white in BOTH themes, like every iOS slider and switch. Tying
     them to the panel surface made the dark one #1C1C1E, and a near-black cap
     on a full-strength blue fill reads as a hole punched in the track rather
     than as the thing you grab. */
  --ks-knob: #FFFFFF;
  --ks-ctl-fill: var(--ks-accent);
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

  /* systemBlue. Apple's own accent, and the one every control in the kit is
     drawn with — a switch, a slider fill and a selected segment are all blue
     there, so an editor built from those components reads as coherent in blue
     in a way it does not in a colour borrowed from elsewhere.
     #007AFF is the light-mode value; the kit's variables gave #0091FF for
     dark, which is the pair Apple ships. */
  /* One triplet, five derived tokens.
     They used to be five hardcoded rgba values, which meant changing the
     accent meant changing all five in both themes and never missing one.
     Custom properties are substituted at computed-value time, so overriding
     the triplet anywhere -- the dark block below, or an inline style on the
     root -- re-resolves every token that reads it. */
  --ks-accent-rgb: 0 122 255;
  --ks-accent: rgb(var(--ks-accent-rgb));
  --ks-accent-strong: rgb(var(--ks-accent-rgb) / 0.85);
  --ks-accent-line: rgb(var(--ks-accent-rgb) / 0.5);
  --ks-accent-wash: rgb(var(--ks-accent-rgb) / 0.14);
  --ks-accent-wash-soft: rgb(var(--ks-accent-rgb) / 0.09);
  --ks-accent-text: #FFFFFF;

  /* Ours, not the mock's. */
  --ks-font: var(--font-sans, var(--font-saans), system-ui, sans-serif);

  /* Radii.
     iOS 26/27 moved its controls to capsules — the segmented control, the
     switch, the slider knob and the buttons are all fully rounded now, and a
     rounded RECTANGLE sitting next to them is what makes a surface read as
     pre-Liquid-Glass. So every control-sized surface is a capsule, and the
     rectangles that remain are the ones that hold content rather than
     respond to a press: panels, cards, and the wells inside them. */
  --ks-r-sm: 999px;
  --ks-r: 999px;
  --ks-r-pill: 999px;
  /* Containers keep a real radius — a capsule the size of a panel is a
     lozenge, and nothing in the kit does that. */
  --ks-r-panel: 16px;
  --ks-r-card: 12px;
  /* Menus and their rows. A menu is a container, not a control — at capsule
     radius it becomes a lozenge, and its rows grow ends wider than the text
     inside them. */
  --ks-r-menu: 10px;
  --ks-r-menu-item: 6px;

  /* Easing, in two families, split by what started the motion.

     --ks-press is for motion your finger is causing right now. It leaves at
     roughly four times its average speed, because a control that eases INTO
     answering a press reads as laggy — the delay is small enough to be
     invisible and large enough to feel.

     --ks-spring is for motion that runs on its own after a discrete change:
     an indicator sliding to a new tab, a knob crossing a switch, a panel
     taking up the space another one left. It is a critically damped spring,
     measured off a reference recording frame by frame rather than picked by
     eye: fitting the position of a control that travelled 103px gives
     omega = 14 rad/s, zeta = 1.01, to within 1.3px over the whole move. In
     other words a real spring, released from rest, damped just enough never
     to overshoot. As a Framer spring that is stiffness 196, damping 28.

     The bezier below is that spring's response resampled over 420ms, which
     tracks it to within 2% of the distance travelled. What it buys is the
     START: a spring accelerates from zero, so the motion has weight in the
     first 60ms instead of jumping and then crawling. That single difference
     is most of what separates motion that looks animated from motion that
     looks physical, and it is why the old easeOutQuint used everywhere here
     (27% off the measured curve, further off than the plain CSS ease-out it
     replaced) read as twitchy on anything that moved more than a few px.

     One duration, not one per element. A linear spring's settle time depends
     only on its stiffness and damping, never on how far it travels — so a
     16px knob and a 410px panel take the same 420ms, and the whole interface
     shares one sense of mass. */
  --ks-press: cubic-bezier(0.23, 1, 0.32, 1);
  --ks-spring: cubic-bezier(0.3, 0.31, 0.2, 0.92);
  --ks-move: 420ms;
  /* Kept as an alias: too many call sites to retarget individually, and the
     press curve is the right default for the ones that remain. */
  --ks-ease-out: var(--ks-press);
  --ks-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);


  /* Spacing scale.
     Twelve different values were in use — 1,2,3,4,5,6,7,8,9,10,12,14 — none
     of them chosen against the others. At that point spacing stops being a
     system and becomes a series of local guesses, and the panel reads as
     slightly loose in some places and slightly tight in others without any
     one gap looking wrong.

     Four steps, on a 4px grid, each with a job:
       4   inside a compact element — a menu's own padding, a chip's gaps
       8   between siblings — rows, columns, the parts of a card
       12  inside a control — the inset from a pill's edge to its text
       16  a container's inset — the panel, a section, the space between them

     Numbers measured from Apple's kit are exempt and stay exactly as they
     are: the segmented control's 2px track padding and 4px segment gap, the
     switch's 2px knob inset. Those are control specs, not layout. */
  --ks-space-1: 4px;
  --ks-space-2: 8px;
  --ks-space-3: 12px;
  --ks-space-4: 16px;

  /* Between the three layout regions — the two panels, the canvas and the
     timeline — and around the outside of all of them. 8 rather than 16: at
     this scale the gutter was reading as a margin, and the space it took came
     straight out of the canvas, which is the one region that wants it. */
  --ks-gap: var(--ks-space-2);
  /* Apple's sidebar is 320. Ours was 290, which is where every "scale it
     down to fit" compromise came from — at 320 the real control sizes fit
     without shrinking any of them. */
  --ks-panel-w: 320px;
  /* Sized to the work rather than picked.
     There are six animatable properties, so six lanes is the number that
     matters: 16 of padding, a 36 toolbar, its 8 gap, a 16 ruler, a 30 source
     bar and 6 x 26 of lanes comes to 262. At 194 it showed three and a half,
     so keying a fourth property meant scrolling to see what you had just
     done. */
  --ks-timeline-h: 262px;
  /* 36, from the macOS kit's pulldown button — 100x36 with its label inset
     18px. macOS is the right reference for this: iOS rows are 44 because a
     fingertip needs 44, and nothing here is touched by a finger. 44 was
     costing four visible rows per panel for a target size nobody uses. */
  --ks-row-h: 36px;
  /* The slider track. Shorter than a row because it holds nothing but the
     fill and its cap now — the name moved above it. */
  --ks-track-h: 28px;
  /* The macOS control inset. Ours was 10, which read as cramped once the
     shapes became capsules — a capsule's corners eat horizontal space that a
     rectangle's do not, so the same number reads tighter. */
  --ks-ctl-pad: var(--ks-space-3);
  --ks-row-gap: var(--ks-space-1);
  /* Between the columns WITHIN a row.
     Zero now that the keyframe button has no pill of its own: there are no
     longer two shapes needing to be told apart, and every pixel of gap was
     coming out of the track. The button's own width is the separation. */
  --ks-col-gap: 0px;
  --ks-kf-w: 30px;
  --ks-reset-w: 22px;
  /* 16, as the kit insets its sidebar content. */
  --ks-panel-pad: var(--ks-space-4);

  font-family: var(--ks-font);
  color: var(--ks-text);
  background: var(--ks-page);

  /* Nothing here is prose.
     Every drag in this editor starts on a label or a track, and the browser's
     default is to treat a drag over text as a selection — so scrubbing a value
     highlighted its own name, and dragging the phone highlighted half the
     panel. The .ks-scrub class was already fighting this control by control,
     which only ever covered the ones someone remembered to mark. */
  user-select: none;
  -webkit-user-select: none;
}

/* The exceptions: places where text really is text and you may want to select,
   copy or retype it — a hex value, a duration, the number you double-clicked
   a slider to enter. */
.ks input,
.ks textarea,
.ks [contenteditable="true"] {
  user-select: text;
  -webkit-user-select: text;
}

/* Dark is Apple's dark system palette, taken from the kit's variables rather
   than hand-mixed. Their label ramp is one colour at four alphas — #EBEBF5 at
   100/70/30/16 — which is why their dark UI stays coherent where a set of
   separately chosen greys drifts apart. */
.ks[data-ks-theme="dark"] {
  --ks-page: #000000;
  --ks-surface: rgba(28, 28, 30, 0.72);
  --ks-surface-solid: #1C1C1E;
  --ks-canvas: #1C1C1E;
  --ks-row: rgba(255, 255, 255, 0.04);
  --ks-row-hover: rgba(255, 255, 255, 0.08);
  --ks-row-strong: rgba(255, 255, 255, 0.05);
  --ks-line: rgba(255, 255, 255, 0.17);
  --ks-line-strong: #38383A;
  --ks-hairline: rgba(255, 255, 255, 0.17);

  --ks-text: #FFFFFF;
  --ks-text-strong: rgba(235, 235, 245, 0.7);
  --ks-text-dim: rgba(235, 235, 245, 0.7);
  --ks-text-muted: rgba(235, 235, 245, 0.3);
  --ks-text-faint: rgba(235, 235, 245, 0.16);

  /* Accents/Blue as the kit's dark palette defines it. Apple lightens the
     accent in dark mode rather than reusing the light one, because #007AFF on
     black is noticeably heavier than it is on white. */
  --ks-accent-rgb: 0 145 255;
  /* Only the washes are redefined: the rest read the triplet above and
     re-resolve on their own. Dark needs a heavier wash to register against a
     dark surface at all. */
  --ks-accent-wash: rgb(var(--ks-accent-rgb) / 0.2);
  --ks-accent-wash-soft: rgb(var(--ks-accent-rgb) / 0.12);

  --ks-ctl: rgba(255, 255, 255, 0.05);
  --ks-knob: #FFFFFF;
  --ks-ctl-fill: var(--ks-accent);
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

/* Control labels. 13px, sentence case —
   one class because it is on nearly every element in the panel. */
/* Apple's body text, measured from the kit: 13px on 18px leading, Medium
   (510), tracking -0.08px. Sentence case.

   This is the single biggest change, and the one that was holding everything
   else back: 10px UPPERCASE with +0.6px tracking is the vocabulary of a
   technical readout — a mixing desk — and no amount of correct control
   geometry reads as Apple underneath it. Their controls are labelled in the
   same typeface and size you would read a sentence in. Negative tracking
   because at 13px and above, letters set at zero read too loose. */
.ks-label {
  font-size: 13px;
  line-height: 18px;
  letter-spacing: -0.08px;
  font-weight: 510;
}

/* Section titles track noticeably wider than control labels in the file. */
/* Section titles differ by WEIGHT, not by case and tracking. Semibold (590)
   is what the kit uses to mark a selected segment, and the same move reads as
   a heading here. */
.ks-section-label {
  font-size: 13px;
  line-height: 18px;
  letter-spacing: -0.08px;
  font-weight: 590;
}

.ks-value {
  font-size: 13px;
  line-height: 18px;
  letter-spacing: -0.08px;
  font-variant-numeric: tabular-nums;
  font-weight: 510;
}

/* Apple's subtitle: 13px on 18px in the menu rows, dropped to 11 here where
   it is genuinely secondary. Still sentence case — uppercase micro-type is
   the thing that made this read as a control surface rather than an app. */
.ks-micro {
  font-size: 11px;
  line-height: 15px;
  letter-spacing: -0.04px;
  font-weight: 400;
}

/* Scrub fields must not select text mid-drag, or the panel highlights the
   moment the pointer leaves the row. */
.ks-scrub {
  cursor: ew-resize;
  user-select: none;
  -webkit-user-select: none;
  /* pan-y, not none.
     These are HORIZONTAL controls inside a vertically scrolling panel, and the
     panel is mostly made of them. Under "none" the browser handed every touch
     to the slider, so a swipe that happened to start on a track -- which is
     most of the panel -- scrubbed a value instead of scrolling, and the panel
     could not be scrolled past the first control at all. "pan-y" gives
     vertical to the scroller and keeps horizontal for the drag; the browser
     sends a pointercancel once it commits to a scroll, which already ends the
     drag cleanly. */
  touch-action: pan-y;
}

/* The exception: a control you drag in BOTH axes has nothing to give back to
   the scroller, so it keeps the whole gesture. */
.ks-scrub-2d {
  touch-action: none;
}

/* ---------------------------------------------------------------- PRESS --
   Feedback on pointer-DOWN, not on release.
   Waiting for the click to acknowledge a press is the single thing that makes
   an interface feel dead, and it is invisible in a screenshot — the control
   looks identical either way, and only feels wrong under a finger. 100ms out
   is  threshold where the response reads as a separate event. */
.ks-press {
  transition: transform 100ms var(--ks-press),
              background-color 120ms var(--ks-press);
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
  /* No shadow.
     A drop shadow separates a surface from what is behind it, and there is
     nothing behind these — the regions sit side by side on flat page colour,
     with an 8px gutter already doing the separating. The shadow was falling
     on nothing and reading as a smudge around each edge. The border and the
     specular rim say "surface" on their own. */
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

/* Scrolls, shows nothing.
   For the timeline, where both bars sit across the middle of the frame rather
   than at the edge of a column: the horizontal one runs under the lanes and
   the vertical one down the middle of the window, and neither is telling you
   anything the ruler and the track rows do not. */
.ks-scroll-hidden {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.ks-scroll-hidden::-webkit-scrollbar { width: 0; height: 0; }

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
  animation: ks-menu-in var(--ks-move) var(--ks-spring);
}

/* The chips that float over the stage: history in one corner, framing in the
   other. One class rather than two copies of the same four properties -- they
   sit at the same height in opposite corners of the same frame, which is
   exactly the arrangement where a difference in tint, ring or radius reads as
   a mistake rather than as a variation. */
.ks-stage-chip {
  background: var(--ks-surface);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: inset 0 0 0 1px var(--ks-line-strong);
  border-radius: var(--ks-r-pill);
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

/* ---------------------------------------------------------------- mobile --

   Below the desktop breakpoint the editor stacks: stage, both panels, then
   the timeline, with the page itself scrolling. Two things have to change
   beyond the layout.

   First, the display cutout. The page declares viewport-fit=cover so the
   stage can run edge to edge, which means it also has to pad itself back out
   of the notch and the home indicator by hand.

   Second, target size. The panel is built to macOS metrics -- a 36px row and
   a 28px switch are comfortable with a mouse and too small for a fingertip.
   Apple and WCAG both put the floor at 44px. Rather than restyle every
   control, the two variables the controls are built from are raised, and the
   sizes follow. */
@media (width < 62.5rem) {
  .ks {
    padding: env(safe-area-inset-top) env(safe-area-inset-right)
      env(safe-area-inset-bottom) env(safe-area-inset-left);
  }

  /* One step at a time. Both panels stay MOUNTED and one is hidden, rather
     than the inactive one being unmounted -- a panel remembers which of its
     sections you left open, and unmounting would reset that every time you
     stepped away and back. */
  .ks[data-ks-step="device"] [data-ks-panel="scene"],
  .ks[data-ks-step="scene"] [data-ks-panel="device"] {
    display: none;
  }

  .ks {
    --ks-row-h: 44px;
    --ks-track-h: 36px;
  }

  /* A finger has no hover state and no pixel precision, so the hit area is
     grown without growing the control: the knob still reads as 20px. */
  .ks-scrub::before {
    content: "";
    position: absolute;
    inset: -8px 0;
  }
  .ks-scrub {
    position: relative;
  }
}

@media (prefers-contrast: more) {
  .ks-material {
    background: var(--ks-surface-solid);
    border-color: var(--ks-text-dim);
  }
}
`;

/**
 * The active theme, for anything that renders OUTSIDE the themed root.
 *
 * Menus and pickers portal to <body> to escape the scroll containers and
 * backdrop-filters that would otherwise clip them, which also takes them out
 * of the subtree the theme variables are defined on. They have to be told.
 *
 * A context rather than a ref read: a ref is not readable during render, and
 * copying it into state on open meant a setState in an effect body and a
 * second render every time a menu opened.
 */
export const EditorThemeContext = createContext<"light" | "dark">("light");

export function EditorTheme() {
  return <style>{EDITOR_THEME_CSS}</style>;
}
