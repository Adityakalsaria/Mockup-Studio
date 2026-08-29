import { gsap, ScrollTrigger } from "@/lib/gsap";

type Direction = "light-to-dark" | "dark-to-light";

interface ThemeTransitionOptions {
  trigger: HTMLElement;
  direction: Direction;
  start?: string;
  end?: string;
}

const themes = {
  light: {
    background: "#ffffff",
    foreground: "#000000",
    muted: "#737373",
    surface: "#f5f5f5",
    surfaceElevated: "#ececec",
    border: "#e5e5e5",
  },
  dark: {
    background: "#050505",
    foreground: "#fafafa",
    muted: "#a1a1aa",
    surface: "#111111",
    surfaceElevated: "#1a1a1a",
    border: "#262626",
  },
} as const;

export function createThemeTransition({
  trigger,
  direction,
  start = "top 40%",
  end = "top 20%",
}: ThemeTransitionOptions): ScrollTrigger {
  const from = direction === "light-to-dark" ? themes.light : themes.dark;
  const to = direction === "light-to-dark" ? themes.dark : themes.light;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger,
      start,
      end,
      scrub: 1,
    },
  });

  tl.fromTo(
    trigger,
    {
      backgroundColor: from.background,
      color: from.foreground,
    },
    {
      backgroundColor: to.background,
      color: to.foreground,
      duration: 1,
    }
  );

  return tl.scrollTrigger!;
}
