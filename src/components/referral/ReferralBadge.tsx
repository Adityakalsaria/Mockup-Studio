"use client";

import { useCallback, useState } from "react";

export default function ReferralBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        // Clipboard not available
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const codeStyle: React.CSSProperties = {
    WebkitTextFillColor: "transparent",
    transform: copied ? "translateY(-100%)" : "translateY(0)",
    opacity: copied ? 0 : 1,
    transition:
      "transform var(--duration-slow) var(--ease-in-out), opacity var(--duration-slow) var(--ease-in-out)",
  };

  const copiedTextStyle: React.CSSProperties = {
    color: "var(--color-accent)",
    WebkitTextFillColor: "var(--color-accent)",
    transform: copied ? "translateY(-100%)" : "translateY(0)",
    opacity: copied ? 1 : 0,
    transition:
      "transform var(--duration-slow) var(--ease-in-out), opacity var(--duration-slow) var(--ease-in-out)",
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className="flex w-full cursor-pointer items-center justify-center rounded-[var(--radius-lg)] bg-[var(--material-glass-surface-dark)] px-0 py-[var(--space-32)] backdrop-blur-[var(--material-glass-blur)]"
      style={{
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: "transform var(--duration-fast) var(--ease-in-out)",
      }}
      aria-label={copied ? "Copied to clipboard" : `Copy referral code ${code}`}
    >
      <div className="flex items-center gap-[var(--space-8)]">
        <div
          className="relative overflow-hidden"
          style={{ height: "var(--line-height-h3)" }}
        >
          <span
            className="block type-h3 bg-gradient-to-b from-white to-text-secondary bg-clip-text"
            style={codeStyle}
          >
            {code}
          </span>
          <span className="block type-h3" style={copiedTextStyle}>
            Copied!
          </span>
        </div>
        <div
          style={{
            opacity: copied ? 0 : 1,
            width: copied ? 0 : 24,
            transform: copied ? "scale(0.5)" : "scale(1)",
            overflow: "hidden",
            transition:
              "opacity var(--duration-slow) var(--ease-in-out), transform var(--duration-slow) var(--ease-in-out), width var(--duration-slow) var(--ease-in-out)",
          }}
        >
          {/* Copy icon */}
          <div className="relative h-6 w-6 shrink-0 overflow-hidden">
            <svg
              className="absolute"
              style={{ left: "3.38px", top: "1.88px", width: "17.25px", height: "20.25px" }}
              viewBox="0 0 17.25 20.25"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="referral-copy-icon-gradient"
                  x1="8.625"
                  y1="0"
                  x2="8.625"
                  y2="20.25"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="white" />
                  <stop offset="1" stopColor="white" stopOpacity="0.56" />
                </linearGradient>
              </defs>
              <path
                d="M15.1709 1.96875H17.25V15.75H12.75V20.25H0V4.5H4.5V0H15.1709V1.96875ZM2.25 6.75V18H10.5V15.75H4.5V6.75H2.25ZM6.75 13.5H15V2.25H6.75V13.5Z"
                fill="url(#referral-copy-icon-gradient)"
              />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
