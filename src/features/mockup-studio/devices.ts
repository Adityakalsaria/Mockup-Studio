/**
 * The device registry.
 *
 * Adding a device is an entry here plus a GLB in
 * `public/figma-assets/mockup-studio/models/` — no changes to the renderer.
 *
 * Most of what used to be hand-tuned per model is now measured at load time
 * instead: PhoneStage3D finds the model's own screen mesh (whichever one
 * `hideHints` matches), takes its size, centre and which face it sits on, and
 * places the screen from that. So an entry only carries what geometry cannot
 * tell you — the glass corner radius, and whether the device has a notch.
 *
 * LICENSING: every model shipped here needs its licence recorded in `credit`.
 * Where the licence requires attribution (CC-BY and friends), that credit has
 * to appear in the site footer, not only in this file.
 */
export interface DeviceNotch {
  /** All measured against the authored screen size below. */
  widthPx: number;
  heightPx: number;
  topPx: number;
  offsetXPx: number;
  offsetYPx: number;
  borderRadiusPx: number;
  scale: number;
}

export interface Device {
  id: string;
  label: string;
  /**
   * How the body is drawn. "glb" loads `modelPath`; "laptop" is generated
   * geometry and needs no file. Absent means glb, so every existing entry is
   * unchanged.
   */
  kind?: "glb" | "laptop";
  /** Served from /public. Required for `kind: "glb"`. */
  modelPath?: string;
  /**
   * Hide any mesh whose name OR material name contains one of these. Models
   * bake a placeholder wallpaper into a mesh that would otherwise cover the
   * real screen — and the same mesh is what gets measured to place it.
   * Miss the name and you get the model's stock home screen instead.
   */
  hideHints: string[];
  /** Screen corner radius as a fraction of screen width. */
  screenCornerRadiusPct: number;
  /** Pulls the screen plane just inside the measured mesh, so its edge does
      not fight the bezel for the same pixels. */
  screenInsetPct: number;
  /** The size the screen UI is authored at; the texture is rasterised at this
      and then mapped onto whatever the mesh measures. */
  screenNative: { width: number; height: number };
  notch: DeviceNotch | null;
  /**
   * Name of the model's own screen material. When set, the renderer binds
   * the screen texture straight onto it instead of hiding the mesh and
   * floating a plane in front — the model already carries screen geometry,
   * UVs and curvature, and reusing them beats reconstructing them.
   * `hideHints` is then unused for that device.
   */
  screenMaterial?: string;
  /**
   * Set when the model's screen UVs run right-to-left, which renders the
   * bound texture mirrored. Nothing about the geometry says which way an
   * author laid them out, so it is a per-model fact rather than something
   * the loader can measure.
   */
  screenFlipX?: boolean;
  /**
   * The same for the V axis, when a model's screen UVs run bottom to top.
   *
   * Separate from `screenFlipX` because the two are independent facts about an
   * export and no model has yet needed both.
   */
  screenFlipY?: boolean;
  /**
   * A quarter turn applied to the screen texture, in degrees.
   *
   * Separate from the flips because it is a different fact: the flips say the
   * UVs run backwards, this says they run along the other axis. The Fold's
   * inner panel is authored landscape, so a portrait screenshot bound to it
   * arrives lying on its side -- and no combination of mirroring stands it
   * back up.
   *
   * Swaps the aspect used to crop as well as turning the texture, or the fit
   * would trim the source against the screen's pre-rotation shape.
   */
  screenRotateDeg?: number;
  /**
   * The aspect of the span the screen mesh's own UVs occupy.
   *
   * Geometry alone does not say how a texture lands on a mesh. The Fold's
   * inner panel is 1.42 times wider than it is tall but its UVs span a 1.0
   * SQUARE, so the mapping stretches anything bound to it by 1.42 -- and the
   * fit, targeting the geometry, cropped to 1.42 as well, for 1.42 x 1.42 =
   * 2.02x. That is the stretch: a circle came back twice as wide as tall no
   * matter what size the source was, which is why no authoring size could fix
   * it from the outside.
   *
   * With this the fit targets uvAspect / meshAspect instead, which is the
   * region shape that comes out undistorted. Read straight off TEXCOORD_0 in
   * the file rather than guessed. Omit it and the fit uses the geometry, which
   * is right for any model whose UVs are laid out proportionally.
   */
  screenUvAspect?: number;
  /**
   * The colour the model was authored in, when part of the body is baked into
   * a base-colour map rather than driven by a material factor. Texels sharing
   * this hue follow the selected finish; everything else in the map — lens
   * rings, flash, mesh — is left alone. Omit and maps are never retinted.
   */
  authoredBodyColor?: string;
  /**
   * Extra yaw applied to the model itself, in degrees.
   *
   * The stage opens at yAxis 180 because the phone GLBs put their screen on
   * -Z. A model built facing the other way shows its back at that default --
   * the MacBook opened on its closed lid. Correcting it here rather than by
   * changing the default keeps ONE camera convention across the registry, so
   * a keyframe or a motion preset means the same thing whichever device is
   * loaded.
   */
  modelYawDeg?: number;
  /**
   * Extra pitch applied to the model itself, in degrees about X.
   *
   * Not every export stands its device up. The iPhone Air is modelled lying
   * flat -- its long axis is Z, not Y -- so at rest the stage showed its edge.
   * Both this and the yaw are applied BEFORE the model is measured, so the
   * fit and the recentring see the pose that will actually be rendered.
   */
  /**
   * Try a handful of quarter turns and keep whichever stands the model up.
   *
   * For exports that are modelled lying down. Measured rather than specified,
   * because a glTF scene carries its own node transforms and a named angle
   * composes with them in ways that are not predictable from the file.
   */
  autoStand?: boolean;
  /**
   * Which mesh is the screen, for `autoStand`.
   *
   * Standing a model up by measuring height and depth cannot tell front from
   * back -- a phone facing away is exactly as tall and as thin as one facing
   * you. Naming the screen lets the search prefer the pose that puts it toward
   * the camera, which is the difference between a mockup and a photo of the
   * back of a phone.
   */
  screenHint?: string;
  /**
   * Where the two ends of the hinge live in the model's own animation.
   *
   * Only for models that ship one. A folding phone has no single correct set
   * of node transforms -- the file's are wherever the rig was left, which for
   * the Fold is both leaves flat with the inner display still folded shut, so
   * the screen renders detached from the body. The poses that make sense are
   * the frames of the clip, and these name the two that matter.
   *
   * Given, the editor grows a Fold control and scrubs between them. Omitted,
   * the device renders exactly as authored and no mixer is built -- which is
   * every rigid phone.
   */
  fold?: { openSec: number; closedSec: number };
  /**
   * A second screen on the same body, with its own source.
   *
   * A fold has two: the big inner panel you open it for, and the cover panel
   * on the outside. They show different things in any real screenshot, so one
   * source bound to both would be a mockup of a phone mirroring itself.
   *
   * Bound exactly like `screenMaterial`, but fed from the second upload and
   * cropped against `native` rather than a measured mesh -- the cover panel is
   * small, flat and rectangular, so its authored aspect is all the fit needs.
   */
  coverScreen?: {
    material: string;
    native: { width: number; height: number };
    flipX?: boolean;
    flipY?: boolean;
    rotateDeg?: number;
  };
  /** Licence + author. Required for anything that ships. */
  credit: string;
}

const MODELS = "/figma-assets/mockup-studio/models";

export const DEVICES: Device[] = [
  {
    id: "iphone-17-pro-max",
    label: "iPhone 17 Pro Max",
    modelPath: `${MODELS}/iphone-17-pro-max.glb`,
    // Unused for this device — it binds by material instead.
    hideHints: [],
    screenMaterial: "OLED",
    // Ships as Cosmic Orange, with the Apple logo baked into a palette atlas
    // at that hue — without this the logo keeps a warm cast in every finish.
    authoredBodyColor: "#e8712e",
    screenFlipX: true,
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 1,
    // The authored wallpaper is 640x1391; the screen is rendered at that
    // aspect so a capture maps onto the mesh without letterboxing.
    screenNative: { width: 640, height: 1391 },
    // The model has a real Dynamic Island in its geometry, so nothing needs
    // to be drawn on top of the screen.
    notch: null,
    // TODO: unconfirmed. Supplied as `phone-17-pro-max (1).zip`; provenance
    // and licence still to be established before this ships anywhere public.
    credit: "UNKNOWN — provenance not yet confirmed",
  },
  {
    id: "iphone-fold",
    label: "iPhone Fold",
    modelPath: `${MODELS}/iphone-fold.glb`,
    hideHints: [],
    // Two screens in this model: "OLED" is the outer cover display and
    // "OLED IN" the inner one that folds. The match is exact, so naming one
    // binds only that one -- the other keeps the model's own wallpaper.
    screenMaterial: "OLED IN",
    // Just the mirror. An earlier reading added a 90 degree turn as well, on
    // the strength of test cards that could not tell the two apart -- a square
    // card is rotation-blind, and a portrait one came back upright either way.
    // A card carrying a CIRCLE settled it: the panel maps the source upright,
    // so the turn was doing nothing except sending the crop to the wrong axis,
    // which is what stretched every portrait source across the panel.
    screenRotateDeg: 90,
    screenFlipX: true,
    // TEXCOORD_0 on the inner panel spans u 0..1, v 0..1 -- a square, over a
    // 1.42 mesh.
    screenUvAspect: 1,
    // The outer panel, measured at 77.2 x 115.1mm in the file. Upright and
    // the right way round without help, unlike the inner one.
    coverScreen: {
      material: "OLED",
      native: { width: 772, height: 1151 },
      // Its UVs run right to left, like the inner panel's: text bound to it
      // came back reversed when read from outside the closed phone, which is
      // the only side this screen is ever seen from.
      flipX: true,
    },
    // The clip closes the phone: the leaves are parallel at t=0 and have swung
    // 180 degrees onto each other by t=2, holding shut to 5. Rendering both
    // ends settled which way round it goes -- "parallel leaves" describes
    // flat-open and folded-shut equally well, so the angle alone cannot say.
    fold: { openSec: 0, closedSec: 2 },
    // Open, this model puts its inner screen on the face the stage's default
    // yaw turns AWAY from -- so it opened showing the back, and the big screen
    // the device exists for was behind it. Half a turn here rather than a new
    // camera default, so one convention still holds across the registry.
    modelYawDeg: 180,
    // The inner panel measures 158.9 x 111.9mm in the file, so the mockup is
    // authored landscape. Portrait would letterbox against the mesh.
    screenNative: { width: 1589, height: 1119 },
    screenCornerRadiusPct: 0.045,
    screenInsetPct: 1,
    // A book fold has no notch on the inner panel; the cameras sit in the
    // outer half.
    notch: null,
    // TODO: unconfirmed. Supplied as `iPhone fold.glb`; provenance and licence
    // still to be established before this ships anywhere public.
    credit: "UNKNOWN — provenance not yet confirmed",
  },
];

export const DEFAULT_DEVICE_ID = DEVICES[0].id;

export function getDevice(id: string | undefined): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}
