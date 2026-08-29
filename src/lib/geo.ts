import { headers } from "next/headers";

const COUNTRY_HEADER_KEYS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
] as const;

const LABEL_OVERRIDES: Record<string, string> = {
  GB: "the UK",
  AE: "the UAE",
  NL: "the Netherlands",
  PH: "the Philippines",
  DO: "the Dominican Republic",
  BS: "the Bahamas",
};

function isPrivateOrLoopback(ip: string): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("::ffff:127.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function lookupCountryFromIpapi(ip: string | null): Promise<string | null> {
  const url =
    ip && !isPrivateOrLoopback(ip)
      ? `https://ipapi.co/${ip}/json/`
      : "https://ipapi.co/json/";

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
      headers: { "User-Agent": "koshmoney.com" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { country_code?: unknown };
    return typeof data.country_code === "string" && data.country_code.length === 2
      ? data.country_code.toUpperCase()
      : null;
  } catch {
    return null;
  }
}

async function resolveCountryCode(): Promise<string | null> {
  const headerStore = await headers();

  for (const key of COUNTRY_HEADER_KEYS) {
    const value = headerStore.get(key);
    if (value) return value.toUpperCase();
  }

  const forwarded = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const visitorIp =
    forwarded?.split(",")[0]?.trim() ?? realIp?.trim() ?? null;

  return await lookupCountryFromIpapi(visitorIp);
}

export async function getVisitorFromLabel(): Promise<string> {
  const code = await resolveCountryCode();

  if (!code || code === "US") {
    return "anywhere";
  }

  if (LABEL_OVERRIDES[code]) {
    return LABEL_OVERRIDES[code];
  }

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code) ?? "anywhere";
  } catch {
    return "anywhere";
  }
}
