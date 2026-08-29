"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";

export default function Navbar({
  onCreateAccountClick,
}: {
  onCreateAccountClick?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll(); // check initial position
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-[var(--z-navbar)] w-full">
      <Header transparent={!scrolled} onCreateAccountClick={onCreateAccountClick} />
    </div>
  );
}
