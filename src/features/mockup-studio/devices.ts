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
    id: "iphone-air",
    label: "iPhone Air",
    modelPath: `${MODELS}/iphone-air.glb`,
    // Modelled lying down; the upright pose is found by measuring.
    autoStand: true,
    // Only 8 meshes here, so the name is unambiguous. Object_2 is the front
    // glass: the flattest panel at the right aspect.
    // Floated, not bound. Binding to this model's glass rendered the picture
    // mirrored, and un-mirroring it via `screenFlipX` blanked the screen: that
    // works by negating the texture's repeat, which assumes UVs spanning 0..1,
    // and this mesh's do not -- so the mirrored copy landed outside the mapped
    // area. The floated plane gets the content right; what it got wrong was
    // which FACE, and that is fixed in the pose search instead.
    //
    // Object_2 is the screen: the camera cluster sits at +Y in this model, so
    // the back is +Y and the display is the -Y face.
    // Bound, not floated: hiding the screen mesh and floating a plane in front
    // left the model's own wallpaper showing and the plane nowhere to be seen.
    // Object_2 / Glass_-_Heavy_Color is the display -- the camera cluster sits
    // at +Y in this model, so the back is +Y and the screen is the -Y face.
    hideHints: [],
    screenHint: "Object_2",
    screenMaterial: "Glass_-_Heavy_Color",
    // KNOWN: the picture renders MIRRORED on this model. Its screen UVs run
    // right to left, and the usual fix -- `screenFlipX`, which negates the
    // texture's repeat -- does not work here: the mesh's UVs do not span 0..1,
    // so the mirrored copy samples outside the mapped area and the middle of
    // the screen comes back blank. Left un-flipped deliberately: a mirrored
    // screenshot is wrong but visible and correctly placed, which beats a
    // blank one. Fixing it properly means flipping the pixels when the texture
    // is built rather than flipping how it is sampled.
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 0.988,
    // Derived from the mesh's own aspect (2.127) rather than a published
    // spec, so the texture maps onto it without stretching.
    screenNative: { width: 402, height: 855 },
    notch: null,
    // TODO: unconfirmed. Supplied as `iphone_air.glb` with no licence file.
    credit: "UNKNOWN — provenance not yet confirmed",
  },
];

export const DEFAULT_DEVICE_ID = DEVICES[0].id;

export function getDevice(id: string | undefined): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}
