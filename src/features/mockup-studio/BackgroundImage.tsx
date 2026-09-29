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
export default function BackgroundImage({
  bg,
  blurPx = 0,
}: {
  bg: BackgroundSettings;
  /**
   * Depth of field's stand-in for this layer. The blur panel's own effect
   * (`DepthOfFieldLayer`) is a screen-space pass over the CANVAS's finished
   * frame -- the phone is the only opaque thing drawn into it, so a backdrop
   * sitting behind that transparent canvas, composited by the browser rather
   * than by three, was never touched by it and stayed sharp under a blurred
   * phone.
   *
   * A plain CSS blur, not the same shader: the backdrop has no depth of its
   * own to vary the amount by (it is one flat plane, further from the lens
   * than anything the phone's blur is shaped around), so there is nothing for
   * a focus region to carve a sharp area out of. Full amount everywhere is
   * the honest approximation of "behind the plane of focus."
   */
  blurPx?: number;
}) {
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
        filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
      }}
    />
  );
}
