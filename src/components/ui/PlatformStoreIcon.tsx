"use client";

import { useEffect, useState } from "react";

export function IosIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16.4697 11.5089C16.4778 10.8956 16.6447 10.2943 16.9548 9.76093C17.2648 9.22753 17.7081 8.77938 18.2433 8.45816C17.9033 7.98413 17.4548 7.59402 16.9334 7.31881C16.4119 7.04361 15.832 6.89089 15.2395 6.8728C13.9757 6.74328 12.7506 7.6111 12.1066 7.6111C11.4501 7.6111 10.4586 6.88566 9.39082 6.9071C8.70018 6.92888 8.02711 7.12496 7.43716 7.47621C6.84722 7.82747 6.36054 8.32193 6.02453 8.91142C4.56905 11.3717 5.65471 14.9875 7.04896 16.9762C7.74654 17.95 8.56181 19.0377 9.62858 18.9992C10.6725 18.9569 11.0623 18.3493 12.3224 18.3493C13.5708 18.3493 13.9366 18.9992 15.025 18.9746C16.1451 18.9569 16.8509 17.9965 17.524 17.0135C18.0252 16.3196 18.4109 15.5527 18.6667 14.7412C18.0159 14.4725 17.4606 14.0227 17.0699 13.4479C16.6792 12.8731 16.4705 12.1987 16.4697 11.5089Z"
        fill="currentColor"
      />
      <path
        d="M14.4139 5.56476C15.0247 4.84895 15.3256 3.9289 15.2527 3C14.3196 3.09568 13.4577 3.53106 12.8387 4.21941C12.536 4.55568 12.3042 4.94689 12.1566 5.37067C12.0089 5.79446 11.9482 6.24251 11.9779 6.68921C12.4447 6.6939 12.9064 6.59514 13.3283 6.40036C13.7503 6.20559 14.1215 5.91988 14.4139 5.56476Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12.0695 11.6113L6.34448 17.8249C6.34502 17.826 6.34502 17.8277 6.34556 17.8288C6.52139 18.5035 7.12363 19 7.83879 19C8.12485 19 8.39317 18.9208 8.62331 18.7823L8.6416 18.7713L15.0856 14.9689L12.0695 11.6113Z"
        fill="#EA4335"
      />
      <path
        d="M17.8612 10.5532L17.8558 10.5494L15.0737 8.90028L11.9393 11.7525L15.085 14.9681L17.852 13.3356C18.337 13.0672 18.6667 12.5443 18.6667 11.9416C18.6667 11.3423 18.3419 10.8221 17.8612 10.5532Z"
        fill="#FBBC04"
      />
      <path
        d="M6.34432 6.03193C6.30991 6.1617 6.29163 6.29807 6.29163 6.43883V17.4187C6.29163 17.5595 6.30991 17.6959 6.34486 17.8251L12.2662 11.7704L6.34432 6.03193Z"
        fill="#4285F4"
      />
      <path
        d="M12.1118 11.9285L15.0746 8.89921L8.63812 5.08309C8.40422 4.93957 8.13106 4.85709 7.83908 4.85709C7.12392 4.85709 6.52061 5.35473 6.34478 6.02997C6.34478 6.03052 6.34424 6.03107 6.34424 6.03162L12.1118 11.9285Z"
        fill="#34A853"
      />
    </svg>
  );
}

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export default function PlatformStoreIcon() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [activeIcon, setActiveIcon] = useState<"ios" | "android">("ios");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    if (platform !== "desktop") return;
    const interval = setInterval(() => {
      setActiveIcon((prev) => (prev === "ios" ? "android" : "ios"));
      setCycle((c) => c + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [platform]);

  if (platform === "ios") return <IosIcon />;
  if (platform === "android") return <AndroidIcon />;

  return (
    <span className="relative inline-flex size-[24px] overflow-hidden">
      <span
        key={`ios-${cycle}`}
        className="absolute inset-0"
        style={{
          animation: `${activeIcon === "ios" ? "iconSlideIn" : "iconSlideOut"} 500ms var(--ease-out) forwards`,
        }}
      >
        <IosIcon />
      </span>
      <span
        key={`android-${cycle}`}
        className="absolute inset-0"
        style={{
          animation: `${activeIcon === "android" ? "iconSlideIn" : "iconSlideOut"} 500ms var(--ease-out) forwards`,
        }}
      >
        <AndroidIcon />
      </span>
    </span>
  );
}
