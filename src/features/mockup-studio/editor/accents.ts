/**
 * Accent colours for the editor's own UI.
 *
 * Apple's system palette, and its light and dark values rather than one value
 * dimmed at runtime. Apple lightens every accent in dark mode for a real
 * reason: the same blue that reads correctly on white is noticeably heavy on
 * black, and a computed shade of one is never quite the shade they publish.
 *
 * Stored as space-separated RGB triplets because that is what
 * `rgb(var(--ks-accent-rgb) / 0.5)` needs -- the whole point of the token being
 * a triplet rather than a colour is that the derived washes can vary the alpha
 * without knowing the colour.
 */

export type AccentId =
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "green"
  | "teal"
  | "graphite";

export type Accent = {
  id: AccentId;
  label: string;
  /** "R G B", for light and dark respectively. */
  light: string;
  dark: string;
};

export const ACCENTS: Accent[] = [
  { id: "blue", label: "Blue", light: "0 122 255", dark: "0 145 255" },
  { id: "indigo", label: "Indigo", light: "88 86 214", dark: "94 92 230" },
  { id: "purple", label: "Purple", light: "175 82 222", dark: "191 90 242" },
  { id: "pink", label: "Pink", light: "255 45 85", dark: "255 55 95" },
  { id: "red", label: "Red", light: "255 59 48", dark: "255 69 58" },
  { id: "orange", label: "Orange", light: "255 149 0", dark: "255 159 10" },
  { id: "green", label: "Green", light: "52 199 89", dark: "48 209 88" },
  { id: "teal", label: "Teal", light: "0 150 199", dark: "64 200 224" },
  // The opt-out. Some shots want no colour in the chrome competing with the
  // colour in the mockup.
  { id: "graphite", label: "Graphite", light: "99 99 102", dark: "152 152 157" },
];

export const DEFAULT_ACCENT: AccentId = "blue";

export const getAccent = (id: AccentId): Accent =>
  ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];

/** What to paint a swatch, for a theme, without going through the CSS vars. */
export const accentCss = (accent: Accent, theme: "light" | "dark"): string =>
  `rgb(${theme === "dark" ? accent.dark : accent.light})`;
