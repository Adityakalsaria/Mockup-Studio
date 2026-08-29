"use client";

import Button from "@/components/ui/Button";
import ReferralBackground from "@/components/referral/ReferralBackground";
import ReferralBadge from "@/components/referral/ReferralBadge";
import ReferralHeroImages from "@/components/referral/ReferralHeroImages";

export default function ReferralLandingPage({ code }: { code: string }) {
  return (
    <main className="relative h-[100svh] min-h-[100svh] w-full overflow-hidden bg-black">
      <ReferralBackground />
      <ReferralHeroImages />

      <div className="absolute inset-x-0 bottom-0 z-[var(--z-above)] h-[var(--space-160)] bg-gradient-to-t from-black to-transparent">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-[var(--material-glass-blur)] [mask-image:linear-gradient(to_top,black,transparent)]" />
      </div>

      <div
        className="absolute left-1/2 z-[var(--z-above)] -translate-x-1/2 top-[var(--space-48)]"
      >
        {/* KOSH logo */}
        <div className="relative h-[32px] w-[140px]">
          <div className="absolute top-1/2 left-[2.86%] right-[80%] aspect-square -translate-y-1/2">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 7.82554L8.00011 15.9731V0H0V7.82554Z" fill="white" />
              <path
                d="M7.99978 16.0629L24 8.00235V0.00290469H15.9999L7.99978 16.0629Z"
                fill="white"
              />
              <path d="M15.9999 24H24V16.0006H7.99978L15.9999 24Z" fill="white" />
              <path d="M0 24H8.00011L7.99978 16.0006H0V24Z" fill="white" />
            </svg>
          </div>
          <div className="absolute top-1/2 left-[28.57%] right-[2.86%] -translate-y-1/2">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 96.0171 24.5625"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 24.2959V0.266622H5.17608V9.86499L13.6582 0.266622H20.6041L9.70416 12.2646L21.4056 24.2959H14.7602L5.17608 15.0114V24.2959H0Z"
                fill="white"
              />
              <path
                d="M34.9286 24.5625C33.1476 24.5625 31.5002 24.2626 29.9863 23.6627C28.4947 23.0405 27.1923 22.174 26.0792 21.0631C24.9661 19.9522 24.0978 18.6524 23.4745 17.1638C22.8734 15.6529 22.5728 14.0198 22.5728 12.2646C22.5728 10.5093 22.8734 8.88738 23.4745 7.39874C24.0978 5.91011 24.9661 4.61033 26.0792 3.49941C27.1923 2.38848 28.4947 1.53307 29.9863 0.933175C31.5002 0.311058 33.1476 0 34.9286 0C36.6874 0 38.3126 0.311058 39.8042 0.933175C41.2958 1.53307 42.587 2.38848 43.6779 3.49941C44.791 4.58811 45.6481 5.87678 46.2492 7.36542C46.8726 8.85405 47.1842 10.4871 47.1842 12.2646C47.1842 14.0421 46.8726 15.6862 46.2492 17.1971C45.6481 18.6857 44.791 19.9855 43.6779 21.0964C42.587 22.1851 41.2958 23.0405 39.8042 23.6627C38.3126 24.2626 36.6874 24.5625 34.9286 24.5625ZM34.8952 20.0299C36.2533 20.0299 37.4554 19.6967 38.5018 19.0301C39.5704 18.3413 40.4053 17.4193 41.0063 16.2639C41.6074 15.0863 41.908 13.7532 41.908 12.2646C41.908 10.7759 41.6074 9.45395 41.0063 8.29859C40.4053 7.12101 39.5704 6.19895 38.5018 5.5324C37.4554 4.84362 36.2533 4.49924 34.8952 4.49924C33.5149 4.49924 32.2905 4.84362 31.2219 5.5324C30.1755 6.19895 29.3518 7.12101 28.7507 8.29859C28.1496 9.45395 27.8491 10.7759 27.8491 12.2646C27.8491 13.7532 28.1496 15.0863 28.7507 16.2639C29.3518 17.4193 30.1755 18.3413 31.2219 19.0301C32.2905 19.6967 33.5149 20.0299 34.8952 20.0299Z"
                fill="white"
              />
              <path
                d="M61.1077 24.5292C59.2599 24.5292 57.6236 24.1737 56.1988 23.4627C54.774 22.7517 53.6386 21.7519 52.7926 20.4632C51.9689 19.1745 51.5125 17.6637 51.4235 15.9306H56.4994C56.6107 17.086 57.1005 18.0636 57.9687 18.8635C58.8369 19.6411 59.8833 20.0299 61.1077 20.0299C62.2209 20.0299 63.1114 19.7966 63.7793 19.3301C64.4694 18.8412 64.8145 18.208 64.8145 17.4304C64.8145 16.7416 64.5696 16.1973 64.0798 15.7973C63.59 15.3752 62.9778 15.053 62.2431 14.8308L58.6366 13.831C57.5012 13.5199 56.4548 13.0978 55.4975 12.5645C54.5402 12.0091 53.7722 11.2648 53.1933 10.3316C52.6145 9.39841 52.3251 8.1875 52.3251 6.69886C52.3251 5.38798 52.6924 4.23262 53.4271 3.23279C54.1618 2.23295 55.1636 1.4442 56.4326 0.86652C57.7238 0.28884 59.1931 0 60.8406 0C62.5993 0 64.1466 0.299949 65.4824 0.899848C66.8181 1.49975 67.8756 2.35516 68.6548 3.46608C69.4563 4.55478 69.8904 5.85456 69.9572 7.36542H64.8813C64.7477 6.63221 64.3358 5.97676 63.6457 5.39908C62.9555 4.79919 62.0205 4.49924 60.8406 4.49924C59.8388 4.49924 59.0484 4.68809 58.4696 5.06581C57.913 5.44352 57.6348 5.97676 57.6348 6.66553C57.6348 7.28765 57.8463 7.76535 58.2693 8.09863C58.7145 8.4319 59.2822 8.69852 59.9723 8.89849L63.6123 9.89832C64.77 10.2316 65.8386 10.6649 66.8181 11.1981C67.7977 11.7313 68.588 12.4757 69.1891 13.4311C69.7902 14.3864 70.0907 15.6751 70.0907 17.2971C70.0907 18.7413 69.7123 20.0077 68.9553 21.0964C68.2207 22.1851 67.1855 23.0294 65.8497 23.6293C64.5139 24.2292 62.9333 24.5292 61.1077 24.5292Z"
                fill="white"
              />
              <path
                d="M90.841 9.6317V0.266622H96.0171V24.2959H90.841V14.1309H80.9897V24.2959H75.8137V0.266622H80.9897V9.6317H90.841Z"
                fill="white"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 z-[var(--z-above)] flex w-[400px] max-w-[calc(100%-var(--space-32))] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[var(--space-24)] rounded-[var(--radius-lg)] bg-black p-[var(--space-24)] tablet:max-w-[calc(100%-var(--space-48))]">
        <div className="flex w-full flex-col items-center gap-[var(--space-16)]">
          <h1 className="type-h4 text-center text-text-primary">
            You&apos;ve been invited!
          </h1>
          <ReferralBadge code={code} />
          <p className="type-body-m text-center text-text-muted">
            Enter your code to <span className="referral-shine">get $10</span> in your KOSH account to save fees on your next transaction.
          </p>
        </div>

        <div className="flex w-full flex-col gap-[var(--space-12)]">
          <Button
            href="https://testflight.apple.com/join/qJPVHJKq"
            variant="primary"
            size="md"
            className="flex w-full justify-center rounded-[var(--radius-pill)] px-[var(--space-16)]"
          >
            Download for iOS - Testflight
          </Button>
          <Button
            href="https://play.google.com/store/apps/details?id=com.koshmoney.app&hl=en_US"
            variant="primary"
            size="md"
            className="flex w-full justify-center rounded-[var(--radius-pill)] px-[var(--space-16)]"
          >
            Download for Android
          </Button>
        </div>
      </div>
    </main>
  );
}
