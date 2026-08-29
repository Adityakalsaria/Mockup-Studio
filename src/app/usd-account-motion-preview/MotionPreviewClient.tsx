"use client";

import { useEffect, useMemo, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";

type MotionSpec = typeof import("@/data/usd-account-prototype-motion.json");
type MotionSection = MotionSpec["sections"][number];

function formatTrigger(section: MotionSection) {
  const trigger = section.trigger;
  if (trigger.type === "onLoad") {
    return "On load";
  }

  if (trigger.type === "scrollScrub") {
    return `${trigger.start} -> ${trigger.end} scrub ${trigger.scrub}`;
  }

  return `${trigger.start} -> ${trigger.end}`;
}

function formatSectionTitle(section: MotionSection) {
  return section.id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function MotionPreviewClient({ spec }: { spec: MotionSpec }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % spec.sections.length);
    }, 2400);

    return () => window.clearInterval(intervalId);
  }, [autoPlay, spec.sections.length]);

  const activeSection = spec.sections[activeIndex];
  const rawSectionJson = useMemo(
    () => JSON.stringify(activeSection, null, 2),
    [activeSection]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(76,94,255,0.14),rgba(0,0,0,0)_28%),#000] text-white">
      <div className="layout-content ds-page-gutter py-[96px]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-[32px]">
          <section className="grid gap-[20px] laptop:grid-cols-[1.2fr_0.8fr]">
            <GlassCard className="rounded-[32px] border border-white/10">
              <div className="flex flex-col gap-[24px] p-[28px] tablet:p-[36px]">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="rounded-full border border-white/12 bg-white/[0.06] px-[12px] py-[6px] text-[12px] uppercase tracking-[0.16em] text-white/72">
                    JSON Driven Preview
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/[0.04] px-[12px] py-[6px] text-[12px] uppercase tracking-[0.16em] text-white/56">
                    {spec.engine.recommended}
                  </span>
                </div>

                <div className="max-w-[760px]">
                  <h1 className="type-display text-text-primary">
                    USD Account Motion Spec
                  </h1>
                  <p className="type-body-l mt-[16px] text-text-secondary">
                    This page is rendered from
                    {" "}
                    <span className="text-white/88">{spec.name}</span>
                    {" "}
                    and cycles through each section in the JSON so you can inspect the motion
                    plan directly in the browser.
                  </p>
                </div>

                <div className="grid gap-[12px] tablet:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-[18px]">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Sections
                    </p>
                    <p className="mt-[10px] text-[32px] font-semibold leading-none text-white">
                      {spec.sections.length}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-[18px]">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Reduced Motion
                    </p>
                    <p className="mt-[10px] text-[18px] font-medium text-white">
                      {spec.globalRules.respectReducedMotion ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-[18px]">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Source
                    </p>
                    <p className="mt-[10px] text-[18px] font-medium text-white">
                      Figma prototype
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="rounded-[32px] border border-white/10">
              <div className="flex h-full flex-col justify-between gap-[24px] p-[28px] tablet:p-[32px]">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                    Active Section
                  </p>
                  <h2 className="mt-[12px] text-[36px] font-semibold leading-[1.02] text-white">
                    {formatSectionTitle(activeSection)}
                  </h2>
                  <p className="mt-[12px] text-[16px] text-white/58">
                    {activeSection.component}
                    {" "}
                    •
                    {" "}
                    {formatTrigger(activeSection)}
                  </p>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#050505] p-[20px]">
                  <div className="relative h-[220px] overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
                    <div className="absolute inset-x-[7%] top-[18%] h-[18px] rounded-full bg-white/10" />
                    <div
                      className="absolute left-[7%] top-[34%] h-[30px] rounded-full bg-white"
                      style={{
                        width: activeSection.trigger.type === "scrollScrub" ? "54%" : "42%",
                        opacity: 0.92,
                        filter: "blur(0.2px)",
                        transform: autoPlay ? "translateY(0px) scale(1)" : "translateY(6px) scale(0.98)",
                        transition:
                          "width 600ms var(--ease-out), transform 600ms var(--ease-out), opacity 600ms var(--ease-out)",
                      }}
                    />
                    <div
                      className="absolute left-[7%] top-[52%] h-[16px] rounded-full bg-white/28"
                      style={{
                        width: activeSection.animations.length > 1 ? "66%" : "48%",
                        transform: autoPlay ? "translateY(0px)" : "translateY(8px)",
                        opacity: autoPlay ? 1 : 0.6,
                        transition:
                          "width 600ms var(--ease-out), transform 600ms var(--ease-out), opacity 600ms var(--ease-out)",
                      }}
                    />
                    <div className="absolute inset-x-[7%] bottom-[16%] flex gap-[10px]">
                      {activeSection.animations.slice(0, 4).map((animation, index) => (
                        <div
                          key={`${activeSection.id}-${animation.target}-${index}`}
                          className="h-[56px] flex-1 rounded-[18px] border border-white/10 bg-white/[0.05]"
                          style={{
                            transform:
                              index === 0
                                ? "translateY(0)"
                                : `translateY(${Math.max(0, 14 - index * 4)}px)`,
                            opacity: 0.3 + (index + 1) * 0.16,
                            transition:
                              "transform 600ms var(--ease-out), opacity 600ms var(--ease-out)",
                          }}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-[88px] bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.82)_100%)]" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoPlay((current) => !current)}
                  className="inline-flex w-fit items-center rounded-full border border-white/12 bg-white/[0.06] px-[16px] py-[10px] text-[14px] font-medium text-white transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-white/[0.1]"
                >
                  {autoPlay ? "Pause cycle" : "Resume cycle"}
                </button>
              </div>
            </GlassCard>
          </section>

          <section className="grid gap-[20px] laptop:grid-cols-[0.9fr_1.1fr]">
            <GlassCard className="rounded-[32px] border border-white/10">
              <div className="p-[24px] tablet:p-[28px]">
                <div className="flex items-center justify-between gap-[12px]">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Sections
                    </p>
                    <h2 className="mt-[8px] text-[24px] font-semibold text-white">
                      Motion Map
                    </h2>
                  </div>
                  <a
                    href="/src/data/usd-account-prototype-motion.json"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[14px] text-white/68 underline decoration-white/20 underline-offset-4"
                  >
                    Raw file path
                  </a>
                </div>

                <div className="mt-[20px] flex flex-col gap-[10px]">
                  {spec.sections.map((section, index) => {
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setActiveIndex(index);
                          setAutoPlay(false);
                        }}
                        className={`group flex w-full items-center gap-[16px] rounded-[24px] border px-[18px] py-[16px] text-left transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)] ${
                          isActive
                            ? "border-white/22 bg-white/[0.08]"
                            : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex w-[32px] shrink-0 items-center justify-center text-[12px] font-medium text-white/45">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[16px] font-medium text-white">
                            {formatSectionTitle(section)}
                          </p>
                          <p className="mt-[4px] truncate text-[13px] text-white/50">
                            {section.component}
                            {" "}
                            •
                            {" "}
                            {section.animations.length}
                            {" "}
                            animation
                            {section.animations.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-[6px]">
                          {section.animations.slice(0, 3).map((animation, animationIndex) => (
                            <span
                              key={`${section.id}-${animation.target}-${animationIndex}`}
                              className={`h-[8px] w-[8px] rounded-full ${
                                isActive ? "bg-white/85" : "bg-white/24"
                              }`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="rounded-[32px] border border-white/10">
              <div className="grid gap-[20px] p-[24px] tablet:p-[28px] laptop:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-[16px]">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-[18px]">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Trigger
                    </p>
                    <p className="mt-[10px] text-[16px] text-white/80">
                      {formatTrigger(activeSection)}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-[18px]">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Confidence
                    </p>
                    <p className="mt-[10px] text-[16px] capitalize text-white/80">
                      {activeSection.confidence}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-[18px]">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Figma Node
                    </p>
                    <p className="mt-[10px] break-all font-mono text-[14px] text-white/80">
                      {activeSection.figmaNodeId}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#040404]">
                  <div className="border-b border-white/8 px-[18px] py-[14px]">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-white/45">
                      Selected Section JSON
                    </p>
                  </div>
                  <pre className="max-h-[780px] overflow-auto px-[18px] py-[18px] text-[12px] leading-[1.65] text-white/76">
                    {rawSectionJson}
                  </pre>
                </div>
              </div>
            </GlassCard>
          </section>
        </div>
      </div>
    </main>
  );
}
