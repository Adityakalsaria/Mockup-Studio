import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { typeScaleTokens } from "@/features/design-system/data/foundations";
import type { TypeScaleTokenDoc } from "@/features/design-system/types";

const typeScaleBlockRegex =
  /export const typeScaleTokens: TypeScaleTokenDoc\[\] = \[[\s\S]*?\n\];/;

const foundationsPath = path.join(
  process.cwd(),
  "src/features/design-system/data/foundations.ts"
);

function isValidToken(value: unknown): value is TypeScaleTokenDoc {
  if (!value || typeof value !== "object") {
    return false;
  }

  const token = value as Record<string, unknown>;
  const fields: Array<keyof TypeScaleTokenDoc> = [
    "name",
    "token",
    "sample",
    "fontName",
    "size",
    "weight",
    "lineHeight",
    "tracking",
  ];

  return fields.every((field) => {
    const content = token[field];
    return typeof content === "string" && content.trim().length > 0;
  });
}

function toTypeScaleCode(tokens: TypeScaleTokenDoc[]): string {
  const records = tokens
    .map(
      (token) => `  {
    name: ${JSON.stringify(token.name)},
    token: ${JSON.stringify(token.token)},
    sample: ${JSON.stringify(token.sample)},
    fontName: ${JSON.stringify(token.fontName)},
    size: ${JSON.stringify(token.size)},
    weight: ${JSON.stringify(token.weight)},
    lineHeight: ${JSON.stringify(token.lineHeight)},
    tracking: ${JSON.stringify(token.tracking)},
  }`
    )
    .join(",\n");

  return `export const typeScaleTokens: TypeScaleTokenDoc[] = [\n${records}\n];`;
}

export async function GET() {
  return NextResponse.json({ tokens: typeScaleTokens });
}

export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Type scale persistence is available only in development." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { tokens?: unknown };
    const nextTokens = body.tokens;

    if (!Array.isArray(nextTokens) || nextTokens.length === 0) {
      return NextResponse.json(
        { error: "tokens must be a non-empty array." },
        { status: 400 }
      );
    }

    if (!nextTokens.every((token) => isValidToken(token))) {
      return NextResponse.json(
        { error: "Invalid typography token payload." },
        { status: 400 }
      );
    }

    const typedTokens = nextTokens as TypeScaleTokenDoc[];
    const source = await fs.readFile(foundationsPath, "utf8");

    if (!typeScaleBlockRegex.test(source)) {
      return NextResponse.json(
        { error: "Unable to locate typeScaleTokens block." },
        { status: 500 }
      );
    }

    const updatedSource = source.replace(
      typeScaleBlockRegex,
      toTypeScaleCode(typedTokens)
    );
    await fs.writeFile(foundationsPath, updatedSource, "utf8");

    return NextResponse.json({ tokens: typedTokens });
  } catch {
    return NextResponse.json(
      { error: "Failed to persist typography tokens." },
      { status: 500 }
    );
  }
}
