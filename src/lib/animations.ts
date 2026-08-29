// Reusable animation presets for GSAP
// Usage: gsap.from(element, fadeUp) or spread into useGSAP timeline

export const fadeUp = {
  y: 60,
  opacity: 0,
  duration: 1,
  ease: "power4.out",
} as const;

export const fadeDown = {
  y: -60,
  opacity: 0,
  duration: 1,
  ease: "power4.out",
} as const;

export const fadeIn = {
  opacity: 0,
  duration: 1.2,
  ease: "power2.out",
} as const;

export const scaleIn = {
  scale: 0.9,
  opacity: 0,
  duration: 1,
  ease: "power4.out",
} as const;

export const staggerChildren = {
  amount: 0.3,
  from: "start" as const,
};

// ScrollTrigger presets
export const scrollFadeUp = {
  ...fadeUp,
  scrollTrigger: {
    start: "top 85%",
    end: "top 20%",
    toggleActions: "play none none reverse",
  },
};

// Factory for pinned scrub sections
export function createPinnedScrub(trigger: string, duration = 1) {
  return {
    scrollTrigger: {
      trigger,
      start: "top top",
      end: `+=${duration * 100}%`,
      pin: true,
      scrub: 1,
    },
  };
}
