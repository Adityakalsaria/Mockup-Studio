"use client";

/**
 * The axis gizmo, as geometry.
 *
 * The Figma artwork is an orthographic projection of three axes — a picture of
 * a gizmo. Tilting that picture in CSS reads as a card turning, because the
 * arms cannot foreshorten independently of each other. Six arms in a scene can,
 * so this is the real thing: drag it and the far arms shorten while the near
 * ones lengthen, which is the whole reason a gizmo tells you anything.
 *
 * The colours are not a coincidence and not copied by eye — the file's
 * #FF383C / #34C759 / #0088FF are `color.accent` exactly, so the axes read from
 * the tokens and follow them if the palette ever moves.
 *
 * `meshBasicMaterial` throughout, so the scene needs no lights: the artwork is
 * flat colour, and a lit gizmo would shade its arms by where a lamp happened to
 * be rather than by which way they point.
 */

import { useState } from "react";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { color } from "@/design/system";

/** The negative arms, dimmed — the file's #979797. */
const MUTED = "#979797";

export type GizmoShape = {
  /** How far each arm reaches from the origin. */
  arm: number;
  /** Shaft radius. */
  thickness: number;
  /** Cap radius at the end of each arm. */
  tip: number;
  /** Overall size, applied to the group rather than the camera — so changing
   *  it does not also change how the arms foreshorten. */
  scale: number;
};

/**
 * Tuned against the real corner, not guessed from the flat export.
 *
 * The arms grew and the shafts thinned — 1.7 long against 0.04 thick, where
 * the first pass was 1 against 0.055. That is a far wirier gizmo: at this
 * ratio the caps read as the ends of lines rather than as beads on sticks,
 * which is what the file's artwork is doing. `scale` then pulls the whole
 * thing back to fit the 160 surface it sits on.
 */
export const GIZMO_SHAPE: GizmoShape = {
  arm: 1.7,
  thickness: 0.04,
  tip: 0.14,
  scale: 0.9,
};

/**
 * One arm: a shaft from the origin and a cap at its end.
 *
 * A cylinder stands along Y by default, so each arm is a rotated group rather
 * than six separately-positioned meshes — the rotation says which way the arm
 * points, and everything inside is written once in one direction.
 */
function Arm({
  rotation,
  tint,
  shape,
}: {
  rotation: [number, number, number];
  tint: string;
  shape: GizmoShape;
}) {
  return (
    <group rotation={rotation}>
      <mesh position={[0, shape.arm / 2, 0]}>
        <cylinderGeometry args={[shape.thickness, shape.thickness, shape.arm, 12]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
      </mesh>
      <mesh position={[0, shape.arm, 0]}>
        <sphereGeometry args={[shape.tip, 20, 20]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
      </mesh>
    </group>
  );
}

const AXES: { rotation: [number, number, number]; tint: string }[] = [
  { rotation: [0, 0, -Math.PI / 2], tint: color.accent.red },
  { rotation: [0, 0, Math.PI / 2], tint: MUTED },
  { rotation: [0, 0, 0], tint: color.accent.green },
  { rotation: [Math.PI, 0, 0], tint: MUTED },
  { rotation: [Math.PI / 2, 0, 0], tint: color.accent.blue },
  { rotation: [-Math.PI / 2, 0, 0], tint: MUTED },
];

/**
 * Is there a 3D context to be had?
 *
 * Not a formality. A browser allows only so many live WebGL contexts across
 * all its tabs — around sixteen in Chrome — and a studio is exactly the kind
 * of thing someone keeps open beside a dozen other things. Past the limit the
 * canvas comes back dead and paints an opaque rectangle where a gizmo should
 * be, which reads as a broken build rather than a busy browser.
 *
 * The probe releases its own context immediately, or asking the question would
 * itself cost one of the answers.
 */
function canRender3D() {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** The flat export, for when there is no context to draw the real one in. */
function FlatGizmo({ size }: { size: number }) {
  return (
    <Image
      src="/figma-assets/mockup-studio/icons/gizmo.svg"
      alt=""
      width={Math.round(size * 0.67)}
      height={Math.round(size * 0.67)}
      unoptimized
    />
  );
}

export default function GizmoCanvas({
  size = 120,
  shape = GIZMO_SHAPE,
}: {
  size?: number;
  shape?: GizmoShape;
}) {
  const [live, setLive] = useState(canRender3D);

  if (!live) return <FlatGizmo size={size} />;

  return (
    <Canvas
      // Orthographic, because a gizmo reports direction and perspective would
      // make the near arm longer than the far one for reasons of distance
      // rather than of orientation.
      orthographic
      camera={{ position: [2.2, 1.8, 2.6], zoom: size / 3.4 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width: size, height: size, background: "transparent", touchAction: "none" }}
      dpr={[1, 2]}
      // A context can also be taken away after it is granted — another tab
      // asking for one is enough. Falling back on the way out matters as much
      // as checking on the way in.
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", () => setLive(false), {
          once: true,
        })
      }
    >
      <group scale={shape.scale}>
        <mesh>
          <sphereGeometry args={[shape.tip * 1.1, 20, 20]} />
          <meshBasicMaterial color={MUTED} toneMapped={false} />
        </mesh>
        {AXES.map((a) => (
          <Arm key={a.rotation.join()} rotation={a.rotation} tint={a.tint} shape={shape} />
        ))}
      </group>
      {/*
        Rotate only. Zoom and pan are camera moves, and this is not a viewport —
        the gizmo's whole job is which way things face.
      */}
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.6}
        enableDamping
        dampingFactor={0.12}
      />
    </Canvas>
  );
}
