"use client";

import { useState } from "react";
import { BLUR_MODES, DEFAULT_BLUR, applyMode, type BlurMode } from "../blurStyles";
import { CAMERA_PRESETS } from "../cameraPresets";
import { isVideoSource } from "../useScreenTexture";
import { DEVICES, getDevice } from "../devices";
import { FINISHES } from "../finishes";
import {
  ColorRow,
  ControlRow,
  InlineSelect,
  PanelSection,
  ParamRow,
  PillButton,
  SwatchGrid,
  Tabs,
  Toggle,
} from "./primitives";
import {
  BACKGROUND_KINDS,
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND,
  type BackgroundKind,
} from "../backgrounds";
import { DEFAULT_EDITOR_STATE, RANGES, type EditorState } from "./editorState";
import type { AnimatableKey } from "../animation";

type SectionId = "source" | "phone" | "mockup" | "camera" | "blur" | "background";

export function RightPanel({
  state,
  onChange,
  sourceSrc,
  onPickSource,
  onClearSource,
  isMirroring,
  canMirror,
  onStartMirror,
  onStopMirror,
  onPair,
  phoneConnected,
  phoneQr,
  phoneSecure,
  phoneReason,
  phoneZeroed,
  liveMotion,
  onToggleLiveMotion,
  onSetZero,
  theme,
  onToggleTheme,
  onResetCamera,
  onResetBlur,
  keyedNow,
  onToggleKey,
}: {
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  sourceSrc: string | null;
  onPickSource: () => void;
  onClearSource: () => void;
  /** A live window capture is currently driving the screen. */
  isMirroring: boolean;
  /** False where the browser has no `getDisplayMedia` — every mobile browser,
      and any insecure context. Hides the control rather than offering a button
      that can only fail. */
  canMirror: boolean;
  onStartMirror: () => void;
  onStopMirror: () => void;
  /** Arms pairing — opens the event stream and fetches the QR. */
  onPair: () => void;
  phoneConnected: boolean;
  /** Inline SVG, generated server-side so there is no image request. */
  phoneQr: string | null;
  phoneSecure: boolean;
  phoneReason: string | null;
  phoneZeroed: boolean;
  liveMotion: boolean;
  onToggleLiveMotion: (next: boolean) => void;
  onSetZero: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onResetCamera: () => void;
  onResetBlur: () => void;
  /** Properties with a keyframe sitting exactly on the playhead. */
  keyedNow: Partial<Record<AnimatableKey, boolean>>;
  onToggleKey: (property: AnimatableKey) => void;
}) {
  const [open, setOpen] = useState<Set<SectionId>>(
    () => new Set<SectionId>(["source", "mockup", "camera", "blur", "background"]),
  );
  const [cameraTab, setCameraTab] = useState<"manual" | "presets">("manual");

  const toggle = (id: SectionId) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isOpen = (id: SectionId) => open.has(id);
  const device = getDevice(state.deviceId);
  const { blur, background } = state;
  const setBackground = (patch: Partial<typeof background>) =>
    onChange({ background: { ...background, ...patch } });

  return (
    <aside
      className="ks-scroll flex h-full w-[var(--ks-panel-w)] shrink-0 flex-col overflow-y-auto rounded-[var(--ks-r-panel)] border px-[var(--ks-panel-pad)]"
      style={{
        background: "var(--ks-surface)",
        borderColor: "var(--ks-line-strong)",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Panel chrome: the theme toggle, on its own. */}
      <div className="flex h-[46px] shrink-0 items-center justify-end">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}
          className="grid h-[22px] w-[22px] place-items-center opacity-60 hover:opacity-100"
          style={{ color: "var(--ks-text-dim)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M11.5 8.4A5 5 0 0 1 5.6 2.5a5 5 0 1 0 5.9 5.9Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* ---------------------------------------------------------- SOURCE */}
      <PanelSection
        title="Source"
        expanded={isOpen("source")}
        onToggle={() => toggle("source")}
      >
        {/* A live mirror outranks the upload in the texture hook, so it has to
            outrank it here too — showing the old still under a running mirror
            would say the phone is displaying something it is not. */}
        {isMirroring ? (
          <div
            className="relative grid h-[132px] w-full place-items-center overflow-hidden rounded-[var(--ks-r)]"
            style={{ background: "var(--ks-ctl)" }}
          >
            <div className="flex flex-col items-center gap-[6px]">
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
              className="absolute right-[8px] top-[8px] grid h-[20px] w-[20px] place-items-center rounded-full"
              style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
            >
              <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 1 9 9M9 1 1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : sourceSrc ? (
          <div
            className="relative h-[132px] w-full overflow-hidden rounded-[var(--ks-r)]"
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
              className="absolute right-[8px] top-[8px] grid h-[20px] w-[20px] place-items-center rounded-full"
              style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
            >
              <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                <path d="M1 1 9 9M9 1 1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPickSource}
            className="flex h-[132px] w-full flex-col items-center justify-center gap-[6px] rounded-[var(--ks-r)] border border-dashed transition-colors"
            style={{ borderColor: "var(--ks-line-strong)", background: "var(--ks-row)" }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color: "var(--ks-text-muted)" }}>
              <path d="M8 11V2.5M5 5.5 8 2.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
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
      </PanelSection>

      {/* ----------------------------------------------------------- PHONE */}
      <PanelSection
        title="Phone"
        expanded={isOpen("phone")}
        onToggle={() => {
          toggle("phone");
          // Opening the section is what arms pairing: closed, nothing fetches
          // a QR and no event stream is held open.
          if (!isOpen("phone")) onPair();
        }}
      >
        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center gap-[6px]">
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: phoneConnected ? "var(--ks-accent)" : "var(--ks-line-strong)" }}
            />
            <span className="ks-label" style={{ color: "var(--ks-text-dim)" }}>
              {phoneConnected ? "Phone connected" : "Scan to connect a phone"}
            </span>
          </div>

          {/* The QR is only a shortcut for typing the LAN URL — the phone still
              has to grant motion access itself, which iOS only allows from a
              tap on the phone. */}
          {phoneQr && !phoneConnected ? (
            <div
              className="mx-auto w-[132px] rounded-[var(--ks-r)] bg-white p-[8px]"
              // The QR is generated server-side as an inline SVG, so there is
              // no image request and nothing to load.
              dangerouslySetInnerHTML={{ __html: phoneQr }}
            />
          ) : null}

          {!phoneSecure ? (
            <p className="ks-micro" style={{ color: "var(--ks-text-faint)", lineHeight: 1.5 }}>
              This page is on http. iOS only releases motion data over https —
              start with <code>npm run dev:https</code>.
            </p>
          ) : null}

          {phoneReason ? (
            <p className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>{phoneReason}</p>
          ) : null}

          {/* Pairing status only. The Manual/Gyro switch lives in Camera,
              beside the rotation rows it replaces. */}
          {phoneConnected ? (
            <p className="ks-micro" style={{ color: "var(--ks-text-faint)", lineHeight: 1.5 }}>
              {liveMotion
                ? "Driving rotation. Switch back to Manual under Camera to use the sliders."
                : "Ready. Switch Camera to Gyro to drive the mockup with it."}
            </p>
          ) : null}
        </div>
      </PanelSection>

      {/* ---------------------------------------------------------- MOCKUP */}
      <PanelSection
        title="Mockup"
        expanded={isOpen("mockup")}
        onToggle={() => toggle("mockup")}
      >
        <div
          className="flex h-[44px] w-full items-center gap-[10px] rounded-[var(--ks-r)] px-[10px]"
          style={{ background: "var(--ks-ctl)" }}
        >
          <span
            className="grid h-[26px] w-[18px] shrink-0 place-items-center rounded-[3px]"
            style={{ background: "var(--ks-badge)" }}
            aria-hidden
          >
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
              <rect x="0.5" y="0.5" width="7" height="12" rx="1.5" stroke="var(--ks-text-faint)" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="ks-label block truncate" style={{ color: "var(--ks-text)" }}>
              {device.label}
            </span>
            <span className="ks-micro block" style={{ color: "var(--ks-text-faint)" }}>
              {device.screenNative.width.toLocaleString()} ×{" "}
              {device.screenNative.height.toLocaleString()}
            </span>
          </span>
          <InlineSelect
            label="Device"
            value={state.deviceId}
            options={DEVICES.map((d) => ({ id: d.id, label: d.label }))}
            onChange={(id) => onChange({ deviceId: id })}
          />
        </div>

        {/* Finish as swatches, not a dropdown: colour is the one property you
            pick by looking at it, and a list of names makes you open a menu
            to compare two greys. */}
        <div className="flex flex-col gap-[6px] pt-[2px]">
          <span className="ks-label" style={{ color: "var(--ks-text-muted)" }}>
            Finish
          </span>
          <div className="flex flex-wrap gap-[6px]">
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

      {/* ---------------------------------------------------------- CAMERA */}
      <PanelSection
        title="Camera"
        expanded={isOpen("camera")}
        onToggle={() => toggle("camera")}
        onReset={onResetCamera}
      >
        <Tabs
          value={cameraTab}
          onChange={setCameraTab}
          options={[
            { id: "manual", label: "Manual" },
            { id: "presets", label: "Presets" },
          ]}
        />

        {cameraTab === "manual" ? (
          <>
            {/* Where the rotation comes from. It lives here, directly above the
                axis rows, because those rows are exactly what it takes over —
                putting it in the Phone section left you reading one part of the
                panel to understand why another had stopped responding. */}
            <div className="mb-[8px] mt-[8px]">
              <Tabs
                value={liveMotion ? "phone" : "manual"}
                onChange={(next) => onToggleLiveMotion(next === "phone")}
                options={[
                  { id: "manual", label: "Manual" },
                  { id: "phone", label: "Gyro" },
                ]}
              />
            </div>

            {liveMotion ? (
              <div className="flex flex-col gap-[8px] pb-[4px]">
                <p className="ks-micro" style={{ color: "var(--ks-text-faint)", lineHeight: 1.5 }}>
                  {phoneConnected
                    ? "Rotation is coming from the phone. Hold it how you want the mockup to sit, then set zero."
                    : "No phone is sending yet — open the Phone section and scan the code."}
                </p>
                {phoneConnected ? (
                  <PillButton onClick={onSetZero}>
                    {phoneZeroed ? "Re-zero" : "Set zero"}
                  </PillButton>
                ) : null}
              </div>
            ) : (
              <>
            <ParamRow label="X axis" hint="Drag" value={state.xAxis} {...RANGES.xAxis} defaultValue={DEFAULT_EDITOR_STATE.xAxis} keyframed={keyedNow.xAxis} onKeyframe={() => onToggleKey("xAxis")} onChange={(xAxis) => onChange({ xAxis })} />
            <ParamRow label="Y axis" hint="Drag" value={state.yAxis} {...RANGES.yAxis} defaultValue={DEFAULT_EDITOR_STATE.yAxis} keyframed={keyedNow.yAxis} onKeyframe={() => onToggleKey("yAxis")} onChange={(yAxis) => onChange({ yAxis })} />
            <ParamRow label="Z axis" value={state.zAxis} {...RANGES.zAxis} defaultValue={DEFAULT_EDITOR_STATE.zAxis} keyframed={keyedNow.zAxis} onKeyframe={() => onToggleKey("zAxis")} onChange={(zAxis) => onChange({ zAxis })} />
              </>
            )}
            <ParamRow label="Zoom" hint="Scroll" value={state.zoom} {...RANGES.zoom} defaultValue={DEFAULT_EDITOR_STATE.zoom} decimals={2} keyframed={keyedNow.zoom} onKeyframe={() => onToggleKey("zoom")} onChange={(zoom) => onChange({ zoom })} />
            {/* No "Space drag" hint on the pans: the canvas only handles
                drag-rotate and wheel-zoom, so panning is these rows only. */}
            <ParamRow label="Pan X" value={state.panX} {...RANGES.panX} defaultValue={DEFAULT_EDITOR_STATE.panX} decimals={2} keyframed={keyedNow.panX} onKeyframe={() => onToggleKey("panX")} onChange={(panX) => onChange({ panX })} />
            <ParamRow label="Pan Y" value={state.panY} {...RANGES.panY} defaultValue={DEFAULT_EDITOR_STATE.panY} decimals={2} keyframed={keyedNow.panY} onKeyframe={() => onToggleKey("panY")} onChange={(panY) => onChange({ panY })} />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-[6px]">
            {CAMERA_PRESETS.map((preset) => (
              <PillButton
                key={preset.id}
                onClick={() =>
                  onChange({
                    xAxis: preset.rotateX,
                    yAxis: preset.rotateY,
                    zAxis: preset.rotateZ,
                    zoom: preset.scale / 100,
                    panX: preset.offsetX / 100,
                    panY: preset.offsetY / 100,
                  })
                }
              >
                {preset.label}
              </PillButton>
            ))}
          </div>
        )}
      </PanelSection>

      {/* ------------------------------------------------------------ BLUR */}
      <PanelSection
        title="Blur"
        expanded={isOpen("blur")}
        onToggle={() => toggle("blur")}
        onReset={onResetBlur}
      >
        <ControlRow label="Mode">
          <InlineSelect
            label="Blur mode"
            value={blur.mode}
            options={BLUR_MODES}
            onChange={(mode: BlurMode) => onChange({ blur: applyMode(blur, mode) })}
          />
        </ControlRow>

        {blur.mode !== "off" ? (
          <>
            <ParamRow
              label="Strength"
              value={blur.strength}
              defaultValue={DEFAULT_BLUR.strength}
              min={0}
              max={100}
              step={1}
              onChange={(strength) => onChange({ blur: { ...blur, strength } })}
            />
            {/* Row order follows the mode, as the frame does: a tilt shift is
                read as strength-then-shape, a radial as strength-then-size. */}
            {blur.mode === "radial" ? (
              <ParamRow
                label="Focus size"
                value={blur.focusSize}
                defaultValue={DEFAULT_BLUR.focusSize}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                onChange={(focusSize) => onChange({ blur: { ...blur, focusSize } })}
              />
            ) : null}
            <ParamRow
              label="Falloff"
              value={blur.falloff}
              defaultValue={DEFAULT_BLUR.falloff}
              min={0}
              max={1}
              step={0.01}
              decimals={2}
              onChange={(falloff) => onChange({ blur: { ...blur, falloff } })}
            />
            <ControlRow label="Bokeh">
              <Toggle
                label="Bokeh"
                checked={blur.bokeh}
                onChange={(bokeh) => onChange({ blur: { ...blur, bokeh } })}
              />
            </ControlRow>

            {blur.mode === "tilt-shift" ? (
              <>
                <ParamRow
                  label="Angle"
                  value={blur.angle}
                  defaultValue={DEFAULT_BLUR.angle}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(angle) => onChange({ blur: { ...blur, angle } })}
                />
                <ParamRow
                  label="Focus size"
                  value={blur.focusSize}
                  defaultValue={DEFAULT_BLUR.focusSize}
                  min={0}
                  max={1}
                  step={0.01}
                  decimals={2}
                  onChange={(focusSize) => onChange({ blur: { ...blur, focusSize } })}
                />
                <ParamRow
                  label="Scan"
                  value={blur.scan}
                  defaultValue={DEFAULT_BLUR.scan}
                  min={0}
                  max={1}
                  step={0.01}
                  decimals={2}
                  onChange={(scan) => onChange({ blur: { ...blur, scan } })}
                />
              </>
            ) : (
              <FocusPad
                x={blur.focusX}
                y={blur.focusY}
                onChange={(focusX, focusY) => onChange({ blur: { ...blur, focusX, focusY } })}
              />
            )}
          </>
        ) : null}
      </PanelSection>

      {/* ------------------------------------------------------ BACKGROUND */}
      <PanelSection
        title="Background"
        expanded={isOpen("background")}
        onToggle={() => toggle("background")}
        onReset={() => onChange({ background: DEFAULT_BACKGROUND })}
      >
        <Tabs
          value={background.kind}
          onChange={(kind: BackgroundKind) => setBackground({ kind })}
          options={BACKGROUND_KINDS}
        />

        {background.kind === "solid" ? (
          <>
            <ColorRow
              label="Colour"
              value={background.color}
              onChange={(color) => setBackground({ color })}
            />
            <SwatchGrid
              label="Background"
              value={background.color}
              options={BACKGROUND_PRESETS}
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

        {background.kind === "transparent" ? (
          <p className="ks-micro py-[6px]" style={{ color: "var(--ks-text-faint)" }}>
            Exports with a transparent background. The chequerboard is the
            editor showing you where there are no pixels.
          </p>
        ) : null}
      </PanelSection>

      <div className="h-[16px] shrink-0" />
    </aside>
  );
}

/**
 * Where the radial blur focuses, picked directly. Two sliders would describe
 * a position; a pad is one, and this is a spatial decision.
 */
function FocusPad({
  x,
  y,
  onChange,
}: {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const [padEl, setPadEl] = useState<HTMLDivElement | null>(null);
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const pick = (clientX: number, clientY: number) => {
    const rect = padEl?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    onChange(clamp01((clientX - rect.left) / rect.width), clamp01((clientY - rect.top) / rect.height));
  };

  return (
    <div className="flex flex-col gap-[6px] pt-[4px]">
      <span className="ks-label" style={{ color: "var(--ks-text-muted)" }}>
        Focus position
      </span>
      {/* The pad itself is a pointer affordance. A 2D position is not a
          slider, and pretending otherwise gives screen readers one value
          for two axes — so the real controls are the paired inputs below,
          which are the standard accessible form of this widget. */}
      <div
        ref={setPadEl}
        aria-hidden
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) pick(event.clientX, event.clientY);
        }}
        className="relative h-[86px] w-full cursor-crosshair rounded-[var(--ks-r)]"
        style={{ background: "var(--ks-ctl)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px" style={{ background: "var(--ks-line)" }} />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px" style={{ background: "var(--ks-line)" }} />
        <span
          className="pointer-events-none absolute h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ left: `${x * 100}%`, top: `${y * 100}%`, borderColor: "var(--ks-accent)" }}
        />
      </div>

      <label className="sr-only">
        Focus position across
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={x}
          onChange={(event) => onChange(Number(event.currentTarget.value), y)}
        />
      </label>
      <label className="sr-only">
        Focus position down
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={y}
          onChange={(event) => onChange(x, Number(event.currentTarget.value))}
        />
      </label>
    </div>
  );
}
