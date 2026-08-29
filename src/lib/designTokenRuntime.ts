import type { TypeScaleTokenDoc } from "@/features/design-system/types";

export const DESIGN_TOKEN_OVERRIDES_STORAGE_KEY = "kosh.design-token-overrides.v3";
export const DESIGN_TOKEN_OVERRIDES_EVENT = "kosh:design-token-overrides-changed";

export interface DesignTokenOverrides {
  variables: Record<string, string>;
  updatedAt: string;
}

function getTypographyScaleKey(token: string): string | null {
  if (!token.startsWith("--font-size-")) {
    return null;
  }

  return token.replace("--font-size-", "");
}

export function isTypographyVariable(variableName: string): boolean {
  return (
    variableName.startsWith("--font-size-") ||
    variableName.startsWith("--font-weight-") ||
    variableName.startsWith("--line-height-") ||
    variableName.startsWith("--tracking-")
  );
}

export function createTypographyVariableMap(
  tokens: TypeScaleTokenDoc[]
): Record<string, string> {
  const variables: Record<string, string> = {};

  for (const token of tokens) {
    const scaleKey = getTypographyScaleKey(token.token);
    if (!scaleKey) {
      continue;
    }

    variables[`--font-size-${scaleKey}`] = token.size;
    variables[`--font-weight-${scaleKey}`] = token.weight;
    variables[`--line-height-${scaleKey}`] = token.lineHeight;
    variables[`--tracking-${scaleKey}`] = token.tracking;
  }

  return variables;
}

export function hydrateTypographyTokensFromVariables(
  tokens: TypeScaleTokenDoc[],
  variables: Record<string, string>
): TypeScaleTokenDoc[] {
  return tokens.map((token) => {
    const scaleKey = getTypographyScaleKey(token.token);
    if (!scaleKey) {
      return token;
    }

    return {
      ...token,
      size: variables[`--font-size-${scaleKey}`] ?? token.size,
      weight: variables[`--font-weight-${scaleKey}`] ?? token.weight,
      lineHeight: variables[`--line-height-${scaleKey}`] ?? token.lineHeight,
      tracking: variables[`--tracking-${scaleKey}`] ?? token.tracking,
    };
  });
}

export function readDesignTokenOverrides(): DesignTokenOverrides | null {
  if (typeof window === "undefined") {
    return null;
  }

  const serialized = window.localStorage.getItem(DESIGN_TOKEN_OVERRIDES_STORAGE_KEY);
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<DesignTokenOverrides>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const variables =
      parsed.variables && typeof parsed.variables === "object"
        ? (parsed.variables as Record<string, string>)
        : null;
    if (!variables) {
      return null;
    }

    return {
      variables,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function writeDesignTokenOverrides(overrides: DesignTokenOverrides) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DESIGN_TOKEN_OVERRIDES_STORAGE_KEY,
    JSON.stringify(overrides)
  );
  window.dispatchEvent(new Event(DESIGN_TOKEN_OVERRIDES_EVENT));
}

export function saveTypographyTokenOverrides(tokens: TypeScaleTokenDoc[]) {
  const current = readDesignTokenOverrides();
  const persistedVariables = current?.variables ?? {};
  const nextTypographyVariables = createTypographyVariableMap(tokens);

  const baseVariables = Object.fromEntries(
    Object.entries(persistedVariables).filter(([name]) => !isTypographyVariable(name))
  );
  const nextVariables = {
    ...baseVariables,
    ...nextTypographyVariables,
  };

  writeDesignTokenOverrides({
    variables: nextVariables,
    updatedAt: new Date().toISOString(),
  });
}

export function saveColorTokenOverride(tokenName: string, value: string) {
  const variableName = `--color-${tokenName}`;
  const current = readDesignTokenOverrides();
  const persistedVariables = current?.variables ?? {};

  writeDesignTokenOverrides({
    variables: {
      ...persistedVariables,
      [variableName]: value,
    },
    updatedAt: new Date().toISOString(),
  });
}

export function applyDesignTokenVariables(
  nextVariables: Record<string, string>,
  previousVariableKeys: string[]
): string[] {
  if (typeof document === "undefined") {
    return previousVariableKeys;
  }

  const root = document.documentElement;
  const nextKeys = Object.keys(nextVariables);
  const nextKeySet = new Set(nextKeys);

  for (const key of previousVariableKeys) {
    if (!nextKeySet.has(key)) {
      root.style.removeProperty(key);
    }
  }

  for (const [name, value] of Object.entries(nextVariables)) {
    root.style.setProperty(name, value);
  }

  return nextKeys;
}
