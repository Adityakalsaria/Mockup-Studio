"use client";

import { useCallback, useMemo, useRef } from "react";
import { RANGES } from "./editorState";

/**
 * A viewport gizmo for a stage that turns the OBJECT, not the camera.
 *
 * ---------------------------------------------------------------------------
 * Why this is not drei's GizmoHelper
 * ---------------------------------------------------------------------------
 *
 * The obvious build is `<GizmoHelper><GizmoViewport/></GizmoHelper>`, which is
 * three lines and wrong here. That component reads the CAMERA's orientation
 * and, on click, flies the camera to a new position -- it needs orbit controls
 * to write through to, and this studio has none. The camera sits still and
 * `xAxis`/`yAxis`/`zAxis` rotate the device group. Pointed at this scene it
 * would show a cube that never moves however far the phone is turned.
 *
 * ---------------------------------------------------------------------------
 * Why it is SVG rather than WebGL
 * ---------------------------------------------------------------------------
 *
 * A gizmo is six dots and three lines. Rendering it in three would mean either
 * a second WebGL context -- a whole renderer, for a widget -- or a corner
 * viewport inside the stage canvas, which then has to be kept out of every
 * export, out of the depth-of-field pass, and woken on a frameloop that is
 * deliberately on demand.
 *
 * Projecting the axes by hand costs a dozen lines and sidesteps all of it. The
 * maths is not an approximation of what the scene does; it is the same Euler,
 * in the same XYZ order, so the gizmo cannot drift from the thing it reports.
 */

/** Degrees to radians, often enough to be worth naming. */
const RAD = Math.PI / 180;

/**
 * The six named views, as poses.
 *
 * Derived from the model convention rather than guessed: these files put the
 * screen on local -Z, which is why the stage opens at `yAxis: 180` and why
 * FRONT is a half turn rather than zero. Each was verified by rotating the
 * unit axes through `Euler(x, y, z, "XYZ")` -- the same order the stage
 * applies -- and checking which one lands on +Z, the direction the camera
 * looks from.
 */
const VIEWS = {
  front: { label: "Front", pose: { xAxis: 0, yAxis: 180, zAxis: 0 } },
  back: { label: "Back", pose: { xAxis: 0, yAxis: 0, zAxis: 0 } },
  right: { label: "Right", pose: { xAxis: 0, yAxis: -90, zAxis: 0 } },
  left: { label: "Left", pose: { xAxis: 0, yAxis: 90, zAxis: 0 } },
  top: { label: "Top", pose: { xAxis: 90, yAxis: 180, zAxis: 0 } },
  bottom: { label: "Bottom", pose: { xAxis: -90, yAxis: 180, zAxis: 0 } },
} as const;

/**
 * The arms, in local space.
 *
 * Coloured by axis on the usual convention -- X warm, Y green, Z blue -- but
 * LABELLED by what the face is, because "the +X face" is not a thing anyone
 * asks to see and "Right" is.
 */
const ARMS = [
  { key: "right", dir: [1, 0, 0], color: "#e35d6a", solid: true },
  { key: "left", dir: [-1, 0, 0], color: "#e35d6a", solid: false },
  { key: "top", dir: [0, 1, 0], color: "#66c07a", solid: true },
  { key: "bottom", dir: [0, -1, 0], color: "#66c07a", solid: false },
  { key: "back", dir: [0, 0, 1], color: "#5b8def", solid: true },
  { key: "front", dir: [0, 0, -1], color: "#5b8def", solid: false },
] as const;

const SIZE = 84;
const R = 27;

function clamp(value: number, { min, max }: { min: number; max: number }) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Rotate a local direction by the stage's Euler, XYZ order.
 *
 * Written out rather than pulled from three so this file stays free of the
 * renderer: it is a panel widget, and importing a 700kB library to multiply
 * three matrices would put three in the bundle for anyone who never opens the
 * 3D stage at all.
 */
function rotate(dir: readonly number[], x: number, y: number, z: number) {
  const [sx, cx] = [Math.sin(x * RAD), Math.cos(x * RAD)];
  const [sy, cy] = [Math.sin(y * RAD), Math.cos(y * RAD)];
  const [sz, cz] = [Math.sin(z * RAD), Math.cos(z * RAD)];
  let [a, b, c] = dir;
  // Z, then Y, then X -- the order three composes 'XYZ' in.
  [a, b] = [a * cz - b * sz, a * sz + b * cz];
  [a, c] = [a * cy + c * sy, -a * sy + c * cy];
  [b, c] = [b * cx - c * sx, b * sx + c * cx];
  return [a, b, c] as const;
}

export type AxisGizmoProps = {
  xAxis: number;
  yAxis: number;
  zAxis: number;
  onChange: (patch: { xAxis?: number; yAxis?: number; zAxis?: number }) => void;
};

export function AxisGizmo({ xAxis, yAxis, zAxis, onChange }: AxisGizmoProps) {
  /*
   * A drag has to be told apart from a click, and the only honest test is
   * distance travelled: a click that moves three pixels is still a click, and
   * treating it as a drag makes the knobs feel broken on a trackpad.
   */
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);

  const arms = useMemo(() => {
    return ARMS.map((arm) => {
      const [x, y, depth] = rotate(arm.dir, xAxis, yAxis, zAxis);
      return {
        ...arm,
        // SVG's Y grows downward; the scene's grows up.
        cx: SIZE / 2 + x * R,
        cy: SIZE / 2 - y * R,
        depth,
      };
      // Painter's algorithm: the far arms are drawn first so the near ones
      // overlap them, which is the only depth cue a flat widget gets.
    }).sort((a, b) => a.depth - b.depth);
  }, [xAxis, yAxis, zAxis]);

  const onPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, moved: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const from = drag.current;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      from.moved += Math.abs(dx) + Math.abs(dy);
      from.x = event.clientX;
      from.y = event.clientY;
      /*
       * Horizontal drags yaw, vertical drags pitch -- and vertical is
       * inverted, because dragging the top of the gizmo away from you should
       * tip the top of the device away from you.
       */
      onChange({
        yAxis: clamp(yAxis + dx * 0.8, RANGES.yAxis),
        xAxis: clamp(xAxis - dy * 0.8, RANGES.xAxis),
      });
    },
    [onChange, xAxis, yAxis],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  }, []);

  const snap = useCallback(
    (key: keyof typeof VIEWS) => {
      // Swallowed if the pointer travelled: the knob was a handle, not a
      // target.
      if ((drag.current?.moved ?? 0) > 4) return;
      onChange(VIEWS[key].pose);
    },
    [onChange],
  );

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="Orientation. Drag to turn the device, or click a face to snap to it."
    >
      {arms.map((arm) => (
        <line
          key={`arm-${arm.key}`}
          x1={SIZE / 2}
          y1={SIZE / 2}
          x2={arm.cx}
          y2={arm.cy}
          stroke={arm.color}
          strokeWidth={1.5}
          strokeLinecap="round"
          // Arms pointing away are dimmed rather than hidden, so the widget
          // still reads as three axes and not as a scatter of dots.
          opacity={arm.solid ? 0.9 : 0.35}
        />
      ))}
      {arms.map((arm) => {
        const near = arm.depth >= 0;
        return (
          <g
            key={`knob-${arm.key}`}
            className="cursor-pointer"
            onPointerUp={(event) => {
              event.stopPropagation();
              snap(arm.key);
            }}
          >
            <title>{VIEWS[arm.key].label}</title>
            <circle
              cx={arm.cx}
              cy={arm.cy}
              r={near ? 8.5 : 6.5}
              fill={arm.solid ? arm.color : "#1b1b1d"}
              stroke={arm.color}
              strokeWidth={1.5}
              opacity={near ? 1 : 0.55}
            />
            {/* Only the near labels, and only on the solid ends. Six words on
                an 84px widget is unreadable, and the far ones are the three
                the user cannot see anyway. */}
            {near && arm.solid ? (
              <text
                x={arm.cx}
                y={arm.cy + 2.6}
                textAnchor="middle"
                fontSize={7.5}
                fontWeight={700}
                fill="#101012"
                style={{ pointerEvents: "none" }}
              >
                {VIEWS[arm.key].label[0]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export default AxisGizmo;
