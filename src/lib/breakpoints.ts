export const BREAKPOINT_PX = {
  mobile: 480,
  tablet: 480,
  laptop: 1000,
  desktop: 1440,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINT_PX;

export const BREAKPOINT_MEDIA = {
  belowTablet: `(max-width: ${BREAKPOINT_PX.tablet - 1}px)`,
  tabletUp: `(min-width: ${BREAKPOINT_PX.tablet}px)`,
  laptopUp: `(min-width: ${BREAKPOINT_PX.laptop}px)`,
  desktopUp: `(min-width: ${BREAKPOINT_PX.desktop}px)`,
} as const;
