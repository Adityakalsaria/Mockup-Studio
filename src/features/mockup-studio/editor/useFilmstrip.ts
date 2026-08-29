"use client";

import { useEffect, useState } from "react";

/**
 * Thumbnails of the screen video, laid out along the timeline.
 *
 * Extraction runs against its OWN hidden `<video>` built from the same source
 * rather than the one feeding the texture. Seeking is how you get a frame out
 * of a video element, and seeking the live one would drag the phone's screen
 * around every time the strip rebuilt — the preview would jump about while
 * the timeline quietly redrew itself.
 *
 * The clip is sampled evenly across its OWN length, and the duration comes
 * back with the frames. The timeline draws them inside a bar as wide as the
 * clip really is, and repeats that bar where the clip loops — so the strip
 * says how long the video is, which a run of thumbnails stretched edge to
 * edge cannot.
 */

export interface Filmstrip {
  frames: string[];
  /** Seconds. 0 until the metadata has loaded. */
  duration: number;
}
export function useFilmstrip(src: string | null, count: number): Filmstrip {
  // Stamped with the source they came from, so a strip from the previous
  // clip is never shown against the new one while the new one extracts. The
  // alternative — clearing state as the effect starts — is a synchronous
  // setState inside an effect, which is a cascading render.
  const [result, setResult] = useState<
    { src: string; frames: string[]; duration: number } | null
  >(null);

  useEffect(() => {
    if (!src || count <= 0) return;

    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const seek = (time: number) =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          video.removeEventListener("seeked", finish);
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(finish, 800);
        video.addEventListener("seeked", finish);
        video.currentTime = time;
      });

    const run = async () => {
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) resolve();
        else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
      if (cancelled) return;

      const clip = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
      // Short and wide: a filmstrip cell only has to say "this bit", and the
      // lane it sits in is 34px tall.
      const height = 48;
      const width = Math.max(
        8,
        Math.round((video.videoWidth / Math.max(1, video.videoHeight)) * height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const out: string[] = [];
      for (let i = 0; i < count; i++) {
        if (cancelled) return;
        // Mid-cell rather than at its left edge: a thumbnail should show what
        // the clip looks like across the slice it occupies, not the instant
        // it begins.
        await seek(((i + 0.5) / count) * clip);
        if (cancelled) return;
        ctx.drawImage(video, 0, 0, width, height);
        // JPEG, not PNG: this is a row of tiny photographs, and a dozen
        // lossless ones is a surprising amount of memory for a strip.
        out.push(canvas.toDataURL("image/jpeg", 0.6));
      }
      if (!cancelled) setResult({ src, frames: out, duration: clip });
    };

    void run().catch(() => {
      if (!cancelled) setResult({ src, frames: [], duration: 0 });
    });

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, count]);

  return result?.src === src ? result : EMPTY;
}

/** Stable identity, so a consumer memoising on it does not rerun each render. */
const EMPTY: Filmstrip = { frames: [], duration: 0 };
