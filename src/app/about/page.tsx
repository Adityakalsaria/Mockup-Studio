import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import FooterSection from "@/components/sections/FooterSection";
import { absoluteUrl } from "@/lib/metadata";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "About",
  description:
    "KOSH is a stablecoin-powered financial platform for global payments, USD accounts, Visa cards, and cross-border transfers — built for freelancers and businesses who earn globally.",
  alternates: {
    canonical: absoluteUrl("/about"),
  },
};

export default function AboutPage() {
  return (
    <main className="bg-black">
      <Navbar />
      <AboutContent />
      <FooterSection />
    </main>
  );
}
