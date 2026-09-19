import { notFound } from "next/navigation";
import RenderShots from "@/features/landing/RenderShots";

/* Development only: renders `SHOTS` into public/landing/shots. */
export default function LandingRenderPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <RenderShots />;
}
