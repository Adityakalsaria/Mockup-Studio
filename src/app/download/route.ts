import { headers } from "next/headers";
import { NextResponse } from "next/server";

const IOS_URL = "https://testflight.apple.com/join/qJPVHJKq";
const ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.koshmoney.app&hl=en_US";
const FALLBACK_URL = "/#footer";

export async function GET() {
  const ua = (await headers()).get("user-agent") ?? "";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return NextResponse.redirect(IOS_URL);
  }

  if (/Android/i.test(ua)) {
    return NextResponse.redirect(ANDROID_URL);
  }

  // Desktop or unknown — send to website footer with both download options
  return NextResponse.redirect(new URL(FALLBACK_URL, "https://koshmoney.com"));
}
