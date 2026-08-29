"use client";

import { useEffect } from "react";

export default function WebsiteSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Stop Lenis from intercepting scroll on this route
    const html = document.documentElement;
    html.classList.remove("lenis", "lenis-smooth");
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      html.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return <>{children}</>;
}
