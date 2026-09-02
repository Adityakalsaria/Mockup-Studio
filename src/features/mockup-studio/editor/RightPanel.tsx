"use client";

import { useState } from "react";
import { isVideoSource } from "../useScreenTexture";
import type { BroadcastLink } from "../broadcast/useBroadcastLink";
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

type SectionId = "source" | "phone" | "mockup" | "camera" | "blur" | "background" | "shadow";

export function RightPanel({
  side,
  state,
  onChange,
  sourceSrc,
  onPickSource,
  onClearSource,
  onPickBackgroundImage,
  isMirroring,
  broadcast,
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
  onClearSource: () => void;
  /** Opens the file picker for a background image. */
  onPickBackgroundImage: () => void;
  /** A live window capture is currently driving the screen. */
  isMirroring: boolean;
  /** The direct iPhone broadcast: pairing QR, connection state, controls. */
  broadcast: BroadcastLink;
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
                {broadcast.stream ? "Broadcasting from iPhone" : "Mirroring a window"}
              </span>
              <span className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>
                Live on the phone
              </span>
              {broadcast.stream ? (
                <span
                  className="ks-micro"
                  style={{ color: "var(--ks-text-faint)", fontVariantNumeric: "tabular-nums" }}
                >
                  {broadcast.diagnostics.frameSize ?? "no frames yet"} ·{" "}
                  {Math.round(broadcast.diagnostics.bytesReceived / 1024)} KB
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={broadcast.stream ? broadcast.stop : onStopMirror}
              aria-label={broadcast.stream ? "Stop broadcasting" : "Stop mirroring"}
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

        {/* Direct from the iPhone, over the LAN.
            The app scans this code and opens a WebRTC connection straight to
            this browser — the signalling below is a few kilobytes of text
            through /api/broadcast, and the frames never touch the server. */}
        {!isMirroring ? (
          <div className="mt-[8px]">
            {broadcast.state === "idle" || broadcast.state === "failed" ? (
              <PillButton onClick={broadcast.start}>Broadcast from iPhone</PillButton>
            ) : null}

            {broadcast.state === "pairing" ? (
              <span className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>
                Opening a session…
              </span>
            ) : null}

            {(broadcast.state === "waiting" || broadcast.state === "connecting") &&
            broadcast.qr ? (
              <div
                className="flex flex-col items-center gap-[8px] rounded-[var(--ks-r-card)] p-[12px]"
                style={{ background: "var(--ks-row)" }}
              >
                <div
                  className="h-[116px] w-[116px] [&>svg]:h-full [&>svg]:w-full"
                  // The QR is an inline SVG from the pairing route, not user
                  // input: it is generated server-side from an address this
                  // machine reported about itself.
                  dangerouslySetInnerHTML={{ __html: broadcast.qr }}
                />
                <span className="ks-micro" style={{ color: "var(--ks-text-dim)" }}>
                  {broadcast.state === "connecting"
                    ? "Connecting…"
                    : "Scan in the Mockup Studio app"}
                </span>
                <BroadcastDiagnostics broadcast={broadcast} />
                <button
                  type="button"
                  onClick={broadcast.stop}
                  className="ks-micro underline"
                  style={{ color: "var(--ks-text-faint)" }}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {broadcast.state === "failed" && broadcast.reason ? (
              <span
                className="ks-micro mt-[6px] block"
                style={{ color: "var(--ks-text-faint)" }}
              >
                {broadcast.reason}
              </span>
            ) : null}
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
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center gap-[8px]">
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
              className="mx-auto w-[132px] rounded-[var(--ks-r-card)] bg-white p-[8px]"
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
        <MotionPanel easing={easing} onApplyPreset={onApplyPreset} />
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
            <ParamRow label="X axis" value={state.xAxis} {...RANGES.xAxis} defaultValue={DEFAULT_EDITOR_STATE.xAxis} onChange={(xAxis) => onChange({ xAxis })} />
            <ParamRow label="Y axis" value={state.yAxis} {...RANGES.yAxis} defaultValue={DEFAULT_EDITOR_STATE.yAxis} onChange={(yAxis) => onChange({ yAxis })} />
            <ParamRow label="Z axis" value={state.zAxis} {...RANGES.zAxis} defaultValue={DEFAULT_EDITOR_STATE.zAxis} onChange={(zAxis) => onChange({ zAxis })} />
              </>
            )}
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

/**
 * Why a broadcast is not showing.
 *
 * Every stage of a WebRTC connection can look fine while the next one is dead,
 * and none of it surfaces on its own — the symptom is always the same blank
 * phone. Each row here is a stage, so the first one that is not green is the
 * one to fix.
 */
function BroadcastDiagnostics({ broadcast }: { broadcast: BroadcastLink }) {
  const d = broadcast.diagnostics;
  const flowing = d.bytesReceived > 0;

  const rows: Array<{ label: string; value: string; ok: boolean }> = [
    { label: "Offer sent", value: d.offerSent ? "yes" : "no", ok: d.offerSent },
    {
      label: "Phone answered",
      value: d.answerApplied ? "yes" : "waiting",
      ok: d.answerApplied,
    },
    {
      label: "Candidates",
      value: `${d.localCandidates} sent · ${d.remoteCandidates} got`,
      ok: d.localCandidates > 0 && d.remoteCandidates > 0,
    },
    { label: "ICE", value: d.ice, ok: d.ice === "connected" || d.ice === "completed" },
    { label: "Connection", value: d.connection, ok: d.connection === "connected" },
    { label: "Track", value: d.trackReceived ? "received" : "none", ok: d.trackReceived },
    {
      label: "Video",
      value: flowing
        ? `${d.frameSize ?? "?"} · ${d.framesDecoded} frames`
        : "no data",
      ok: flowing,
    },
  ];

  return (
    <div className="mt-[10px] flex w-full flex-col gap-[3px]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-[8px]">
          <span className="ks-micro" style={{ color: "var(--ks-text-faint)" }}>
            {row.label}
          </span>
          <span
            className="ks-micro"
            style={{
              color: row.ok ? "var(--ks-accent)" : "var(--ks-text-faint)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}

      {/* The one failure mode that looks like every other failure mode. */}
      {d.mdns && !flowing ? (
        <span
          className="ks-micro mt-[6px] leading-[1.4]"
          style={{ color: "var(--ks-text-faint)" }}
        >
          This browser is hiding its local address behind an mDNS name, which the
          phone may not resolve. In Chrome, set
          chrome://flags/#enable-webrtc-hide-local-ips-with-mdns to Disabled.
        </span>
      ) : null}
    </div>
  );
}
