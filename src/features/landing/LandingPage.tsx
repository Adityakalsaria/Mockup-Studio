"use client";

import { useState } from "react";
import { DesignSystem } from "@/design/ui";
import { UserScreenContext } from "./LiveDevice";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Categories } from "./sections/Categories";
import { Highlights } from "./sections/Highlights";
import { Studio } from "./sections/Studio";
import { Everywhere } from "./sections/Everywhere";
import { CloserLook } from "./sections/CloserLook";
import { MadeForApple } from "./sections/MadeForApple";
import { SetTheScene } from "./sections/SetTheScene";
import { BringItToLife } from "./sections/BringItToLife";
import { MadeToShip } from "./sections/MadeToShip";
import { PickDevice } from "./sections/PickDevice";
import { Faq } from "./sections/Faq";
import { FinalCta, Footer } from "./sections/Closing";

/*
 * Two references, one page. From a mockup library: the left-set two-tone hero
 * with a working drop zone, dense category grids, panels with small-caps
 * labels, a running reel, big dark and pastel cards, and a black footer under
 * the page's rounded edge. From an Apple product page: the floating glass nav,
 * the highlights gallery, the finish trio, the closer-look viewer, the lineup
 * and the figures. Chapters alternate white and light grey.
 */
export default function LandingPage() {
  const [screen, setScreen] = useState<string | null>(null);
  return (
    <UserScreenContext.Provider value={{ screen, setScreen }}>
      <div className="min-h-dvh bg-black text-text-primary-dark">
        <DesignSystem />
        <Nav />
        <main className="overflow-clip rounded-b-[40px] bg-white">
          <Hero />
          <Categories />
          <Highlights />
          <Studio />
          <Everywhere />
          <CloserLook />
          <MadeForApple />
          <SetTheScene />
          <BringItToLife />
          <MadeToShip />
          <PickDevice />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </UserScreenContext.Provider>
  );
}
