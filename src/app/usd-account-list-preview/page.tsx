import type { Metadata } from "next";
import UsdAccountListPreviewClient from "./UsdAccountListPreviewClient";

export const metadata: Metadata = {
  title: "USD Account List Preview",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UsdAccountListPreviewPage() {
  return <UsdAccountListPreviewClient />;
}
