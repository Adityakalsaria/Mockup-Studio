"use client";

/**
 * What one keyframe is, and how to change it.
 *
 * Opens the moment a key is pressed, because selecting a keyframe and then
 * hunting for where its numbers live is two gestures for one intention — you
 * clicked the key because you wanted to do something to it.
 *
 * Three things belong to a key and nothing else does: WHEN it happens, WHAT
 * pose it holds, and HOW the animation leaves it. The first two are rows here.
 * The third is a span rather than a point — it is the curve between this key
 * and the next — so it is a press that hands over to the span's own menu
 * rather than a control crammed in beside the other two, and the two menus are
 * deliberately never open at once.
 */

import {
  Glass,
  Header,
  HeaderButton,
  ParamRow,
  Row,
  RowGroup,
  TrashIcon,
} from "@/design/ui";
import { CurveThumb } from "./EasingMenu";
import {
  formatTime,
  type AnimatableKey,
  type Easing,
  type Keyframe,
} from "../animation";
import { RANGES } from "../editor/editorState";

/**
 * How each channel reads.
 *
 * The same suffixes the craft panel uses, because a keyframe on Rotation Y is
 * a view of the same number the Transform popup shows — 40 there and "40" here
 * with no degree sign would look like two different quantities.
 */
const UNIT: Partial<Record<AnimatableKey, (n: number) => string>> = {
  xAxis: (n) => `${Math.round(n)}°`,
  yAxis: (n) => `${Math.round(n)}°`,
  zAxis: (n) => `${Math.round(n)}°`,
  fov: (n) => `${Math.round(n)}°`,
  zoom: (n) => `${n.toFixed(2)}×`,
  fold: (n) => `${Math.round(n)}%`,
};

export function KeyframeMenu({
  channel,
  label,
  frame,
  duration,
  easing,
  onValue,
  onTime,
  onEasing,
  onDelete,
}: {
  channel: AnimatableKey;
  label: string;
  frame: Keyframe;
  duration: number;
  /** The curve leaving this key, already resolved against the clip default. */
  easing: Easing;
  onValue: (value: number) => void;
  onTime: (time: number) => void;
  onEasing: () => void;
  onDelete: () => void;
}) {
  const range = RANGES[channel as keyof typeof RANGES] ?? {
    min: 0,
    max: 1,
    step: 0.01,
  };
  const format = UNIT[channel] ?? ((n: number) => n.toFixed(2));

  return (
    <Glass>
      {/* The time is the key's name — there is one of these per channel per
          moment, so "Y axis" alone would not say which. */}
      <Header
        trailing={
          <HeaderButton label="Delete keyframe" onClick={onDelete}>
            <TrashIcon />
          </HeaderButton>
        }
      >
        {label} · {formatTime(frame.time)}
      </Header>
      <ParamRow
        label="Value"
        value={frame.value}
        min={range.min}
        max={range.max}
        step={range.step}
        format={format}
        onChange={onValue}
      />
      {/*
        Time as a slider as well as a drag. Dragging is how you place a key by
        eye; this is how you place one at 1.60 exactly, which is the half of it
        a lane cannot do at any zoom.
      */}
      <ParamRow
        label="Time"
        value={frame.time}
        min={0}
        max={duration}
        step={0.01}
        format={(n) => formatTime(n)}
        onChange={onTime}
      />
      <RowGroup>
        <Row icon={<CurveThumb easing={easing} />} onClick={onEasing}>
          Easing
        </Row>
      </RowGroup>
    </Glass>
  );
}
