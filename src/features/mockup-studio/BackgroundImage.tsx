import type { BackgroundSettings } from "./backgrounds";

/**
 * The canvas's picture, as a layer of its own inside the frame so Zoom can
 * scale it without touching what is drawn over it.
 *
 * A real element with the image in its own `background-image`, not a CSS
 * variable: Chrome drops any custom property over about 2 MB, and a phone photo
 * as a data URL is well past that -- the picture vanished and only the colour
 * behind it was left. The host must isolate (`backgroundClass`) so the layer
 * sits above the frame's colour and under everything in it.
 */
export default function BackgroundImage({ bg }: { bg: BackgroundSettings }) {
  if (bg.kind !== "image" || !bg.imageSrc) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: -1,
        backgroundImage: `url(${bg.imageSrc})`,
        backgroundSize: bg.imageFit,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        transform: `scale(${bg.imageZoom ?? 1})`,
      }}
    />
  );
}
