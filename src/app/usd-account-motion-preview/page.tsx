import type { Metadata } from "next";
import motionSpec from "@/data/usd-account-prototype-motion.json";
import MotionPreviewClient from "./MotionPreviewClient";

export const metadata: Metadata = {
  title: "USD Account Motion Preview",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UsdAccountMotionPreviewPage() {
  return <MotionPreviewClient spec={motionSpec} />;
}
