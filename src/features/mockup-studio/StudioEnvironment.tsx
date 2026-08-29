"use client";

import { useEffect, useMemo } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { CanvasTexture, LinearFilter } from "three";

/**
 * The studio lighting rig.
 *
 * A bare `<Lightformer form="rect">` emits at full strength right up to its
 * edge, so what the phone's glass reflects is the rectangle itself — four
 * hard-edged slabs, which is what made the earlier rig read as harsh and
 * flat. Real studio light does not have an edge like that; a softbox has
 * diffusion cloth over it and falls off toward the frame.
 *
 * So every emitter here is mapped with a radial falloff. drei's Lightformer
 * puts the map on an unlit basic material, which means black in the map is
 * simply light that is not emitted — no transparency needed, and the
 * reflection ends up as a soft blob instead of a rectangle.
 *
 * The other half of "not boring" is that the light is not all one colour.
 * The key is warm and the two edge strips are cool, so the aluminium picks
 * up a temperature difference along its length rather than a single grey
 * sheen. That split is what reads as studio rather than showroom.
 */

/**
 * White at the centre falling to black at the rim.
 *
 * The midpoint stop is deliberately high and placed past halfway: a plain
 * linear ramp spends most of its area dim and the rig loses its punch, so
 * this holds near-full brightness across the middle and does its falling in
 * the outer third.
 */
function makeSoftboxTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.62, "#d8d8d8");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  // The gradient is the whole point; a mipmap chain on something this smooth
  // buys nothing and the smallest levels only muddy the falloff.
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

export function StudioEnvironment() {
  const softbox = useMemo(() => makeSoftboxTexture(), []);
  useEffect(() => () => softbox.dispose(), [softbox]);

  return (
    // 512 rather than 256: the emitters are gradients now, and a 256 cube map
    // quantises a smooth falloff into visible steps across a surface as
    // polished as the back glass. Still `frames={1}` — nothing here moves.
    <Environment resolution={512} frames={1}>
      {/* Key: a wide softbox up and in front, warm. Intensities run higher
          than the old hard rects because a radial falloff emits roughly a
          third of the light a flat panel of the same size does. */}
      <Lightformer
        form="rect"
        map={softbox}
        color="#fff4e6"
        intensity={4.6}
        position={[0.6, 2.6, 1.6]}
        scale={[7, 4, 1]}
        target={[0, 0, 0]}
      />

      {/* The two edge strips. These are what actually draw the highlight down
          the side of the phone, and they are the reason the rig is worth
          having at all — an even wash leaves the body a flat silhouette.
          Left reads brighter and cool, right dimmer and cooler still, so the
          two edges are never the same value. */}
      <Lightformer
        form="rect"
        map={softbox}
        color="#eef4ff"
        intensity={6.4}
        position={[-2.6, 0.3, 1.1]}
        scale={[1.8, 6, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        map={softbox}
        color="#e8eeff"
        intensity={4.2}
        position={[2.6, 0.5, 1.1]}
        scale={[1.6, 6, 1]}
        target={[0, 0, 0]}
      />

      {/* Fill from behind the camera, split in two rather than one big panel.
          A single centred fill is what left the back of the phone flat: the
          back faces the camera head-on, so an even panel behind the camera
          lands as an even wash and the surface has nothing to grade across.
          Two offset halves at different temperatures give it a cool-to-warm
          sweep instead, which is what a flat slab of aluminium needs to read
          as metal rather than as grey paint. */}
      <Lightformer
        form="rect"
        map={softbox}
        color="#e8effb"
        intensity={1.5}
        position={[-2.4, 0.8, 3.6]}
        scale={[6, 7, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        map={softbox}
        color="#fff1e2"
        intensity={1.1}
        position={[2.6, -0.6, 3.6]}
        scale={[6, 7, 1]}
        target={[0, 0, 0]}
      />

      {/* Bounce off the floor, warm, to stop the bottom edge dying. */}
      <Lightformer
        form="circle"
        map={softbox}
        color="#ffeede"
        intensity={2.1}
        position={[0, -2.6, 1.4]}
        scale={[5, 3, 1]}
        target={[0, 0, 0]}
      />

      {/* A slim overhead strip. Small and bright, it lands as the tight
          specular line along the top chamfer — the one hard-ish accent in an
          otherwise soft rig, which is what keeps it from looking foggy. */}
      <Lightformer
        form="rect"
        map={softbox}
        color="#ffffff"
        intensity={7}
        position={[-0.4, 1.9, 0.2]}
        scale={[3, 0.5, 1]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
}
