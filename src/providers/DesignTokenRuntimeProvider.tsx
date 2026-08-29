"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  colorTokens,
  durationTokens,
  easingTokens,
  spacingTokens,
  typeScaleTokens,
} from "@/features/design-system/data/foundations";
import {
  applyDesignTokenVariables,
  createTypographyVariableMap,
  DESIGN_TOKEN_OVERRIDES_EVENT,
  DESIGN_TOKEN_OVERRIDES_STORAGE_KEY,
  readDesignTokenOverrides,
} from "@/lib/designTokenRuntime";

function createTokenValueMap(tokens: Array<{ token: string; value: string }>) {
  return Object.fromEntries(tokens.map((token) => [token.token, token.value]));
}

function createColorVariableMap(tokens: Array<{ name: string; value: string }>) {
  return Object.fromEntries(tokens.map((token) => [`--color-${token.name}`, token.value]));
}

function shouldEnableTokenRuntime(pathname: string): boolean {
  return pathname.startsWith("/website-system") || pathname.startsWith("/design-system");
}

function buildResolvedVariables(pathname: string) {
  // Only inject runtime tokens on design-system pages where live editing is needed.
  // All other routes use the static @theme tokens from globals.css.
  if (!shouldEnableTokenRuntime(pathname)) {
    return {};
  }

  const foundationVariables = {
    ...createTypographyVariableMap(typeScaleTokens),
    ...createTokenValueMap(spacingTokens),
    ...createTokenValueMap(easingTokens),
    ...createTokenValueMap(durationTokens),
    ...createColorVariableMap(colorTokens),
  };
  const overrides = readDesignTokenOverrides();

  return {
    ...foundationVariables,
    ...(overrides?.variables ?? {}),
  };
}

export default function DesignTokenRuntimeProvider() {
  const appliedKeysRef = useRef<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const syncVariables = () => {
      appliedKeysRef.current = applyDesignTokenVariables(
        buildResolvedVariables(pathname || "/"),
        appliedKeysRef.current
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DESIGN_TOKEN_OVERRIDES_STORAGE_KEY) {
        return;
      }

      syncVariables();
    };

    syncVariables();

    window.addEventListener(DESIGN_TOKEN_OVERRIDES_EVENT, syncVariables);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(DESIGN_TOKEN_OVERRIDES_EVENT, syncVariables);
      window.removeEventListener("storage", handleStorage);
    };
  }, [pathname]);

  return null;
}
