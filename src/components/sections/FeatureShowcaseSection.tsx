"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import CanvasSequence from "@/components/sequence/CanvasSequence";

// ── Tab content data ──
const TAB_ITEMS = [
  {
    label: "Wallet",
    description:
      "See your total balance, track recent transactions, and take action in seconds.",
  },
  {
    label: "Virtual Accounts",
    description:
      "Receive USD transfers via ACH or Wire. Share your details, track incoming payments.",
  },
  {
    label: "Card",
    description:
      "Pay for AI tools, subscriptions, cloud services, and everyday essentials directly with your crypto.",
  },
  {
    label: "Rewards",
    description:
      "See your total balance, track recent transactions, and take action in seconds.",
  },
];

// ── Frame-to-tab mapping (matches baked-in tab switching animation) ──
const TAB_FRAMES = [
  { end: 385, index: 0 },
  { end: 460, index: 1 },
  { end: 530, index: 2 },
  { end: 599, index: 3 },
];

function frameToTabIndex(frame: number): number {
  for (const tab of TAB_FRAMES) {
    if (frame < tab.end) return tab.index;
  }
  return 3;
}

// ── Connector line geometry (desktop only) ──
// SVG covers full viewport: viewBox Y maps to vh (0–1000 ≈ 0–100vh)
const CONN_VB_W = 1296; // matches grid width: 4×240 + 3×112
const CONN_VB_H = 1000; // 1000 units = 100vh
const CONN_PHONE_W = 800;
const CONN_PHONE_OFFSET = (CONN_VB_W - CONN_PHONE_W) / 2; // 248

// Icon X positions on the zoomed phone nav bar (adjust to match frame)
// Center X is provided as a percentage across the phone bar.
const CONN_BAR_WIDTH_PX = 565.65;
const CONN_OFFSETS_PX = [210, 348, 486, 625];
const CONN_ICON_BASE_XS = CONN_OFFSETS_PX.map(
  (offset) => CONN_PHONE_OFFSET + CONN_PHONE_W * (offset / CONN_BAR_WIDTH_PX)
);
const CONN_ICON_DELTAS = [-126, -164, -202, -249];
const CONN_ICON_XS = CONN_ICON_BASE_XS.map((x, i) => x + CONN_ICON_DELTAS[i]);
// Fallback column left edges (used before first layout measurement)
const CONN_COL_XS_FALLBACK = [0, 352, 704, 1056];

// Y coordinates (in viewBox units where 1000 = 100vh)
const CONN_ICON_Y = 238; // ≈ 23.8vh — just below the phone bottom bezel
const CONN_COL_Y = 585; // ends at the top of column titles
const CONN_TURN_Y = 490; // L-turn point
const CONN_R = 8;
// Compensate for preserveAspectRatio="none" distortion:
// viewBox is 1296×1000 but rendered at ~1296px × 100vh (~900px).
// Y scale ≈ 0.9× of X scale, so Y radii need to be larger in viewBox units.
const CONN_RY = Math.round(CONN_R * (CONN_VB_W / CONN_VB_H));

function buildConnectorPath(iconX: number, colX: number): string {
  const r = CONN_R;   // X-direction radius (viewBox units)
  const ry = CONN_RY; // Y-direction radius (compensated for scaling)
  const ty = CONN_TURN_Y;
  const y0 = CONN_ICON_Y;
  const y1 = CONN_COL_Y;
  if (Math.abs(colX - iconX) < r * 2) {
    return `M ${iconX} ${y0} L ${colX} ${y1}`;
  }
  if (colX < iconX) {
    return [
      `M ${iconX} ${y0}`,
      `L ${iconX} ${ty - ry}`,
      `Q ${iconX} ${ty} ${iconX - r} ${ty}`,
      `L ${colX + r} ${ty}`,
      `Q ${colX} ${ty} ${colX} ${ty + ry}`,
      `L ${colX} ${y1}`,
    ].join(" ");
  }
  return [
    `M ${iconX} ${y0}`,
    `L ${iconX} ${ty - ry}`,
    `Q ${iconX} ${ty} ${iconX + r} ${ty}`,
    `L ${colX - r} ${ty}`,
    `Q ${colX} ${ty} ${colX} ${ty + ry}`,
    `L ${colX} ${y1}`,
  ].join(" ");
}

const CONNECTOR_PATHS_FALLBACK = CONN_ICON_XS.map((x, i) =>
  buildConnectorPath(x, CONN_COL_XS_FALLBACK[i])
);
export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const headingDarkRef = useRef<HTMLHeadingElement>(null);
  const headingLightRef = useRef<HTMLHeadingElement>(null);
  const lastTabRef = useRef(-1);
  const frameCount = 600;
  const startFrame = 35;
  const endFrame = 599;
  const holdFrame = 240;
  const scrollEnd = "+=100%";
  const connDrawRanges = TAB_FRAMES.map((tab, i) => ({
    start: i === 0 ? startFrame : TAB_FRAMES[i - 1].end,
    end: tab.end,
  }));

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      // ── Theme transition: white → dark ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 40%",
          end: "top 20%",
          scrub: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
        },
      });

      const headingDark = headingDarkRef.current;
      const headingLight = headingLightRef.current;
      gsap.set(section, {
        backgroundColor: "#ffffff",
        willChange: "background-color",
      });
      if (headingDark) {
        gsap.set(headingDark, { opacity: 1, willChange: "opacity" });
      }
      if (headingLight) {
        gsap.set(headingLight, { opacity: 0, willChange: "opacity" });
      }
      tl.to(section, {
        backgroundColor: "#000000",
        duration: 1,
      });

      if (headingDark) {
        tl.to(headingDark, { opacity: 0, duration: 0.75, ease: "none" }, 0);
      }
      if (headingLight) {
        tl.to(headingLight, { opacity: 1, duration: 0.75, ease: "none" }, 0.1);
      }

      tl.to("[data-features-subtitle]", {
        color: "rgba(255,255,255,0.45)",
        duration: 1,
      }, 0);

      const topMask = section.querySelector<HTMLElement>("[data-sequence-top-mask]");
      const depthBlack = section.querySelector<HTMLElement>("[data-features-depth-black]");

      if (topMask) tl.to(topMask, { opacity: 1, duration: 0.3 }, 0.7);
      if (depthBlack) tl.to(depthBlack, { opacity: 1, duration: 0.3 }, 0.7);

      // ── Scroll-synced animations ──
      const totalFrames = endFrame - startFrame;
      const holdProgress = Math.max(0, Math.min(1, (holdFrame - startFrame) / totalFrames));
      const fadeEnd = Math.min(1, holdProgress + 0.05);

      const textEl = textRef.current;
      const setterY = textEl ? gsap.quickSetter(textEl, "y", "px") : null;
      const setterOpacity = textEl ? gsap.quickSetter(textEl, "opacity") : null;

      // Measure gap above sequence wrapper for transform-based collapse
      // (GPU-accelerated — no layout reflows during scroll)
      const seqWrap = section.querySelector<HTMLElement>("[data-sequence-wrap]");
      const collapseDistance = seqWrap
        ? seqWrap.getBoundingClientRect().top - section.getBoundingClientRect().top
        : 0;
      const setterWrapY = seqWrap ? gsap.quickSetter(seqWrap, "y", "px") : null;

      // Cache tab grid DOM refs
      const tabGridEl = section.querySelector<HTMLElement>("[data-tab-grid]");
      const tabColEls = section.querySelectorAll<HTMLElement>("[data-tab-col]");

      // Grid fades in around frame 310–350
      const tabFadeInStart = (310 - startFrame) / totalFrames;
      const tabFadeInEnd = (350 - startFrame) / totalFrames;

      // Cache connector SVG elements + measure path lengths
      const connSvg = section.querySelector<SVGSVGElement>("[data-connectors-svg]");
      const connDrawPaths = [0, 1, 2, 3].map((i) =>
        section.querySelector<SVGPathElement>(`[data-connector-draw="${i}"]`)
      );
      const connVisiblePaths = [0, 1, 2, 3].map((i) =>
        section.querySelector<SVGPathElement>(`[data-connector-visible="${i}"]`)
      );
      let connLengths = connDrawPaths.map((p) => p?.getTotalLength() || 0);

      const updateConnectorGeometry = () => {
        if (!connSvg || !tabColEls.length) return;
        const svgRect = connSvg.getBoundingClientRect();
        if (!svgRect.width) return;

        const xScale = CONN_VB_W / svgRect.width;
        const colXs = Array.from(tabColEls).map((colEl) => {
          const titleEl = colEl.querySelector<HTMLElement>("[data-col-title]");
          const targetEl = titleEl ?? colEl;
          const rect = targetEl.getBoundingClientRect();
          const x = (rect.left - svgRect.left) * xScale;
          return Math.max(0, Math.min(CONN_VB_W, x));
        });

        const dValues = CONN_ICON_XS.map((iconX, i) =>
          buildConnectorPath(iconX, colXs[i] ?? CONN_COL_XS_FALLBACK[i])
        );

        connDrawPaths.forEach((path, i) => {
          if (path) path.setAttribute("d", dValues[i]);
        });
        connVisiblePaths.forEach((path, i) => {
          if (path) path.setAttribute("d", dValues[i]);
        });

        connLengths = connDrawPaths.map((p) => p?.getTotalLength() || 0);
        connDrawPaths.forEach((path, i) => {
          if (path) {
            const len = connLengths[i];
            path.style.strokeDasharray = `${len}`;
            path.style.strokeDashoffset = `${len}`;
          }
        });
      };

      updateConnectorGeometry();
      const handleResize = () => updateConnectorGeometry();
      window.addEventListener("resize", handleResize);

      // Set initial dash state: fully hidden
      connDrawPaths.forEach((path, i) => {
        if (path) {
          const len = connLengths[i];
          path.style.strokeDasharray = `${len}`;
          path.style.strokeDashoffset = `${len}`;
        }
      });

      gsap.to({}, {
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: scrollEnd,
          scrub: 1,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => updateConnectorGeometry(),
          onUpdate: (self) => {
            const p = self.progress;

            // Text fade-out + phone pull-up (transform only — no layout reflows)
            if (textEl && setterY && setterOpacity) {
              if (p <= holdProgress) {
                setterY(0);
                setterOpacity(1);
                textEl.style.zIndex = "20";
                if (setterWrapY) setterWrapY(0);
              } else if (p >= fadeEnd) {
                setterY(-40);
                setterOpacity(0);
                textEl.style.zIndex = "5";
                if (setterWrapY) setterWrapY(-collapseDistance);
              } else {
                const t = (p - holdProgress) / (fadeEnd - holdProgress);
                setterY(-40 * t);
                setterOpacity(1 - t);
                textEl.style.zIndex = "5";
                if (setterWrapY) setterWrapY(-collapseDistance * t);
              }
            }

            // Current frame → active tab
            const currentFrame = startFrame + p * totalFrames;
            const tabIndex = frameToTabIndex(currentFrame);

            // Progressive grid reveal
            if (tabGridEl && tabColEls.length) {
              // Fade in the grid container
              if (p < tabFadeInStart) {
                tabGridEl.style.opacity = "0";
              } else if (p < tabFadeInEnd) {
                tabGridEl.style.opacity = String(
                  (p - tabFadeInStart) / (tabFadeInEnd - tabFadeInStart)
                );
              } else {
                tabGridEl.style.opacity = "1";
              }

              // Only update DOM when tab changes
              if (tabIndex !== lastTabRef.current) {
                lastTabRef.current = tabIndex;

                tabColEls.forEach((el, idx) => {
                  const isRevealed = idx <= tabIndex;
                  const isActive = idx === tabIndex;

                  // Reveal / hide column
                  el.style.opacity = isRevealed ? "1" : "0";
                  el.style.transform = isRevealed ? "translateY(0)" : "translateY(16px)";

                  // Highlight active, dim previously revealed
                  const titleEl = el.querySelector<HTMLElement>("[data-col-title]");
                  const descEl = el.querySelector<HTMLElement>("[data-col-desc]");
                  if (titleEl) {
                    titleEl.style.color = isActive
                      ? "var(--color-foreground)"
                      : "var(--color-text-muted)";
                  }
                  if (descEl) {
                    descEl.style.color = isActive
                      ? "var(--color-text-muted)"
                      : "var(--color-border)";
                  }
                });
              }
            }

            // ── Connector line visibility ──
            if (connSvg) {
              // Keep connectors hidden until a specific frame
              const showConnectors = currentFrame >= 329;
              connSvg.style.opacity = showConnectors ? "1" : "0";

              if (!showConnectors) {
                connDrawRanges.forEach((_, i) => {
                  const len = connLengths[i];
                  const path = connDrawPaths[i];
                  if (path) path.style.strokeDashoffset = `${len}`;
                });
              } else {
                // Only show the active tab's connector — no scroll-based draw
                connDrawRanges.forEach((_, i) => {
                  const isActive = i === tabIndex;
                  const len = connLengths[i];
                  const path = connDrawPaths[i];
                  if (path) path.style.strokeDashoffset = isActive ? "0" : `${len}`;
                });
              }
            }
          },
        },
      });

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative flex flex-col items-center overflow-hidden bg-white"
      style={{
        minHeight: "860px",
        height: "100vh",
        paddingTop: "var(--spacing-section)",
      }}
    >
      <div className="relative mx-auto h-full w-full max-w-[var(--layout-bleed-max)]">
        {/* Text content */}
        <div
          ref={textRef}
          className="relative z-20 flex flex-col items-center gap-[var(--spacing-sm)] px-[var(--layout-page-gutter)] text-center"
        >
          <div className="relative">
            <h1
              ref={headingDarkRef}
              data-heading-dark
              className="-m-[8px] type-h1 p-[8px]"
              style={{
                background: "linear-gradient(to right, #000000, #2d2d2d)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Designed for how money
              <br />
              moves today.
            </h1>

            <h1
              ref={headingLightRef}
              data-heading-light
              className="type-h1 absolute -inset-[8px] p-[8px]"
              style={{
                background: "linear-gradient(to right, #ffffff, #d2d2d2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                opacity: 0,
              }}
              aria-hidden="true"
            >
              Designed for how money
              <br />
              moves today.
            </h1>
          </div>

          <p
            data-features-subtitle
            className="type-body-m max-w-[376px]"
            style={{
              color: "rgba(63,63,63,0.45)",
              fontFeatureSettings: "'lnum' 1, 'pnum' 1",
            }}
          >
            Create virtual accounts, manage balances, and send payouts, all from
            one seamless mobile experience.
          </p>
        </div>

        {/* PNG sequence */}
        <div
          className="relative z-10 mx-auto w-full max-w-[800px]"
          style={{
            aspectRatio: "1000 / 1464",
            marginTop: "clamp(-80px, -5vw, -20px)",
          }}
          data-sequence-wrap
        >
          <CanvasSequence
            frameCount={frameCount}
            startFrame={startFrame}
            endFrame={endFrame}
            triggerSelector="#features"
            className="h-full w-full"
            start="top top"
            end={scrollEnd}
          />

          {/* Top gradient mask — soft fade so the phone crop isn't visible */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[25%] opacity-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0) 100%)",
            }}
            data-sequence-top-mask
          />

          {/* Bottom gradient mask */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[30%] opacity-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0) 100%)",
            }}
            data-features-depth-black
          />
        </div>

        {/* ── Connector lines — draw in as tabs activate (desktop only) ── */}
        <svg
          data-connectors-svg
          className="pointer-events-none absolute inset-x-0 top-0 z-[25] mx-auto hidden laptop:block"
          style={{
            height: "100vh",
            width: "calc(100% - (var(--layout-page-gutter) * 2))",
            opacity: 0,
          }}
          viewBox={`0 0 ${CONN_VB_W} ${CONN_VB_H}`}
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            {CONNECTOR_PATHS_FALLBACK.map((d, i) => (
              <mask key={`m${i}`} id={`cmask-${i}`}>
                <path
                  data-connector-draw={i}
                  d={d}
                  stroke="white"
                  strokeWidth={6}
                  fill="none"
                />
              </mask>
            ))}
          </defs>
          {CONNECTOR_PATHS_FALLBACK.map((d, i) => (
            <path
              key={`c${i}`}
              data-connector-visible={i}
              d={d}
              className="connector-line"
              stroke="#434343"
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="none"
              mask={`url(#cmask-${i})`}
            />
          ))}
        </svg>

        {/* ── Progressive 4-column grid — columns reveal as tabs switch ── */}
        <div
          data-tab-grid
          className="absolute inset-x-0 z-20 mx-auto grid w-[calc(100%-(var(--layout-page-gutter)*2))] grid-cols-2 gap-x-[var(--spacing-md)] gap-y-[var(--spacing-sm)] px-0 laptop:grid-cols-4 laptop:gap-x-[clamp(var(--space-16),3vw,var(--space-64))]"
          style={{ top: "62vh", opacity: 0 }}
        >
          {TAB_ITEMS.map((item) => (
            <div
              key={item.label}
              data-tab-col
              className="flex flex-col gap-[var(--space-4)]"
              style={{
                opacity: 0,
                transform: "translateY(16px)",
                transition:
                  "opacity 0.5s var(--ease-apple), transform 0.5s var(--ease-apple)",
              }}
            >
              <h3
                data-col-title
                className="type-h3"
                style={{
                  color: "var(--color-foreground)",
                  transition: "color var(--duration-fast) var(--ease-apple)",
                }}
              >
                {item.label}
              </h3>
              <p
                data-col-desc
                className="type-body-m"
                style={{
                  color: "var(--color-text-muted)",
                  fontFeatureSettings: "'lnum' 1, 'pnum' 1",
                  transition: "color var(--duration-fast) var(--ease-apple)",
                }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
