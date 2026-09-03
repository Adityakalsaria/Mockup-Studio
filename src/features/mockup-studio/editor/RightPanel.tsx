"use client";

import { useState } from "react";
import { isVideoSource } from "../useScreenTexture";
import { DEVICES, getDevice } from "../devices";
import { FINISHES } from "../finishes";
import {
  AccentPicker,
  ColorRow,
  ControlRow,
  PanelSection,
  ParamRow,
  PillButton,
  Tabs,
  Toggle,
} from "./primitives";
import {
  BACKGROUND_KINDS,
  DEFAULT_BACKGROUND,
  type BackgroundKind,
} from "../backgrounds";
import { DEFAULT_EDITOR_STATE, RANGES, type EditorState } from "./editorState";
import { MotionPanel } from "./MotionPanel";
import { FOCAL_MAX, FOCAL_MIN, focalFromFov, fovFromFocal } from "../lens";
import { DEFAULT_SHADOW, SHADOW_RANGES } from "../shadow";
import { LIGHTING_PRESETS, type LightingId } from "../lighting";
import type { AccentId } from "./accents";
import { ExportMenu } from "./framing";
import { useLiquidGlass } from "./useLiquidGlass";
import type { Easing } from "../animation";
import { Icon } from "./icons";

type SectionId = "source" | "mockup" | "camera" | "blur" | "background" | "shadow";

export function RightPanel({
  side,
  state,
  onChange,
  sourceSrc,
  onPickSource,
  coverSrc,
  onPickCoverSource,
  onClearCoverSource,
  onClearSource,
  onPickBackgroundImage,
  isMirroring,
  canMirror,
  onStartMirror,
  onStopMirror,
  easing,
  onApplyPreset,
  onExportPng,
  onExportVideo,
  canExportVideo,
  recordProgress,
  theme,
  onToggleTheme,
  accent,
  onAccentChange,
}: {
  /**
   * Which flank this instance is. One component renders both panels rather
   * than two files duplicating every control: the sections differ, the
   * controls inside them do not.
   */
  side: "left" | "right";
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  sourceSrc: string | null;
  onPickSource: () => void;
  /** The second screen's source, for devices with a cover panel. */
  coverSrc: string | null;
  onPickCoverSource: () => void;
  onClearCoverSource: () => void;
  onClearSource: () => void;
  /** Opens the file picker for a background image. */
  onPickBackgroundImage: () => void;
  /** A live window capture is currently driving the screen. */
  isMirroring: boolean;
  /** False where the browser has no `getDisplayMedia` — every mobile browser,
      and any insecure context. Hides the control rather than offering a button
      that can only fail. */
  canMirror: boolean;
  onStartMirror: () => void;
  onStopMirror: () => void;
  /** Passed to the motion previews so they play the easing you have chosen. */
  easing: Easing;
  onApplyPreset: (id: string) => void;
  /** Both moved off the old top bar. */
  onExportPng: () => void;
  onExportVideo: () => void;
  canExportVideo: boolean;
  recordProgress: number | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  accent: AccentId;
  onAccentChange: (next: AccentId) => void;
  /** Properties with a keyframe sitting exactly on the playhead. */
}) {
  const [open, setOpen] = useState<Set<SectionId>>(
    () => new Set<SectionId>(["source", "mockup", "camera", "blur", "background"]),
  );
  // Which half of the right panel is showing. Motion is a browsing task —
  // twenty three cards you scan — and the shot controls are an adjusting one;
  // stacking them in one scroll made both worse.
  const [rightTab, setRightTab] = useState<"shot" | "motion">("shot");
  // Refraction on the panel itself. Falls back to plain frosted glass wherever
  // the browser will not displace a backdrop — see the hook.
  const { ref: glassRef, svg: glassSvg, style: glassStyle } = useLiquidGlass(16);

  const toggle = (id: SectionId) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isOpen = (id: SectionId) => open.has(id);
  const device = getDevice(state.deviceId);
  const { background, shadow } = state;
  const setBackground = (patch: Partial<typeof background>) =>
    onChange({ background: { ...background, ...patch } });
  const setShadow = (patch: Partial<typeof shadow>) =>
    onChange({ shadow: { ...shadow, ...patch } });

  return (
    <aside
      ref={glassRef}
      className="ks-material flex h-full w-full flex-col overflow-hidden rounded-[var(--ks-r-panel)] laptop:w-[var(--ks-panel-w)] laptop:shrink-0"
      style={{
        background: "var(--ks-surface)",
        ...glassStyle,
      }}
    >
      {glassSvg}
      {/* Body scrolls, footer does not: Export has to stay reachable without
          scrolling to the end of twenty three preset cards.

          `data-lenis-prevent` because the app mounts Lenis for smooth
          scrolling at the root, and Lenis takes the wheel for the whole
          document — this panel never received one. It went unnoticed while
          the only tab was short enough not to need scrolling.

          `scrollbar-gutter: stable both-edges` because the bar appears only
          when content overflows, so the usable width changed between a short
          tab and a long one and every control shifted sideways with it.
          `stable` alone fixed the shifting but reserved the space on the right
          only, leaving the content 17px from one edge and 23px from the other
          -- a dead strip you read as the panel being narrower than it is. It
          shows up worst on Motion, where a two column grid puts a card edge
          right against it. `both-edges` mirrors the reservation, so the
          content is centred and identical on every tab and on every platform,
          whether or not the scrollbar overlays. */}
      <div
        data-lenis-prevent
        className="ks-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-[var(--ks-panel-pad)] [scrollbar-gutter:stable_both-edges]">
      {/* Panel chrome: the theme toggle, on the right panel only — two of them
          would be two controls for one piece of state. The left panel keeps
          the empty bar so both columns start their sections at one height. */}
      <div className="flex h-[46px] shrink-0 items-center justify-end">
        {side === "right" ? (
        <div className="flex items-center gap-[var(--ks-space-1)]">
        <AccentPicker accent={accent} theme={theme} onChange={onAccentChange} />
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}
          className="ks-press grid h-[24px] w-[24px] place-items-center opacity-60 hover:opacity-100"
          style={{ color: "var(--ks-text-dim)" }}
        >
          <Icon name={theme === "light" ? "dark" : "light"} />
        </button>
        </div>
        ) : null}
      </div>

      {/* The device: what it is, what is on its screen, what is driving it. */}
      {side === "left" && (
        <>
      {/* ---------------------------------------------------------- SOURCE */}
      <PanelSection
        title="Source"
        expanded={isOpen("source")}
        onToggle={() => toggle("source")}
      >
        {/* Named only when there are two screens to tell apart. On a rigid
            phone there is one image and one set of sliders, and a heading over
            them would be labelling the obvious. */}
        {device.coverScreen ? (
          <span className="ks-micro mb-[6px] block" style={{ color: "var(--ks-text-faint)" }}>
            Inner screen
          </span>
        ) : null}
        {/* A live mirror outranks the upload in the texture hook, so it has to
            outrank it here too — showing the old still under a running mirror
            would say the phone is displaying something it is not. */}
        {isMirroring ? (
          <div
            className="relative grid h-[132px] w-full place-items-center overflow-hidden rounded-[var(--ks-r-card)]"
            style={{ background: "var(--ks-ctl)" }}
          >
            <div className="flex flex-col items-center gap-[8px]">
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: "var(--ks-accent)" }}
              />
              <span className="ks-label" style={{ color: "var(--ks-ctl-text)" }}>
                Mirroring a window
              </span>
              <span className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>
                Live on the phone
              </span>
            </div>
            <button
              type="button"
              onClick={onStopMirror}
              aria-label="Stop mirroring"
              className="absolute right-[8px] top-[8px] grid h-[24px] w-[24px] place-items-center rounded-full"
              style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
            >
              <Icon name="dismiss" />
            </button>
          </div>
        ) : sourceSrc ? (
          <div
            className="relative h-[132px] w-full overflow-hidden rounded-[var(--ks-r-card)]"
            style={{ background: "var(--ks-ctl)" }}
          >
            {/* A video source needs a <video> to preview: an <img> pointed at
                one renders nothing, and the thumbnail is how you confirm the
                right file landed before looking at the phone. Muted, looping
                and inline so it behaves as a preview rather than a player. */}
            {isVideoSource(sourceSrc) ? (
              <video
                src={sourceSrc}
                muted
                loop
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={sourceSrc}
                alt="Screen source"
                className="h-full w-full object-contain"
              />
            )}
            <button
              type="button"
              onClick={onClearSource}
              aria-label="Remove source"
              className="absolute right-[8px] top-[8px] grid h-[24px] w-[24px] place-items-center rounded-full"
              style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
            >
              <Icon name="dismiss" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPickSource}
            className="flex h-[132px] w-full flex-col items-center justify-center gap-[8px] rounded-[var(--ks-r-card)] border border-dashed transition-colors"
            style={{ borderColor: "var(--ks-line-strong)", background: "var(--ks-row)" }}
          >
            <Icon name="upload" />
            <span className="ks-label" style={{ color: "var(--ks-text-dim)" }}>
              Click to upload
            </span>
            <span className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>
              Image or video
            </span>
          </button>
        )}

        {/* Mirror any window the OS will share: a phone mirrored over USB
            (scrcpy, QuickTime), a simulator, or a browser tab. The web cannot
            capture a phone's own screen from the phone, so the desktop picking
            up a mirror window is the whole trick. */}
        {!isMirroring && canMirror ? (
          <div className="mt-[8px]">
            <PillButton onClick={onStartMirror}>Mirror a window</PillButton>
          </div>
        ) : null}

        {/* Nudge on top of the automatic centre-crop. A mirrored window carries
            chrome on one edge only, so the fit lands it low or high; a
            screenshot needs none of this and leaves these at their defaults. */}
        {isMirroring || sourceSrc ? (
          <div className="mt-[12px]">
            <ParamRow
              label="Screen zoom"
              value={state.screenScale}
              {...RANGES.screenScale}
              defaultValue={DEFAULT_EDITOR_STATE.screenScale}
              decimals={2}
              onChange={(screenScale) => onChange({ screenScale })}
            />
            <ParamRow
              label="Screen X"
              value={state.screenOffsetX}
              {...RANGES.screenOffsetX}
              defaultValue={DEFAULT_EDITOR_STATE.screenOffsetX}
              decimals={3}
              onChange={(screenOffsetX) => onChange({ screenOffsetX })}
            />
            <ParamRow
              label="Screen Y"
              value={state.screenOffsetY}
              {...RANGES.screenOffsetY}
              defaultValue={DEFAULT_EDITOR_STATE.screenOffsetY}
              decimals={3}
              onChange={(screenOffsetY) => onChange({ screenOffsetY })}
            />
          </div>
        ) : null}

        {/* A rule between the two, because the pair above and the pair below
            are the same three controls twice and the only thing separating
            them is which image they belong to. */}
        {device.coverScreen ? (
          <div className="mt-[16px] h-px w-full" style={{ background: "var(--ks-line)" }} />
        ) : null}

        {/* The cover panel gets its own upload, and only appears for a device
            that has one. A fold shows different things on its two screens in
            any real screenshot -- binding one source to both would be a mockup
            of a phone mirroring itself. */}
        {device.coverScreen ? (
          <div className="mt-[12px]">
            <span className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>
              Cover screen
            </span>
            {coverSrc ? (
              <div className="relative mt-[6px] h-[92px] overflow-hidden rounded-[var(--ks-r-card)]">
                <img
                  src={coverSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={onClearCoverSource}
                  aria-label="Remove cover source"
                  className="absolute right-[8px] top-[8px] grid h-[24px] w-[24px] place-items-center rounded-full"
                  style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
                >
                  <Icon name="dismiss" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onPickCoverSource}
                className="mt-[6px] flex h-[92px] w-full flex-col items-center justify-center gap-[6px] rounded-[var(--ks-r-card)] border border-dashed transition-colors"
                style={{ borderColor: "var(--ks-line-strong)", background: "var(--ks-row)" }}
              >
                <Icon name="upload" />
                <span className="ks-micro" style={{ color: "var(--ks-text-dim)" }}>
                  Upload for the outer screen
                </span>
              </button>
            )}
          </div>
        ) : null}

        {/* The cover's own nudges. Separate from the three above on purpose:
            those belong to the panel you are composing, and one pair of
            sliders moving two different images would be worse than two. */}
        {device.coverScreen && coverSrc ? (
          <div className="mt-[8px]">
            <ParamRow label="Cover zoom" value={state.coverScale} {...RANGES.coverScale} defaultValue={DEFAULT_EDITOR_STATE.coverScale} decimals={2} onChange={(coverScale) => onChange({ coverScale })} />
            <ParamRow label="Cover X" value={state.coverOffsetX} {...RANGES.coverOffsetX} defaultValue={DEFAULT_EDITOR_STATE.coverOffsetX} decimals={3} onChange={(coverOffsetX) => onChange({ coverOffsetX })} />
            <ParamRow label="Cover Y" value={state.coverOffsetY} {...RANGES.coverOffsetY} defaultValue={DEFAULT_EDITOR_STATE.coverOffsetY} decimals={3} onChange={(coverOffsetY) => onChange({ coverOffsetY })} />
          </div>
        ) : null}
      </PanelSection>

      {/* ---------------------------------------------------------- MOCKUP */}
      <PanelSection
        title="Mockup"
        expanded={isOpen("mockup")}
        onToggle={() => toggle("mockup")}
      >
        {/* A picker again, now that there is more than one thing to pick.
            The row carried the device NAME and nothing else, from when the
            registry had one entry worth showing -- so a laptop could be
            registered and still be unreachable. Same shape as Frame and
            Lighting, for the same reason: a handful of named options is a
            list, and a list belongs in a menu. */}
        <label
          className="relative flex h-[44px] w-full items-center justify-between rounded-[var(--ks-r)] px-[12px]"
          style={{ background: "var(--ks-ctl)" }}
        >
          <span className="ks-label min-w-0 flex-1 truncate" style={{ color: "var(--ks-text)" }}>
            {device.label}
          </span>
          <Icon name="chevronDown" />
          <select
            value={device.id}
            onChange={(event) => onChange({ deviceId: event.currentTarget.value })}
            aria-label="Device"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {DEVICES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        {/* Finish as swatches, not a dropdown: colour is the one property you
            pick by looking at it, and a list of names makes you open a menu
            to compare two greys. */}
        <div className="flex flex-col gap-[8px] pt-[4px]">
          <span className="ks-label" style={{ color: "var(--ks-text-muted)" }}>
            Finish
          </span>
          <div className="flex flex-wrap gap-[8px]">
            {FINISHES.map((f) => {
              const selected = f.id === state.finishId;
              return (
                <button
                  key={f.id}
                  type="button"
                  title={f.label}
                  aria-label={f.label}
                  aria-pressed={selected}
                  onClick={() => onChange({ finishId: f.id })}
                  className="grid h-[24px] w-[24px] place-items-center rounded-full transition-transform hover:scale-110"
                  style={{
                    // The ring sits outside the swatch so selection never
                    // changes the colour area you are actually judging.
                    boxShadow: selected
                      ? "0 0 0 1.5px var(--ks-accent), 0 0 0 3px var(--ks-surface)"
                      : "inset 0 0 0 1px rgba(0,0,0,0.25)",
                  }}
                >
                  <span
                    className="h-full w-full rounded-full"
                    style={{ background: f.color }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </PanelSection>

        </>
      )}

      {side === "right" && (
        <div className="pb-[12px]">
          <Tabs
            value={rightTab}
            onChange={setRightTab}
            options={[
              { id: "shot", label: "Shot" },
              { id: "motion", label: "Motion" },
            ]}
          />
        </div>
      )}

      {side === "right" && rightTab === "motion" ? (
        <MotionPanel easing={easing} onApplyPreset={onApplyPreset} hasFold={Boolean(device.fold)} />
      ) : null}

      {/* The shot: how it moves, what the lens does, what sits behind it. */}
      {side === "right" && rightTab === "shot" && (
        <>
      {/* ---------------------------------------------------------- CAMERA */}
      <PanelSection
        title="Camera"
        expanded={isOpen("camera")}
        onToggle={() => toggle("camera")}
      >
        <>
            <ParamRow label="X axis" value={state.xAxis} {...RANGES.xAxis} defaultValue={DEFAULT_EDITOR_STATE.xAxis} onChange={(xAxis) => onChange({ xAxis })} />
            <ParamRow label="Y axis" value={state.yAxis} {...RANGES.yAxis} defaultValue={DEFAULT_EDITOR_STATE.yAxis} onChange={(yAxis) => onChange({ yAxis })} />
            <ParamRow label="Z axis" value={state.zAxis} {...RANGES.zAxis} defaultValue={DEFAULT_EDITOR_STATE.zAxis} onChange={(zAxis) => onChange({ zAxis })} />
            {/* Only where the model has a hinge. A Fold row on a rigid phone
                would be a control that does nothing, which is worse than a
                missing one -- it invites you to look for the effect. */}
            {device.fold ? (
              <ParamRow label="Fold" value={state.fold} {...RANGES.fold} defaultValue={DEFAULT_EDITOR_STATE.fold} onChange={(fold) => onChange({ fold })} />
            ) : null}
            <ParamRow label="Zoom" value={state.zoom} {...RANGES.zoom} defaultValue={DEFAULT_EDITOR_STATE.zoom} decimals={2} onChange={(zoom) => onChange({ zoom })} />
            {/* No "Space drag" hint on the pans: the canvas only handles
                drag-rotate and wheel-zoom, so panning is these rows only. */}
            <ParamRow label="Pan X" value={state.panX} {...RANGES.panX} defaultValue={DEFAULT_EDITOR_STATE.panX} decimals={2} onChange={(panX) => onChange({ panX })} />
            <ParamRow label="Pan Y" value={state.panY} {...RANGES.panY} defaultValue={DEFAULT_EDITOR_STATE.panY} decimals={2} onChange={(panY) => onChange({ panY })} />
            {/* The lens, in millimetres rather than in degrees.
                The state is a vertical field of view because that is what the
                camera takes, but nobody frames a shot in degrees -- 35 and 85
                mean something, 38 and 16 do not. The conversion is for a
                full-frame back, so the numbers on this slider are the numbers
                on a real lens barrel: 12mm at the wide end, 98mm at the long
                end, and the stage's own default lands on 35. */}
            <ParamRow
              label="Focal length"
              value={focalFromFov(state.fov)}
              min={FOCAL_MIN}
              max={FOCAL_MAX}
              step={1}
              suffix="mm"
              defaultValue={focalFromFov(DEFAULT_EDITOR_STATE.fov)}
              // Not keyframable yet: the frame loop samples the animated keys
              // and does not know about fov, so a key here would be recorded
              // and never played back.
              animatable={false}
              onChange={(mm) => onChange({ fov: fovFromFocal(mm) })}
            />
        </>
      </PanelSection>

      {/* ------------------------------------------------------- LIGHTING */}
      {/* A list in a menu, like Frame and Background type. Five named looks
          are not something you compare side by side; you pick one. */}
      <div className="pb-[12px]">
        <label
          className="relative flex h-[var(--ks-row-h)] w-full items-center justify-between rounded-[var(--ks-r)] px-[var(--ks-ctl-pad)]"
          style={{ background: "var(--ks-ctl)" }}
        >
          <span className="ks-label" style={{ color: "var(--ks-text-dim)" }}>
            Lighting
          </span>
          <span className="ks-label flex items-center gap-[8px]" style={{ color: "var(--ks-ctl-text)" }}>
            {LIGHTING_PRESETS.find((l) => l.id === state.lighting)?.label}
            <Icon name="chevronDown" />
          </span>
          <select
            value={state.lighting}
            onChange={(event) => onChange({ lighting: event.currentTarget.value as LightingId })}
            aria-label="Lighting"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {LIGHTING_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ---------------------------------------------------------- SHADOW */}
      <PanelSection
        title="Shadow"
        expanded={isOpen("shadow")}
        onToggle={() => toggle("shadow")}
      >
        <ControlRow label="Drop shadow">
          <Toggle
            checked={shadow.enabled}
            onChange={(enabled) => setShadow({ enabled })}
            label="Drop shadow"
          />
        </ControlRow>
        {shadow.enabled ? (
          <>
            {/* Angle is where the LIGHT is, so the shadow falls opposite it.
                That is the way every other tool words it and the way anyone
                who has moved a lamp expects it to behave. */}
            {/* Position, blur, spread, colour: the same handful a design
                tool offers, because that is what this is -- the phone's own
                silhouette offset behind it, not a light in the scene. */}
            <ParamRow
              label="Position X"
              value={shadow.offsetX}
              {...SHADOW_RANGES.offsetX}
              suffix="px"
              defaultValue={DEFAULT_SHADOW.offsetX}
              animatable={false}
              onChange={(offsetX) => setShadow({ offsetX })}
            />
            <ParamRow
              label="Position Y"
              value={shadow.offsetY}
              {...SHADOW_RANGES.offsetY}
              suffix="px"
              defaultValue={DEFAULT_SHADOW.offsetY}
              animatable={false}
              onChange={(offsetY) => setShadow({ offsetY })}
            />
            <ParamRow
              label="Blur"
              value={shadow.blur}
              {...SHADOW_RANGES.blur}
              suffix="px"
              defaultValue={DEFAULT_SHADOW.blur}
              animatable={false}
              onChange={(blur) => setShadow({ blur })}
            />
            <ParamRow
              label="Spread"
              value={shadow.spread}
              {...SHADOW_RANGES.spread}
              suffix="px"
              defaultValue={DEFAULT_SHADOW.spread}
              animatable={false}
              onChange={(spread) => setShadow({ spread })}
            />
            <ParamRow
              label="Opacity"
              value={shadow.opacity}
              {...SHADOW_RANGES.opacity}
              decimals={2}
              defaultValue={DEFAULT_SHADOW.opacity}
              animatable={false}
              onChange={(opacity) => setShadow({ opacity })}
            />
            <ColorRow
              label="Colour"
              value={shadow.color}
              onChange={(color) => setShadow({ color })}
            />
          </>
        ) : null}
      </PanelSection>

      {/* ------------------------------------------------------ BACKGROUND */}
      <PanelSection
        title="Background"
        expanded={isOpen("background")}
        onToggle={() => toggle("background")}
      >
        {/* A row, not a five-segment strip.
            Five segments across 288px gave each one 55px, so every label was
            set in type too small to sit beside the rest of the panel and the
            strip read as a band of noise above the controls that matter. A
            segmented control is for two or three choices you compare; five
            mutually exclusive modes are a list, and a list belongs in a menu.
            It also matches Frame directly above it, which does the same job. */}
        <label
          className="relative flex h-[var(--ks-row-h)] w-full items-center justify-between rounded-[var(--ks-r)] px-[var(--ks-ctl-pad)]"
          style={{ background: "var(--ks-ctl)" }}
        >
          <span className="ks-label" style={{ color: "var(--ks-text-dim)" }}>
            Type
          </span>
          <span className="ks-label flex items-center gap-[8px]" style={{ color: "var(--ks-ctl-text)" }}>
            {BACKGROUND_KINDS.find((k) => k.id === background.kind)?.label}
            <Icon name="chevronDown" />
          </span>
          <select
            value={background.kind}
            onChange={(event) =>
              setBackground({ kind: event.currentTarget.value as BackgroundKind })
            }
            aria-label="Background type"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {BACKGROUND_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>

        {background.kind === "solid" ? (
          <>
            <ColorRow
              label="Colour"
              value={background.color}
              onChange={(color) => setBackground({ color })}
            />
          </>
        ) : null}

        {background.kind === "gradient" ? (
          <>
            <ColorRow
              label="From"
              value={background.gradientFrom}
              onChange={(gradientFrom) => setBackground({ gradientFrom })}
            />
            <ColorRow
              label="To"
              value={background.gradientTo}
              onChange={(gradientTo) => setBackground({ gradientTo })}
            />
            <ParamRow
              label="Angle"
              value={background.gradientAngle}
              defaultValue={DEFAULT_BACKGROUND.gradientAngle}
              min={0}
              max={360}
              step={1}
              animatable={false}
              onChange={(gradientAngle) => setBackground({ gradientAngle })}
            />
          </>
        ) : null}

        {background.kind === "dots" ? (
          <>
            <ColorRow
              label="Base"
              value={background.color}
              onChange={(color) => setBackground({ color })}
            />
            <ColorRow
              label="Dots"
              value={background.dotColor}
              onChange={(dotColor) => setBackground({ dotColor })}
            />
            <ParamRow
              label="Spacing"
              value={background.dotSize}
              defaultValue={DEFAULT_BACKGROUND.dotSize}
              min={4}
              max={40}
              step={1}
              animatable={false}
              onChange={(dotSize) => setBackground({ dotSize })}
            />
          </>
        ) : null}

        {background.kind === "image" ? (
          <div className="flex flex-col gap-[8px]">
            {background.imageSrc ? (
              <div
                className="relative h-[96px] w-full overflow-hidden rounded-[var(--ks-r-card)]"
                style={{ background: "var(--ks-ctl)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={background.imageSrc}
                  alt="Background"
                  className="h-full w-full"
                  style={{ objectFit: background.imageFit }}
                />
                <button
                  type="button"
                  onClick={() => setBackground({ imageSrc: null })}
                  aria-label="Remove background image"
                  className="ks-press absolute right-[8px] top-[8px] grid h-[24px] w-[24px] place-items-center rounded-full"
                  style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
                >
                  <Icon name="dismiss" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onPickBackgroundImage}
                className="ks-press flex h-[96px] w-full flex-col items-center justify-center gap-[8px] rounded-[var(--ks-r-card)] border border-dashed"
                style={{ borderColor: "var(--ks-line-strong)", background: "var(--ks-row)" }}
              >
                <Icon name="upload" />
                <span className="ks-label" style={{ color: "var(--ks-text-dim)" }}>
                  Choose an image
                </span>
              </button>
            )}

            <Tabs
              value={background.imageFit}
              onChange={(imageFit) => setBackground({ imageFit })}
              options={[
                { id: "cover" as const, label: "Fill" },
                { id: "contain" as const, label: "Fit" },
              ]}
            />

            {/* Only meaningful under "Fit", where the image does not reach the
                edges and something has to be behind it. */}
            {background.imageFit === "contain" ? (
              <ColorRow
                label="Behind"
                value={background.color}
                onChange={(color) => setBackground({ color })}
              />
            ) : null}
          </div>
        ) : null}

        {background.kind === "transparent" ? (
          <p className="ks-micro py-[8px]" style={{ color: "var(--ks-text-faint)" }}>
            Exports with a transparent background. The chequerboard is the
            editor showing you where there are no pixels.
          </p>
        ) : null}
      </PanelSection>

      <div className="h-[16px] shrink-0" />
        </>
      )}
      </div>

      {side === "right" ? (
        <div className="shrink-0 px-[var(--ks-panel-pad)] pb-[12px] pt-[4px]">
          <ExportMenu
            onExportPng={onExportPng}
            onExportVideo={onExportVideo}
            canExportVideo={canExportVideo}
            recordProgress={recordProgress}
          />
        </div>
      ) : null}
    </aside>
  );
}

/**
 * Where the radial blur focuses, picked directly. Two sliders would describe
 * a position; a pad is one, and this is a spatial decision.
 */
