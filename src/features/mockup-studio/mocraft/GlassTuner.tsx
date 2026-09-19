"use client";

/**
 * Live sliders for the glass every panel is made of.
 *
 * The material's numbers live in `design/system.ts` and reach the page as
 * `--mo-glass-*` variables on `:root`. Writing the same variables on the
 * document element overrides them everywhere at once -- every panel, popup,
 * the timeline, the preview card -- so a value can be judged on the real
 * interface before it is typed back into the system. Nothing is saved: a
 * reload is the system's values again.
 *
 * Portalled and placed the way `MaterialLabPanel` learned to: leva's own
 * injection opens top right, under the crafting stack, where it takes no
 * clicks.
 */

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Leva, useControls } from "leva";
import { material } from "@/design/system";

export function GlassTuner({ open }: { open: boolean }) {
  const v = useControls("Glass", {
    blur: { value: material.glass.blur, min: 0, max: 60, step: 0.5, label: "blur px" },
    veil: { value: material.glass.veil, min: 0, max: 1, step: 0.01, label: "white veil" },
    base: {
      value: material.glass.base.opacity,
      min: 0,
      max: 1,
      step: 0.01,
      label: "base opacity",
    },
    top: {
      value: material.glass.top.opacity,
      min: 0,
      max: 1,
      step: 0.01,
      label: "top opacity",
    },
    buttonBlur: {
      value: material.button.blur,
      min: 0,
      max: 60,
      step: 0.5,
      label: "button blur px",
    },
  });

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--mo-glass-blur", `${v.blur}px`);
    root.setProperty("--mo-glass-veil", String(v.veil));
    root.setProperty("--mo-glass-base-opacity", String(v.base));
    root.setProperty("--mo-glass-top-opacity", String(v.top));
    root.setProperty("--mo-btn-blur", `${v.buttonBlur}px`);
  }, [v]);

  // No body on the server; the client's first render has one.
  const onClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!onClient) return null;

  // `hidden`, never absent -- see `MaterialLabPanel`: an unrendered store
  // makes leva inject its own panel.
  return createPortal(
    <Leva
      hidden={!open}
      titleBar={{ title: "Glass", position: { x: -290, y: 60 } }}
      theme={{ sizes: { rootWidth: "260px" } }}
    />,
    document.body,
  );
}
