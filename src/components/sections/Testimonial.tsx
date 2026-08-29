import Image from "next/image";

type TestimonialItem = {
  quote: string;
  name: string;
  role: string;
  avatarSrc: string;
  tone: "light" | "dark";
  backgroundVideoSrc?: string;
};

export type TestimonialVideoSettings = {
  scale: number;
  positionX: number;
  positionY: number;
};

export const DEFAULT_TESTIMONIAL_VIDEO_SETTINGS: TestimonialVideoSettings = {
  scale: 1,
  positionX: 29,
  positionY: 48,
};

const TESTIMONIAL_BG_VIDEO_SRC = "/figma-assets/testimonial/website-optimized.mp4?v=20260402-1710";

const TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "No delays, no hidden fees. Everything from receiving payments to managing funds is in one place",
    name: "Aditya K",
    role: "Freelance Developer",
    avatarSrc: "/images/avatars/user1.png",
    tone: "light",
  },
  {
    quote:
      "KOSH made getting paid from US clients effortless. I finally have a USD account that works like a local one",
    name: "Dalpat T",
    role: "Freelance Developer",
    avatarSrc: "/images/avatars/user2.png",
    tone: "dark",
    backgroundVideoSrc: TESTIMONIAL_BG_VIDEO_SRC,
  },
];

function TestimonialCard({
  item,
  variant,
  videoSettings = DEFAULT_TESTIMONIAL_VIDEO_SETTINGS,
}: {
  item: TestimonialItem;
  variant: "left" | "right";
  videoSettings?: TestimonialVideoSettings;
}) {
  const isLight = variant === "left";
  const showVideoBackground = !isLight && item.backgroundVideoSrc;

  return (
    <article
      className={`relative flex h-full min-h-[330px] flex-col overflow-hidden rounded-[24px] px-[var(--space-24)] py-[var(--space-24)] laptop:min-h-[420px] laptop:px-[32px] laptop:py-[32px] desktop:h-[480px] desktop:min-h-0 desktop:px-[40px] desktop:py-[40px] ${
        isLight
          ? "bg-[linear-gradient(135deg,#4F9FFE_0%,#A6CFFF_100%)] text-black"
          : "bg-white/7 text-white"
      }`}
    >
      {showVideoBackground ? (
        <>
          <div aria-hidden className="absolute inset-0 bg-[#0F0F0F]" />
          <div
            aria-hidden
            className="absolute inset-0 h-full w-full overflow-hidden"
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute left-1/2 top-1/2 h-full w-full min-h-full min-w-full object-cover"
              style={{
                width: `${videoSettings.scale * 100}%`,
                height: `${videoSettings.scale * 100}%`,
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(-${videoSettings.positionX}%, -${videoSettings.positionY}%)`,
              }}
            >
              <source src={item.backgroundVideoSrc} type="video/mp4" />
            </video>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 84% 78%, rgba(15,15,15,0) 0%, rgba(15,15,15,0.12) 24%, rgba(15,15,15,0.46) 54%, rgba(15,15,15,0.82) 78%, rgba(15,15,15,0.96) 100%),
                linear-gradient(90deg, #0F0F0F 0%, #0F0F0F 32%, rgba(15,15,15,0.92) 46%, rgba(15,15,15,0.52) 60%, rgba(15,15,15,0.16) 74%, rgba(15,15,15,0) 100%),
                linear-gradient(180deg, #0F0F0F 0%, rgba(15,15,15,0.92) 20%, rgba(15,15,15,0.28) 46%, rgba(15,15,15,0) 100%)
              `,
            }}
          />
        </>
      ) : null}

      <p
        className={`relative z-[1] text-[28px] leading-[38px] max-laptop:text-[24px] max-laptop:leading-[34px] max-laptop:font-normal ${
          variant === "right" ? "max-w-[24ch]" : "max-w-[380px]"
        } ${isLight ? "text-[var(--color-text-primary-dark)]" : "text-text-primary"}`}
      >
        {item.quote}
      </p>

      <div className="relative z-[1] mt-auto flex items-center gap-[var(--space-12)]">
        <Image
          src={item.avatarSrc}
          alt={item.name}
          width={40}
          height={40}
          className="h-[40px] w-[40px] rounded-full object-cover"
        />
        <div className="flex flex-col">
          <p className={`type-action ${isLight ? "text-[var(--color-text-primary-dark)]" : "text-text-primary"}`}>
            {item.name}
          </p>
          <p
            className={`type-micro ${
              isLight ? "text-[var(--color-text-secondary-dark)]" : "text-text-secondary"
            }`}
          >
            {item.role}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function Testimonial({
  videoSettings = DEFAULT_TESTIMONIAL_VIDEO_SETTINGS,
}: {
  videoSettings?: TestimonialVideoSettings;
}) {
  return (
    <section
      id="testimonial"
      className="w-full bg-black py-[var(--spacing-section)] desktop:pt-[112px] desktop:pb-[112px]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="flex flex-col items-center gap-[var(--space-48)] desktop:gap-[var(--space-64)]">
          <div className="max-w-[420px] text-center">
            <h2 className="type-h1 text-text-primary">
              <span className="block">What people</span>
              <span className="block">say about KOSH</span>
            </h2>
          </div>

          <div className="grid w-full grid-cols-1 gap-[8px] laptop:grid-cols-12 laptop:gap-[8px]">
            <div className="laptop:col-span-4">
              <TestimonialCard item={TESTIMONIALS[0]} variant="left" />
            </div>
            <div className="laptop:col-span-8">
              <TestimonialCard
                item={TESTIMONIALS[1]}
                variant="right"
                videoSettings={videoSettings}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
