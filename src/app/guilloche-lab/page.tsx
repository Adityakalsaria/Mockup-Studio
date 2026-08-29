import type { Metadata } from "next";
import GuillocheLabClient from "./GuillocheLabClient";

export const metadata: Metadata = {
  title: "Guilloche Lab",
  description: "Standalone spirograph-style currency pattern generator.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuillocheLabPage() {
  return <GuillocheLabClient />;
}
