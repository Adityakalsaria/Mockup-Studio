export interface FlowLeafItem {
  id: string;
  label: string;
}

export interface FlowGroup {
  groupLabel: string;
  items: FlowLeafItem[];
}

export const FLOW_GROUPS: FlowGroup[] = [
  {
    groupLabel: "Virtual account",
    items: [
      { id: "virtual-account-bank-selection", label: "Account selection" },
      { id: "virtual-account-selection", label: "Account profile" },
      { id: "virtual-account-profile-page", label: "Bank details" },
    ],
  },
  {
    groupLabel: "Card",
    items: [{ id: "card-screen", label: "Card screen" }],
  },
];

export const DEFAULT_FLOW_ID = "virtual-account-bank-selection";

export interface ScreenPreset {
  id: string;
  label: string;
  src: string;
}

// Drop PNGs into /public/figma-assets/mockup-studio/screen-presets/ and add an
// entry below. id is used as a React key + flow id so make it unique. label
// is just for accessibility — not rendered. src must start with a leading
// slash so it resolves from /public.
const PRESET_BASE = "/figma-assets/mockup-studio/screen-presets";
export const SCREEN_PRESETS: ScreenPreset[] = [
  { id: "dark", label: "Dark", src: `${PRESET_BASE}/dark.png` },
  { id: "dark-2", label: "Dark 2", src: `${PRESET_BASE}/dark-2.png` },
  { id: "dark-3", label: "Dark 3", src: `${PRESET_BASE}/dark-3.png` },
  { id: "dark-4", label: "Dark 4", src: `${PRESET_BASE}/dark-4.png` },
  { id: "dark-5", label: "Dark 5", src: `${PRESET_BASE}/dark-5.png` },
  { id: "dark-6", label: "Dark 6", src: `${PRESET_BASE}/dark-6.png` },
  { id: "dark-7", label: "Dark 7", src: `${PRESET_BASE}/dark-7.png` },
  { id: "dark-8", label: "Dark 8", src: `${PRESET_BASE}/dark-8.png` },
  { id: "dark-9", label: "Dark 9", src: `${PRESET_BASE}/dark-9.png` },
  {
    id: "confirm-payment",
    label: "Confirm payment",
    src: `${PRESET_BASE}/confirm-payment.png`,
  },
  {
    id: "confirm-payment-1",
    label: "Confirm payment 1",
    src: `${PRESET_BASE}/confirm-payment-1.png`,
  },
  {
    id: "confirm-payment-2",
    label: "Confirm payment 2",
    src: `${PRESET_BASE}/confirm-payment-2.png`,
  },
];
