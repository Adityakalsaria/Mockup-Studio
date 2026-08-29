"use client";

import { useEffect } from "react";

export default function KoshstudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      html.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return children;
}
