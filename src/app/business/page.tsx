import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import FooterSection from "@/components/sections/FooterSection";
import { absoluteUrl } from "@/lib/metadata";
import BusinessContent from "./BusinessContent";

export const metadata: Metadata = {
  title: "Business Credit Cards",
  description:
    "The stablecoin corporate card for your company. Manage subscriptions, travel, contractor payments, and department budgets with KOSH.",
  alternates: {
    canonical: absoluteUrl("/business"),
  },
};

export default function BusinessPage() {
  return (
    <main className="bg-black">
      <Navbar />
      <BusinessContent />
      <FooterSection />
    </main>
  );
}
