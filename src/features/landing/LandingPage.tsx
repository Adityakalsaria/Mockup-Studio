import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Craft } from "./sections/Craft";
import { StepDemo } from "./sections/StepDemo";
import { MotionFold } from "./sections/MotionFold";
import { Features } from "./sections/Features";
import { Gallery } from "./sections/Gallery";
import { Faq } from "./sections/Faq";
import { Footer } from "./sections/Footer";
import { DesignSystem } from "@/design/ui";

/*
 * The page as the design lays it out: the hero, the two halves of the studio,
 * one design step by step, the Motion band, every feature, a gallery, the
 * questions, and the footer. Static; interaction comes after.
 */
export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-[#282228]">
      <DesignSystem />
      <Nav />
      <main className="flex flex-col items-center gap-[120px] pb-[160px] pt-[144px] laptop:gap-[296px] laptop:pt-[200px]">
        <Hero />
        <Craft />
        <StepDemo />
        <MotionFold />
        <Features />
        <Gallery />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
