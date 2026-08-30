"use client";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateLeft,
  faArrowRotateRight,
  faArrowUpFromBracket,
  faChevronDown,
  faChevronUp,
  faDiamond,
  faArrowsRotate,
  faEyeDropper,
  faMobileScreenButton,
  faMoon,
  faPause,
  faPlay,
  faSun,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

/**
 * Every icon in the editor, in one place.
 *
 * They used to be hand-drawn inline SVGs — thirteen of them, at seven
 * different sizes, each with its own stroke width and its own idea of how
 * round a corner should be. Individually fine; together they read as a set
 * that grew rather than one that was designed. A drawn family only holds
 * together if someone maintains it as a family, and a solid icon set already
 * did that work.
 *
 * Font Awesome Solid: one weight, one optical size, consistent stroke and
 * terminal treatment across the lot.
 */

// Font Awesome injects its own <style> tag by default, which under a bundler
// that already emits the CSS gives you two copies and a flash of oversized
// icons before the first paint. The stylesheet is imported above instead.
config.autoAddCss = false;

export const ICON = {
  reset: faArrowRotateLeft,
  collapse: faChevronUp,
  expand: faChevronDown,
  chevronDown: faChevronDown,
  chevronUp: faChevronUp,
  keyframe: faDiamond,
  dark: faMoon,
  light: faSun,
  dismiss: faXmark,
  upload: faArrowUpFromBracket,
  device: faMobileScreenButton,
  eyedropper: faEyeDropper,
  undo: faArrowRotateLeft,
  redo: faArrowRotateRight,
  resetAll: faArrowsRotate,
  play: faPlay,
  pause: faPause,
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICON;

/**
 * 14 is the only size. Font Awesome's glyphs are drawn on a 512 grid with
 * their own optical padding, so a box is not needed around them the way it
 * was around the hand-drawn ones — and one size means an icon never has to be
 * argued about at the call site.
 */
export function Icon({
  name,
  size = 14,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <FontAwesomeIcon
      icon={ICON[name]}
      className={className}
      // Sized in px rather than by Font Awesome's own scale classes, so an
      // icon lines up with the 16px scale the rest of the panel uses instead
      // of with a font size it does not share.
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
