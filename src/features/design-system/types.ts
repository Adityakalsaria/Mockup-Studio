export type ColorGroup = "base" | "text" | "surface" | "button" | "header" | "material";

export interface OpacityStop {
  value: number;
  tailwind: string;
  usage: string;
  occurrences: number;
}

export interface ColorTokenDoc {
  name: string;
  value: string;
  /** Human-readable label shown on the website-system page (e.g. "white / 90%"). */
  displayValue?: string;
  group: ColorGroup;
  usage: string;
  usageCount: number;
}

export interface TypeScaleTokenDoc {
  name: string;
  token: string;
  sample: string;
  fontName: string;
  size: string;
  weight: string;
  lineHeight: string;
  tracking: string;
}

export interface SpacingTokenDoc {
  name: string;
  token: string;
  value: string;
  usage: string;
  group: "primitive" | "semantic" | "layout";
  usageCount: number;
}

export interface MotionTokenDoc {
  name: string;
  token: string;
  value: string;
  usage: string;
}

export interface RadiusTokenDoc {
  name: string;
  value: string;
  usage: string;
}

export interface ZIndexTokenDoc {
  name: string;
  value: number;
  usage: string;
}

export interface DesignCharterRule {
  title: string;
  intent: string;
  details: string;
}

export interface AntiPatternRule {
  title: string;
  doRule: string;
  dontRule: string;
  reason: string;
}

export interface ComponentSpecDoc {
  name: string;
  purpose: string;
  anatomy: string[];
  variants: string[];
  states: string[];
  interaction: string[];
  accessibility: string[];
  responsive: string[];
  codeUsage: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface MaterialPatternDoc {
  name: string;
  description: string;
  surface: string;
  blur: string;
  border: string;
  radius: string;
  usedIn: string[];
  variant?: "prominent" | "light" | "dark-subtle" | "dark";
}
