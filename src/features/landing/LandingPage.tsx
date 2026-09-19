"use client";

import { useState } from "react";
import { DesignSystem } from "@/design/ui";
import { ModelTokenContext, UserScreenContext } from "./LiveDevice";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Craft } from "./sections/Craft";
import { StepDemo } from "./sections/StepDemo";
import { MotionFold } from "./sections/MotionFold";
import { Bento } from "./sections/Bento";
import { Faq } from "./sections/Faq";
import { Footer } from "./sections/Footer";

/*
 * Seven folds: the hero, the two halves of the studio, one device step by step,
 * the Motion tab with its focus points, what comes out, the questions, and the
 * footer. Layout and imagery first; interaction comes after.
 */
export default function LandingPage({ modelToken }: { modelToken: string | null }) {
  const [screen, setScreen] = useState<string | null>(null);
  return (
    <ModelTokenContext.Provider value={modelToken}>
      <UserScreenContext.Provider value={{ screen, setScreen }}>
        <div className="min-h-dvh bg-white text-text-primary-dark">
          <DesignSystem />
          <Nav />
          <main>
            <Hero />
            <Craft />
            <StepDemo />
            <MotionFold />
            <Bento />
            <Faq />
          </main>
          <Footer />
        </div>
      </UserScreenContext.Provider>
    </ModelTokenContext.Provider>
  );
}
