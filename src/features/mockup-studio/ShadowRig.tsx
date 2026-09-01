"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { DirectionalLight } from "three";
import type { ShadowSettings } from "./shadow";

/**
 * One light that casts, and a backdrop that catches.
 *
 * The environment map does the lighting; it cannot cast, because an image has
 * no direction. This adds the one directional light the scene needs for a
 * shadow and nothing else -- its `intensity` is near zero, so it contributes
 * essentially no light of its own and the finish stays exactly as lit as it
 * was. All it is here to do is throw a shape.
 *
 * The catcher uses `ShadowMaterial`, which is transparent everywhere except
 * where a shadow lands. Over a transparent canvas that leaves the 2D
 * background untouched and composites the shadow onto it, so the shadow falls
 * on whatever the background happens to be -- colour, gradient or image --
 * without the plane itself ever being visible.
 */

/**
 * How far behind the phone the backdrop sits, in scene units.
 *
 * This has to be small, and the reason is perspective rather than taste. The
 * camera is 1.8 units from the phone, so a backdrop 0.9 units behind it is at
 * 2.7 -- and the shadow, being further away, renders at 1.8/2.7 = 67% of the
 * phone's apparent size. It reads as a small shadow belonging to a smaller
 * phone somewhere in the distance, which is exactly what it is. At 0.14 the
 * shadow renders at 93%, close enough to the phone's own size to read as its
 * shadow rather than as another object.
 */
const BACKDROP_Z = -0.14;
/** Roughly the phone's own size in scene units: normalised to one unit tall,
    about half that wide, and a slim slab through. */
const PHONE_H = 1;
const PHONE_W = 0.5;
const PHONE_D = 0.075;
/** Kept between the phone's rearmost point and the backdrop. Small, because
    every unit of it costs apparent shadow size to perspective. */
const BACKDROP_MARGIN = 0.06;

/**
 * How far behind its own centre the phone reaches at a given tilt.
 *
 * A flat phone reaches back by half its thickness and no more, which is why a
 * backdrop at 0.14 was fine head on. Tilt it and the far edge swings back:
 * past about 11 degrees it crosses the backdrop, and from then on the plane --
 * and the shadow drawn on it -- renders IN FRONT of part of the phone. That is
 * the shadow appearing to lie across the screen.
 */
function rearReach(rotateXDeg: number, rotateYDeg: number): number {
  const rx = (rotateXDeg * Math.PI) / 180;
  const ry = (rotateYDeg * Math.PI) / 180;
  return (
    (PHONE_H / 2) * Math.abs(Math.sin(rx)) +
    (PHONE_W / 2) * Math.abs(Math.sin(ry)) +
    (PHONE_D / 2)
  );
}
/** Big enough to cover the frame at any zoom; it costs nothing, being a
    single unlit quad that draws only where the shadow is. */
const BACKDROP_SIZE = 12;
/**
 * The light's distance along +Z, and how much the throw slider leans it off
 * axis.
 *
 * The shadow's offset is `(lightXY / LIGHT_Z) * backdropGap`, so shrinking the
 * gap above to fix the size also shrank the offset to nothing. THROW_GAIN puts
 * the range back: the light leans much further off axis to buy the same
 * displacement over a much shorter distance. The shadow is a translation
 * either way -- the phone is a flat slab and the backdrop is parallel to it,
 * so a steeper light moves the shadow without distorting its shape.
 */
const LIGHT_Z = 1;
const THROW_GAIN = 1.6;
/** Half-width of the shadow camera with the light head on; scaled by the
    light's obliquity below. Sized to the phone, not to the backdrop: a camera
    wide enough for a 12 unit plane would spend its whole map on empty space. */
const SHADOW_EXTENT = 1.15;

export function ShadowRig({
  settings,
  rotateX = 0,
  rotateY = 0,
}: {
  settings: ShadowSettings;
  /** The phone's current tilt, in degrees. The backdrop has to stay behind it. */
  rotateX?: number;
  rotateY?: number;
}) {
  const lightRef = useRef<DirectionalLight>(null);
  const invalidate = useThree((state) => state.invalidate);

  const theta = (settings.angle * Math.PI) / 180;
  /*
   * The backdrop tracks the phone rather than sitting at a fixed depth.
   *
   * Fixed at 0.14 it was close enough to keep the shadow near the phone's own
   * apparent size, which is what a distant backdrop loses to perspective -- but
   * only while the phone was flat. It is placed just behind whatever the
   * current tilt actually reaches now, so it can never cut through the phone,
   * and it stays as close as that allows so the shadow keeps its size.
   */
  const backdropZ = Math.min(BACKDROP_Z, -(rearReach(rotateX, rotateY) + BACKDROP_MARGIN));

  const lean = settings.throwDistance * THROW_GAIN;
  /*
   * The shadow camera has to grow as the light leans.
   *
   * It was fixed at +/-1.1, which held while the light was near head on. Push
   * Distance up and the light reaches 72 degrees off axis, where a phone's
   * shadow stretches by 1/cos of that -- 3.35x -- and ran straight off the
   * edge of the map. The result was not a soft shadow fading out but a hard
   * straight cut across it, which is the frustum boundary itself. It showed up
   * on a wide lens because that is when enough of the scene is in frame to see
   * where the shadow stops.
   *
   * hypot(lean, LIGHT_Z) / LIGHT_Z is exactly that 1/cos, so this is the
   * smallest camera that always contains the shadow it is asked to draw.
   */
  const shadowHalf = SHADOW_EXTENT * (Math.hypot(lean, LIGHT_Z) / LIGHT_Z);
  const x = Math.sin(theta) * lean;
  const y = Math.cos(theta) * lean;

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    // Radius and sample count are not reactive props in r3f -- they live on
    // the shadow object, so they are set imperatively and the frame is
    // requested by hand. The canvas renders on demand; without this a change
    // to softness would sit in the object and never be drawn.
    light.shadow.radius = settings.softness;
    // Samples have to keep up with the radius or a wide blur turns into
    // visible rings: the same few taps spread further apart. 24 holds to the
    // top of the range, where the shadow is a soft wash rather than an edge.
    light.shadow.blurSamples = 24;
    light.shadow.needsUpdate = true;
    invalidate();
  }, [settings.softness, settings.throwDistance, settings.angle, invalidate]);

  if (!settings.enabled) return null;

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={[x, y, LIGHT_Z]}
        // Not zero: three skips a light that contributes nothing, and the
        // shadow goes with it.
        intensity={0.001}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        // The frustum is sized to the phone rather than to the backdrop. A
        // camera wide enough for a 12 unit plane would spend its whole map on
        // empty space and give the phone a few dozen pixels of it, which is
        // what makes a shadow look like a staircase.
        shadow-camera-left={-shadowHalf}
        shadow-camera-right={shadowHalf}
        shadow-camera-top={shadowHalf}
        shadow-camera-bottom={-shadowHalf}
        shadow-camera-near={0.1}
        shadow-camera-far={8}
        // The phone is a slab with a flat back, so the classic bias tradeoff
        // barely bites; a small negative bias is enough to keep the contact
        // edge from detaching without opening a gap at the silhouette.
        shadow-bias={-0.0012}
      />
      <mesh position={[0, 0, backdropZ]} receiveShadow>
        <planeGeometry args={[BACKDROP_SIZE, BACKDROP_SIZE]} />
        <shadowMaterial
          transparent
          opacity={settings.opacity}
          color={settings.color}
        />
      </mesh>
    </>
  );
}
