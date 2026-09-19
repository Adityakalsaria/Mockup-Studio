import { notFound } from "next/navigation";
import StudioChrome from "@/features/mockup-studio/mocraft/StudioChrome";

/* Development only: the studio without the sign-in gate, to screenshot it for the landing page. */
export default function StudioCapturePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <StudioChrome />;
}
