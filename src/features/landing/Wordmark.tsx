/**
 * The Mocraft wordmark as an alpha mask filled with the current text colour,
 * the same way the studio chrome paints it, so it follows whatever ground it
 * sits on.
 */
export function Wordmark({ width = 96 }: { width?: number }) {
  return (
    <span
      role="img"
      aria-label="Mocraft"
      className="block"
      style={{
        width,
        height: Math.round((width * 82) / 220),
        background: "currentColor",
        maskImage: "url(/figma-assets/mockup-studio/wordmark.png)",
        WebkitMaskImage: "url(/figma-assets/mockup-studio/wordmark.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "left center",
        WebkitMaskPosition: "left center",
      }}
    />
  );
}
