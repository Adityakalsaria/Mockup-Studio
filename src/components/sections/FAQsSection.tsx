"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { FAQS } from "@/components/sections/faqs-data";

function ToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="transition-transform duration-300 ease-out"
      style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
    >
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function FAQsSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faqs" aria-label="FAQs" className="relative w-full bg-black">
      <div className="layout-content ds-page-gutter py-[var(--spacing-section)]">
        <div className="flex w-full flex-col items-center gap-[var(--space-20)]">
          {/* Header */}
          <h2 className="type-body-l text-center text-text-secondary">
            Frequently asked questions
          </h2>

          {/* Accordion */}
          <div className="flex w-full flex-col gap-[4px]">
            {FAQS.map((item, index) => {
              const isOpen = openIndex === index;
              const answerId = `faq-answer-${index}`;

              return (
                <GlassCard
                  key={item.question}
                  className="rounded-[24px] backdrop-blur-[7.5px]"
                >
                  <h3>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-[10px] rounded-[24px] p-[var(--space-32)] cursor-pointer"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() =>
                      setOpenIndex((prev) => (prev === index ? null : index))
                    }
                  >
                    <span className="type-h5 text-left text-text-primary">
                      {item.question}
                    </span>
                    <span className="shrink-0 text-white">
                      <ToggleIcon isOpen={isOpen} />
                    </span>
                  </button>
                  </h3>

                  <div
                    id={answerId}
                    className="grid px-[var(--space-32)] transition-[grid-template-rows,opacity] duration-300 ease-out"
                    style={{
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <p className="type-body-m pb-[var(--space-32)] text-text-secondary">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Bottom link */}
          <p className="type-body-m text-center text-text-secondary">
            Still have questions? Visit our{" "}
            <a href="https://support.copperx.io/en/" target="_blank" rel="noopener noreferrer" className="text-text-link transition-opacity hover:opacity-80">
              Help Center
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
