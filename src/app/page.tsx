import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/sections/HeroSection";
import Navbar from "@/components/layout/Navbar";
import FloatingQRCode from "@/components/ui/FloatingQRCode";
import PrefetchBusinessSequence from "@/components/PrefetchBusinessSequence";

const HeroSecondSection = dynamic(() => import("@/components/sections/HeroSecondSection"));
const FourthSection = dynamic(() => import("@/components/sections/FourthSection"));
const FutureSection = dynamic(() => import("@/components/sections/FutureSection"));
const BusinessCTASection = dynamic(() => import("@/components/sections/BusinessCTASection"));
const FAQsSection = dynamic(() => import("@/components/sections/FAQsSection"));
const FooterSection = dynamic(() => import("@/components/sections/FooterSection"));
import JsonLd from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/metadata";
import {
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: {
    absolute: "KOSH - The Global Financial Account",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
};

export default function Home() {
  const schemas = [organizationSchema(), websiteSchema(), softwareApplicationSchema()];

  return (
    <>
      <JsonLd data={schemas} />
      <main>
        <Navbar />
        <Hero />
        <div id="sequence-zone" className="bg-black">
          <HeroSecondSection />
        </div>
        <FourthSection />
        <FutureSection />

        {/* ── Business CTA Section ──
            Pulled under FutureSection via -mt-[100vh]. FutureSection (z-10)
            covers this, so the content is only revealed through FutureSection's
            bottom gradient as it scrolls away. The sticky inner keeps the
            image + CTA pinned to the viewport during the reveal scroll.
            Canvas sequence scrubs 241 frames as user scrolls through. */}
        <BusinessCTASection />

        <FAQsSection />
        <FooterSection />
      </main>
      <FloatingQRCode />
      <PrefetchBusinessSequence />
    </>
  );
}
