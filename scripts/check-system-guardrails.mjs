#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const read = (filePath) =>
  fs.readFileSync(path.join(rootDir, filePath), "utf8");

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const globalsCss = read("src/app/globals.css");
assert(
  globalsCss.includes("--viewport-mobile: 390px;") &&
    globalsCss.includes("--viewport-tablet: 768px;") &&
    globalsCss.includes("--viewport-desktop: 1440px;"),
  "globals.css is missing one or more canonical viewport tokens (390/768/1440)."
);
assert(
  globalsCss.includes("@media (max-width: 767px)"),
  "globals.css must use max-width: 767px for mobile-only typography overrides."
);

const headerTsx = read("src/components/layout/Header.tsx");
assert(
  !/\b(sm|md|lg|xl|2xl):/.test(headerTsx),
  "Header.tsx should use project breakpoints (`tablet:`/`desktop:`), not legacy responsive prefixes."
);
assert(
  !/#[0-9A-Fa-f]{3,8}\b/.test(headerTsx),
  "Header.tsx contains hardcoded hex color literals. Use component or semantic tokens."
);

const buttonTsx = read("src/components/ui/Button.tsx");
assert(
  !/#[0-9A-Fa-f]{3,8}\b/.test(buttonTsx),
  "Button.tsx contains hardcoded hex color literals. Use component or semantic tokens."
);

const appFeaturesTsx = read("src/components/sections/AppFeaturesAndBentoSection.tsx");
assert(
  appFeaturesTsx.includes("BREAKPOINT_MEDIA.desktopUp"),
  "AppFeaturesAndBentoSection.tsx should use BREAKPOINT_MEDIA.desktopUp for runtime desktop detection."
);
assert(
  !appFeaturesTsx.includes("1280px"),
  "AppFeaturesAndBentoSection.tsx still contains hardcoded 1280px breakpoint logic."
);

if (errors.length > 0) {
  console.error("System guardrails failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("System guardrails passed.");
