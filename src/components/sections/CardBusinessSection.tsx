"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import Button from "@/components/ui/Button";
import { gsap } from "@/lib/gsap";

const CARD_BUSINESS_TEAM_IMAGE = "/figma-assets/global-card/card-business-team-v2.png";

const CARD_BUSINESS_FEATURES = [
  "Virtual + physical cards",
  "Apple Pay / Google Pay",
  "Instant virtual cards",
] as const;

const WHITE = "#ffffff";
const BLACK = "#000000";

export default function CardBusinessSection({
  interactiveOnScroll = false,
}: {
  interactiveOnScroll?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!interactiveOnScroll || !sectionRef.current) return;

      const section = sectionRef.current;
      const shell = shellRef.current;
      const title = section.querySelector<HTMLElement>("[data-cb-title]");
      const body = section.querySelector<HTMLElement>("[data-cb-body]");
      const featureLabels = section.querySelectorAll<HTMLElement>("[data-cb-feature]");
      const featureItems = section.querySelectorAll<HTMLElement>("[data-cb-feature-item]");
      const inner = section.querySelector<HTMLElement>("[data-cb-inner]");

      const toLight = {
        bg: BLACK,
        title: "rgba(255,255,255,0.9)",
        body: "rgba(255,255,255,0.6)",
        feature: "rgba(255,255,255,0.6)",
        border: "rgba(255,255,255,0.08)",
      };
      const toDark = {
        bg: WHITE,
        title: "rgba(0,0,0,0.9)",
        body: "rgba(0,0,0,0.6)",
        feature: "rgba(0,0,0,0.6)",
        border: "rgba(0,0,0,0.08)",
      };

      const getTargetWidth = () => Math.max(1340, window.innerWidth - 96);
      const getTargetHeight = () => Math.max(883, window.innerHeight - 224);

      gsap.set(section, { backgroundColor: toLight.bg, willChange: "background-color" });
      if (shell) {
        gsap.set(shell, {
          width: 1340,
          height: 883,
          willChange: "width,height",
        });
      }
      if (inner) {
        gsap.set(inner, {
          width: 1340,
          height: 883,
        });
      }
      if (title) gsap.set(title, { color: toLight.title, willChange: "color" });
      if (body) gsap.set(body, { color: toLight.body, willChange: "color" });
      featureLabels.forEach((el) => gsap.set(el, { color: toLight.feature, willChange: "color" }));
      featureItems.forEach((el) =>
        gsap.set(el, { borderColor: toLight.border, willChange: "border-color" })
      );

      // Entry: CardBusiness bg fades black -> white + rewards bottom edge fades in white
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "top top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(
          shell,
          {
            width: getTargetWidth,
            height: getTargetHeight,
            ease: "none",
          },
          0
        )
        .to(section, { backgroundColor: toDark.bg, ease: "none" }, 0)
        .to(title, { color: toDark.title, ease: "none" }, 0)
        .to(body, { color: toDark.body, ease: "none" }, 0)
        .to(featureLabels, { color: toDark.feature, ease: "none" }, 0)
        .to(featureItems, { borderColor: toDark.border, ease: "none" }, 0);

      // Exit: CardBusiness bg fades white -> black + steps top edge fades out of white
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "bottom bottom",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(section, { backgroundColor: toLight.bg, ease: "none" }, 0)
        .to(title, { color: toLight.title, ease: "none" }, 0)
        .to(body, { color: toLight.body, ease: "none" }, 0)
        .to(featureLabels, { color: toLight.feature, ease: "none" }, 0)
        .to(featureItems, { borderColor: toLight.border, ease: "none" }, 0);
    },
    { scope: sectionRef, dependencies: [interactiveOnScroll] }
  );

  return (
    <section
      ref={sectionRef}
      id="card-business-section"
      className={`w-full ${
        interactiveOnScroll
          ? "bg-transparent desktop:min-h-screen desktop:flex desktop:items-center desktop:justify-center py-[72px] tablet:py-[96px] desktop:py-0"
          : "bg-transparent py-[72px] tablet:py-[96px] desktop:py-[112px]"
      }`}
    >
        <div
          className={`w-full ${
            interactiveOnScroll ? "" : "layout-content ds-page-gutter"
          }`}
        >
          <div className="desktop:flex desktop:justify-center">
          <div
            ref={shellRef}
            className={`relative overflow-hidden desktop:h-[883px] desktop:w-[1340px] ${
              interactiveOnScroll ? "" : "bg-white"
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                data-cb-inner
                className="relative h-full w-full desktop:h-[883px] desktop:w-[1340px]"
              >
                <div className="absolute inset-x-0 bottom-0 top-[220px] overflow-hidden tablet:top-[248px] desktop:top-[264px]">
                  <img
                    src={CARD_BUSINESS_TEAM_IMAGE}
                    alt="Team collaborating around a table"
                    className="h-full w-full object-cover object-center"
                    style={{
                      WebkitMaskImage:
                        "radial-gradient(ellipse 85% 80% at center, #000 45%, transparent 100%)",
                      maskImage:
                        "radial-gradient(ellipse 85% 80% at center, #000 45%, transparent 100%)",
                    }}
                  />
                </div>

                <div className="relative z-10 flex h-full flex-col items-center px-[24px] pt-[56px] pb-[32px] text-center tablet:px-[40px] tablet:pt-[72px] tablet:pb-[40px] desktop:px-[48px] desktop:pt-[80px] desktop:pb-[48px]">
                  <div className="flex w-full max-w-[698px] flex-col items-center gap-[16px]">
                    <h2
                      data-cb-title
                      className="font-saans text-[36px] font-semibold leading-[1.08] tracking-[-0.028em] text-black/[0.9] tablet:text-[44px] desktop:text-[48px]"
                    >
                      Also built for modern businesses
                    </h2>
                    <p
                      data-cb-body
                      className="max-w-[520px] font-saans text-[18px] font-normal leading-[1.5] tracking-[-0.022em] text-black/[0.6] desktop:text-[20px]"
                    >
                      Manage global spending across your team with full control, visibility, and
                      flexibility — all from one dashboard.
                    </p>
                  </div>

                  <div className="mt-[16px]">
                    <Button variant="prominent" size="md">
                      Get your card
                    </Button>
                  </div>

                  <div className="mt-auto flex w-full max-w-[1032px] flex-col items-stretch justify-center tablet:flex-row">
                    {CARD_BUSINESS_FEATURES.map((feature, index) => (
                      <div
                        key={feature}
                        data-cb-feature-item
                        className={`flex items-center justify-center px-[24px] py-[12px] text-center tablet:w-[344px] ${
                          index < CARD_BUSINESS_FEATURES.length - 1
                            ? "border-b border-black/[0.08] tablet:border-r tablet:border-b-0"
                            : ""
                        }`}
                      >
                        <span
                          data-cb-feature
                          className="font-saans text-[18px] font-medium leading-[24px] tracking-[-0.022em] text-black/[0.6] desktop:text-[20px]"
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
