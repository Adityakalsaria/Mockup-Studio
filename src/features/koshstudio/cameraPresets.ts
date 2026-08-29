/**
 * Named camera positions, matching the set ultramock exposes under
 * CAMERA → PRESETS.
 *
 * These are shortcuts into the same transform state the manual sliders drive,
 * not a separate camera rig — picking one writes rotate/scale/offset and the
 * existing easing carries the phone there, so a preset reads as a move rather
 * than a jump.
 *
 * Angles are in degrees to match the sliders; scale is a percentage.
 */
export interface CameraPreset {
  id: string;
  label: string;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Presets that only make sense in 3D switch the toggle on themselves. */
  requires3D: boolean;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    // Straight on, filling the frame — the default product shot.
    id: "hero",
    label: "Hero",
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 100,
    offsetX: 0,
    offsetY: 0,
    requires3D: false,
  },
  {
    // The three-quarter view most mockups actually ship with.
    id: "angled",
    label: "Angled",
    rotateX: -12,
    rotateY: -24,
    rotateZ: -4,
    scale: 92,
    offsetX: 0,
    offsetY: 0,
    requires3D: true,
  },
  {
    // Flat to camera with the 3D toggle off — the fallback for anyone who
    // wants a plain screenshot frame rather than a rendered object.
    id: "flat",
    label: "Flat",
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 100,
    offsetX: 0,
    offsetY: 0,
    requires3D: false,
  },
  {
    // Looking up at the device, which is what gives the "keynote" feel.
    id: "bottom",
    label: "Bottom",
    rotateX: 18,
    rotateY: -14,
    rotateZ: 0,
    scale: 96,
    offsetX: 0,
    offsetY: -20,
    requires3D: true,
  },
  {
    // Pushed in and off-centre so the frame crops the device — pairs with a
    // shallow blur for the close-up shots.
    id: "detail",
    label: "Detail",
    rotateX: -20,
    rotateY: -38,
    rotateZ: -8,
    scale: 165,
    offsetX: 60,
    offsetY: 40,
    requires3D: true,
  },
];
