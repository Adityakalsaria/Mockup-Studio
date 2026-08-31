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
  /** Licence + author. Required for anything that ships. */
  credit: string;
}

const MODELS = "/figma-assets/mockup-studio/models";

export const DEVICES: Device[] = [
  {
    id: "iphone-16",
    label: "iPhone 16",
    modelPath: `${MODELS}/iphone-16.glb`,
    // The model's meshes are named Object_0..Object_40 and its materials are
    // content hashes, so nothing self-identifies as a screen. The screen mesh
    // is Object_3 — but hints match by substring, and "Object_3" would also
    // catch Object_30..Object_39. Its material is unique to that one mesh, so
    // match on that instead.
    hideHints: ["4130c6244c49c5d5712e"],
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 0.988,
    screenNative: { width: 393, height: 852 },
    // TODO: unverified. Set once it is clear whether the model carries its own
    // Dynamic Island geometry or the screen plane has to draw one.
    notch: null,
    // TODO: unconfirmed. Supplied as `iphone_16_-_free.glb` with no licence
    // file. Provenance and licence to be established before this ships.
    credit: "UNKNOWN — provenance not yet confirmed",
  },
  {
    id: "iphone-air",
    label: "iPhone Air",
    modelPath: `${MODELS}/iphone-air.glb`,
    // Only 8 meshes here, so the name is unambiguous. Object_2 is the front
    // glass: the flattest panel at the right aspect.
    hideHints: ["Object_2"],
    screenCornerRadiusPct: 0.135,
    screenInsetPct: 0.988,
    // Derived from the mesh's own aspect (2.127) rather than a published
    // spec, so the texture maps onto it without stretching.
    screenNative: { width: 402, height: 855 },
    notch: null,
    // TODO: unconfirmed. Supplied as `iphone_air.glb` with no licence file.
    credit: "UNKNOWN — provenance not yet confirmed",
  },
  {
    id: "macbook-pro-14",
    label: 'MacBook Pro 14"',
    modelPath: `${MODELS}/macbook-pro-14.glb`,
    // Matched by mesh name, not material: this model reuses one material
    // across seven meshes, so a material hint would hide most of the lid.
    hideHints: ["cpUmMDYlGqLEAMt"],
    screenCornerRadiusPct: 0.02,
    screenInsetPct: 0.99,
    // 1512x982 points — the 3024x1964 panel at 2x.
    screenNative: { width: 1512, height: 982 },
    notch: null,
    // TODO: unconfirmed. Supplied as `macbook_pro_14_inch_M5.glb` with no
    // licence file. The GLB embeds its own textures, so the separate
    // `textures/` folder it shipped with is not needed.
    credit: "UNKNOWN — provenance not yet confirmed",
  },
];

export const DEFAULT_DEVICE_ID = DEVICES[0].id;

export function getDevice(id: string | undefined): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}
