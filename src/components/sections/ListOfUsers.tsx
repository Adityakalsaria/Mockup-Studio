"use client";

import anime from "animejs";
import { useEffect, useRef, useState } from "react";

type UserDetail = { label: string };

type UserCategory = {
  title: string;
  videoSrc: string;
  imageAlt: string;
  titleTone: string;
  bodyTone: string;
  detailGapClassName?: string;
  imageOverlayClassName?: string;
  imageClassName?: string;
  details: readonly UserDetail[];
};

const USER_CATEGORIES: UserCategory[] = [
  {
    title: "Freelancers",
    videoSrc: "/videos/list-of-users/card-1.mp4",
    imageAlt: "Freelancers and remote workers category image",
    titleTone: "text-white/60",
    bodyTone: "text-white/40",
    imageClassName: "object-cover object-center",
    details: [
      { label: "Get paid in USD" },
      { label: "Receive platform payouts" },
      { label: "Avoid high FX fees" },
    ],
  },
  {
    title: "Startups & Businesses",
    videoSrc: "/videos/list-of-users/card-2-v2.mp4",
    imageAlt: "Startups and businesses category image",
    titleTone: "text-white/60",
    bodyTone: "text-white/40",
    imageOverlayClassName:
      "bg-[linear-gradient(93.7deg,rgba(0,0,0,0)_89.8%,rgba(0,0,0,1)_105.92%),linear-gradient(257.26deg,rgba(0,0,0,0)_74.64%,rgba(0,0,0,1)_94.45%),linear-gradient(180deg,rgba(0,0,0,0)_92.5%,rgba(0,0,0,1)_100%)]",
    imageClassName: "object-cover object-center",
    details: [
      { label: "Collect global USD payments" },
      { label: "Pay vendors worldwide" },
      { label: "Hold funds in USD" },
    ],
  },
  {
    title: "Agencies & Creators",
    videoSrc: "/videos/list-of-users/card-3.mp4",
    imageAlt: "Agencies and creators category image",
    titleTone: "text-white/60",
    bodyTone: "text-white/40",
    imageOverlayClassName:
      "bg-[linear-gradient(257.26deg,rgba(0,0,0,0)_74.64%,rgba(0,0,0,1)_94.45%),linear-gradient(180deg,rgba(0,0,0,0)_70.73%,rgba(0,0,0,1)_100%)]",
    imageClassName: "object-cover object-center",
    details: [
      { label: "Bill clients in USD" },
      { label: "Receive large contract payouts" },
      { label: "Manage sponsorship payments" },
    ],
  },
  {
    title: "Exporters",
    videoSrc: "/videos/list-of-users/card-4.mp4",
    imageAlt: "Consultants and exporters category image",
    titleTone: "text-white/60",
    bodyTone: "text-white/40",
    imageOverlayClassName:
      "bg-[linear-gradient(93.7deg,rgba(0,0,0,0)_89.8%,rgba(0,0,0,1)_105.92%),linear-gradient(257.26deg,rgba(0,0,0,0)_74.64%,rgba(0,0,0,1)_94.45%),linear-gradient(180deg,rgba(0,0,0,0)_87.13%,rgba(0,0,0,1)_100%)]",
    imageClassName: "object-cover object-center",
    details: [
      { label: "Invoice clients in USD" },
      { label: "Receive ACH and wires" },
      { label: "Convert at fair rates" },
    ],
  },
];

function CategoryCard({
  title,
  videoSrc,
  imageAlt,
  titleTone,
  bodyTone,
  detailGapClassName = "gap-[16px]",
  imageOverlayClassName,
  imageClassName = "object-cover object-center",
  details,
}: UserCategory) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteractiveViewport, setIsInteractiveViewport] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const isActive = isInteractiveViewport && isHovered;
  const activeTitleTone = isActive ? "text-text-primary" : titleTone;
  const activeBodyTone = isActive ? "text-white/60" : bodyTone;
  const idleFilterClassName = isInteractiveViewport
    ? isActive
      ? "grayscale-0 saturate-100"
      : "grayscale saturate-0"
    : "grayscale-0 saturate-100";

  const setIdleFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    try {
      video.currentTime = 0.01;
    } catch {
      // Leave the browser-selected paused frame in place if the seek is blocked.
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateViewportMode = (matches: boolean) => {
      setIsInteractiveViewport(matches);
      setIsHovered(false);
      setIdleFrame();
    };

    const handleChange = (event: MediaQueryListEvent) => updateViewportMode(event.matches);

    updateViewportMode(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handlePointerEnter = async () => {
    if (!isInteractiveViewport) return;

    setIsHovered(true);

    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.readyState < 2) {
        video.load();
      }
      video.currentTime = 0;
      await video.play();
    } catch {
      setIdleFrame();
    }
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setIdleFrame();
  };

  return (
    <article
      className="group flex w-full flex-col items-center gap-[20px] text-center laptop:items-start laptop:text-left laptop:col-span-3"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className="relative aspect-square w-[60%] overflow-hidden rounded-[24px] laptop:w-full">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay={!isInteractiveViewport}
          preload="auto"
          aria-label={imageAlt}
          onLoadedData={() => {
            if (isInteractiveViewport && !isHovered) {
              setIdleFrame();
            }
          }}
          className={`absolute inset-0 h-full w-full ${imageClassName} transition-[filter,opacity] duration-300 ${idleFilterClassName}`}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        {imageOverlayClassName ? (
          <>
            <div
              aria-hidden
              className={`absolute inset-0 rounded-[24px] transition-opacity duration-300 ${
                isInteractiveViewport ? (isActive ? "opacity-35" : "opacity-100") : "opacity-0"
              } ${imageOverlayClassName}`}
            />
            <div
              aria-hidden
              className={`absolute inset-0 rounded-[24px] bg-black mix-blend-hue transition-opacity duration-300 ${
                isInteractiveViewport ? (isActive ? "opacity-0" : "opacity-100") : "opacity-0"
              }`}
            />
          </>
        ) : null}
      </div>

      <div className={`flex w-full flex-col items-center not-italic laptop:items-start ${detailGapClassName}`}>
        <h3
          className={`w-full text-[20px] font-semibold leading-[24px] text-white transition-colors duration-300 ${
            isInteractiveViewport
              ? isActive
                ? "laptop:text-text-primary"
                : "laptop:text-white/60"
              : ""
          }`}
        >
          {title}
        </h3>
        <div className="mt-[var(--space-8)] flex w-full flex-col items-center gap-[var(--space-12)] laptop:items-start">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="flex items-center gap-[var(--space-8)] transition-colors duration-300"
            >
              <span className="hidden laptop:inline-flex">
                <TickIcon active={isActive} />
              </span>
              <span className={`type-body-m transition-colors duration-300 ${activeBodyTone}`}>
                {detail.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function ListOfUsers() {
  return (
    <section
      id="list-of-users"
      className="relative w-full bg-black py-[var(--spacing-section)] desktop:pt-[112px] desktop:pb-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="flex w-full flex-col items-center gap-[72px]">
          <div className="flex w-full flex-col items-center gap-[16px] text-center">
            <h2 className="type-h1 tracking-[-0.8px] text-text-primary desktop:text-[48px] desktop:leading-[54px]">
              Built for people earning globally
            </h2>
            <p className="type-body-l text-text-secondary">
              However you earn, KOSH fits into your workflow and helps you get
              paid from US without friction.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 justify-center gap-y-[var(--space-24)] tablet:grid-cols-2 tablet:gap-x-[var(--space-24)] tablet:gap-y-[var(--space-24)] laptop:grid-cols-12 laptop:gap-x-[32px] laptop:gap-y-[32px]">
            {USER_CATEGORIES.map((category, index) => (
              <div key={category.title} className="contents">
                <CategoryCard {...category} />
                {index < USER_CATEGORIES.length - 1 ? (
                  <div
                    aria-hidden
                    className="my-[var(--space-24)] h-[1px] w-full tablet:hidden"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, var(--color-divider) 0, var(--color-divider) 4px, transparent 4px, transparent 8px)",
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TickIcon({ active }: { active: boolean }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const checkRef = useRef<SVGPathElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const circle = circleRef.current;
    const check = checkRef.current;
    if (!circle || !check) return;

    if (active) {
      hasAnimated.current = true;
      anime.remove(circle);
      anime.remove(check);

      anime({
        targets: circle,
        r: [2, 10],
        fill: ["rgba(255,255,255,0.3)", "#389BFF"],
        duration: 400,
        easing: "easeOutCubic",
      });
      anime({
        targets: check,
        opacity: [0, 1],
        duration: 250,
        delay: 200,
        easing: "easeOutCubic",
      });
    } else if (hasAnimated.current) {
      anime.remove(circle);
      anime.remove(check);

      anime({
        targets: check,
        opacity: [1, 0],
        duration: 200,
        easing: "easeOutCubic",
      });
      anime({
        targets: circle,
        r: [10, 2],
        fill: ["#389BFF", "rgba(255,255,255,0.3)"],
        duration: 300,
        delay: 100,
        easing: "easeOutCubic",
      });
    }
  }, [active]);

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <circle ref={circleRef} cx="10" cy="10" r="2" fill="rgba(255,255,255,0.3)" />
      <path
        ref={checkRef}
        d="M15.343 7.04102L8.93433 14.873L4.84375 11.6016L6.40625 9.64844L8.56567 11.3757L13.407 5.45898L15.343 7.04102Z"
        fill="white"
        opacity="0"
      />
    </svg>
  );
}
