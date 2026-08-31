"use client";

import { RoundedBox } from "@react-three/drei";
import type { Texture } from "three";
import { getFinish } from "./finishes";

/**
 * A laptop, built rather than loaded.
 *
 * Every other device here is a GLB. This one is geometry because a laptop is
 * a far simpler shape than a phone -- two rounded slabs on a hinge -- and
 * because the licence on a model you did not make is a liability you carry
 * forever. Generated geometry has no provenance question, adds nothing to the
 * bundle against the ~1.4MB a device GLB costs, and picks up the finishes and
 * the studio rig for free because it uses the same materials everything else
 * does.
 *
 * Proportions are the 16" MacBook Pro's real ones: 355.7 x 248.1 x 16.8mm
 * closed, with a 3456x2234 display. Everything below is that, divided through
 * so the open machine stands about one unit tall -- the same height the GLBs
 * are normalised to, so it frames like they do and the camera defaults do not
 * have to know which device is loaded.
 */

/** 355.7mm wide against a 248.1mm deck. */
const DECK_W = 1.55;
const DECK_D = 1.08;
const DECK_H = 0.045;
const DECK_RADIUS = 0.03;

const LID_W = DECK_W;
/* Set from the panel aspect rather than guessed: the bezel is a uniform
   fraction of each side, so the lid's ratio IS the display's. 3456x2234 is
   1.547, and 1.55/1.547 lands the lid height here. */
const LID_H = 1.002;
const LID_T = 0.028;
const LID_RADIUS = 0.024;

/**
 * How far the lid leans back, in radians from upright.
 *
 * Just past vertical. A lid at exactly 90 degrees reads as a diagram rather
 * than a photograph -- nobody sits a laptop perfectly upright -- and much more
 * than this and the screen starts hiding from a head-on camera, which is the
 * angle most shots are framed at.
 */
const LID_TILT = 0.20;

/** The black border around the panel, as a fraction of the lid. Apple's is
    very thin on this machine, and a fat bezel is the fastest way to make a
    generated laptop look like a 2012 one. */
const BEZEL = 0.030;

export type LaptopProps = {
  texture: Texture | null;
  finishId?: string;
  /** Drawn over the top of the panel, like the phone's island. */
  showNotch?: boolean;
};

/**
 * Fitted and turned to match the GLBs.
 *
 * SCALE: the stage normalises a loaded model to one unit TALL, which suits a
 * portrait phone. A laptop is wider than it is tall, so the same treatment
 * pushes it straight off both sides of the frame. Normalising on width
 * instead makes it occupy the frame the way the phone does, and the camera
 * defaults keep working unchanged.
 *
 * FACING: the phone GLBs have their screen on -Z, which is why the stage
 * defaults yAxis to 180. Built the natural way round, this laptop would show
 * the camera its lid. Turning it here rather than special-casing the default
 * keeps one rotation convention for every device.
 */
const OPEN_H = DECK_H + LID_H * Math.cos(LID_TILT);
/**
 * 0.8 rather than 1: the frame is portrait, so a laptop normalised to exactly
 * one unit wide bleeds off both edges at the default zoom. This leaves it
 * sitting in the frame about as generously as the phone does.
 */
const FIT_SCALE = 0.8 / DECK_W;
/**
 * The build starts at the deck's underside because that is where a hinge is
 * easiest to reason about, which puts the whole machine above the origin. The
 * stage recentres a loaded GLB on its bounding box and cannot do that for
 * geometry it did not load, so the centring happens here.
 */
const FIT_Y = -(OPEN_H / 2) * FIT_SCALE;

export function LaptopScene({ texture, finishId, showNotch = true }: LaptopProps) {
  const finish = getFinish(finishId);
  const body = {
    color: finish.color,
    metalness: finish.metalness,
    roughness: finish.roughness,
  };

  // The hinge sits at the back edge of the deck, and the lid rotates about it.
  // Modelling it as a group pivoted there rather than positioning the lid by
  // hand means the tilt above is the only number to change, and the lid stays
  // attached to the deck whatever it is set to.
  const hingeZ = -DECK_D / 2 + LID_T / 2;

  const panelW = LID_W * (1 - BEZEL * 2);
  const panelH = LID_H * (1 - BEZEL * 2);

  return (
    <group scale={FIT_SCALE} position={[0, FIT_Y, 0]} rotation={[0, Math.PI, 0]}>
      {/* Deck */}
      <RoundedBox
        args={[DECK_W, DECK_H, DECK_D]}
        radius={DECK_RADIUS}
        smoothness={4}
        creaseAngle={0.4}
        position={[0, DECK_H / 2, 0]}
        // Casting is set per mesh here, where the GLB path sets it during its
        // traverse. Without it the laptop is the one device that throws no
        // shadow, which is obvious the moment the shadow rig is switched on.
        castShadow
      >
        <meshStandardMaterial {...body} />
      </RoundedBox>

      <group position={[0, DECK_H, hingeZ]} rotation={[-LID_TILT, 0, 0]}>
        {/* Lid, standing on the hinge: shifted up by half its height so the
            group's origin is the pivot rather than the lid's centre. */}
        <group position={[0, LID_H / 2, 0]}>
          <RoundedBox
            args={[LID_W, LID_H, LID_T]}
            radius={LID_RADIUS}
            smoothness={4}
            creaseAngle={0.4}
            castShadow
          >
            <meshStandardMaterial {...body} />
          </RoundedBox>

          {/* The black panel the screen sits on, so the bezel is a surface
              rather than a gap showing the lid's own colour. */}
          <mesh position={[0, 0, LID_T / 2 + 0.0008]}>
            <planeGeometry args={[LID_W * 0.985, LID_H * 0.985]} />
            <meshStandardMaterial color="#0A0A0B" metalness={0.1} roughness={0.35} />
          </mesh>

          {/* The picture. Basic rather than standard, like the phone's: this
              is emitted light, not a lit surface, and shading it would drag
              the studio rig across someone's screenshot. */}
          <mesh position={[0, 0, LID_T / 2 + 0.0016]}>
            <planeGeometry args={[panelW, panelH]} />
            <meshBasicMaterial map={texture ?? undefined} color={texture ? "#FFFFFF" : "#141416"} toneMapped={false} />
          </mesh>

          {showNotch ? (
            <mesh position={[0, panelH / 2 - LID_H * 0.014, LID_T / 2 + 0.0024]}>
              <planeGeometry args={[LID_W * 0.075, LID_H * 0.030]} />
              <meshBasicMaterial color="#000000" toneMapped={false} />
            </mesh>
          ) : null}
        </group>
      </group>
    </group>
  );
}
