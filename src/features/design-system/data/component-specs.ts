import type { ComponentSpecDoc } from "@/features/design-system/types";

export const componentSpecs: ComponentSpecDoc[] = [
  {
    name: "Button",
    purpose: "Primary action trigger for conversion and core product actions.",
    anatomy: ["Container", "Label", "Optional icon"],
    variants: ["primary", "secondary", "prominent"],
    states: ["default", "hover", "active", "disabled"],
    interaction: [
      "Primary uses foreground/background inverse contrast.",
      "Hover and active are opacity-based transitions with 200-300ms timing.",
      "Background context (light/dark) controls inversion for secondary and primary variants.",
    ],
    accessibility: [
      "Ensure visible focus ring in keyboard navigation.",
      "Minimum touch target 44x44px on mobile.",
      "Maintain AA contrast across dark and light surfaces.",
    ],
    responsive: [
      "Label can wrap only in constrained layouts; avoid truncating core CTA text.",
      "Icon and text spacing stays consistent across the 390/768/1440 contract.",
    ],
    codeUsage: '<Button variant="primary">Create Account</Button>',
  },
  {
    name: "Container",
    purpose: "Creates consistent horizontal safe-zones for major page sections.",
    anatomy: ["Outer wrapper", "Responsive horizontal padding", "Content slot"],
    variants: ["default"],
    states: ["not stateful"],
    interaction: [
      "No motion behavior.",
      "Used as structural primitive only.",
    ],
    accessibility: [
      "Preserves readable line length and visual grouping.",
      "Avoid content clipping at any breakpoint.",
    ],
    responsive: [
      "Mobile layout is default, tablet starts at 768px, desktop starts at 1440px.",
      "Horizontal safe-zones should map to the shared layout token contract.",
    ],
    codeUsage: '<Container className="py-16">...content...</Container>',
  },
  {
    name: "KoshLogo",
    purpose: "Brand anchor for navigation, docs, and trust surfaces.",
    anatomy: ["K mark", "Wordmark"],
    variants: ["color=\"black\"", "color=\"white\""],
    states: ["static brand mark"],
    interaction: ["No motion by default; can be wrapped in link interactions."],
    accessibility: [
      "Logo should have accessible text label when used as a link.",
      "Decorative logo instances can use `aria-hidden`.",
    ],
    responsive: ["Keep aspect ratio locked; avoid stretching via CSS."],
    codeUsage: '<KoshLogo color="white" />',
  },
];
