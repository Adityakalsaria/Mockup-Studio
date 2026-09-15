"use client";

/**
 * A live bench for the iPhone 18's surface — the SCENE half.
 *
 * The sliders are in `MaterialLabPanel`, which is DOM. They have to be: leva
 * renders a panel, and a leva hook called inside the `<Canvas>` is running in
 * the three.js reconciler, where there is no DOM to render it into. That is
 * why the first version showed nothing at all.
 *
 * These numbers cannot be derived. Anodised aluminium is a look you recognise
 * rather than a value you compute, and the loop for finding it — edit a device
 * entry, reload, screenshot, compare against Apple's render — is slow enough
 * that it discourages the small adjustments that actually settle it. This
 * panel makes it a drag.
 *
 * It writes STRAIGHT ONTO THE LIVE MATERIALS, after the retint has run, which
 * is the only place these can be set. `materialColors` in the device registry
 * looks like the natural home and is not: it is an override list, and putting
 * a body material in it takes that material out of the finish path altogether
 * — the symptom being a phone that renders grey no matter which colour is
 * chosen. The 17 Pro's entry only ever lists non-body materials there, and
 * that is why.
 *
 * So the values found here belong in `finishes.ts` (roughness and metalness,
 * which travel with a colour) rather than in the device — and the back panel's
 * darkening has nowhere to go yet at all. Read the numbers off, then decide
 * where they live.
 */

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { subscribeSurface, surfaceValues } from "./materialLabStore";

/** The chassis, the shell, the panel under the back glass, and the logo. */
const BODY = ["vUgmkmbQjXTaqEc", "DodbyqhrrBLNbcB"];
const PANEL = ["WElbLmMkunjUugH"];
const LOGO = ["yPeTOPaiWwFMSdb"];
const GLASS = ["IxiedJEUxrDhLIX"];

type Surface = {
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  color?: { multiplyScalar: (n: number) => void; clone: () => unknown };
};

export function MaterialLab({
  active,
  body = BODY,
  panel = PANEL,
  glass = GLASS,
  antenna = [],
}: {
  active: boolean;
  /** Material names per folder; the iPhone 18's when not given. */
  body?: string[];
  panel?: string[];
  glass?: string[];
  antenna?: string[];
}) {
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  /* The colour each material was first seen with. Darkening multiplies, so
     re-applying it to an already-darkened colour compounds — three nudges of
     the slider and the panel is black. */
  const originals = useRef(new WeakMap<object, { clone: () => unknown }>());

  useEffect(() => {
    if (!active) return;

    const paint = (
      material: Surface,
      spec: Partial<Surface> & { darken?: number },
    ) => {
      if (spec.roughness !== undefined && "roughness" in material) {
        material.roughness = spec.roughness;
      }
      if (spec.metalness !== undefined && "metalness" in material) {
        material.metalness = spec.metalness;
      }
      if (spec.envMapIntensity !== undefined && "envMapIntensity" in material) {
        material.envMapIntensity = spec.envMapIntensity;
      }
      if (spec.darken !== undefined && material.color) {
        const store = originals.current;
        if (!store.has(material))
          store.set(material, material.color.clone() as never);
        const base = store.get(material) as { clone: () => unknown };
        const next = base.clone() as { multiplyScalar: (n: number) => void };
        next.multiplyScalar(1 - spec.darken);
        (material as { color: unknown }).color = next;
      }
    };

    const apply = () => {
      scene.traverse((object) => {
        const mesh = object as { isMesh?: boolean; material?: unknown };
        if (!mesh.isMesh) return;
        const list = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const one of list) {
          const material = one as Surface & { name?: string };
          const name = material?.name;
          if (!name) continue;
          if (body.includes(name)) {
            paint(material, {
              roughness: surfaceValues.bodyRoughness,
              metalness: surfaceValues.bodyMetalness,
              envMapIntensity: surfaceValues.bodyEnv,
            });
          } else if (panel.includes(name)) {
            paint(material, {
              darken: surfaceValues.panelDarken,
              roughness: surfaceValues.panelRoughness,
              metalness: surfaceValues.panelMetalness,
              envMapIntensity: surfaceValues.panelEnv,
            });
          } else if (LOGO.includes(name)) {
            paint(material, {
              roughness: surfaceValues.logoRoughness,
              metalness: surfaceValues.logoMetalness,
            });
          } else if (antenna.includes(name)) {
            paint(material, {
              roughness: surfaceValues.antennaRoughness,
              metalness: surfaceValues.antennaMetalness,
            });
          } else if (glass.includes(name)) {
            paint(material, {
              roughness: surfaceValues.glassRoughness,
              metalness: surfaceValues.glassMetalness,
              envMapIntensity: surfaceValues.glassEnv,
            });
          } else if (surfaceValues.restOn) {
            paint(material, {
              roughness: surfaceValues.restRoughness,
              metalness: surfaceValues.restMetalness,
              envMapIntensity: surfaceValues.restEnv,
            });
          }
        }
      });
      // The canvas is a demand loop; a slider moving is not a frame request.
      invalidate();
    };

    apply();
    return subscribeSurface(apply);
  }, [active, scene, invalidate, body, panel, glass, antenna]);

  return null;
}
