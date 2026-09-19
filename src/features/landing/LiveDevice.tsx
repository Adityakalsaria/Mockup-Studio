"use client";

/**
 * The studio's own renderer, on the landing page.
 *
 * Not a picture of Mocraft: this is `PhoneStage3D`, the same scene the studio
 * draws, fed a pose and a screen. Everything the page claims about devices,
 * lighting and motion is therefore something the product visibly does.
 *
 * Mounted only while near the viewport. Every live stage is a WebGL context,
 * and a browser keeps a small handful of those before it starts dropping the
 * oldest -- so a chapter that has scrolled well away gives its context back.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import PhoneStage3D from "@/features/mockup-studio/PhoneStage3D";
import { useScreenTexture } from "@/features/mockup-studio/useScreenTexture";
import { DEFAULT_BLUR, type BlurSettings } from "@/features/mockup-studio/blurStyles";
import { DEFAULT_SHADOW, type ShadowSettings } from "@/features/mockup-studio/shadow";
import type { LightingId } from "@/features/mockup-studio/lighting";
import type { Animation } from "@/features/mockup-studio/animation";
import { getMotionPreset, type Pose } from "@/features/mockup-studio/editor/motionPresets";
import { DEFAULT_EDITOR_STATE } from "@/features/mockup-studio/editor/editorState";

export const SCREENS = "/figma-assets/mockup-studio/screen-presets";

/**
 * The signed link the device models load through -- see `lib/modelToken`. The
 * landing page is public, so its server component mints one and hands it down
 * here; without it every live device would be refused.
 */
export const ModelTokenContext = createContext<string | null>(null);

/**
 * A design the visitor dropped onto the page, as a data URL -- the same form
 * the studio reads an upload into. While it is set, every live device on the
 * page shows it instead of its sample screen.
 */
export const UserScreenContext = createContext<{ screen: string | null; setScreen: (src: string | null) => void }>({
  screen: null,
  setScreen: () => {},
});

/** The studio's opening pose: front-on, centred, with a margin. */
export const FRONT: Pose = {
  xAxis: DEFAULT_EDITOR_STATE.xAxis,
  yAxis: DEFAULT_EDITOR_STATE.yAxis,
  zAxis: DEFAULT_EDITOR_STATE.zAxis,
  zoom: DEFAULT_EDITOR_STATE.zoom,
  panX: 0,
  panY: 0,
  panZ: 0,
  fold: 0,
  fov: DEFAULT_EDITOR_STATE.fov,
};

export const usePrefersReducedMotion = () => useReducedMotion() ?? false;

/** True while the element is within `margin` of the viewport. */
export function useNear<T extends HTMLElement>(margin = "60%") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: margin,
    });
    io.observe(node);
    return () => io.disconnect();
  }, [margin]);
  return [ref, near] as const;
}

export type LiveDeviceProps = {
  deviceId?: string;
  finishId?: string;
  screen?: string;
  pose?: Partial<Pose>;
  lighting?: LightingId;
  shadow?: ShadowSettings;
  /** A motion preset from the studio, played when the stage first comes into view. */
  preset?: string;
  /** Replay the preset for as long as the stage stays in view. */
  loop?: boolean;
  /** Pause between loops, in seconds. */
  rest?: number;
  /** Degrees added to the pose after any preset -- pointer parallax, a scroll turn. */
  tilt?: { x?: number; y?: number };
  blur?: BlurSettings;
  /** Direct handling, as in the studio: drag on the canvas to turn the device. */
  onRotateDrag?: (delta: { dx: number; dy: number }) => void;
  className?: string;
};

export function LiveDevice({
  deviceId,
  finishId,
  screen = `${SCREENS}/dark.png`,
  pose,
  lighting = "studio",
  shadow = DEFAULT_SHADOW,
  preset,
  loop = false,
  rest = 1.2,
  tilt,
  blur,
  onRotateDrag,
  className = "",
}: LiveDeviceProps) {
  const [ref, near] = useNear<HTMLDivElement>();
  const { screen: userScreen } = useContext(UserScreenContext);
  const modelToken = useContext(ModelTokenContext);
  return (
    <div ref={ref} className={`${/\babsolute\b/.test(className) ? "" : "relative"} ${className}`}>
      {near ? (
        <Stage
          deviceId={deviceId}
          finishId={finishId}
          screen={userScreen ?? screen}
          pose={{ ...FRONT, ...pose }}
          lighting={lighting}
          shadow={shadow}
          preset={preset}
          loop={loop}
          rest={rest}
          tilt={tilt}
          blur={blur}
          onRotateDrag={onRotateDrag}
          modelToken={modelToken}
        />
      ) : null}
    </div>
  );
}

function Stage({
  deviceId,
  finishId,
  screen,
  pose,
  lighting,
  shadow,
  preset,
  loop,
  rest,
  tilt,
  blur = DEFAULT_BLUR,
  onRotateDrag,
  modelToken,
}: Omit<LiveDeviceProps, "pose" | "className"> & { pose: Pose; screen: string; modelToken: string | null }) {
  const noSource = useRef<HTMLElement>(null);
  const screenTexture = useScreenTexture(noSource, screen);
  const reduced = usePrefersReducedMotion();
  const timeRef = useRef(0);
  const [running, setRunning] = useState(false);

  /*
   * The preset is built from the pose the stage rests at, exactly as the studio
   * builds it from the current shot, so the move ends on the composition.
   * Waits for the screen: an entrance that lands on a blank glass is the one
   * frame nobody should see.
   */
  const presetKey = preset && !reduced && screenTexture ? preset : null;
  const poseKey = JSON.stringify(pose);
  const animation = useMemo<Animation | undefined>(() => {
    const found = presetKey ? getMotionPreset(presetKey) : undefined;
    return found ? { ...found.build(JSON.parse(poseKey) as Pose), easing: { kind: "smooth" } } : undefined;
  }, [presetKey, poseKey]);

  useEffect(() => {
    if (!animation) return;
    let raf = 0;
    let last = 0;
    const cycle = animation.durationSec + (loop ? (rest ?? 0) : 0);
    const tick = (now: number) => {
      if (!last) {
        timeRef.current = 0;
        setRunning(true);
      } else {
        timeRef.current += (now - last) / 1000;
      }
      last = now;
      if (timeRef.current >= cycle) {
        if (!loop) {
          timeRef.current = animation.durationSec;
          setRunning(false);
          return;
        }
        timeRef.current -= cycle;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animation, loop, rest]);

  const playing = running && animation !== undefined;

  return (
    <div className="absolute inset-0" style={{ opacity: screenTexture ? 1 : 0, transition: "opacity var(--duration-slow) var(--ease-out)" }}>
      <PhoneStage3D
        rail={undefined}
        screenTexture={screenTexture}
        deviceId={deviceId}
        finishId={finishId}
        blur={blur}
        fold={pose.fold}
        onRotateDrag={onRotateDrag}
        modelToken={modelToken}
        rotateX={pose.xAxis + (tilt?.x ?? 0)}
        rotateY={pose.yAxis + (tilt?.y ?? 0)}
        rotateZ={pose.zAxis}
        fov={pose.fov}
        offsetX={pose.panX * 100}
        offsetY={pose.panY * 100}
        offsetZ={pose.panZ}
        scale={pose.zoom * 100}
        heightPct={100}
        lighting={lighting}
        shadow={shadow}
        animation={animation}
        timeRef={timeRef}
        playing={playing}
        animating={playing}
        immediate={playing}
      />
    </div>
  );
}
