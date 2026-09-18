"use client";

/**
 * The axis gizmo, as geometry — and as a handle on the model.
 *
 * The Figma artwork is an orthographic projection of three axes — a picture of
 * a gizmo. Tilting that picture in CSS reads as a card turning, because the
 * arms cannot foreshorten independently of each other. Six arms in a scene can,
 * so this is the real thing: drag it and the far arms shorten while the near
 * ones lengthen, which is the whole reason a gizmo tells you anything.
 *
 * What it tells you is where the PHONE is pointing. The gizmo carries the
 * model's own rotation rather than a camera of its own, and dragging it turns
 * the model — so the corner is a readout and a control at once, and the two
 * can never disagree, because they are the same three numbers. A gizmo that
 * spun independently of the shot would be an ornament that looks like an
 * instrument.
 *
 * The colours are not a coincidence and not copied by eye — the file's
 * #FF383C / #34C759 / #0088FF are `color.accent` exactly, so the axes read from
 * the tokens and follow them if the palette ever moves.
 *
 * `meshBasicMaterial` throughout, so the scene needs no lights: the artwork is
 * flat colour, and a lit gizmo would shade its arms by where a lamp happened to
 * be rather than by which way they point.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { color } from "@/design/system";
import { DEFAULT_EDITOR_STATE } from "../editor/editorState";
import { sampleAnimation, type Animation } from "../animation";
import { springTo } from "../transformSpring";

/** The negative arms, dimmed — the file's #979797. */
const MUTED = "#979797";

const DEG = Math.PI / 180;
const TURN = Math.PI * 2;

/**
 * The yaw at which the phone is facing you, which is where the gizmo rests.
 *
 * Not zero. The GLB is authored facing away from the camera and
 * `DEFAULT_EDITOR_STATE.yAxis` is 180 to correct it, so a shot at rest is a
 * phone front-on with a Y of 180 in the state. Showing that raw would open the
 * studio with the gizmo already spun half a turn — reporting a rotation of the
 * model that is not a rotation of the SHOT. Subtracting the neutral yaw makes
 * the gizmo say what the eye says: the phone is square to you, so the axes are
 * square too, and every degree it shows from there is a degree you can see.
 */
const NEUTRAL_YAW = DEFAULT_EDITOR_STATE.yAxis;

/** Degrees of the model, as the panel and the stage hold them. */
export type Orientation = { x: number; y: number; z: number };

/** A turn asked for by hand, in degrees — dx about Y, dy about X. */
export type Turn = { dxDeg: number; dyDeg: number };

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
 * A quarter turn from the middle of the gizmo to its rim.
 *
 * The stage's own drag is 0.4° per pixel — a full turn in about nine hundred
 * pixels — which is right for a canvas you sweep across and useless on a
 * widget eighty pixels wide, where the same gain buys thirty degrees of the
 * whole surface. This is the trackball reading instead: the gain follows the
 * radius, so the grab lands where you put it at any size, and dragging from
 * the centre to the edge is always 90°.
 */
const quarterTurnPerRadius = (size: number) => 90 / (size / 2);

/**
 * How much the pointer may wander and still count as a tap.
 *
 * Generous, because at a quarter turn per radius even a careful press moves
 * the phone a degree or two, and the point of the guard is to tell a tap from
 * a DRAG — not to demand a still hand.
 */
const TAP_SLOP = 6;

/** Arrow keys, for the same control without a pointer. Shift is the coarse
    step — the same pairing the panel's sliders use. */
const KEY_STEP = 5;
const KEY_STEP_COARSE = 15;

/**
 * The same angle, expressed nearest to where the gizmo already is.
 *
 * Angles here are unbounded — Y runs -360..360 and a drag walks straight
 * through the ends — so a jump from 179° to -179° is two degrees of rotation
 * written as 358. Without this the spring believes the long number and the
 * gizmo takes an almost full turn to travel two degrees, every time a slider
 * crosses the wrap.
 */
const nearest = (current: number, target: number) =>
  target + Math.round((current - target) / TURN) * TURN;

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
 * The six arms, wearing the model's rotation.
 *
 * Sprung rather than set, on the phone's own spring — `transformSpring` is the
 * module both read, so the gizmo and the model are integrating the same
 * equation from the same omega and arrive together. Setting the rotation
 * directly would put the gizmo a fifth of a second ahead of the shot on every
 * slider nudge, which at this size reads as the corner twitching.
 *
 * Euler order is three's default XYZ, which is what `PhoneStage3D` sets on the
 * phone's group — the same three numbers composed the same way round, or the
 * two would agree on one axis and drift on the others.
 */
function Rig({
  shape,
  rotation,
  animation,
  playing,
  timeRef,
}: {
  shape: GizmoShape;
  rotation: Orientation;
  animation?: Animation;
  playing?: boolean;
  timeRef?: { current: number };
}) {
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  /* Seeded, not empty. `springTo` reads `vel[key]` before it writes it, so a
     missing key is `undefined` in the arithmetic and the first frame returns
     NaN — which lands in the group's matrix and takes the whole gizmo off
     screen. `PhoneStage3D` seeds its own for the same reason. */
  const vel = useRef<Record<string, number>>({ x: 0, y: 0, z: 0 });

  const target = useMemo(
    () => ({
      x: rotation.x * DEG,
      y: (rotation.y - NEUTRAL_YAW) * DEG,
      z: rotation.z * DEG,
    }),
    [rotation.x, rotation.y, rotation.z],
  );

  // Land on the pose the shot is already in, rather than springing to it from
  // neutral on mount — the studio restores a saved shot, and a gizmo that
  // swung into place on load would announce a rotation nobody just made.
  const settled = useRef(false);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    if (!settled.current) {
      g.rotation.set(target.x, target.y, target.z);
      settled.current = true;
      return;
    }

    /*
     * While a preset is playing, the phone is not at the angles in the state.
     *
     * `PhoneStage3D` samples the animation off a ref inside its own frame loop
     * — the pose is a function of one number and React never sees it — so a
     * gizmo reading the committed state would sit perfectly still through a
     * turntable, reporting the pose the shot will return to rather than the
     * one it is in. Sampling the same curve at the same playhead is what keeps
     * the corner honest, and costs no render: this runs inside a frame that is
     * already happening.
     *
     * Set, not sprung, for the reason the phone sets: playback asks for the
     * pose it was given exactly, and a filter would trail every keyframe and
     * round off the extremes a preset was authored around.
     */
    if (playing && animation && timeRef) {
      // Playback never settles on its own: every frame is a new sample.
      invalidate();
      const pose = sampleAnimation(animation, timeRef.current);
      g.rotation.set(
        pose.xAxis === undefined ? target.x : pose.xAxis * DEG,
        pose.yAxis === undefined ? target.y : (pose.yAxis - NEUTRAL_YAW) * DEG,
        pose.zAxis === undefined ? target.z : pose.zAxis * DEG,
      );
      return;
    }

    // A backgrounded tab hands back one enormous delta on the way in; the
    // closed form is stable at any dt but the phone clamps here too, so both
    // resume from the same place.
    const dt = Math.min(delta, 0.032);
    g.rotation.x = springTo(g.rotation.x, nearest(g.rotation.x, target.x), vel.current, "x", dt);
    g.rotation.y = springTo(g.rotation.y, nearest(g.rotation.y, target.y), vel.current, "y", dt);
    g.rotation.z = springTo(g.rotation.z, nearest(g.rotation.z, target.z), vel.current, "z", dt);

    // Another frame only while something is still travelling. Velocity as well
    // as distance: a spring passes close to its target still carrying speed,
    // and parking on position alone freezes the arms a fraction short.
    const moving =
      Object.values(vel.current).some((v) => Math.abs(v) > 1e-3) ||
      Math.abs(g.rotation.x - target.x) > 1e-4 ||
      Math.abs(g.rotation.y - target.y) > 1e-4 ||
      Math.abs(g.rotation.z - target.z) > 1e-4;
    if (moving) invalidate();
  });

  // A new pose arrives as a prop, and a parked loop has no way to notice.
  useEffect(() => {
    invalidate();
  }, [target.x, target.y, target.z, invalidate]);

  return (
    <group ref={group} scale={shape.scale}>
      <mesh>
        <sphereGeometry args={[shape.tip * 1.1, 20, 20]} />
        <meshBasicMaterial color={MUTED} toneMapped={false} />
      </mesh>
      {AXES.map((a) => (
        <Arm key={a.rotation.join()} rotation={a.rotation} tint={a.tint} shape={shape} />
      ))}
    </group>
  );
}

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

/** The flat export, for when there is no context to draw the real one in.
    Static on purpose: it cannot foreshorten, so it cannot report an
    orientation, and a picture that turns without foreshortening would report
    the wrong one. It stays a mark that says where the gizmo lives. */
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
  rotation,
  onTurn,
  onReset,
  animation,
  playing,
  timeRef,
}: {
  size?: number;
  shape?: GizmoShape;
  /** Where the model is pointing. Omitted, the gizmo sits at rest. */
  rotation?: Orientation;
  /** Turn the model. Omitted, the gizmo is a readout and takes no input. */
  onTurn?: (turn: Turn) => void;
  /**
   * Put the model back where it started — bound to a double tap on the gizmo.
   *
   * The gesture belongs here rather than on a button because this is the
   * control that got the phone off neutral in the first place, and a drag that
   * has gone somewhere unhelpful wants its undo under the same finger.
   */
  onReset?: () => void;
  /** The curve the shot is playing, and where the playhead is on it — the
   *  same three the stage is given, so the two sample one animation. */
  animation?: Animation;
  playing?: boolean;
  timeRef?: { current: number };
}) {
  /* Whether this browser can draw 3D at all -- asked once. Separate from a
     context being LOST, which is temporary and must not be treated as "no". */
  const [supported] = useState(canRender3D);
  const [lost, setLost] = useState(false);
  /** Bumped to rebuild the canvas with a fresh context. */
  const [generation, setGeneration] = useState(0);

  /*
   * A lost context comes back one way or another.
   *
   * The browser may restore it (`webglcontextrestored`, below). If it has not
   * within a moment -- after a hot reload it usually will not, the context
   * belonged to a canvas from before -- the canvas is rebuilt, which asks for
   * a brand-new context. Before this the gizmo waited for a restore event on a
   * canvas it had already unmounted, so it never came back.
   */
  useEffect(() => {
    if (!lost) return;
    const t = window.setTimeout(() => {
      setGeneration((g) => g + 1);
      setLost(false);
    }, 800);
    return () => window.clearTimeout(t);
  }, [lost]);
  const [dragging, setDragging] = useState(false);

  const pose = rotation ?? { x: 0, y: NEUTRAL_YAW, z: 0 };
  const gain = quarterTurnPerRadius(size);

  /*
   * The previous point, not the point the drag started from.
   *
   * Each move reports the step since the last one, because `onTurn` ADDS to
   * the model's rotation — a delta measured from the origin of the drag would
   * re-apply the whole travel on every event and the phone would take off.
   * A ref rather than state: pointermove fires several times a frame and none
   * of them should cost a render of the chrome.
   */
  const last = useRef<{ x: number; y: number } | null>(null);

  /**
   * How far the pointer travelled while it was down.
   *
   * A double tap is two clicks, and the browser will report one whether the
   * presses were still or swept the phone half a turn each. Two quick drags is
   * a plausible way to line a shot up, and answering it by throwing the pose
   * away would be the worst thing this widget could do. So the reset asks
   * whether either press actually stayed put.
   */
  const travel = useRef(0);
  /** The press before this one, kept because a double tap is a pair and a
      sweep followed by a tap is not one. */
  const lastTravel = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onTurn) return;
      // Capture, so a drag that leaves the 112px surface — which it will, at a
      // quarter turn per radius — keeps arriving here instead of stopping at
      // the rim.
      e.currentTarget.setPointerCapture(e.pointerId);
      last.current = { x: e.clientX, y: e.clientY };
      lastTravel.current = travel.current;
      travel.current = 0;
      setDragging(true);
    },
    [onTurn],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const from = last.current;
      if (!from || !onTurn) return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      last.current = { x: e.clientX, y: e.clientY };
      travel.current += Math.abs(dx) + Math.abs(dy);
      onTurn({ dxDeg: dx * gain, dyDeg: dy * gain });
    },
    [onTurn, gain],
  );

  /**
   * Double tap: the model back where it started.
   *
   * `dblclick` rather than a hand-rolled two-tap timer, because the browser
   * already knows the platform's interval and a touch that taps twice raises
   * it here as well. The travel guard above is the only thing added to it.
   */
  const onDoubleClick = useCallback(() => {
    if (!onReset) return;
    if (travel.current > TAP_SLOP || lastTravel.current > TAP_SLOP) return;
    onReset();
  }, [onReset]);

  const endDrag = useCallback(() => {
    last.current = null;
    setDragging(false);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onTurn) return;
      const step = e.shiftKey ? KEY_STEP_COARSE : KEY_STEP;
      const turn: Record<string, Turn> = {
        ArrowLeft: { dxDeg: -step, dyDeg: 0 },
        ArrowRight: { dxDeg: step, dyDeg: 0 },
        ArrowUp: { dxDeg: 0, dyDeg: -step },
        ArrowDown: { dxDeg: 0, dyDeg: step },
      };
      const move = turn[e.key];
      if (!move) return;
      // Or the arrows scroll the workspace as well as turning the phone.
      e.preventDefault();
      onTurn(move);
    },
    [onTurn],
  );

  if (!supported) return <FlatGizmo size={size} />;

  return (
    <div
      // A control, not a picture, so it is reachable and announced as one. The
      // arms are the value: there is no number to put in an aria-valuenow that
      // would mean anything, and three of them at once is not a slider.
      role="group"
      aria-label="Model orientation — drag or use the arrow keys to turn the model, double-tap to put it back"
      tabIndex={onTurn ? 0 : -1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      style={{
        position: "relative",
        width: size,
        height: size,
        touchAction: "none",
        cursor: onTurn ? (dragging ? "grabbing" : "grab") : "default",
        outlineOffset: 4,
      }}
    >
      {/* The flat mark covers a lost context; the canvas stays MOUNTED under it
          so that a restore can actually arrive. */}
      {lost ? (
        <div className="absolute inset-0 grid place-items-center">
          <FlatGizmo size={size} />
        </div>
      ) : null}
      <Canvas
        key={generation}
        // Orthographic, because a gizmo reports direction and perspective would
        // make the near arm longer than the far one for reasons of distance
        // rather than of orientation.
        orthographic
        /*
         * On demand. The gizmo is six meshes that are still most of the time,
         * and a canvas drawing anyway is a canvas holding a GPU context busy
         * beside the phone's — which is the pressure that gets one of them
         * dropped to begin with. `Rig` asks for a frame while it is moving.
         */
        frameloop="demand"
        camera={{ position: [2.2, 1.8, 2.6], zoom: size / 3.4 }}
        gl={{ alpha: true, antialias: true }}
        style={{
          width: size,
          height: size,
          background: "transparent",
          visibility: lost ? "hidden" : "visible",
        }}
        dpr={[1, 2]}
        /*
         * A context can be taken away after it is granted, and given back.
         *
         * Falling back on the way out was only half of it: the listener fired
         * once, flipped to the flat artwork and stayed there — so a gizmo that
         * lost its context to a hot reload or to another tab never came back
         * without a full page load. That is the "it keeps stopping".
         *
         * `preventDefault` is what makes the difference. The default action for
         * `webglcontextlost` is to abandon the context for good; a cancelled
         * event asks the browser to restore it, and `webglcontextrestored`
         * then arrives on its own.
         */
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            setLost(true);
          });
          canvas.addEventListener("webglcontextrestored", () => setLost(false));
        }}
      >
        {/*
          No OrbitControls. They moved the CAMERA, which is the one thing in
          here that must not move: a gizmo whose viewpoint drifts stops being a
          fixed frame to read the model against, and the arms would report the
          camera's history rather than the phone's pose. The drag above turns
          the model instead, and the arms follow it home.
        */}
        <Rig
          shape={shape}
          rotation={pose}
          animation={animation}
          playing={playing}
          timeRef={timeRef}
        />
      </Canvas>
    </div>
  );
}
