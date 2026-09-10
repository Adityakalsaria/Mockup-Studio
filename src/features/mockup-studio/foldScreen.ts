/**
 * What a folding screen does to the picture on it.
 *
 * Read off Apple's own product viewer for the iPhone Duo, and the important
 * finding is a NEGATIVE one: their device surface does not blur anything.
 *
 * Their pipeline has two halves. An offscreen compositor builds the screen
 * image -- wallpaper layers, the UI plate, a rounded frame -- and blurs THAT,
 * twice, with a bicubic reconstruction over a mip chain, into a render target
 * sized to the screen. Then the device's own material samples the finished
 * target and shades it. The blur belongs to the first half, where it operates
 * on a texture holding the screen content and nothing else.
 *
 * This studio has no first half. Our screen texture is the user's screenshot,
 * FITTED -- an offset and a repeat crop an arbitrary image to the panel's
 * aspect. Three attempts to graft their blur onto that failed for three
 * different reasons and one shared one:
 *
 *   - mip levels of a fitted texture average in the region outside the crop,
 *     so the panel became blocks of the screenshot's average colours;
 *   - a ring of taps whose angle step was a quarter turn rather than an
 *     eighth put eight samples on four directions and smeared the picture
 *     into a cross;
 *   - clamping taps to the crop rectangle showed one column of the picture
 *     stretched across the whole panel whenever that rectangle arrived
 *     degenerate.
 *
 * The shared reason is that all three resampled a texture whose layout this
 * file does not own. So it no longer resamples anything.
 *
 * WHAT THE SURFACE ACTUALLY DOES, from wipe-surface.frag.glsl, is fold the
 * hinge into one brightness term:
 *
 *   distanceToWipe = |u - wipePosition|
 *   wipe  = 1 - clamp(smoothstep(shadeBounds, distanceToWipe) * amount * 1.5, 0, 1)
 *   edges = ... * smoothstep(0.05, 0.5, u)   // inner panel, as it folds
 *
 * with wipePosition and shadeBounds stated per panel:
 *
 *   inner   position 1, bounds [0.5, 1] -- nothing at all happens across the
 *           half you are looking at, and the half turning away goes down
 *   cover   position 0, bounds [0, 1]
 *
 * A multiply, so it cannot produce an artefact: the worst it can do is be the
 * wrong amount of dark. That is the point of matching what they do rather than
 * what it looked like they were doing.
 */

import type { MeshBasicMaterial } from "three";

/** Which panel this is, and therefore which way the picture recedes. */
export type FoldScreenKind = "inner" | "cover";

export type FoldScreenHandle = {
  /** 0 fully open, 1 fully shut. Written every frame by the fold loop. */
  shut: { value: number };
};

/**
 * Attach the effect to a screen material.
 *
 * Returns the handle whose `.value` the caller writes; the material keeps the
 * same uniform object across recompiles, so a program rebuild -- a texture
 * arriving, the screen turning on -- does not silently orphan it.
 */
export function patchFoldScreen(
  material: MeshBasicMaterial,
  kind: FoldScreenKind,
): FoldScreenHandle {
  const shut = { value: 0 };
  const inner = kind === "inner";
  // The edge the image stays bright AT, and where the falloff runs between.
  const wipePosition = inner ? "1.0" : "0.0";
  const bounds = inner ? ["0.5", "1.0"] : ["0.0", "1.0"];
  /*
   * The inner panel's is the closedness. The cover's peaks halfway and at half
   * depth -- 1 - 2|shut - 0.5| is symmetric, so it does not matter which end of
   * the hinge it is measured from.
   */
  const amount = inner
    ? "uShut"
    : "clamp(1.0 - 2.0 * abs(uShut - 0.5), 0.0, 1.0) * 0.5";
  /*
   * And a second shadow creeping in from the hinge side of the inner panel as
   * it closes, which is theirs too and is what stops the fold reading as a
   * dimmer switch. The cover has no equivalent.
   */
  const creep = inner
    ? "mix(1.0, smoothstep(0.05, 0.5, vFoldUv.x), smoothstep(0.0, 0.55, uShut))"
    : "1.0";

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShut = shut;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vFoldUv;`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
        vFoldUv = uv;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uShut;
        varying vec2 vFoldUv;`,
      )
      /*
       * AFTER the stock chunk, not instead of it.
       *
       * The three failed versions all replaced map_fragment so they could
       * sample the texture themselves, which is how a fold effect ended up
       * able to corrupt a picture on a device that was not even folded.
       * Leaving the sampling exactly as three wrote it means the only thing
       * this can change is how bright the result is.
       */
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          float foldDistance = distance(vFoldUv.x, ${wipePosition});
          float foldWipe = 1.0 - clamp(
            smoothstep(${bounds[0]}, ${bounds[1]}, foldDistance) * ${amount} * 1.5,
            0.0,
            1.0
          );
          diffuseColor.rgb *= foldWipe * ${creep};
        }`,
      );
  };
  // A patched material is a different program from an unpatched one.
  material.needsUpdate = true;
  return { shut };
}
