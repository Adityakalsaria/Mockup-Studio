import { notFound } from "next/navigation";
import RenderShots from "@/features/landing/RenderShots";
import { signModelToken } from "@/lib/modelToken";

/* Development only: renders `SHOTS` into public/landing/shots. */
export default async function LandingRenderPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  // A token, so the models load in a browser with no session (a headless render).
  return <RenderShots modelToken={await signModelToken()} />;
}
