"use client";

import Button from "@/components/ui/Button";
import { useOpenAccountModal } from "@/components/modals/OpenAccountModal";

export default function GlobalCardCtaSection() {
  const { open } = useOpenAccountModal();

  return (
    <section
      id="global-card-cta"
      className="w-full bg-black py-[var(--spacing-section)] desktop:py-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div
          className="relative flex flex-col items-center overflow-hidden rounded-[24px] bg-[#08090a] px-[var(--space-32)] py-[96px] text-center tablet:px-[var(--space-64)] desktop:py-[140px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-top bg-no-repeat opacity-40"
            style={{ backgroundImage: "url('/figma-assets/cta-bg.jpg')" }}
          />
          <h2 className="relative z-[1] type-h1 text-text-primary">
            Your global card, ready in minutes
          </h2>
          <p className="relative z-[1] type-body-l mx-auto mt-[var(--space-16)] max-w-[520px] text-text-secondary">
            Issue a virtual card instantly, order your physical card, and start
            spending your USD anywhere in the world.
          </p>
          <div className="relative z-[1] mt-[var(--space-32)]">
            <Button variant="prominent" size="md" onClick={open}>
              Get your card
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
