"use client";

/**
 * The composition, and everything that acts on it.
 *
 * `StudioChrome` was a chrome over nothing: every list was a hard-coded array
 * of plausible names and every slider wrote into a `values` bag that no
 * renderer read. This hook is the other side — one `EditorState`, the same
 * value the existing editor edits and the same one `PhoneStage3D` renders, plus
 * the history, the uploads and the pairing link that go with it.
 *
 * Deliberately NOT lifted out of `EditorShell`. That component is some fifteen
 * hundred lines of working software with a timeline, an exporter and a video
 * pipeline hanging off the same state, and the way to break it is to refactor
 * it in the same change that adds a second consumer. What is shared is the
 * MODEL — `editorState`, `devices`, `finishes`, `backgrounds`, `overlay`,
 * `shadow`, `motionPresets`, `useScreenTexture`, `useBroadcastLink` — which is
 * where the behaviour actually lives. The two shells are then two views of it,
 * which is the relationship they should have had from the start.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ANIMATABLE,
  KEY_EPSILON,
  type Easing,
  putKey,
  removeKey,
  sampleAnimation,
  type AnimatableKey,
} from "../animation";
import { getDevice } from "../devices";
import { finishForDevice, finishesFor } from "../finishes";
import { paintBackground, preloadBackgroundImage } from "../backgrounds";
import { paintOverlay } from "../overlay";
import { applyCanvasShadow, clearCanvasShadow } from "../shadow";
import { recordStageVideo } from "../recordVideo";
import { renderVideoExact, supportsExactRender } from "../renderVideoExact";
import type { StageCapture, StageRecorder } from "../PhoneStage3D";
import { useScreenTexture } from "../useScreenTexture";
import { useBroadcastLink } from "../broadcast/useBroadcastLink";
import { fitToClip, getMotionPreset } from "../editor/motionPresets";
import { getRatio } from "../editor/framing";
import {
  BROADCAST_SCREEN_FIT,
  DEFAULT_EDITOR_STATE,
  RANGES,
  type EditorState,
} from "../editor/editorState";

const HISTORY_COALESCE_MS = 450;
const HISTORY_LIMIT = 60;

/**
 * How far the phone turns per pixel of drag across the canvas.
 *
 * The editor's figure: a full turn in about nine hundred pixels, which is a
 * comfortable sweep rather than a flick. The gizmo does not use it — see
 * `GizmoCanvas`, where the gain follows the widget's radius instead.
 */
const DRAG_DEG_PER_PX = 0.4;

/** Where Res and FPS open. 3x is the App Store's ask for a 6.9-inch
    screenshot and the number the old editor settled on; both are settings
    rather than constants now, and these are their first values. */
const EXPORT_SCALE = 3;
const EXPORT_FPS = 30;

/** What the Duration field will accept, from the old editor. */
export const DURATION_MIN = 0.5;
export const DURATION_MAX = 3600;

/** The frame the studio opens on, and what a canvas panel's reset goes back
    to. Named because two places now need to agree on it. */
export const DEFAULT_RATIO_ID = "1:1";

/** Read a picked file as a data URL — it outlives the `File` and survives into
    a client-side export, which an object URL does neither of. */
function readFile(file: File, onLoad: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.readAsDataURL(file);
}

export type Studio = ReturnType<typeof useStudio>;

export function useStudio() {
  /*
   * Every load opens on the defaults.
   *
   * The composition used to be saved to `localStorage` and restored, which
   * sounds like a kindness and is not one here: a mockup tool is a thing
   * people come back to in order to make a NEW picture, and finding the last
   * one still on the desk — someone else's device, someone else's background —
   * means undoing before starting. Worse, it hides the studio's own defaults
   * from anyone who has used it once, so what a first visitor sees and what
   * everybody else sees stop being the same thing.
   *
   * The writer went with the reader. A key nothing reads is a key that quietly
   * rots, and this one held a whole composition including a data-URL image.
   */
  const [state, setState] = useState<EditorState>(DEFAULT_EDITOR_STATE);

  /**
   * The live value, for handlers that must not close over a stale one.
   *
   * Written from an effect rather than during render. A ref assignment in the
   * render body runs on every attempt React makes — including the ones it
   * throws away — and reading it back during render is how a component ends up
   * rendering one thing and behaving like another. Everything that reads this
   * is an event handler or an effect, both of which run after commit, so the
   * value is always the one on screen.
   */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Edit the composition.
   *
   * Takes the previous state rather than a patch object so a caller can read
   * before it writes — every binding in `bindings.ts` is exactly that shape,
   * and it means a control never has to be handed the state it is editing.
   *
   * Defined below `record`, which every write goes through first.
   */

  /* ---------------------------------------------------------------- history */

  const [past, setPast] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);
  const lastEditAt = useRef(0);

  /**
   * Note where we were, just before changing it.
   *
   * The existing editor records history by WATCHING its state from an effect,
   * because it has ten `setState` call sites and only some go through a common
   * helper — a watcher is the only thing that can see all ten. This hook has
   * one way in, so it can do the simpler and more direct thing: record on the
   * way past.
   *
   * That also keeps it out of an effect. An effect that calls `setState`
   * synchronously schedules a second render for every first one, and the state
   * it is reacting to has already been committed by the time it runs — so the
   * entry it pushes is one render late by construction.
   *
   * `stateRef` holds the COMMITTED state, which is exactly what wants pushing:
   * the shot as it was before this gesture began.
   *
   * Consecutive edits inside one gesture collapse into a single entry. A slider
   * drag fires a change per frame; without this, undo would walk back through
   * a drag one pixel at a time and feel broken. The window extends itself while
   * the gesture continues, so the whole drag costs one entry.
   */
  const record = useCallback(() => {
    // A fresh edit forks history: whatever redo could have reached no longer
    // follows from here.
    setFuture((entries) => (entries.length ? [] : entries));
    const now = performance.now();
    const sameGesture = now - lastEditAt.current < HISTORY_COALESCE_MS;
    lastEditAt.current = now;
    if (sameGesture) return;
    const prev = stateRef.current;
    setPast((entries) =>
      entries.length >= HISTORY_LIMIT
        ? [...entries.slice(1), prev]
        : [...entries, prev],
    );
  }, []);

  /**
   * An edit, and a keyframe if the thing edited is animated.
   *
   * This is what makes the Transform and Camera rows keep working once a
   * preset is applied, and it is the old editor's rule exactly: a change to a
   * property that already has a track becomes a KEY on that track, at the
   * playhead, rather than a change to a static value the animation is about to
   * overwrite. Without it every slider in the stack goes dead the moment a
   * preset lands — you drag, the number moves, and the phone does not, because
   * the pose is coming from the clip.
   *
   * Only channels that ALREADY have keys are keyed. A track is the statement
   * "this property is animated"; dragging Pan X on a preset that never touched
   * Pan X should move the shot, not quietly start a new track from one key.
   *
   * Which properties moved is worked out by diffing rather than declared,
   * because `edit` takes a whole-state updater — so the gizmo's double-tap
   * reset, a slider, and a canvas drag all key themselves without any of them
   * having to say what they touched.
   */
  const edit = useCallback(
    (f: (prev: EditorState) => EditorState) => {
      record();
      setState((prev) => {
        const next = f(prev);
        const tracks = { ...next.animation.tracks };
        let keyed = false;
        for (const { key } of ANIMATABLE) {
          const after = next[key];
          if (typeof after !== "number" || after === prev[key]) continue;
          if (!tracks[key]?.length) continue;
          tracks[key] = putKey(tracks[key], playheadRef.current, after);
          keyed = true;
        }
        return keyed
          ? { ...next, animation: { ...next.animation, tracks } }
          : next;
      });
    },
    [record],
  );

  /*
   * The stacks are read from the render scope, not from inside an updater.
   *
   * A `setState` updater has to be a pure function of its argument — React
   * calls it twice in development on purpose — so an updater that also pushes
   * onto the OTHER stack pushes twice, and history quietly grows a duplicate
   * every time you step through it.
   */
  const undo = useCallback(() => {
    if (!past.length) return;
    // Reopen the coalescing window, or the next edit folds into the gesture
    // that was just undone.
    lastEditAt.current = 0;
    setFuture((entries) => [stateRef.current, ...entries]);
    setState(past[past.length - 1]);
    setPast((entries) => entries.slice(0, -1));
  }, [past]);

  const redo = useCallback(() => {
    if (!future.length) return;
    lastEditAt.current = 0;
    setPast((entries) => [...entries, stateRef.current]);
    setState(future[0]);
    setFuture((entries) => entries.slice(1));
  }, [future]);

  /** Back to defaults, and itself undoable — the watcher above records it like
      any other change, so a mis-click costs one undo. The uploaded image is
      left alone: it is the one thing here a slider cannot recreate. */
  const reset = useCallback(() => {
    lastEditAt.current = 0;
    record();
    setState((prev) => ({
      ...DEFAULT_EDITOR_STATE,
      background: prev.background,
    }));
  }, [record]);

  /* ------------------------------------------------------- device & finish */

  const device = useMemo(() => getDevice(state.deviceId), [state.deviceId]);
  const finishes = useMemo(() => finishesFor(device.finishIds), [device]);

  /**
   * Pick a device, and land on a colour it actually comes in.
   *
   * Carrying the old id across would put a MacBook's Citrus on an iMac —
   * `finishForDevice` is the existing guard against exactly that, and running
   * it here means there is no path to a finish the device does not offer,
   * however the id got there.
   */
  const pickDevice = useCallback(
    (deviceId: string) => {
      edit((prev) => ({
        ...prev,
        deviceId,
        finishId: finishForDevice(getDevice(deviceId).finishIds, prev.finishId)
          .id,
      }));
    },
    [edit],
  );

  const pickFinish = useCallback(
    (finishId: string) => edit((prev) => ({ ...prev, finishId })),
    [edit],
  );

  /* ------------------------------------------------------------- the screen */

  /** What is on the phone's screen: an upload, or nothing. */
  const [screenSrc, setScreenSrc] = useState<string | null>(null);
  const [screenName, setScreenName] = useState<string | null>(null);

  const uploadScreen = useCallback((file: File) => {
    readFile(file, (dataUrl) => {
      setScreenSrc(dataUrl);
      setScreenName(file.name);
    });
  }, []);

  const clearScreen = useCallback(() => {
    setScreenSrc(null);
    setScreenName(null);
  }, []);

  /* --------------------------------------------------------- the background */

  const uploadBackground = useCallback(
    (file: File) => {
      readFile(file, (imageSrc) => {
        edit((prev) => ({
          ...prev,
          background: { ...prev.background, kind: "image", imageSrc },
        }));
        void preloadBackgroundImage({
          ...stateRef.current.background,
          kind: "image",
          imageSrc,
        });
      });
    },
    [edit],
  );

  const clearBackground = useCallback(() => {
    edit((prev) => ({
      ...prev,
      background: { ...prev.background, kind: "solid", imageSrc: null },
    }));
  }, [edit]);

  /* ------------------------------------------------------------- the mirror */

  /**
   * A direct iPhone broadcast, when one is running.
   *
   * Signalling goes through `/api/broadcast` on this machine; the frames come
   * peer to peer over the LAN and never touch the Next process.
   */
  const broadcast = useBroadcastLink();
  const liveStream = broadcast.stream;

  /**
   * How the source is cropped onto the device's screen.
   *
   * A broadcast arrives already framed — it carries the device framebuffer and
   * nothing else — so while one is running it gets the neutral fit rather than
   * whatever crop was dialled in for a screenshot.
   *
   * DERIVED, not written into the state. Overwriting the three fields when a
   * stream connects means they are gone when it disconnects, so a shot that
   * had been fitted by hand comes back reset. Computing it leaves the saved fit
   * untouched underneath and hands it back the moment the stream stops.
   */
  const screenFit = useMemo(() => {
    // `BROADCAST_SCREEN_FIT` is keyed by the STATE's field names, since that is
    // what the existing editor spreads it onto. The stage takes the same three
    // numbers under shorter ones, so the swap happens here.
    const fit = liveStream
      ? BROADCAST_SCREEN_FIT
      : {
          screenScale: state.screenScale,
          screenOffsetX: state.screenOffsetX,
          screenOffsetY: state.screenOffsetY,
        };
    return {
      scale: fit.screenScale,
      offsetX: fit.screenOffsetX,
      offsetY: fit.screenOffsetY,
    };
  }, [liveStream, state.screenScale, state.screenOffsetX, state.screenOffsetY]);

  /*
   * There are no built-in React screens in this shell, so the DOM-capture path
   * `useScreenTexture` also offers has nothing to capture — the ref is here to
   * satisfy it and stays empty. An upload IS a texture and loads straight onto
   * the mesh; a broadcast outranks it.
   */
  const screenHostRef = useRef<HTMLElement>(null);
  const screenTexture = useScreenTexture(
    screenHostRef,
    screenSrc ?? undefined,
    2,
    // Autoplay on: with no timeline in this shell there is no playhead for a
    // clip to be parked against, so a video screen simply runs.
    true,
    liveStream,
  );

  /* --------------------------------------------------------- direct handling */

  /**
   * Turn the model by an angle.
   *
   * In DEGREES, not pixels, because the two things that turn the phone do not
   * agree about what a pixel is worth: a sweep across the canvas is 0.4° per
   * pixel, while the gizmo is a trackball a hundred pixels wide and runs at
   * five times that. Each gesture converts its own travel to an angle and they
   * meet here, so there is one place that knows a turn is `yAxis` about the
   * vertical and `xAxis` about the horizontal — rather than that fact being
   * written out once per input, ready to disagree.
   *
   * A functional update rather than a read of the committed state. Pointermove
   * fires several times per frame and React commits once, so anything reading
   * back the last rendered value would drop every move but the first of each
   * frame and the phone would turn in steps. `prev` is always the newest queued
   * value, whether or not it has been painted yet.
   */
  const turn = useCallback(
    ({ dxDeg, dyDeg }: { dxDeg: number; dyDeg: number }) => {
      edit((prev) => {
        /*
         * Continue from where the phone LOOKS, not from the number underneath
         * it.
         *
         * On an animated axis those are different: the static value is
         * whatever the pose was when the preset landed, and the clip has been
         * painting over it ever since. Adding the drag to the static one makes
         * the first frame of the gesture a jump to a rotation nothing has been
         * showing — then `edit` keys THAT at the playhead, so the jump sticks.
         */
        const now = sampleAnimation(prev.animation, playheadRef.current);
        return {
          ...prev,
          yAxis: (now.yAxis ?? prev.yAxis) + dxDeg,
          xAxis: (now.xAxis ?? prev.xAxis) + dyDeg,
        };
      });
    },
    [edit],
  );

  /**
   * Drag the model to turn it.
   *
   * `PhoneStage3D` only mounts its pointer listener when a handler is given —
   * `{onRotateDrag ? <PointerDragRotation/> : null}` — so leaving this off did
   * not make the stage ignore drags, it left nothing on the stage listening for
   * one at all. The phone sat there because there was no gesture to sit through.
   *
   * The gain is the editor's own figure — a full turn in about nine hundred
   * pixels of drag, which is a comfortable sweep rather than a flick. Past
   * that this is `turn` in pixel clothing.
   */
  const nudgeRotation = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      turn({ dxDeg: dx * DRAG_DEG_PER_PX, dyDeg: dy * DRAG_DEG_PER_PX });
    },
    [turn],
  );

  /**
   * Wheel and trackpad pinch over the canvas.
   *
   * The stage reports scale in percentage points; `zoom` is the same number
   * over a hundred, clamped to the range the Transform popup's sliders run in
   * so the two cannot disagree about where the ends are.
   */
  const nudgeZoom = useCallback(
    (deltaPct: number) => {
      edit((prev) => {
        // Off the sampled scale for the same reason `turn` is — see there.
        const now = sampleAnimation(prev.animation, playheadRef.current);
        return {
          ...prev,
          zoom: Math.max(
            RANGES.zoom.min,
            Math.min(RANGES.zoom.max, (now.zoom ?? prev.zoom) + deltaPct / 100),
          ),
        };
      });
    },
    [edit],
  );

  /* ------------------------------------------------------------------ export */

  /*
   * The two bridges the stage hands back, and the two encoders behind them.
   *
   * None of this is new: `CaptureBridge`, `RecorderBridge`, `renderVideoExact`
   * and `recordStageVideo` are the old editor's export path, which works and is
   * measured — the comments in `recordVideo.ts` carry the timing results that
   * settled how it captures. What this adds is the same path reached from the
   * Mocraft chrome.
   */
  const captureRef = useRef<StageCapture | null>(null);
  const recorderRef = useRef<StageRecorder | null>(null);
  const [exporting, setExporting] = useState<null | {
    kind: "image" | "video";
    done: number;
  }>(null);

  /**
   * The still.
   *
   * The WebGL buffer holds the PHONE and nothing else — no background, no
   * shadow, no overlay — so the export composites the picture itself, in the
   * order the live stage paints it. The shadow is a CSS filter on the live
   * canvas and a pixel read does not carry one, so it is laid down here and
   * scaled, since the settings are in 1x pixels and the export may be 3x.
   */
  /* Res and FPS: what an export is written at, and nothing else — neither
     touches what is on screen. */
  const [exportScale, setExportScale] = useState(EXPORT_SCALE);
  const [exportFps, setExportFps] = useState(EXPORT_FPS);

  const exportImage = useCallback(async () => {
    const shot = stateRef.current;
    // The painter is synchronous, so an image background has to be decoded
    // before it runs or the export comes out with the base colour instead.
    await preloadBackgroundImage(shot.background);
    const url = captureRef.current?.(exportScale);
    if (!url) return;

    const frame = new Image();
    frame.src = url;
    try {
      await frame.decode();
    } catch {
      return;
    }

    const out = document.createElement("canvas");
    out.width = frame.width;
    out.height = frame.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    setExporting({ kind: "image", done: 0 });
    paintBackground(ctx, shot.background, out.width, out.height, exportScale);
    applyCanvasShadow(ctx, shot.shadow, exportScale);
    ctx.drawImage(frame, 0, 0);
    clearCanvasShadow(ctx);
    // After the phone: the layer sits over the shot, which is the order the
    // live stage renders in.
    paintOverlay(ctx, shot.overlay, out.width, out.height);

    const link = document.createElement("a");
    link.href = out.toDataURL("image/png");
    link.download = "mocraft.png";
    link.click();
    setExporting(null);
  }, [exportScale]);

  /**
   * The clip.
   *
   * Length comes from the motion preset, because that is the only length in
   * this chrome that means anything — one clean pass of whatever was chosen.
   * With no preset there is nothing moving, so it exports five seconds of the
   * shot as it stands rather than refusing.
   *
   * `onTime` writes straight into the playhead ref the scene samples in its
   * own frame loop: no React render per frame, and the pose is in place before
   * the frame is composited, which `renderVideoExact` requires.
   */
  const exportVideo = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || exporting) return;
    const shot = stateRef.current;
    await preloadBackgroundImage(shot.background);

    // `tracks` is a record of channels, not a list: a shot is animated when
    // any channel has keys on it.
    const animated = Object.values(shot.animation.tracks).some(
      (keys) => keys && keys.length > 0,
    );
    const durationSec = Math.min(
      30,
      Math.max(0.5, animated ? shot.animation.durationSec : 5),
    );
    setPlaying(false);
    setExporting({ kind: "video", done: 0 });

    const onTime = animated
      ? (seconds: number) => {
          playheadRef.current = Math.min(seconds, shot.animation.durationSec);
        }
      : undefined;
    const onProgress = (done: number) => setExporting({ kind: "video", done });

    try {
      let blob: Blob;
      let extension: string;
      if (supportsExactRender()) {
        // Frame by frame, with timestamps we choose, so the file does not
        // inherit this machine's stutters. See `renderVideoExact`.
        blob = await renderVideoExact({
          recorder,
          background: shot.background,
          overlay: shot.overlay,
          shadow: shot.shadow,
          scale: exportScale,
          durationSec,
          fps: exportFps,
          onTime,
          onProgress,
        });
        extension = "mp4";
      } else {
        const result = await recordStageVideo({
          recorder,
          background: shot.background,
          overlay: shot.overlay,
          shadow: shot.shadow,
          scale: exportScale,
          durationSec,
          fps: exportFps,
          onTime,
          onProgress,
        });
        blob = result.blob;
        extension = result.format.extension;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mocraft.${extension}`;
      link.click();
      // Revoking at once cancels the download in some browsers; a turn of the
      // event loop is enough for the click to be taken.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      console.warn("mocraft: video export failed", error);
    } finally {
      setExporting(null);
      playheadRef.current = 0;
    }
  }, [exporting, exportScale, exportFps]);

  /* --------------------------------------------------------------- the frame */

  /*
   * Square to start, which is what the frame draws selected.
   *
   * Not "fill": at Fill the canvas takes the whole workspace and the dot grid
   * the glass is reading from disappears behind it — so the first thing anyone
   * sees is the panels over a flat shot, with the material looking broken when
   * it is fine. A constrained ratio leaves the ground visible around it.
   */
  const [ratioId, setRatioId] = useState(DEFAULT_RATIO_ID);
  const ratio = getRatio(ratioId);

  /* -------------------------------------------------------------- the motion */

  /**
   * The playhead, as a ref.
   *
   * `PhoneStage3D` samples it inside its own frame loop precisely so playback
   * does not re-render React sixty times a second — which in this chrome would
   * mean re-running every selection spring in the interface for each frame of
   * a three-second move.
   */
  const playheadRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  /**
   * Whether the clip runs again when it reaches the end.
   *
   * On by default, because a preset is a loop far more often than not — the
   * ones worth keeping are the ones that can sit on a page cycling — and
   * because judging a move takes more than one pass.
   */
  const [looping, setLooping] = useState(true);
  const [presetId, setPresetId] = useState<string | null>(null);
  /**
   * The playhead, again — as state this time, and only for the parked case.
   *
   * `playheadRef` is the clock; this is a nudge that says "the head moved
   * without the transport running", which is the one case the scene cannot
   * notice on its own. The canvas is a demand loop: while playing it asks for
   * the next frame itself, but a scrub happens between frames and nothing
   * would redraw. Setting state re-renders `Stage`, which is what gets a frame
   * out of r3f.
   *
   * Deliberately NOT written during playback — that would re-render the whole
   * chrome sixty times a second, which is exactly what the ref exists to
   * avoid.
   */
  const [parkedAt, setParkedAt] = useState(0);

  /**
   * The shot as it is actually being drawn: the animation laid over the state.
   *
   * The panels read this rather than `state`, so a slider on an animated axis
   * shows the value on screen instead of the static one underneath it — and a
   * drag therefore continues from where the phone looks rather than jumping to
   * a number the clip has not used since the preset landed.
   *
   * Sampled at `parkedAt`, NOT at the live playhead, and that is the one place
   * this differs from the old editor. That one pushed the time into React ten
   * times a second so its sliders crept along during playback; here the same
   * push would hand `Stage` a new `studio` ten times a second and reconcile the
   * entire 3D tree behind it. So the rows follow the head whenever it is
   * parked — paused, scrubbed, stopped at the end — and hold still while the
   * clip runs, which is the half of the behaviour anyone can actually read.
   */
  const effective = useMemo(
    () =>
      ({
        ...state,
        ...sampleAnimation(state.animation, parkedAt),
      }) as EditorState,
    [state, parkedAt],
  );

  /**
   * Apply a preset and play it once.
   *
   * This shell has no transport — no timeline, no play button — so a preset
   * that only loaded keyframes would be a control that appears to do nothing.
   * Playing it through on selection is what makes the tile mean something, and
   * it is the same gesture as flipping through a gallery.
   */
  const pickPreset = useCallback(
    (id: string) => {
      const preset = getMotionPreset(id);
      if (!preset) return;
      const pose = stateRef.current;
      setPresetId(id);
      playheadRef.current = 0;
      // A preset replaces every keyframe in the shot, which is the largest edit
      // this shell can make in one press and the one most worth being able to
      // take back. Its own entry, never folded into a neighbouring gesture.
      lastEditAt.current = 0;
      record();
      setState((prev) => ({
        ...prev,
        animation: {
          easing: prev.animation.easing,
          ...fitToClip(
            preset.build({
              xAxis: pose.xAxis,
              yAxis: pose.yAxis,
              zAxis: pose.zAxis,
              zoom: pose.zoom,
              panX: pose.panX,
              panY: pose.panY,
              panZ: pose.panZ,
              fold: pose.fold,
              fov: pose.fov,
            }),
            // No clip to fit to in this shell, so the preset keeps the length it
            // was authored at.
            0,
          ),
        },
      }));
      setPlaying(true);
    },
    [record],
  );

  /**
   * Drag a key along its lane.
   *
   * Its value and its easing travel with it — a key is a moment with a pose
   * attached, and moving WHEN it happens should not change WHAT happens. A key
   * dropped on top of another replaces it, because two keys at one time is a
   * state the sampler has no answer for.
   *
   * Goes through `edit`, so a drag lands in history as one entry (the record
   * window coalesces the whole gesture) and can be undone in one press.
   */
  const moveKey = useCallback(
    (property: AnimatableKey, from: number, to: number) => {
      edit((prev) => {
        const keys = prev.animation.tracks[property];
        if (!keys?.length) return prev;
        const key = keys.find((k) => Math.abs(k.time - from) <= KEY_EPSILON);
        if (!key) return prev;
        /*
         * Clamped between its neighbours, and NOTHING is removed.
         *
         * This used to drop whatever key the dragged one landed on. That is a
         * defensible rule for a drop and a catastrophe for a drag, because a
         * drag is a continuous stream of drops: pulling one key from the start
         * of a track to the end quietly ate every key it passed on the way.
         * Two or three of those leaves a track with one key, and one more
         * press takes the track with it — which is how a timeline full of
         * keyframes ends up an empty panel.
         *
         * Clamping is what every timeline does instead. A key cannot cross its
         * neighbours, so the order of a track is something you can rely on and
         * a drag can never destroy anything.
         */
        const index = keys.indexOf(key);
        const floor = index > 0 ? keys[index - 1].time + KEY_EPSILON : 0;
        const ceiling =
          index < keys.length - 1
            ? keys[index + 1].time - KEY_EPSILON
            : prev.animation.durationSec;
        const at = Math.max(floor, Math.min(ceiling, to));
        const next = keys.map((k) => (k === key ? { ...k, time: at } : k));
        return {
          ...prev,
          animation: {
            ...prev.animation,
            tracks: { ...prev.animation.tracks, [property]: next },
          },
        };
      });
    },
    [edit],
  );

  /**
   * Retype a key's value, leaving its time and its easing alone.
   *
   * `putKey` replaces whatever sits at that time, so this is the same call the
   * transform rows make when they key an edit — the difference is only that
   * the time comes from the key rather than from the playhead.
   */
  const setKeyValue = useCallback(
    (property: AnimatableKey, time: number, value: number) => {
      edit((prev) => {
        const keys = prev.animation.tracks[property];
        if (!keys?.length) return prev;
        const existing = keys.find(
          (k) => Math.abs(k.time - time) <= KEY_EPSILON,
        );
        return {
          ...prev,
          animation: {
            ...prev.animation,
            tracks: {
              ...prev.animation.tracks,
              [property]: keys.map((k) =>
                k === existing ? { ...k, value } : k,
              ),
            },
          },
        };
      });
    },
    [edit],
  );

  /**
   * The easing for the span that STARTS at `time`.
   *
   * Written onto the leading keyframe rather than held in a table beside the
   * track, so it travels with that key when it is dragged and disappears with
   * it when it is deleted — which is what makes the marker between two keys
   * mean "this span", rather than "the span that used to be here".
   */
  const setKeyEasing = useCallback(
    (property: AnimatableKey, time: number, easing: Easing) => {
      edit((prev) => {
        const keys = prev.animation.tracks[property];
        if (!keys?.length) return prev;
        return {
          ...prev,
          animation: {
            ...prev.animation,
            tracks: {
              ...prev.animation.tracks,
              [property]: keys.map((k) =>
                Math.abs(k.time - time) <= KEY_EPSILON ? { ...k, easing } : k,
              ),
            },
          },
        };
      });
    },
    [edit],
  );

  /**
   * Drop a key.
   *
   * The last key on a track takes the track with it: an empty array and no
   * track are the same thing to the sampler, and keeping the empty one leaves
   * a lane in the timeline with nothing in it.
   */
  const deleteKey = useCallback(
    (property: AnimatableKey, time: number) => {
      edit((prev) => {
        const keys = prev.animation.tracks[property];
        if (!keys?.length) return prev;
        const next = removeKey(keys, time);
        const tracks = { ...prev.animation.tracks };
        if (next.length) tracks[property] = next;
        else delete tracks[property];
        return { ...prev, animation: { ...prev.animation, tracks } };
      });
    },
    [edit],
  );

  /**
   * How long the clip runs.
   *
   * Keys past the new end are left where they are rather than trimmed or
   * rescaled: shortening a clip to look at its first second and then putting
   * it back should return the move you had, not a shorter one that has
   * forgotten its ending. The playhead is pulled inside, because a head parked
   * past the end has nowhere to sit on the ruler.
   */
  const setDuration = useCallback(
    (seconds: number) => {
      const next = Math.min(DURATION_MAX, Math.max(DURATION_MIN, seconds));
      edit((prev) => ({
        ...prev,
        animation: { ...prev.animation, durationSec: next },
      }));
      if (playheadRef.current > next) {
        playheadRef.current = next;
        setParkedAt(next);
      }
    },
    [edit],
  );

  /**
   * The clip's default easing, for every segment nobody has set individually.
   *
   * A per-key easing beats it — that is what `Keyframe.easing` is — so this is
   * the floor rather than an override, and changing it leaves the curves a
   * preset deliberately authored alone.
   */
  const setEasing = useCallback(
    (easing: Easing) => {
      edit((prev) => ({ ...prev, animation: { ...prev.animation, easing } }));
    },
    [edit],
  );

  /**
   * Park the head at a time and show that frame.
   *
   * Scrubbing stops playback rather than seeking underneath it: a playhead
   * that springs back to where the clip had got to the moment you let go is a
   * scrub that does not work, and pausing is what every editor does here.
   */
  const seek = useCallback((seconds: number) => {
    const end = stateRef.current.animation.durationSec;
    const at = Math.max(0, Math.min(end, seconds));
    playheadRef.current = at;
    setPlaying(false);
    setParkedAt(at);
  }, []);

  /**
   * Drop the preset and give the pose back to the panels.
   *
   * While a preset is applied the animation owns the phone — the timeline is
   * showing you a frame of a clip, not the composition — so there has to be a
   * way back out that is not "undo three times". Clearing empties the tracks,
   * which is what makes `Stage` stop sampling and the transform rows mean
   * something again.
   */
  const clearPreset = useCallback(() => {
    lastEditAt.current = 0;
    record();
    setPresetId(null);
    setPlaying(false);
    playheadRef.current = 0;
    setParkedAt(0);
    setState((prev) => ({
      ...prev,
      animation: { ...prev.animation, tracks: {} },
    }));
  }, [record]);

  /**
   * The transport: one rAF loop, running only while something is playing.
   *
   * The playhead is written to the ref rather than to state, so this drives the
   * scene without re-rendering the chrome. The one piece of state it touches is
   * `playing`, once, when the clip runs out.
   */
  const duration = state.animation.durationSec;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      playheadRef.current += dt;
      if (playheadRef.current >= duration) {
        if (looping) {
          // Wrapped by the overshoot rather than reset to zero, so a clip
          // whose frame lands 4ms past the end does not lose those 4ms every
          // cycle and drift out of time with itself.
          playheadRef.current -= duration;
        } else {
          // Park on the last frame rather than snapping back to the first: the
          // preset's final pose is the composition it was chosen for.
          playheadRef.current = duration;
          setPlaying(false);
          setParkedAt(duration);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, looping]);

  /**
   * One stable object, so the stage can be told when to bother re-rendering.
   *
   * The chrome re-renders on every frame of every spring in it — a selection
   * travelling between rows, a panel resizing, a glyph turning. Without this,
   * each of those frames also handed `Stage` a brand-new `studio` and
   * reconciled the entire 3D tree behind it: the environment rig, the model's
   * mesh traversal, the shadow filter, ninety times a second, to draw a shot
   * that had not changed.
   *
   * Memoised, the object changes only when something in it does — which is
   * exactly when the stage genuinely has new work — and `memo(Stage)` can skip
   * everything else.
   */
  return useMemo(
    () => ({
      state,
      effective,
      edit,
      device,
      finishes,
      pickDevice,
      pickFinish,
      // History
      undo,
      redo,
      reset,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      // Screen
      screenSrc,
      screenName,
      uploadScreen,
      clearScreen,
      // Background
      uploadBackground,
      clearBackground,
      // Mirror
      broadcast,
      liveStream,
      screenTexture,
      screenFit,
      // Export
      captureRef,
      recorderRef,
      exportImage,
      exportVideo,
      exporting,
      // Direct handling
      turn,
      nudgeRotation,
      nudgeZoom,
      // Frame
      ratioId,
      setRatioId,
      ratio,
      // Motion
      presetId,
      pickPreset,
      playing,
      playheadRef,
      /**
       * Play from wherever the head is, or from the top if it is at the end.
       *
       * Pressing play on a finished clip should replay it, not sit there doing
       * nothing — which is what happens without this, because the head is parked
       * on the last frame and the loop exits immediately.
       */
      togglePlay: () => {
        setPlaying((was) => {
          if (!was && playheadRef.current >= duration - 0.01)
            playheadRef.current = 0;
          // Pausing parks the head, which is what lets `effective` — and so
          // every slider in the stack — catch up to the frame you stopped on.
          if (was) setParkedAt(playheadRef.current);
          return !was;
        });
      },
      looping,
      toggleLoop: () => setLooping((was) => !was),
      seek,
      clearPreset,
      duration,
      parkedAt,
      moveKey,
      deleteKey,
      setKeyEasing,
      setKeyValue,
      setDuration,
      setEasing,
      exportScale,
      setExportScale,
      exportFps,
      setExportFps,
    }),
    [
      state,
      effective,
      edit,
      device,
      finishes,
      pickDevice,
      pickFinish,
      undo,
      redo,
      reset,
      past.length,
      future.length,
      screenSrc,
      screenName,
      uploadScreen,
      clearScreen,
      uploadBackground,
      clearBackground,
      broadcast,
      liveStream,
      screenTexture,
      screenFit,
      exportImage,
      exportVideo,
      exporting,
      turn,
      nudgeRotation,
      nudgeZoom,
      ratioId,
      ratio,
      presetId,
      pickPreset,
      playing,
      looping,
      duration,
      seek,
      clearPreset,
      parkedAt,
      moveKey,
      deleteKey,
      setKeyEasing,
      setKeyValue,
      setDuration,
      setEasing,
      exportScale,
      exportFps,
    ],
  );
}
