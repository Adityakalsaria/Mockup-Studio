"use client";

/**
 * The canvas the chrome floats over.
 *
 * `StudioChrome` had a comment where this goes — "The stage goes here. Left
 * empty on purpose: this file is the chrome, and the canvas is a different
 * problem with a different owner." This is that owner.
 *
 * The frame the shot is composed inside is a rounded rectangle in the middle of
 * the dotted workspace, and the panels sit OVER it rather than beside it. That
 * is not a layout accident: the whole material is a refracting glass, and glass
 * with nothing behind it is a grey rectangle. The chrome is legible over the
 * shot because it bends the shot.
 *
 * `container-type: size` is what lets the frame size itself off the workspace
 * in CSS — `cqw`/`cqh` are the two numbers needed to fit a ratio inside a box,
 * and reading them here avoids a resize observer that would re-render the whole
 * scene on every drag of the window edge. Same technique as the editor's.
 */

import { memo, useEffect, useRef, useState } from "react";
import PhoneStage3D, { type ScreenBox } from "../PhoneStage3D";
import { OverlayLayer } from "../OverlayLayer";
import { backgroundClass, backgroundCss, BACKGROUND_CATEGORIES } from "../backgrounds";
import BackgroundImage from "../BackgroundImage";
import { isOverlayActive } from "../overlay";
import type { Studio } from "./useStudio";
import { sampleAnimation } from "../animation";
import {
  poseOf,
  projectWorld,
  toPhone,
  toScreen,
  type FocusArea,
  type FocusPose,
} from "./focusMath";
import { Group, Vector3 } from "three";
import type { SnapGuides } from "./snapping";
import { DEFAULT_BLUR, isBlurActive, type BlurSettings } from "../blurStyles";
import { pickPasteTarget } from "./pasteTarget";
import { screenDepthTune } from "./screenDepthTune";
import {
  MenuPopover,
  Icon,
  ImageWell,
  ScreenAdjust,
  ToggleRow,
  type MenuItem,
} from "./StudioChrome";
import { CircleButton, Header, ParamGroup, Divider, ColorRow } from "@/design/ui";

/** Width of the screen's right-click menu -- narrower than `control.panelW`,
    the width every slider/colour popup in `StudioChrome` opens at, since this
    one is just two one-line labels. See its anchor div for why it needs one
    at all. */
const CONTEXT_MENU_W = 160;

/** Width of the Canvas background quick panel -- wide enough for the image
    well `ImageWell`/`ScreenAdjust` already assume, which is what forces this
    one wider than the right-click menu above despite both using the same
    synthetic-anchor trick to open beside a fixed point instead of a real,
    already-sized trigger. */
const BG_PANEL_W = 260;
/** Clear space between the button and the popup it opens -- the popup used
    to sit flush against the button/canvas edge, with nothing to say the two
    were separate surfaces. */
const BG_PANEL_GAP = 20;

/**
 * How much workspace is left around the canvas.
 *
 * Enough that the dot grid reads as a surface the frame is sitting on, and not
 * so much that the shot is a stamp in the middle of it. The panels overlap it
 * either way — see above.
 */
export const INSET = 40;

/**
 * How much of the room the frame actually takes.
 *
 * `min(100cqw, ratio * 100cqh)` is the largest the shot could be, and the
 * largest is not the right size: it left the composition running edge to edge
 * under the chrome with no ground showing, so the panels had nothing to sit on
 * and the shot read as the page rather than as something placed on it.
 *
 * A fraction rather than a bigger inset, because a fixed margin is a different
 * proportion on every window — 40px around a laptop screen and 40px around a
 * 27-inch one are not the same picture. This holds the same margin at any size.
 *
 * Fill is exempt: it is the one ratio whose name is a promise about the room it
 * takes.
 */
export const FRAME = 0.82;

function StageInner({
  studio,
  modelToken = null,
  focusDrawing = false,
}: {
  studio: Studio;
  /** Signed link for the device models — see `lib/modelToken`. */
  modelToken?: string | null;
  /** The Focus points panel is open: drags on the shot draw areas. */
  focusDrawing?: boolean;
}) {
  const {
    state,
    ratio,
    screenTexture,
    coverTexture,
    playing,
    playheadRef,
    exporting,
    presetId,
    motionMode,
    screenSrc,
    coverSrc,
    uploadScreen,
    uploadCover,
  } = studio;

  // Where the model's own screen(s) really are, reported by PhoneStage3D once
  // it has measured them -- used by `ScreenPlaceholderLayer` below for the
  // right-click replace/delete menu's hit-testing (the empty-screen outline
  // itself has been removed, see that component).
  const [screenBox, setScreenBox] = useState<{
    main: ScreenBox | null;
    cover: ScreenBox | null;
  }>({ main: null, cover: null });
  // The phone's own group, live -- read straight off it instead of rebuilt
  // from state, because the phone eases toward the state on a spring rather
  // than ever equalling it exactly. See `focusMath.projectWorld`.
  const liveGroupRef = useRef<Group | null>(null);

  // The corner "Screen image" quick panel's own trigger and synthetic anchor
  // -- mirrors `bgAnchor`/`bgAnchorRef` below exactly, just opening on the
  // opposite corner of the shot.
  const [imgAnchor, setImgAnchor] = useState<{ left: number; top: number } | null>(null);
  const imgAnchorRef = useRef<HTMLDivElement | null>(null);

  // The Canvas background quick panel's own trigger and synthetic anchor --
  // see the button's own comment for why it isn't `MenuPopover`'s normal
  // anchor-is-the-trigger setup. `shotRef` is the shot frame itself: the
  // panel lines up with ITS edges, not the button's, so the gap reads as
  // clear space beside the canvas rather than beside a 44px circle sitting
  // 12px inside it.
  const shotRef = useRef<HTMLDivElement | null>(null);
  const bgAnchorRef = useRef<HTMLDivElement | null>(null);
  const [bgAnchor, setBgAnchor] = useState<{ left: number; top: number } | null>(null);

  /*
   * Off the SHOT's own frame, always the same `BG_PANEL_GAP` -- not clamped
   * against the rail. A clamp here was tried first, to stop the popup
   * landing on the rail at a narrow window, but the rail is drawn OVER the
   * shot by design (see this file's own header comment) and `MenuPopover`
   * always paints above the rest of the chrome (`z-index: 100`) regardless
   * of what it lands on -- so there is nothing left for a clamp to protect
   * against, and one only pulled the popup away from the canvas edge it is
   * supposed to track. Only a window-edge floor remains, for the popup's
   * own sake, not the rail's.
   */
  const computeImgAnchor = () => {
    const rect = shotRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const left = Math.max(8, rect.left - BG_PANEL_GAP - BG_PANEL_W);
    return { left, top: rect.top - 4 };
  };

  /*
   * Off the SHOT's own frame, not the button's box: the gap is clear space
   * beside the canvas, and the panel's top edge lines up with the canvas's
   * own -- see `computeImgAnchor` above for why this no longer clamps
   * against the right dock either.
   */
  const computeBgAnchor = () => {
    const rect = shotRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const left = Math.min(rect.right + BG_PANEL_GAP, window.innerWidth - 8 - BG_PANEL_W);
    // Less `MenuPopover`'s own 4px drop below whatever it's anchored to, so
    // the panel's top edge lands ON the canvas's rather than 4px under it.
    return { left, top: rect.top - 4 };
  };

  /*
   * Re-placed on resize, not just computed once at open -- a browser zoom
   * change fires `resize` exactly like a window drag does, and either one
   * can move the shot's edge relative to the rail/dock without this popup
   * hearing about it otherwise. Left open at its old, now-wrong spot, it
   * could land on top of the very panel it is meant to stop short of.
   * Closed anchors stay closed; only an open one is re-measured.
   */
  useEffect(() => {
    const onResize = () => {
      setImgAnchor((current) => (current ? computeImgAnchor() : null));
      setBgAnchor((current) => (current ? computeBgAnchor() : null));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /*
   * Paste an image straight onto whichever screen is empty -- no panel has to
   * be open. One listener for the whole stage: Crafting and Motion share this
   * single mount (see `StudioChrome`), so there is nowhere else it would need
   * to live twice.
   *
   * Left alone if the paste landed in a text field -- the hex colour field,
   * any future text input -- so this never steals a normal paste elsewhere in
   * the studio.
   */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      // `event.target` is only ever an Element for a real paste triggered
      // somewhere on the page -- it is `window` itself for the rare paste
      // with nothing focused at all, and `Window` has no `.closest`.
      const target = event.target;
      if (target instanceof Element) {
        if (target.closest("input, textarea, [contenteditable='true']")) return;
      }
      const item = Array.from(event.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      const screen = pickPasteTarget({
        screenSrc,
        coverSrc,
        hasCover: Boolean(studio.device.coverScreen),
      });
      if (!screen) return;
      event.preventDefault();
      (screen === "main" ? uploadScreen : uploadCover)(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [screenSrc, coverSrc, studio.device.coverScreen, uploadScreen, uploadCover]);

  /*
   * The pose follows the playhead while the transport runs AND while a video
   * is being written.
   *
   * Those are two different things and it cost an export to find out. The
   * stage samples the animation only when it is told something is playing,
   * and `exportVideo` deliberately calls `setPlaying(false)` first -- it
   * drives time itself, one frame at a time, so that the file does not
   * inherit this machine's stutters. The two together meant the recorder
   * advanced the playhead 75 times and the phone never once looked at it:
   * every frame of the clip was the same static pose, at the right length,
   * which is precisely the shape of bug that survives being watched.
   *
   * The third case is a preset simply being applied. The head can be parked
   * anywhere -- paused mid-clip, dropped by a scrub, resting on the last frame
   * -- and in every one of those the phone has to show the frame the timeline
   * says it is showing. Without it a scrub moves the marker and nothing else,
   * and a finished clip snaps back to the pre-preset pose.
   *
   * `immediate` rides along for the same reason it does during playback: the
   * spring is a lag filter, and a filter on top of frame-exact export would
   * smear each keyframe a fifth of a second late.
   */
  /* Motion is the only tab that shows the clip; Crafting shows the rest
     pose, as the device was set before anything moved it. */
  const timeDriven =
    exporting?.kind === "video" ||
    (motionMode &&
      (playing ||
        presetId !== null ||
        // Any keys at all, not only a preset's: a composed focus move or keys
        // set by hand have to follow a scrub too. Gated on the preset alone, a
        // scrub moved the depth of field -- which samples the clip itself --
        // and left the phone standing still.
        Object.values(state.animation.tracks).some(
          (keys) => keys && keys.length > 0,
        )));
  /* Each tab's own depth of field: Motion's travels with its moves. */
  const blur = motionMode ? (state.motionBlur ?? DEFAULT_BLUR) : state.blur;

  return (
    <div
      className="absolute inset-0 grid place-items-center"
      /*
       * No margin at Fill, and the inset at every other ratio.
       *
       * Fill means the whole surface: at a ratio the shot is an object sitting
       * on a workspace and wants ground around it, but Fill is the workspace,
       * and a 40px band of dot grid around it would be a frame it did not ask
       * for.
       */
      style={{ containerType: "size", padding: ratio === null ? 0 : INSET }}
      // No browser menu over the shot: "Save Image As" / "Copy Image" would
      // hand out the render outside the studio's export (and its
      // watermark). Scoped to the stage -- text fields elsewhere keep theirs.
      onContextMenu={(event) => event.preventDefault()}
    >
      {/*
        The canvas fills its frame by CSS, not by the pixel size R3F last
        measured. The frame changes size -- eased when the timeline comes and
        goes, at once when the ratio changes -- and R3F's measurement trails it
        by a few frames; sized in pixels, the canvas sat at the OLD size inside
        the new frame for those frames, cropped and off centre, then snapped.

        CONTAIN, not stretch: stretched, the last render took the new frame's
        proportions and a ratio change squashed the phone flat for those
        frames. Contained, it keeps its shape and is only scaled until the new
        render lands. The canvas is transparent, so the space around it is the
        frame's own background and shows nothing. Exports read the drawing
        buffer, so they are untouched.
      */}
      <style>{`.mo-shot canvas { width: 100% !important; height: 100% !important; object-fit: contain; }`}</style>
      <div
        ref={shotRef}
        className={`mo-shot relative overflow-hidden ${backgroundClass(state.background)}`}
        style={{
          // Square at Fill: a corner is what tells you where a shot ends, and
          // at Fill it ends at the window.
          borderRadius: ratio === null ? 0 : "var(--mo-r-panel)",
          ...backgroundCss(state.background),
          ...(ratio === null
            ? { width: "100%", height: "100%" }
            : {
                aspectRatio: String(ratio),
                // Whichever of the two constraints binds first wins, so the
                // frame always fits and never overflows.
                width: `calc(min(100cqw, ${ratio} * 100cqh) * ${FRAME})`,
              }),
        }}
      >
        <BackgroundImage bg={state.background} />
        <PhoneStage3D
          rail={undefined}
          /* The two doors export goes through: one frame on demand for the
             still, and a held-open resolution for the clip. Both are refs the
             scene fills in — see `CaptureBridge` and `RecorderBridge`. */
          captureRef={studio.captureRef}
          recorderRef={studio.recorderRef}
          focusFollow={motionMode ? (state.focusFollow ?? null) : null}
          canvasRef={studio.stageCanvasRef}
          screenTexture={screenTexture}
          coverTexture={coverTexture}
          deviceId={state.deviceId}
          modelToken={modelToken}
          finishId={state.finishId}
          blur={blur}
          rotateX={state.xAxis}
          rotateY={state.yAxis}
          rotateZ={state.zAxis}
          fov={state.fov}
          fold={state.fold}
          cardRadius={state.cardRadius}
          cardDepth={state.cardDepth}
          shadow={state.shadow}
          lighting={state.lighting}
          lightAngle={state.lightAngle ?? 0}
          lightElevation={state.lightElevation ?? 0}
          coverScreenFit={studio.coverFit}
          screenFit={{
            ...studio.screenFit,
            // A mirrored device screen already contains its own island.
            sourceHasNotch: Boolean(studio.liveStream),
          }}
          offsetX={state.panX * 100}
          offsetY={state.panY * 100}
          offsetZ={state.panZ}
          scale={state.zoom * 100}
          scaleX={state.scaleX}
          scaleY={state.scaleY}
          scaleZ={state.scaleZ}
          heightPct={100}
          /*
           * Easing is a lag filter — right for a slider nudge, wrong for
           * playback, where it would smear every keyframe a fifth of a second
           * late and round off the poses a preset was authored around.
           */
          immediate={timeDriven}
          animation={state.animation}
          timeRef={playheadRef}
          playing={timeDriven}
          /* The clock is RUNNING — only true for the transport, never for a
             parked head or a frame-at-a-time export, both of which drive time
             themselves. It is what keeps the demand loop asking. */
          animating={playing}
          /*
           * Direct handling. `PhoneStage3D` mounts its pointer listener only
           * when a handler is passed, so without these the model is a picture:
           * the drag and the wheel have nothing on the canvas to reach.
           */
          onRotateDrag={studio.nudgeRotation}
          onScaleWheel={studio.nudgeZoom}
          onPanDrag={studio.nudgePan}
          onScreenBox={setScreenBox}
          liveGroupRef={liveGroupRef}
        />

        {/* Right-click-to-replace/delete on a filled screen only -- the
            empty-screen outline/icon/text this used to also draw is gone. */}
        <ScreenPlaceholderLayer
          studio={studio}
          box={screenBox}
          liveGroupRef={liveGroupRef}
          onPick={(target, file) =>
            (target === "main" ? uploadScreen : uploadCover)(file)
          }
        />

        {/*
          Over the phone by definition — a layer blur is composited on top of
          the shot, and putting it under the canvas would make it a background,
          which the Background layer already is.

          AFTER the phone, and with no z-index: paint order is what lifts it
          now. `raise` exists because the alternative was containing a stray
          `z-10`, and the only way to contain one is a stacking context on this
          frame — which composites the stage as its own group and stops the
          chrome's `backdrop-filter` from sampling it. The popups lost their
          frost every time that was tried.
        */}
        {isOverlayActive(state.overlay) ? (
          <OverlayLayer overlay={state.overlay} raise={false} />
        ) : null}

        <SnapGuideLayer guides={studio.guides} />
        {focusDrawing ? <FocusLayer studio={studio} /> : null}
        {isBlurActive(blur) ? (
          <FocusGuide blur={blur} pinned={studio.focusPicking} />
        ) : null}
        {/* After the guide, so its handles sit on top of the lines they slide
            along rather than under them. */}
        {studio.focusPicking ? <FocusPickLayer studio={studio} /> : null}
        {/* Quick access to the screen image, right on the surface it fills --
            the empty-screen outline used to live for exactly this, drawn over
            the screen itself; this is its replacement now that outline is
            gone. Same popover-on-a-corner-button pattern as Canvas
            background opposite it, mirrored rather than a plain file-picker
            trigger, so zoom/fit and (on a foldable) the cover screen are
            reachable here too, not just from the right rail. */}
        <div
          className="pointer-events-auto absolute"
          style={{ top: 12, left: 12 }}
        >
          <CircleButton
            title="Screen image"
            onClick={() => {
              if (imgAnchor) {
                setImgAnchor(null);
                return;
              }
              setImgAnchor(computeImgAnchor());
            }}
          >
            <Icon name="add-image" />
          </CircleButton>
        </div>
        {imgAnchor ? (
          <>
            <div
              ref={imgAnchorRef}
              style={{
                position: "fixed",
                left: imgAnchor.left,
                top: imgAnchor.top,
                width: BG_PANEL_W,
                height: 0,
              }}
            />
            <MenuPopover
              anchor={imgAnchorRef}
              label="Screen image"
              placement="below"
              onClose={() => setImgAnchor(null)}
            >
              <ScreenImageFields studio={studio} onClose={() => setImgAnchor(null)} />
            </MenuPopover>
          </>
        ) : null}

        {/* The Canvas background row used to be the only way in; this is the
            quicker one, right on the surface it edits, so its colour and
            image live under an icon rather than a scroll down the right
            panel. Its own popover, not `openLayer`'s -- that one docks
            beside the right rail, which reads as unrelated to an icon
            sitting on the shot itself. */}
        <div
          className="pointer-events-auto absolute"
          style={{ top: 12, right: 12 }}
        >
          <CircleButton
            title="Canvas background"
            onClick={() => {
              if (bgAnchor) {
                setBgAnchor(null);
                return;
              }
              setBgAnchor(computeBgAnchor());
            }}
          >
            <Icon name="canvas-color" />
          </CircleButton>
        </div>
        {bgAnchor ? (
          <>
            <div
              ref={bgAnchorRef}
              style={{
                position: "fixed",
                left: bgAnchor.left,
                top: bgAnchor.top,
                width: BG_PANEL_W,
                height: 0,
              }}
            />
            <MenuPopover
              anchor={bgAnchorRef}
              label="Canvas background"
              placement="below"
              onClose={() => setBgAnchor(null)}
            >
              <BackgroundFields studio={studio} onClose={() => setBgAnchor(null)} />
            </MenuPopover>
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A rounded rectangle's outline, as points in the box's own LOCAL x/y units --
 * real 3D rounding, not a 2D screen-space trick drawn after the fact. Each
 * point still goes through the actual perspective projection like the four
 * plain corners used to, so the rounding stays correct at any tilt instead of
 * only looking right face-on. `stroke-linejoin="round"` alone (rounding where
 * the dashes meet) was too subtle to read as a rounded screen at all.
 *
 * `radiusFrac` is the device's own `screenCornerRadiusPct` -- the same number
 * `ScreenPlane` multiplies by screen width to round the real screen content --
 * so the hint's corners land on the actual modelled radius instead of a
 * guessed one that happens to look fine on whichever device it was eyeballed
 * against.
 */
function roundedRectLocal(b: ScreenBox, radiusFrac: number): [number, number][] {
  const r = b.w * radiusFrac;
  const x0 = b.cx - b.w / 2 + r;
  const x1 = b.cx + b.w / 2 - r;
  const y0 = b.cy - b.h / 2 + r;
  const y1 = b.cy + b.h / 2 - r;
  const STEPS = 6;
  const points: [number, number][] = [];
  const arc = (cx: number, cy: number, from: number, to: number) => {
    for (let i = 0; i <= STEPS; i++) {
      const t = from + ((to - from) * i) / STEPS;
      points.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
  };
  const PI = Math.PI;
  arc(x0, y0, PI, PI * 1.5); // bottom-left
  arc(x1, y0, PI * 1.5, PI * 2); // bottom-right
  arc(x1, y1, 0, PI * 0.5); // top-right
  arc(x0, y1, PI * 0.5, PI); // top-left
  return points;
}

/** Ray casting, for the right-click menu below: is `(px, py)` inside the
    screen's own projected outline, in the same fractional [0,1] space its
    corners are already in. */
function pointInPolygon(px: number, py: number, corners: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const a = corners[i];
    const b = corners[j];
    const crosses = a.y > py !== b.y > py;
    if (crosses && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * The Canvas background popup's fields, exactly as `StudioChrome`'s own
 * `background` layer defines them (colour, Transparent, then the image well
 * and its fit/zoom) -- read and written straight off `studio.state`/
 * `studio.edit`, the same two things that layer's own popup uses, so the two
 * can never drift into disagreeing about what a colour or an image means.
 */
function BackgroundFields({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const { state, edit } = studio;
  const bg = state.background;
  return (
    <div className="flex flex-col" style={{ gap: "var(--mo-space-4)" }}>
      <Header icon={<Icon name="canvas-color" />} closeIcon={<Icon name="close-rounded" />} onClose={onClose}>
        Canvas background
      </Header>
      <ParamGroup>
        <ColorRow
          label="Color"
          value={bg.color}
          onChange={(hex) =>
            edit((prev) => ({ ...prev, background: { ...prev.background, kind: "solid", color: hex } }))
          }
        />
        <ToggleRow
          label="Transparent"
          value={bg.kind === "transparent"}
          onChange={(on) =>
            edit((prev) => ({
              ...prev,
              background: { ...prev.background, kind: on ? "transparent" : "solid" },
            }))
          }
        />
      </ParamGroup>
      <Divider />
      <ParamGroup title="Presets">
        <BackgroundPresets
          selected={bg.kind === "image" ? bg.imageSrc : null}
          onPick={studio.pickBackground}
        />
      </ParamGroup>
      <Divider />
      <ParamGroup title="Image">
        <ImageWell
          src={bg.kind === "image" ? bg.imageSrc : null}
          empty="No background image"
          onPick={studio.uploadBackground}
          onClear={studio.clearBackground}
        />
        <ScreenAdjust
          scale={bg.imageZoom ?? 1}
          mode={bg.imageFit === "contain" ? "fit" : "fill"}
          canReset={(bg.imageZoom ?? 1) !== 1}
          onScale={(imageZoom) =>
            edit((prev) => ({ ...prev, background: { ...prev.background, imageZoom } }))
          }
          onMode={(mode) =>
            edit((prev) => ({
              ...prev,
              background: { ...prev.background, imageFit: mode === "fit" ? "contain" : "cover" },
            }))
          }
          onReset={() =>
            edit((prev) => ({ ...prev, background: { ...prev.background, imageZoom: 1 } }))
          }
        />
      </ParamGroup>
    </div>
  );
}

/** Corner of a backdrop chip: a well's corner, scaled to a chip a third its
    height, so it reads as a small picture rather than a colour swatch. */
const PRESET_CHIP_R = 10;
const PRESET_GAP = 8;
/**
 * Three and a half rows of chips, then the grid scrolls. The half row is the
 * point: a category of wallpapers can run to dozens, and a row cut through
 * its middle says there is more below where a clean edge would not.
 */
const PRESET_GRID_MAX = 3.5 * 52 + 3 * PRESET_GAP;

/**
 * The ready-made backdrops: a row of categories, then that category's chips,
 * four to a row.
 *
 * Categories as small text chips rather than a segmented switch, because the
 * switch divides its width evenly and the list grows -- three gradient sets
 * today, and each imported wallpaper set adds one. The row scrolls sideways
 * when it outgrows the panel.
 *
 * Opens on whichever category holds the backdrop already on the canvas, so
 * reopening the panel shows the choice that was made.
 *
 * Chips of the picture itself, not names: a backdrop is chosen by eye. The
 * name rides on the title for anyone who hovers. The selected one carries an
 * ink ring held off the chip by a gap -- an outline, so the gap is the glass
 * itself -- which reads on the light chips and the dark ones alike. Hover is
 * a small lift and nothing else.
 */
function BackgroundPresets({
  selected,
  onPick,
}: {
  selected: string | null;
  onPick: (src: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(
    () =>
      BACKGROUND_CATEGORIES.find((c) => c.items.some((i) => i.src === selected))?.id ??
      BACKGROUND_CATEGORIES[0]?.id,
  );
  const category =
    BACKGROUND_CATEGORIES.find((c) => c.id === categoryId) ?? BACKGROUND_CATEGORIES[0];
  if (!category) return null;

  return (
    <div className="flex flex-col" style={{ gap: PRESET_GAP }}>
      {BACKGROUND_CATEGORIES.length > 1 ? (
        <div
          role="tablist"
          aria-label="Background categories"
          className="mo-noscroll flex overflow-x-auto"
          style={{
            gap: 4,
            // Fades the far edge, so a chip running under it reads as more
            // to scroll to rather than as a label cut short.
            WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
            maskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
          }}
        >
          {BACKGROUND_CATEGORIES.map((c) => {
            const on = c.id === category.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setCategoryId(c.id)}
                className="mo-code shrink-0 cursor-pointer whitespace-nowrap transition-colors duration-150"
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--mo-r-pill)",
                  background: on ? "var(--mo-field)" : "transparent",
                  color: on ? "var(--mo-ink)" : "var(--mo-ink-muted)",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div
        role="tabpanel"
        className="mo-noscroll overflow-y-auto"
        /* Room for the selected ring, which sits outside the chip -- the
           scroller clips on both axes, so without it the outer chips' rings
           were cut. The margin hands the room back. */
        style={{ maxHeight: PRESET_GRID_MAX + 8, padding: 4, margin: -4 }}
      >
        <div className="grid grid-cols-4" style={{ gap: PRESET_GAP }}>
          {category.items.map((preset) => {
            const on = preset.src === selected;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                aria-label={`${preset.label} background`}
                aria-pressed={on}
                onClick={() => onPick(preset.src)}
                className="aspect-square w-full cursor-pointer transition-transform duration-150 ease-out hover:scale-[1.04]"
                style={{
                  borderRadius: PRESET_CHIP_R,
                  backgroundImage: `url(${preset.thumb})`,
                  backgroundSize: "cover",
                  border: "var(--mo-swatch-edge)",
                  outline: on ? "1.5px solid var(--mo-ink)" : undefined,
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The corner "Screen image" popup's fields -- the same well/adjust pair the
 * right rail's own "image" tool panel shows for the screen (and, on a
 * foldable, the cover screen below it), read and written off the same
 * `studio` calls/`state` fields so the two can never disagree about what
 * image or fit is showing.
 */
function ScreenImageFields({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const { state, edit } = studio;
  return (
    <div className="flex flex-col" style={{ gap: "var(--mo-space-4)" }}>
      <Header icon={<Icon name="add-image" />} closeIcon={<Icon name="close-rounded" />} onClose={onClose}>
        Screen image
      </Header>
      <ParamGroup>
        <ImageWell
          src={studio.screenSrc}
          empty="No screen yet"
          onPick={studio.uploadScreen}
          onClear={studio.clearScreen}
        />
        <ScreenAdjust
          scale={state.screenScale}
          mode={state.screenFitMode ?? "fill"}
          canReset={
            state.screenScale !== 1 || state.screenOffsetX !== 0 || state.screenOffsetY !== 0
          }
          onScale={(screenScale) => edit((prev) => ({ ...prev, screenScale }))}
          onMode={(screenFitMode) => edit((prev) => ({ ...prev, screenFitMode }))}
          onReset={() =>
            edit((prev) => ({ ...prev, screenScale: 1, screenOffsetX: 0, screenOffsetY: 0 }))
          }
        />
      </ParamGroup>
      {studio.device.coverScreen ? (
        <>
          <Divider />
          <ParamGroup title="Front screen">
            <ImageWell
              src={studio.coverSrc}
              empty="No front screen yet"
              onPick={studio.uploadCover}
              onClear={studio.clearCover}
            />
            <ScreenAdjust
              scale={state.coverScale}
              mode={state.coverFitMode ?? "fill"}
              canReset={
                state.coverScale !== 1 || state.coverOffsetX !== 0 || state.coverOffsetY !== 0
              }
              onScale={(coverScale) => edit((prev) => ({ ...prev, coverScale }))}
              onMode={(coverFitMode) => edit((prev) => ({ ...prev, coverFitMode }))}
              onReset={() =>
                edit((prev) => ({ ...prev, coverScale: 1, coverOffsetX: 0, coverOffsetY: 0 }))
              }
            />
          </ParamGroup>
        </>
      ) : null}
    </div>
  );
}

/**
 * Right-click on a screen that already has an image: "Replace image" /
 * "Delete image". No longer draws anything of its own -- the empty-screen
 * outline/icon/"Click to add image" text this used to also render over an
 * empty screen was removed (it kept coming out wrong across the laptops and
 * the iMac at steep angles); this component still exists to track where the
 * screen(s) project to on screen, in whichever pose the phone is currently
 * in, purely so a right-click can be tested against that shape.
 *
 * Positioned with the same rig `FocusLayer` uses (`focusMath`'s `pose`/
 * `toScreen`), because it is the same problem: a box that lives on the phone,
 * tracked wherever the phone's current rotation/zoom/pan put it on screen.
 */
function ScreenPlaceholderLayer({
  studio,
  box,
  liveGroupRef,
  onPick,
}: {
  studio: Studio;
  /** Where the model's own screen(s) measured out to -- see `PhoneStage3D`'s
      `onScreenBox`. `null` for a screen the device doesn't have, or hasn't
      finished measuring yet. */
  box: { main: ScreenBox | null; cover: ScreenBox | null };
  /** The phone's own group, live -- see `StageInner`. */
  liveGroupRef: React.RefObject<Group | null>;
  onPick: (target: "main" | "cover", file: File) => void;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [aspect, setAspect] = useState(1);
  const mainInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;
    const measure = () =>
      setAspect(node.clientHeight ? node.clientWidth / node.clientHeight : 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const foldPct = studio.state.fold ?? 0;
  // A screen the device HAS, whether or not it currently holds an image --
  // tracked regardless of fill state, since the right-click menu is only
  // relevant once a screen stops being empty.
  const mainPresent = Boolean(box.main);
  const coverPresent = Boolean(box.cover) && Boolean(studio.device.coverScreen);
  const fov = studio.state.fov ?? 35;
  const cornerRadiusPct = studio.device.screenCornerRadiusPct ?? 0;

  type Projected = {
    corners: { x: number; y: number }[];
    center: { x: number; y: number };
    facing: number;
  };
  const [shown, setShown] = useState<{ main: Projected | null; cover: Projected | null }>({
    main: null,
    cover: null,
  });

  /*
   * Projected fresh every frame while there is a candidate screen to draw
   * over -- not only while Motion plays, unlike `FocusLayer`'s equivalent
   * tick -- and the ONLY place `liveGroupRef` is read: refs are for effects,
   * not render, so the projection is computed here and only its RESULT
   * (plain numbers) becomes state for the render below to use.
   *
   * Rebuilding the projection from `EditorState` (as `FocusLayer` does)
   * would only ever show the phone's TARGET pose. The phone itself eases
   * toward that target on a spring (`PhoneScene`'s own frame loop, driven by
   * a drag or a nudge, not by Motion) rather than snapping to it, so the two
   * would visibly disagree for as long as the spring was still moving -- the
   * placeholder jumping to where the phone was headed instead of riding
   * along with it. Reading the live group's actual position/rotation/scale,
   * the same object that spring writes into, removes the gap entirely
   * rather than narrowing it.
   */
  useEffect(() => {
    // Nothing to project -- and nothing to reset either: `shown` is only
    // ever read back gated on fill state (for the right-click menu), so
    // stale coordinates sitting in state from before an image was uploaded,
    // or from after the device changed, are never used regardless of
    // whether this effect bothers clearing them out. Gated on presence, not
    // emptiness -- a filled screen still needs its outline tracked for the
    // right-click menu to hit-test.
    if (!mainPresent && !coverPresent) return;
    let raf = 0;
    const project = (g: Group | null, b: ScreenBox): Projected => {
      // Local point -> world, off the SAME transform PhoneScene's spring is
      // driving. Mirrors `focusMath.place`'s own arithmetic exactly, just
      // sourced from the live object instead of a `FocusPose`.
      const worldOf = (x: number, y: number, z: number) =>
        g
          ? new Vector3(x * g.scale.x, y * g.scale.y, z * g.scale.z)
              .applyEuler(g.rotation)
              .add(g.position)
          : new Vector3(x, y, z);
      /*
       * `zAt` bilinearly interpolates Z across the four corners
       * (`b.tlZ`/`trZ`/`blZ`/`brZ`) rather than assuming one constant depth
       * -- present only on devices `screenOutlinePad` is set for (see
       * `cornerZs` in `PhoneStage3D.tsx`), absent everywhere else, where this
       * is exactly `b.z` as before. A screen mounted with a genuine recline
       * (the iMac, by design) truly has a different Z at its top edge than
       * its bottom; a laptop screen mesh whose single measured extreme lands
       * on a trim detail rather than the glass needs the corners read
       * independently to avoid that trim skewing the whole plane -- and,
       * since that glass can curve across X as well as Y, needs all four
       * corners rather than just a top and a bottom to get right.
       */
      const zAt = (x: number, y: number) => {
        if (b.tlZ == null || b.trZ == null || b.blZ == null || b.brZ == null || !b.w || !b.h) {
          return b.z;
        }
        /*
         * Combined with, not replaced by, whatever's locked in `devices.ts`
         * (`Device.screenZGain`/`screenZBias`) -- the panel's own neutral is
         * 1 for gain (multiplied) and 0 for bias (added), so leaving both
         * sliders untouched reproduces the locked device exactly, and moving
         * either one keeps tuning FROM that lock rather than fighting it or
         * going dead once a device has one. A straight `b.zGain ?? tune`
         * either/or was tried first and was wrong: locking a device made its
         * sliders stop doing anything at all, which is what looked like the
         * lock not having taken effect while dialling in a steeper angle.
         */
        const zGain = (b.zGain ?? 1) * screenDepthTune.zGain;
        const zBias = (b.zBias ?? 0) + screenDepthTune.zBias;
        const avg = (b.tlZ + b.trZ + b.blZ + b.brZ) / 4;
        const tune = (z: number) => avg + (z - avg) * zGain + zBias;
        const tl = tune(b.tlZ);
        const tr = tune(b.trZ);
        const bl = tune(b.blZ);
        const br = tune(b.brZ);
        const u = (x - (b.cx - b.w / 2)) / b.w;
        const v = (y - (b.cy - b.h / 2)) / b.h;
        const bottom = bl + (br - bl) * u;
        const top = tl + (tr - tl) * u;
        return bottom + (top - bottom) * v;
      };
      const project1 = (x: number, y: number) => projectWorld(worldOf(x, y, zAt(x, y)), fov, aspect);
      /*
       * How square-on this screen's own outward face is to the camera in the
       * CURRENT pose -- not fixed, the phone can be spun round. `facing` is
       * the box's outward normal before rotation (+1 or -1 along the model's
       * local z); turned the same way a local point is, its cosine to the
       * camera axis is >0 pointing toward the camera and 1 dead-on -- see
       * `focusMath.projectWorld` for why the camera sits on that side. The
       * translation `worldOf` also applies is subtracted back out first: a
       * direction turns with the phone, but does not slide with it.
       */
      const dir = worldOf(0, 0, b.facing).sub(worldOf(0, 0, 0));
      const facing = g ? dir.z / dir.length() : 1;
      const half = b.w / 2;
      const halfH = b.h / 2;
      /*
       * The icon used to just sit at a point and rotate flat -- readable, but
       * a flat rotation is only the part of lying-on-a-tilted-plane that a
       * SINGLE point can express. A picture frame has width: it should
       * foreshorten and shear the way the screen itself does, not just turn.
       *
       * `corners` already IS the screen's true projected shape, one point at
       * a time. The icon gets its own small SQUARE in those same local units
       * -- square, not the screen's own (typically tall) aspect, since the
       * icon itself is square and shrinking the screen's rectangle toward its
       * centre would inherit that rectangle's aspect and stretch it. Three of
       * that square's four corners, projected through the exact same
       * `project1` the outline uses, is all a `matrix()` needs: `a,b` the
       * projected top edge as a vector, `c,d` the projected left edge, `e,f`
       * the top-left corner itself. Perspective is only locally linear, not
       * globally, but "locally" here covers the icon's whole footprint -- a
       * small fraction of the screen -- so the true projective warp and this
       * affine fit (exact on 3 corners, off on the 4th by an amount that
       * shrinks with the icon's own size) are the same picture.
       */
      /*
       * A few percent smaller than the measured box, on all four sides --
       * only on the handful of devices `outlineInset` is actually set for
       * (see `Device.screenOutlinePad` in `devices.ts`). Every other device's
       * box comes through with `outlineInset` absent and this is a no-op:
       * phones measure their screen mesh cleanly and were never part of the
       * problem this exists for.
       *
       * The measured box comes from the model's own screen MESH, and on the
       * affected laptops/display that mesh is not a paper-thin plane -- it
       * carries real glass thickness and a bezel recess behind it, so its
       * axis-aligned bounds describe more volume than the flat front
       * rectangle a camera actually sees. Front-on that gap is sub-pixel;
       * edge-on, the same absolute gap projects as a visible wedge of overlay
       * sitting on the bezel past the real glass.
       */
      // Device value first, same priority as `zGain`/`zBias`/`minFacing`
      // below -- a device locked in `devices.ts` stays locked regardless of
      // what the live panel is doing for some OTHER device in the meantime.
      const outlineInset = b.outlineInset ?? screenDepthTune.insetOverride ?? 1;
      const outlineBox: ScreenBox = { ...b, w: b.w * outlineInset, h: b.h * outlineInset };
      const corners = roundedRectLocal(outlineBox, cornerRadiusPct).map(([x, y]) => project1(x, y));
      const tl = project1(b.cx - half, b.cy + halfH);
      const tr = project1(b.cx + half, b.cy + halfH);
      const br = project1(b.cx + half, b.cy - halfH);
      const bl = project1(b.cx - half, b.cy - halfH);
      const center = {
        x: (tl.x + tr.x + br.x + bl.x) / 4,
        y: (tl.y + tr.y + br.y + bl.y) / 4,
      };
      return { corners, center, facing };
    };
    const tick = () => {
      const g = liveGroupRef.current;
      const main = mainPresent && box.main ? project(g, box.main) : null;
      const cover = coverPresent && box.cover ? project(g, box.cover) : null;
      /*
       * A hair above dead-edge-on, not just `> 0`. The screen is still
       * technically facing the camera at any positive value down to zero,
       * but the SVG overlay has no back-face culling of its own -- nothing
       * stops it drawing on the panel's far side, and near zero that draws
       * as a barely-foreshortened, oddly-readable label sitting on what is,
       * to the eye, the underside of the lid. `0.08` is far enough from
       * zero to cut that off without touching the normal rotation range the
       * placeholder is meant to survive -- it was pulled all the way to a
       * bare `> 0` specifically because an earlier, much larger threshold
       * hid the placeholder during ordinary use.
       */
      const minFacingFor = (b: ScreenBox | null) => b?.minFacing ?? screenDepthTune.minFacing;
      let showMain = Boolean(main && main.facing > minFacingFor(box.main));
      let showCover = Boolean(cover && cover.facing > minFacingFor(box.cover));
      /*
       * `cover`'s box is measured with the model posed fully OPEN (see
       * `PhoneStage3D`), because that's the only pose a hinge-skinned mesh
       * gets measured at -- so this local-box-plus-rigid-rotation projection
       * is only ever exactly right for `cover` at that one fold amount. At
       * open, viewed from the front, it happens to land on the same on-screen
       * area as `main` and both pass the facing check -- a false ambiguity,
       * not a real one, since only one screen is ever actually in front of
       * the camera. Break the tie with the fold amount itself, which knows
       * which screen that is. Genuinely unambiguous cases -- `cover` alone
       * facing because the open device has been turned to show its back,
       * `main` alone facing head-on -- are left as the facing check found
       * them.
       */
      if (showMain && showCover) {
        if (foldPct >= 50) showMain = false;
        else showCover = false;
      }
      setShown({ main: showMain ? main : null, cover: showCover ? cover : null });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mainPresent, coverPresent, box.main, box.cover, fov, aspect, cornerRadiusPct, foldPct, liveGroupRef]);

  // Mirrored into a ref for the contextmenu handler below, which is added
  // once and reads whatever the latest tick left behind rather than closing
  // over a render's now-stale `shown`.
  const shownRef = useRef(shown);
  useEffect(() => {
    shownRef.current = shown;
  });

  /*
   * Right-click on a screen that already has an image: replace it, or clear
   * it. Nothing to do this for on an empty screen -- there is nothing on it
   * to replace or delete.
   *
   * A `contextmenu` listener on `window`, not a DOM hit-region layered over
   * the screen: giving a FILLED screen a pointer-events layer of its own
   * would put it back in the drag gesture's way for no reason, and a
   * right-click never starts a drag anyway. So this reaches for the same
   * projected outline `shownRef` already carries and asks a plain geometry
   * question instead: did the click land inside it.
   */
  const [menu, setMenu] = useState<{ x: number; y: number; target: "main" | "cover" } | null>(null);
  const menuAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      const node = layerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const s = shownRef.current;
      const candidates: Array<["main" | "cover", typeof s.main, boolean]> = [
        ["main", s.main, Boolean(studio.screenSrc)],
        ["cover", s.cover, Boolean(studio.coverSrc)],
      ];
      for (const [target, proj, filled] of candidates) {
        if (filled && proj && pointInPolygon(px, py, proj.corners)) {
          event.preventDefault();
          // Clamped so the menu doesn't run off a right-click taken near the
          // right edge of the window -- `MenuPopover`'s `below` placement
          // clamps its top for the same reason but never needed to clamp its
          // left, since every other caller opens it from a trigger already
          // placed well inside the panel it sits in.
          const x = Math.min(event.clientX, window.innerWidth - CONTEXT_MENU_W - 8);
          setMenu({ x, y: event.clientY, target });
          return;
        }
      }
    };
    window.addEventListener("contextmenu", onContextMenu);
    return () => window.removeEventListener("contextmenu", onContextMenu);
  }, [studio.screenSrc, studio.coverSrc]);

  const menuItems: MenuItem[] = [
    { id: "replace", label: "Replace image" },
    { id: "delete", label: "Delete image" },
  ];

  /*
   * No early return, even though nothing is ever drawn here any more: this
   * layer's own wrapping div is what `onContextMenu` above measures a
   * bounding rect from, and a filled screen -- exactly the case the
   * right-click menu is for -- needs that rect regardless. Bailing out here
   * used to mean the div, and with it any chance of `layerRef.current`
   * existing, never mounted at all until a menu was already open -- which
   * nothing could ever open, since opening one needs that same rect first.
   */
  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0">
      <input
        ref={mainInput}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onPick("main", file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={coverInput}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onPick("cover", file);
          event.currentTarget.value = "";
        }}
      />
      {menu ? (
        <>
          {/* A positioning reference, not a visible trigger: `MenuPopover`'s
              `below` placement sizes the popup to the anchor's OWN width,
              which is right for a real dropdown trigger and wrong for a
              point -- a 0-width anchor made `Glass` render a sliver with its
              row labels clipped down to nothing, all background and no menu.
              `CONTEXT_MENU_W` is narrower than `control.panelW`, the width
              every OTHER popup in this file opens at -- those hold sliders
              and colour wells; this is two one-line labels, and at the full
              panel width they sat in a lot of empty pill. Zero height is
              fine; `below` only reads the anchor's bottom edge for where to
              sit, and at this height that is just the click's own Y. */}
          <div
            ref={menuAnchorRef}
            style={{ position: "fixed", left: menu.x, top: menu.y, width: CONTEXT_MENU_W, height: 0 }}
          />
          <MenuPopover
            anchor={menuAnchorRef}
            items={menuItems}
            label={menu.target === "main" ? "Screen image" : "Cover image"}
            placement="below"
            onPick={(id) => {
              if (id === "replace") {
                (menu.target === "main" ? mainInput : coverInput).current?.click();
              } else if (id === "delete") {
                (menu.target === "main" ? studio.clearScreen : studio.clearCover)();
              }
              setMenu(null);
            }}
            onClose={() => setMenu(null)}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * The alignment guides, Figma's way: a dashed line through the frame's centre
 * for each axis the phone has snapped onto, and a small label for a snap a
 * line cannot draw — an angle, a scale, a depth.
 *
 * Over the shot and never in it: this is a DOM layer on the frame, not part of
 * the canvas, so no export or recording can pick it up. It takes no pointer
 * events, so a drag on the model passes straight through the lines it causes.
 */
const GUIDE = "#0D99FF"; // Figma's selection blue

/**
 * The rotate cursor: a curved arrow with a head at each end, black on a white
 * outline so it reads over any shot -- the one Figma shows on a corner. Drawn
 * here as an SVG because CSS has no cursor that says "turn"; the hotspot is its
 * middle, and `grab` is the fallback if a browser will not take the image.
 */
const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><g stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 14Q13 4.5 20.5 14" fill="none" stroke="#fff" stroke-width="5"/><path d="M2.6 13.2h5.8L5.5 18.6zM17.6 13.2h5.8L20.5 18.6z" fill="#fff" stroke="#fff" stroke-width="2.6"/><path d="M5.5 14Q13 4.5 20.5 14" fill="none" stroke="#000" stroke-width="2"/><path d="M2.6 13.2h5.8L5.5 18.6zM17.6 13.2h5.8L20.5 18.6z" fill="#000"/></g></svg>',
)}") 13 13, grab`;

function SnapGuideLayer({ guides }: { guides: SnapGuides }) {
  const line = {
    position: "absolute",
    pointerEvents: "none",
  } as const;
  return (
    <>
      {guides.vertical ? (
        <div
          aria-hidden
          style={{
            ...line,
            top: 0,
            bottom: 0,
            left: "calc(50% - 0.5px)",
            // A dotted border, not a gradient: at 1px a gradient's dashes are
            // blended into the ground and the red read as grey.
            borderLeft: `1px dotted ${GUIDE}`,
          }}
        />
      ) : null}
      {guides.horizontal ? (
        <div
          aria-hidden
          style={{
            ...line,
            left: 0,
            right: 0,
            top: "calc(50% - 0.5px)",
            borderTop: `1px dotted ${GUIDE}`,
          }}
        />
      ) : null}
      {guides.label ? (
        <div
          aria-hidden
          className="mo-code"
          style={{
            ...line,
            left: "50%",
            top: 12,
            transform: "translateX(-50%)",
            padding: "2px 6px",
            borderRadius: 4,
            background: GUIDE,
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {guides.label}
        </div>
      ) : null}
    </>
  );
}

/**
 * Where the blur is, drawn over the shot: solid where sharp ends, dotted where
 * the blur is fully in. The numbers are `DepthOfFieldLayer`'s own — radius
 * `focusSize / 2` and a falloff of `0.02 + falloff × 0.6`, both in frame
 * heights — so the marks sit exactly on the edges the shader draws.
 */
function FocusGuide({
  blur,
  pinned = false,
}: {
  blur: BlurSettings;
  /** Aiming by hand: the guide stays up instead of fading after each change. */
  pinned?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  /*
   * At rest until the blur is being edited: shown on each change and gone a
   * beat after the last, like the snap guides. The first render is not an
   * edit, so switching DOF on — or loading a shot with it — draws nothing.
   */
  // Written to the node, not state: it is a fade, not something to render.
  const first = useRef(true);
  useEffect(() => {
    const node = ref.current;
    if (pinned && node) {
      node.style.transition = "opacity 100ms ease-out";
      node.style.opacity = "1";
      return;
    }
    if (first.current || !node) {
      first.current = false;
      return;
    }
    node.style.transition = "opacity 100ms ease-out";
    node.style.opacity = "1";
    const t = window.setTimeout(() => {
      node.style.transition = "opacity 300ms ease-out";
      node.style.opacity = "0";
    }, 800);
    return () => window.clearTimeout(t);
  }, [blur, pinned]);
  const [aspect, setAspect] = useState(1);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setAspect(width / height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Frame heights across, so a circle is round at any ratio.
  const cx = blur.focusX * aspect;
  const cy = blur.focusY;
  const inner = blur.focusSize * 0.5;
  const outer = inner + 0.02 + blur.falloff * 0.6;
  // The shader's direction is y-up; the SVG's is y-down.
  const a = (blur.angle * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: -Math.sin(a) };
  const stroke = {
    stroke: GUIDE,
    fill: "none",
    vectorEffect: "non-scaling-stroke" as const,
    strokeWidth: 1.5,
  };
  const dotted = { ...stroke, strokeDasharray: "2 4" };

  /** A line through the frame, `d` along `n` from the focus point. */
  const across = (n: { x: number; y: number }, d: number, dots: boolean) => {
    const px = cx + n.x * d;
    const py = cy + n.y * d;
    const L = 10;
    return (
      <line
        key={`${d}-${dots}`}
        x1={px - n.y * L}
        y1={py + n.x * L}
        x2={px + n.y * L}
        y2={py - n.x * L}
        {...(dots ? dotted : stroke)}
      />
    );
  };
  // Tilt shift measures across the band, along its normal; directional along
  // the direction itself.
  const normal = { x: -Math.sin(a), y: -Math.cos(a) };

  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox={`0 0 ${aspect} 1`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0 }}
    >
      {blur.mode === "radial" ? (
        <>
          <circle cx={cx} cy={cy} r={inner} {...stroke} />
          <circle cx={cx} cy={cy} r={outer} {...dotted} />
        </>
      ) : blur.mode === "directional" ? (
        [across(dir, inner, false), across(dir, outer, true)]
      ) : (
        [
          across(normal, inner, false),
          across(normal, -inner, false),
          across(normal, outer, true),
          across(normal, -outer, true),
        ]
      )}
    </svg>
  );
}

/**
 * Skipped whenever nothing about the shot has changed.
 *
 * `useStudio` hands back one memoised object, so this only re-renders when the
 * composition, a texture or a handler actually moved — not on every frame of a
 * selection travelling across a panel in front of it.
 */
export const Stage = memo(StageInner);

/**
 * Aim the blur by hand: while the Depth of Field popup is open with a blur on,
 * a press on the shot puts the focus there, dragging carries it along, and two
 * fingers (pinch or scroll) size it -- in every mode, where "there" is the sharp
 * point, or the middle of the sharp band. The layer is only mounted then, so the rest of the time the
 * shot orbits and drags as usual.
 *
 * The frame is what the blur is measured against -- `focusX`/`focusY` are shares
 * of it, y down -- so the press is read against this layer's own box, which is
 * the frame. `FocusGuide` flashes the ring on every change, so each click shows
 * where it landed.
 */
function FocusPickLayer({ studio }: { studio: Studio }) {
  const { edit } = studio;
  const layerRef = useRef<HTMLDivElement>(null);
  /*
   * Two fingers on the trackpad set the spot's size: pinch out or scroll up for
   * bigger, pinch in or scroll down for smaller. A pinch arrives as a wheel event
   * with ctrlKey set, which the browser would otherwise turn into a page zoom --
   * so this is a native, non-passive listener that can cancel it, and it stops
   * there so the same gesture does not also zoom the phone behind it.
   */
  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Multiplicative, so it feels the same at 5% as at 60%. A pinch reports far
      // smaller deltas than a scroll, hence the two rates.
      const rate = event.ctrlKey ? 0.01 : 0.004;
      const factor = Math.exp(-event.deltaY * rate);
      edit((prev) => ({
        ...prev,
        blur: {
          ...prev.blur,
          focusSize: Math.min(1, Math.max(0.02, prev.blur.focusSize * factor)),
        },
      }));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [edit]);
  const blur = studio.state.blur;
  // The frame's shape, so the handles sit in frame heights like the shader does.
  const [aspect, setAspect] = useState(1);
  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setAspect(width / height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /*
   * Handles on the guide: one for Size (the solid edge of the sharp region) and
   * one for Falloff (the dotted edge where the blur is full), in every mode.
   * Radial puts them on the rings; Directional on its two lines; Tilt shift on
   * both sides of the band. Each is dragged to where the edge should be, and
   * `reach` measures that the way the shader does -- distance from the focus,
   * along the direction or across the band.
   */
  const angle = (blur.angle * Math.PI) / 180;
  const dir = { x: Math.cos(angle), y: -Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: -Math.cos(angle) };
  const axis =
    blur.mode === "radial"
      ? // Up and to the left: the panels are on the right, and a handle under one
        // cannot be reached.
        { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }
      : blur.mode === "directional"
        ? dir
        : normal;
  const reach = (dx: number, dy: number) =>
    blur.mode === "radial"
      ? Math.hypot(dx, dy)
      : blur.mode === "directional"
        ? Math.max(0, dx * dir.x + dy * dir.y)
        : Math.abs(dx * normal.x + dy * normal.y);
  const inner = blur.focusSize * 0.5;
  const outer = inner + 0.02 + blur.falloff * 0.6;
  const sides = blur.mode === "tilt-shift" ? [1, -1] : [1];
  /*
   * Rotation, for the two modes that have a direction (a circle has none), is
   * done from the ring around the Size dot: the point you grab follows the
   * pointer, so the line turns by how far the pointer has swung round the focus
   * point, not to where it points.
   */
  const handles = sides.flatMap((side) => [
    { kind: "size" as const, side, at: inner * side },
    { kind: "falloff" as const, side, at: outer * side },
  ]);
  const swing = useRef<{ from: number; angle: number } | null>(null);
  /** The pointer's bearing from the focus point, degrees, y down. */
  const bearing = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = layerRef.current?.getBoundingClientRect();
    if (!box || box.height <= 0) return null;
    const dx =
      (event.clientX - box.left) / box.height -
      blur.focusX * (box.width / box.height);
    const dy = (event.clientY - box.top) / box.height - blur.focusY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };
  const turn = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swing.current;
    const now = bearing(event);
    if (!start || now === null) return;
    // On screen (y down) a bearing that grows is clockwise, and this angle grows
    // the other way -- so the sweep is subtracted.
    let degrees = start.angle - (now - start.from);
    if (event.shiftKey) degrees = Math.round(degrees / 15) * 15;
    const wrapped = ((Math.round(degrees) % 360) + 360) % 360;
    edit((prev) => ({ ...prev, blur: { ...prev.blur, angle: wrapped } }));
  };
  const drag = (
    event: React.PointerEvent<HTMLDivElement>,
    kind: "size" | "falloff",
  ) => {
    const box = layerRef.current?.getBoundingClientRect();
    if (!box || box.height <= 0) return;
    const ratio = box.width / box.height;
    // Pointer relative to the focus point, in frame heights.
    const dx = (event.clientX - box.left) / box.height - blur.focusX * ratio;
    const dy = (event.clientY - box.top) / box.height - blur.focusY;
    const d = reach(dx, dy);
    edit((prev) => ({
      ...prev,
      blur:
        kind === "size"
          ? { ...prev.blur, focusSize: Math.min(1, Math.max(0, d * 2)) }
          : {
              ...prev.blur,
              falloff: Math.min(
                1,
                Math.max(0, (d - prev.blur.focusSize * 0.5 - 0.02) / 0.6),
              ),
            },
    }));
  };
  // Press to put the focus there; hold and move to drag it along.
  const place = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const share = (n: number) => Math.min(1, Math.max(0, n));
    const focusX = share((event.clientX - box.left) / box.width);
    const focusY = share((event.clientY - box.top) / box.height);
    edit((prev) => ({ ...prev, blur: { ...prev.blur, focusX, focusY } }));
  };
  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      style={{ cursor: "crosshair", touchAction: "none" }}
      onPointerDown={(event) => {
        // The popup this belongs to dismisses on a press outside it; this press
        // is part of using it, so it must not reach that.
        event.stopPropagation();
        // Captured, so the drag keeps following the pointer past the frame's
        // edge and the release lands here whatever is under it.
        event.currentTarget.setPointerCapture(event.pointerId);
        place(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          place(event);
      }}
    >
      {handles.map(({ kind, side, at }) => {
        /*
         * The Size dot has two zones. Its middle slides the edge in and out; the
         * ring just outside it turns the line about the focus point -- with the
         * rotate cursor -- so rotating lives on the same dot, at its edge. Radial
         * has no direction, so there its dot is just the dot.
         */
        const turnable = kind === "size" && blur.mode !== "radial";
        const RING = 46;
        const DOT = 22;
        const box = turnable ? RING : DOT;
        const marker = (
          <span
            style={{
              width: kind === "size" ? 12 : 9,
              height: kind === "size" ? 12 : 9,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: `0 0 0 1.5px ${GUIDE}, 0 1px 4px rgb(0 0 0 / 0.25)`,
            }}
          />
        );
        return (
          <div
            // Keyed by what it is, not where it is: it moves under the pointer
            // as it is dragged, and a new key would replace it and drop the
            // capture.
            key={`${kind}${side}`}
            role="slider"
            aria-label={kind === "size" ? "Focus size" : "Focus falloff"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(
              (kind === "size" ? blur.focusSize : blur.falloff) * 100,
            )}
            className="absolute"
            style={{
              // In frame shares: x over the frame's width, y over its height.
              left: `${(blur.focusX + (axis.x * at) / aspect) * 100}%`,
              top: `${(blur.focusY + axis.y * at) * 100}%`,
              width: box,
              height: box,
              margin: -box / 2,
              display: "grid",
              placeItems: "center",
              cursor: turnable ? ROTATE_CURSOR : "grab",
              touchAction: "none",
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              if (turnable) {
                const from = bearing(event);
                swing.current =
                  from === null ? null : { from, angle: blur.angle };
              } else drag(event, kind);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId))
                return;
              if (turnable) turn(event);
              else drag(event, kind);
            }}
            onPointerUp={() => {
              swing.current = null;
            }}
          >
            {turnable ? (
              <div
                style={{
                  width: DOT,
                  height: DOT,
                  display: "grid",
                  placeItems: "center",
                  cursor: "grab",
                }}
                onPointerDown={(event) => {
                  // The middle of the dot sizes; the ring around it turns.
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag(event, kind);
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    drag(event, kind);
                }}
              >
                {marker}
              </div>
            ) : (
              marker
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The focus areas, pinned to the phone, drawn over the shot while their
 * panel is open.
 *
 * Each area lives in the phone's own coordinates (see `focusMath`), so it is
 * drawn by projecting its corners through the pose the stage is showing --
 * the animated one during playback -- and stays on the part of the device it
 * was drawn over while the camera moves, the phone turns or a move plays. A
 * tilted phone draws it as the tilted quad it really is.
 *
 * Every pointer gesture goes the other way, through `toPhone`: a new box is
 * drawn on screen and its corners laid onto the phone; a move or a resize
 * follows the pointer across the phone rather than across the screen.
 */
function FocusLayer({ studio }: { studio: Studio }) {
  const { state, playing, playheadRef, parkedAt, focusPoints: points } = studio;
  const onChange = studio.setFocusPoints;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [aspect, setAspect] = useState(1);
  /* Where the playhead is, as state: copied off the ref on each animation
     frame while playing, since a ref must not be read during render. */
  const [liveTime, setLiveTime] = useState(0);
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const gesture = useRef<
    | { kind: "draw"; from: { x: number; y: number } }
    | { kind: "move" | "resize"; index: number; from: Vector3; area: FocusArea }
    | null
  >(null);

  // The frame's shape, for the projection.
  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;
    const measure = () =>
      setAspect(node.clientHeight ? node.clientWidth / node.clientHeight : 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // While the clip plays the pose changes every frame and nothing in React
  // hears of it; redraw on the animation frame so the boxes ride along.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setLiveTime(playheadRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, playheadRef]);
  const time = playing ? liveTime : (parkedAt ?? 0);

  const hasTracks = Object.values(state.animation.tracks).some(
    (keys) => keys && keys.length > 0,
  );
  const pose: FocusPose = poseOf(
    {
      xAxis: state.xAxis,
      yAxis: state.yAxis,
      zAxis: state.zAxis,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      panZ: state.panZ,
      fov: state.fov ?? 35,
      scaleX: state.scaleX ?? 1,
      scaleY: state.scaleY ?? 1,
      scaleZ: state.scaleZ ?? 1,
    },
    hasTracks ? sampleAnimation(state.animation, time) : {},
  );

  const screenOf = (event: React.PointerEvent) => {
    const box = layerRef.current!.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    };
  };
  const phoneOf = (event: React.PointerEvent) =>
    toPhone(screenOf(event), pose, aspect);

  const corners = (a: FocusArea) =>
    [
      [a.cx - a.w / 2, a.cy + a.h / 2],
      [a.cx + a.w / 2, a.cy + a.h / 2],
      [a.cx + a.w / 2, a.cy - a.h / 2],
      [a.cx - a.w / 2, a.cy - a.h / 2],
    ].map(([x, y]) => toScreen(new Vector3(x, y, 0), pose, aspect));

  const grab = (
    event: React.PointerEvent,
    kind: "move" | "resize",
    index: number,
  ) => {
    event.stopPropagation();
    const from = phoneOf(event);
    if (!from) return;
    layerRef.current?.setPointerCapture(event.pointerId);
    gesture.current = { kind, index, from, area: points[index] };
  };

  const MIN = 0.02;
  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      // No z-index. The frame is not a stacking context, so a number here
      // competed with the whole page -- and at Fill, where the frame is the
      // window, it put this layer over every panel and took their clicks.
      // After the canvas in the DOM, it already paints above it.
      style={{ cursor: "crosshair", touchAction: "none" }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const from = screenOf(event);
        gesture.current = { kind: "draw", from };
        setDraft({ ...from, w: 0, h: 0 });
        studio.setFocusDrafting(true);
      }}
      onPointerMove={(event) => {
        const g = gesture.current;
        if (!g) return;
        if (g.kind === "draw") {
          const now = screenOf(event);
          setDraft({
            x: Math.min(g.from.x, now.x),
            y: Math.min(g.from.y, now.y),
            w: Math.abs(now.x - g.from.x),
            h: Math.abs(now.y - g.from.y),
          });
          return;
        }
        const now = phoneOf(event);
        if (!now) return;
        const a = g.area;
        let next: FocusArea;
        if (g.kind === "move") {
          next = {
            ...a,
            cx: a.cx + (now.x - g.from.x),
            cy: a.cy + (now.y - g.from.y),
          };
        } else {
          // The corner under the pointer; the opposite corner stays put.
          const left = a.cx - a.w / 2;
          const top = a.cy + a.h / 2;
          const w = Math.max(MIN, now.x - left);
          const h = Math.max(MIN, top - now.y);
          next = { cx: left + w / 2, cy: top - h / 2, w, h };
        }
        onChange(points.map((p, i) => (i === g.index ? next : p)));
      }}
      onPointerUp={() => {
        const g = gesture.current;
        gesture.current = null;
        const box = draft;
        setDraft(null);
        studio.setFocusDrafting(false);
        if (g?.kind !== "draw" || !box || box.w < 0.03 || box.h < 0.03) return;
        // The drawn box's corners, laid onto the phone; the area is what
        // they cover there.
        const hits = [
          { x: box.x, y: box.y },
          { x: box.x + box.w, y: box.y },
          { x: box.x + box.w, y: box.y + box.h },
          { x: box.x, y: box.y + box.h },
        ]
          .map((c) => toPhone(c, pose, aspect))
          .filter((p): p is Vector3 => p !== null);
        if (hits.length < 4) return;
        const xs = hits.map((p) => p.x);
        const ys = hits.map((p) => p.y);
        const [x0, x1, y0, y1] = [
          Math.min(...xs),
          Math.max(...xs),
          Math.min(...ys),
          Math.max(...ys),
        ];
        onChange([
          ...points,
          { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 },
        ]);
      }}
      onPointerCancel={() => {
        gesture.current = null;
        setDraft(null);
        studio.setFocusDrafting(false);
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={{ overflow: "visible" }}
      >
        {points.map((a, i) => (
          <polygon
            key={i}
            points={corners(a)
              .map((c) => `${c.x},${c.y}`)
              .join(" ")}
            fill="rgb(59 130 246 / 0.1)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: "move" }}
            onPointerDown={(event) => grab(event, "move", i)}
          />
        ))}
      </svg>
      {points.map((a, i) => {
        const [, topRight, bottomRight] = corners(a);
        return (
          <div key={i}>
            <button
              type="button"
              title="Remove this area"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onChange(points.filter((_, j) => j !== i))}
              className="mo-label absolute grid cursor-pointer place-items-center"
              style={{
                left: `calc(${topRight.x * 100}% - 11px)`,
                top: `calc(${topRight.y * 100}% - 11px)`,
                width: 22,
                height: 22,
                borderRadius: 11,
                background: "#3b82f6",
                color: "#fff",
              }}
            >
              {i + 1}
            </button>
            {/* The corner: drag to resize. */}
            <span
              aria-hidden
              onPointerDown={(event) => grab(event, "resize", i)}
              className="absolute"
              style={{
                left: `calc(${bottomRight.x * 100}% - 6px)`,
                top: `calc(${bottomRight.y * 100}% - 6px)`,
                width: 12,
                height: 12,
                borderRadius: 3,
                background: "#fff",
                border: "1.5px solid #3b82f6",
                cursor: "nwse-resize",
              }}
            />
          </div>
        );
      })}
      {draft ? (
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.w * 100}%`,
            height: `${draft.h * 100}%`,
            border: "1.5px solid #3b82f6",
            background: "rgb(59 130 246 / 0.1)",
            borderRadius: 6,
          }}
        />
      ) : null}
    </div>
  );
}
