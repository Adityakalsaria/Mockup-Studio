"use client";

import { useEffect, useRef, useState } from "react";
import { toCanvas } from "html-to-image";
import {
  CanvasTexture,
  LinearFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  VideoTexture,
} from "three";

/** Data URLs carry their type in the prefix; plain paths only have a suffix. */
export function isVideoSource(src: string): boolean {
  return src.startsWith("data:video/") || /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(src);
}

/**
 * Rasterises the phone's screen DOM into a texture for the 3D scene.
 *
 * The screen used to be a drei `<Html transform>` overlay — real DOM floating
 * in front of the WebGL canvas. That is what forced `preserveDrawingBuffer`,
 * forced export through `html-to-image` (and with it the SVG-disappears bug),
 * and made depth of field impossible, since a post-processing pass cannot
 * touch DOM.
 *
 * So the DOM still renders — off-screen, once — and what goes into the scene
 * is a texture of it.
 *
 * Recapture is driven by a MutationObserver rather than a dependency key. The
 * screen is assembled from dozens of pieces of client state (screen id, blur,
 * corner radius, account fields, edge insets, presets...), and any hand-written
 * key would eventually miss one and leave the phone showing a stale screen.
 * Watching the DOM itself cannot drift out of sync with what the DOM says.
 */
export function useScreenTexture(
  sourceRef: React.RefObject<HTMLElement | null>,
  /**
   * An image OR video to use as the screen directly — an upload or a preset.
   *
   * This is the fast path and the one that matters: an image IS a texture, so
   * it loads straight onto the mesh with no rasterising, no `html-to-image`,
   * and none of its failure modes. A video is the same trick one step on,
   * with the element feeding new frames in. Only the built-in React screens
   * need the DOM capture below.
   */
  directSrc?: string | null,
  /** Multiplier on the source's CSS size. 2 keeps text crisp when the phone
      fills a large viewport without the memory cost of 3. */
  pixelRatio = 2,
  /**
   * Whether a video source starts playing on its own.
   *
   * The editor says no, because there the TIMELINE owns the playhead: the
   * clip has to sit on the frame the playhead is pointing at, or a keyframe
   * cannot be placed against anything you can see. Left to autoplay it just
   * loops in the background, unrelated to the timeline and impossible to key
   * against.
   */
  autoPlay = true,
): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);
  // The texture currently in the scene, so a superseded capture is disposed
  // rather than leaking a GPU allocation per screen change.
  const liveRef = useRef<Texture | null>(null);

  // ── Video source: a moving screen ───────────────────────────────────────
  //
  // A VideoTexture is just a texture whose image is a <video>; three re-uploads
  // it as the element advances. The element is never added to the document —
  // it exists to decode frames, and `playsInline` + `muted` are what let it
  // autoplay at all, since every browser blocks audible autoplay.
  useEffect(() => {
    if (!directSrc || !isVideoSource(directSrc)) return;

    const video = document.createElement("video");
    video.src = directSrc;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";

    const texture = new VideoTexture(video);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;

    liveRef.current?.dispose();
    liveRef.current = texture;
    setTexture(texture);

    if (autoPlay) {
      void video.play().catch((error) => {
        console.warn("koshstudio: screen video failed to play", error);
      });
    }

    return () => {
      video.pause();
      // Dropping the src is what actually releases the decoder; leaving it
      // set keeps a paused video pipeline alive per upload.
      video.removeAttribute("src");
      video.load();
      texture.dispose();
      if (liveRef.current === texture) liveRef.current = null;
    };
  }, [directSrc, autoPlay]);

  // ── Fast path: an image source loads straight onto the mesh ──────────────
  useEffect(() => {
    if (!directSrc || isVideoSource(directSrc)) return;
    let cancelled = false;

    new TextureLoader().loadAsync(directSrc).then(
      (loaded) => {
        if (cancelled) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = SRGBColorSpace;
        loaded.minFilter = LinearFilter;
        loaded.magFilter = LinearFilter;
        loaded.anisotropy = 4;

        // Fitting happens in ScreenPlane, not here: only the mesh knows the
        // aspect the texture actually lands on, and it comes from the model's
        // measured screen rather than the size the React tree is authored at.
        loaded.needsUpdate = true;

        liveRef.current?.dispose();
        liveRef.current = loaded;
        setTexture(loaded);
      },
      (error) => {
        console.warn("koshstudio: screen image failed to load", error);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [directSrc]);

  // ── Slow path: rasterise the built-in React screens ─────────────────────
  useEffect(() => {
    // Any direct source wins; there is nothing to capture.
    if (directSrc) return;
    const el = sourceRef.current;
    if (!el) return;

    let disposed = false;
    let timer: number | undefined;
    // Bumped per scheduled capture so a slow one that resolves after a newer
    // one has already landed discards itself instead of overwriting it.
    let run = 0;

    const capture = async () => {
      const mine = ++run;
      try {
        // Fonts and images matter more here than in a normal render: a capture
        // taken before they resolve bakes the fallback into the texture
        // permanently, because nothing redraws it afterwards.
        await (document.fonts?.ready ?? Promise.resolve());
        await Promise.all(
          Array.from(el.querySelectorAll("img")).map((img) =>
            img.complete ? Promise.resolve() : img.decode().catch(() => {}),
          ),
        );
        if (disposed || mine !== run) return;

        const canvas = await toCanvas(el, { pixelRatio, cacheBust: false });
        if (disposed || mine !== run) return;
        // An empty host rasterises to a zero-sized canvas. Uploading that as
        // a texture is a WebGL error (`glTexStorage2D: dimensions must all be
        // greater than zero`) and it binds a sampler that reads black, so the
        // screen would be driven by a texture that does not exist. No texture
        // is the honest answer, and it lets the renderer show the screen off.
        if (!canvas.width || !canvas.height) {
          liveRef.current?.dispose();
          liveRef.current = null;
          setTexture(null);
          return;
        }

        const next = new CanvasTexture(canvas);
        next.colorSpace = SRGBColorSpace;
        // The plane is almost always drawn smaller than the capture, so
        // minification is the filter that decides how the UI reads.
        next.minFilter = LinearFilter;
        next.magFilter = LinearFilter;
        next.anisotropy = 4;
        next.needsUpdate = true;

        liveRef.current?.dispose();
        liveRef.current = next;
        setTexture(next);
      } catch (error) {
        // A failed capture leaves the previous texture in place, which reads as
        // "the screen did not change" rather than as a black phone — but it
        // must not be silent, or a blank phone looks like a placement bug.
        console.warn("koshstudio: screen capture failed", error);
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      // Long enough to collapse a burst of edits (dragging a slider mutates
      // style on every frame) into one capture; short enough to feel immediate.
      timer = window.setTimeout(capture, 120);
    };

    capture();

    const observer = new MutationObserver(schedule);
    observer.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [sourceRef, directSrc, pixelRatio]);

  // Dispose on unmount only — the effect above handles replacement.
  useEffect(() => {
    return () => {
      liveRef.current?.dispose();
      liveRef.current = null;
    };
  }, []);

  return texture;
}
