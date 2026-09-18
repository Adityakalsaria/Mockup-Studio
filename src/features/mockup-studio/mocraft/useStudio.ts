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
import { Euler, Matrix4, Vector3 } from "three";
import {
  CAMERA_Z,
  toScreen,
  type FocusArea,
  type FocusPose,
} from "./focusMath";
import { resetTransform } from "./bindings";
import { NO_GUIDES, snap, type SnapGuides, type SnapKey } from "./snapping";
import {
  ANIMATABLE,
  KEY_EPSILON,
  type Easing,
  type Keyframe,
  keyAt,
  putKey,
  removeKey,
  sampleAnimation,
  type AnimatableKey,
} from "../animation";
import { getDevice } from "../devices";
import { finishForDevice, finishesFor } from "../finishes";
import { paintBackground, preloadBackgroundImage } from "../backgrounds";
import { paintOverlay } from "../overlay";
import { loadWatermark, paintWatermark } from "../watermark";
import { applyCanvasShadow, clearCanvasShadow } from "../shadow";
import { recordStageVideo } from "../recordVideo";
import { renderVideoExact, supportsExactRender } from "../renderVideoExact";
import type { StageCapture, StageRecorder } from "../PhoneStage3D";
import { useScreenTexture } from "../useScreenTexture";
import { useBroadcastLink } from "../broadcast/useBroadcastLink";
import { fitToClip, getMotionPreset } from "../editor/motionPresets";
import { getRatio } from "../editor/framing";
import { DEFAULT_BLUR } from "../blurStyles";
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

export type { FocusArea } from "./focusMath";

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
  /*
   * Which tab is animating. Crafting sets the pose at rest: there, an edit
   * changes the static value and never writes a key, and the sliders and the
   * stage show the rest pose rather than wherever the clip was parked. Motion
   * is where keys are made and the clip is looked at. A ref as well, so
   * `edit` reads it without being rebuilt on every switch.
   */
  const [motionMode, setMotionModeState] = useState(false);
  const motionModeRef = useRef(false);
  /** Whether the clip is playing, for `edit` -- synced below, where `playing`
      is declared. */
  const playingRef = useRef(false);
  const setMotionMode = useCallback((on: boolean) => {
    motionModeRef.current = on;
    setMotionModeState(on);
  }, []);

  const edit = useCallback(
    (f: (prev: EditorState) => EditorState) => {
      record();
      setState((prev) => {
        const next = f(prev);
        if (!motionModeRef.current) return next;
        /*
         * Locked while the clip plays. A drag during playback used to stamp
         * a key at every playhead position it passed -- a pile of keys where
         * one was meant -- so an animated channel ignores changes until the
         * clip is paused. Channels with no keys still take them.
         */
        if (playingRef.current) {
          const held = { ...next } as Record<string, unknown>;
          for (const { key } of ANIMATABLE)
            if (next.animation.tracks[key]?.length) held[key] = prev[key];
          return held as unknown as EditorState;
        }
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
  /**
   * Choose a device, and frame it from neutral.
   *
   * The transform is RESET rather than carried over, and that is a decision
   * rather than a convenience. A rotation is only meaningful against the shape
   * it turns: 95 degrees of pitch that framed a phone is a foldable seen edge
   * on, and a lid left 67% shut by the last device is a slab of black glass on
   * one that opens the other way. Carrying those over means every device
   * change starts by undoing the one before it.
   *
   * `resetTransform` is the same neutral the Transform panel's own reset uses,
   * so "pick a device" and "reset the transform" cannot disagree about where
   * neutral is -- and it already states that the lid's neutral is OPEN for
   * every device that has one, which is the whole point of a foldable in a
   * mockup.
   */
  const pickDevice = useCallback(
    (deviceId: string) => {
      edit((prev) => ({
        ...resetTransform(prev),
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

  /*
   * And the cover panel's own picture, on a foldable.
   *
   * Its own source rather than a share of the screen's, because the two show
   * different things on any real device -- a lock screen outside and whatever
   * you opened it for inside. One upload bound to both would be a mockup of a
   * phone mirroring itself, which is a photograph of nothing.
   */
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);

  const uploadCover = useCallback((file: File) => {
    readFile(file, (dataUrl) => {
      setCoverSrc(dataUrl);
      setCoverName(file.name);
    });
  }, []);

  const clearCover = useCallback(() => {
    setCoverSrc(null);
    setCoverName(null);
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
      // A live mirror is always filled -- it is a screen, not a picture.
      mode: liveStream ? "fill" : (state.screenFitMode ?? "fill"),
    };
  }, [
    liveStream,
    state.screenScale,
    state.screenOffsetX,
    state.screenOffsetY,
    state.screenFitMode,
  ]);

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
  /*
   * The same hook again, its own host and its own source, so the two screens
   * are independent all the way down rather than sharing a crop. No live
   * stream: a broadcast is the thing you are demonstrating, and it belongs on
   * the panel you opened the device to look at.
   */
  const coverHostRef = useRef<HTMLElement>(null);
  const coverTexture = useScreenTexture(
    coverHostRef,
    coverSrc ?? undefined,
    2,
    true,
    null,
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
  /* ---------------------------------------------------------------- snapping */

  /*
   * What the stage's guides show. Held while a gesture sits on a snap and
   * cleared a beat after it stops moving, the way Figma's lines leave once
   * you let go — a guide that stayed would be a mark on the shot.
   */
  const [guides, setGuides] = useState<SnapGuides>(NO_GUIDES);
  const guideTimer = useRef<number | null>(null);
  const showGuides = useCallback(
    (hits: { key: SnapKey; snapped: boolean; label: string | null }[]) => {
      const on = hits.filter((h) => h.snapped);
      const next: SnapGuides = {
        // A line for every snap, not only position: a turn about Y lands on the
        // vertical, about X on the horizontal, and the rest mark the centre.
        vertical: on.some((h) => !["panY", "xAxis"].includes(h.key)),
        horizontal: on.some((h) => !["panX", "yAxis"].includes(h.key)),
        label:
          on.find((h) => h.key !== "panX" && h.key !== "panY")?.label ?? null,
      };
      setGuides((was) =>
        was.vertical === next.vertical &&
        was.horizontal === next.horizontal &&
        was.label === next.label
          ? was
          : next,
      );
      if (guideTimer.current !== null) window.clearTimeout(guideTimer.current);
      guideTimer.current = window.setTimeout(() => setGuides(NO_GUIDES), 700);
    },
    [],
  );
  useEffect(
    () => () => {
      if (guideTimer.current !== null) window.clearTimeout(guideTimer.current);
    },
    [],
  );

  /** A slider's value, snapped — for the Transform popup's rows. */
  const snapField = useCallback(
    (key: SnapKey, raw: number) => {
      const hit = snap(key, raw);
      showGuides([{ key, ...hit }]);
      return hit.value;
    },
    [showGuides],
  );

  /*
   * Where a drag WOULD be without the snaps.
   *
   * A drag arrives as deltas. Added to a value that has just snapped, every
   * small move would be pulled straight back and the phone could never leave
   * 0°. So the gesture keeps its own unsnapped total and the snap is applied
   * to that; a pause longer than a gesture's gap starts from the state again.
   */
  const rawDrag = useRef<{
    at: number;
    values: Partial<Record<SnapKey, number>>;
  }>({
    at: 0,
    values: {},
  });
  const dragBase = (key: SnapKey, current: number) => {
    const now = performance.now();
    if (now - rawDrag.current.at > 250) rawDrag.current.values = {};
    rawDrag.current.at = now;
    return rawDrag.current.values[key] ?? current;
  };

  const turn = useCallback(
    ({ dxDeg, dyDeg }: { dxDeg: number; dyDeg: number }) => {
      /*
       * The snap is worked out once per event, outside the updater: React runs
       * updaters twice in development, and the unsnapped total below would
       * gather each delta twice — a drag at double speed. The updater only
       * receives the answer, and a memo of it per starting pose.
       */
      let answer: { yAxis: number; xAxis: number } | null = null;
      const snapTurn = (y0: number, x0: number) => {
        if (answer) return answer;
        const rawY = dragBase("yAxis", y0) + dxDeg;
        const rawX = dragBase("xAxis", x0) + dyDeg;
        rawDrag.current.values.yAxis = rawY;
        rawDrag.current.values.xAxis = rawX;
        const y = snap("yAxis", rawY);
        const x = snap("xAxis", rawX);
        // Only where the gesture moves that axis: a sideways drag should not
        // flash a guide for the tilt it never touched.
        const hits = [
          ...(dxDeg !== 0 ? [{ key: "yAxis" as const, ...y }] : []),
          ...(dyDeg !== 0 ? [{ key: "xAxis" as const, ...x }] : []),
        ];
        queueMicrotask(() => showGuides(hits));
        answer = { yAxis: y.value, xAxis: x.value };
        return answer;
      };
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
          ...snapTurn(now.yAxis ?? prev.yAxis, now.xAxis ?? prev.xAxis),
        };
      });
    },
    [edit, showGuides],
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
  /** Cmd+Shift+drag on the stage: Location X and Y, from where the phone is. */
  const nudgePan = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      edit((prev) => {
        const now = sampleAnimation(prev.animation, playheadRef.current);
        return {
          ...prev,
          panX: (now.panX ?? prev.panX) + dx,
          panY: (now.panY ?? prev.panY) + dy,
        };
      });
    },
    [edit],
  );

  const nudgeZoom = useCallback(
    (deltaPct: number) => {
      // Once per event, for the reason `turn` gives.
      let zoomAnswer: number | null = null;
      edit((prev) => {
        // Off the sampled scale for the same reason `turn` is — see there.
        const now = sampleAnimation(prev.animation, playheadRef.current);
        if (zoomAnswer !== null) return { ...prev, zoom: zoomAnswer };
        const raw = Math.max(
          RANGES.zoom.min,
          Math.min(
            RANGES.zoom.max,
            dragBase("zoom", now.zoom ?? prev.zoom) + deltaPct / 100,
          ),
        );
        rawDrag.current.values.zoom = raw;
        const hit = snap("zoom", raw);
        queueMicrotask(() => showGuides([{ key: "zoom", ...hit }]));
        zoomAnswer = hit.value;
        return { ...prev, zoom: hit.value };
      });
    },
    [edit, showGuides],
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
  /** The stage's WebGL canvas, which the preview card streams from. */
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  /** Whether exports carry the Mocraft mark. */
  const [watermark, setWatermark] = useState(true);

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
    /*
     * Display P3 where the screen is, so the file is the picture the editor
     * showed. An sRGB canvas clipped the wider colours an image background
     * carries on a Mac, and wrote a PNG with no profile at all — which apps
     * are then free to read as whatever they like, and several read as dull.
     * A P3 canvas tags the file; the sRGB phone converts into it exactly.
     */
    const colorSpace: PredefinedColorSpace = window.matchMedia(
      "(color-gamut: p3)",
    ).matches
      ? "display-p3"
      : "srgb";
    const ctx = out.getContext("2d", { colorSpace });
    if (!ctx) return;
    // The canvas default is "low", and CSS scales a background image with a
    // far better filter than that.
    ctx.imageSmoothingQuality = "high";

    setExporting({ kind: "image", done: 0 });
    paintBackground(ctx, shot.background, out.width, out.height, exportScale);
    applyCanvasShadow(ctx, shot.shadow, exportScale);
    ctx.drawImage(frame, 0, 0);
    clearCanvasShadow(ctx);
    // After the phone: the layer sits over the shot, which is the order the
    // live stage renders in.
    paintOverlay(ctx, shot.overlay, out.width, out.height);
    const mark = watermark ? await loadWatermark() : null;
    if (mark) paintWatermark(ctx, out.width, out.height, mark);

    /*
     * A Blob, not a data URL. Chrome quietly refuses to download a large
     * `data:` link, and a 3x or 4x PNG is past that line -- the click did
     * nothing at all. The video export already goes this way.
     */
    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, "image/png"),
    );
    setExporting(null);
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "mocraft.png";
    link.click();
    // Revoking at once cancels the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  }, [exportScale, watermark]);

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
          watermark,
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
          watermark,
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
  }, [exporting, exportScale, exportFps, watermark]);

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
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
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
      motionMode
        ? ({
            ...state,
            ...sampleAnimation(state.animation, parkedAt),
          } as EditorState)
        : state,
    [state, parkedAt, motionMode],
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
   * Key this property here, or take the key away.
   *
   * The one way to START a track. `edit` keys only properties that are already
   * animated -- deliberately, so that dragging Pan X on a preset that never
   * touched Pan X moves the shot rather than quietly beginning a new track
   * from a single key. That rule leaves nothing able to make the first key,
   * which is what this is.
   *
   * A toggle rather than an add, because the glyph is a state and not a verb:
   * it is filled when there is a key at the playhead, and pressing a filled
   * one should take it away. Deleting the last key on a track removes the
   * track, which `deleteKey` already handles.
   *
   * The value it stores is the EFFECTIVE one -- what the stage is showing at
   * this instant, which on an already-animated property is the sampled value
   * rather than the static one underneath it. Keying the static value would
   * make the phone jump the moment you pressed the diamond.
   */
  const toggleKey = useCallback(
    (property: AnimatableKey) => {
      const time = playheadRef.current;
      const existing = keyAt(effective.animation.tracks[property], time);
      if (existing) {
        deleteKey(property, existing.time);
        return;
      }
      const value = effective[property];
      if (typeof value !== "number") return;
      edit((prev) => ({
        ...prev,
        animation: {
          ...prev.animation,
          tracks: {
            ...prev.animation.tracks,
            [property]: putKey(prev.animation.tracks[property], time, value),
          },
        },
      }));
    },
    [deleteKey, edit, effective],
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
      // Global means every span: drop each key's own easing so none of them
      // keeps overriding the default it was just set to. One undo step.
      edit((prev) => {
        const tracks = Object.fromEntries(
          Object.entries(prev.animation.tracks).map(([key, keys]) => [
            key,
            keys?.map((frame) => ({ ...frame, easing: undefined })),
          ]),
        ) as typeof prev.animation.tracks;
        return { ...prev, animation: { ...prev.animation, easing, tracks } };
      });
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
  /* ----------------------------------------------------------- focus camera */

  /**
   * Areas of the shot to visit, as fractions of the frame, in the order they
   * were drawn. Not part of the shot's state: they are the brief for Compose,
   * and what Compose writes -- keyframes -- is what the shot keeps and undo
   * walks back.
   */
  const [focusPoints, setFocusPoints] = useState<FocusArea[]>([]);
  /** A focus area is being dragged out right now -- the popup's picture of
      what to do steps aside the moment you start doing it. */
  const [focusDrafting, setFocusDrafting] = useState(false);

  /** How hard Compose turns the phone toward each area, 0 (flat) to 1. */
  const [focusTilt, setFocusTilt] = useState(0.6);
  /** How far the camera pushes into each area: 1 fills the frame with it,
      less stops part-way from the wide shot, more goes tighter than it. */
  const [focusZoom, setFocusZoom] = useState(1);
  /** Depth of field for the move, 0..1. 0 leaves the blur as it is. */
  const [focusDof, setFocusDof] = useState(0);

  /**
   * Turn the areas into one camera move: wide, then each area in turn -- a
   * travel and a hold apiece -- then wide again, over the clip's length.
   *
   * The rig is exact: the camera sits 1.8 back with a vertical fov, pan moves
   * the phone `pan * 0.2` units and zoom scales it about its origin, inside
   * the XYZ rotation. So a box's centre is a point on the phone, found by
   * undoing the base pose, and framing it is re-posing the phone and panning
   * that point onto the camera's axis.
   *
   * The smart part is the tilt. Arriving at an area, the phone turns so that
   * area comes toward the camera -- top-left leans the top-left edge in --
   * in proportion to how far off-centre it is, with a touch of roll, and it
   * keeps drifting a little through the hold so a hold is never a still.
   * Zoom is corrected for the depth the turn brings the area forward by, so
   * the box still fills the frame.
   */
  const composeFocus = useCallback(
    (frameAspect: number) => {
      if (!focusPoints.length || !(frameAspect > 0)) return;
      edit((prev) => {
        const deg = Math.PI / 180;
        const base: FocusPose = {
          xAxis: prev.xAxis,
          yAxis: prev.yAxis,
          zAxis: prev.zAxis,
          zoom: prev.zoom,
          panX: prev.panX,
          panY: prev.panY,
          panZ: prev.panZ,
          fov: prev.fov ?? 35,
          scaleX: prev.scaleX ?? 1,
          scaleY: prev.scaleY ?? 1,
          scaleZ: prev.scaleZ ?? 1,
        };
        const halfTan = Math.tan((base.fov * deg) / 2);
        const perAxis = new Vector3(base.scaleX, base.scaleY, base.scaleZ);

        /*
         * One area, framed. The area lives on the phone, so nothing here
         * guesses from the screen: its centre and edges are points in the
         * phone's own coordinates, turned by the new pose, and the pan puts
         * the centre on the camera's axis.
         */
        const frame = (
          a: FocusArea,
          extraYaw: number,
          push: number,
          sideOf: number,
        ) => {
          const centre = new Vector3(a.cx, a.cy, 0);
          // Where the area sits in the wide shot decides which way to lean.
          const seen = toScreen(centre, base, frameAspect);
          // With a FLOOR: proportional alone gave an area near the middle a
          // few degrees, which reads as no tilt at all. Every area leans at
          // least 12 degrees toward its side (36 at the edge); one almost
          // dead centre takes the side its order gives it.
          const t = focusTilt;
          const lean = (
            offset: number,
            fallback: number,
            floor: number,
            span: number,
          ) => {
            const side =
              Math.abs(offset) < 0.04 ? fallback : Math.sign(offset);
            return (
              side * (floor + span * Math.min(1, Math.abs(offset) * 2)) * t
            );
          };
          // Screen y runs top-down: an area ABOVE centre has 0.5 - y > 0,
          // and positive pitch brings the top edge toward the camera.
          const pitch = base.xAxis + lean(0.5 - seen.y, 1, 6, 14);
          const yaw = base.yAxis + lean(0.5 - seen.x, sideOf, 12, 24) + extraYaw;
          const roll = base.zAxis - lean(0.5 - seen.x, sideOf, 1.5, 4);

          const turn = new Matrix4().makeRotationFromEuler(
            new Euler(pitch * deg, yaw * deg, roll * deg),
          );
          const turned = (x: number, y: number) =>
            new Vector3(x, y, 0).multiply(perAxis).applyMatrix4(turn);
          const mid = turned(a.cx, a.cy);
          const edges = [
            turned(a.cx - a.w / 2, a.cy),
            turned(a.cx + a.w / 2, a.cy),
            turned(a.cx, a.cy + a.h / 2),
            turned(a.cx, a.cy - a.h / 2),
          ];
          // Relative to the centre, which the pan puts on the axis; depth
          // measured from the camera.
          const onFrame = (p: Vector3, zoom: number) => {
            const depth = CAMERA_Z - base.panZ - zoom * p.z;
            return {
              u: (zoom * (p.x - mid.x)) / depth / (halfTan * frameAspect) / 2,
              v: (zoom * (p.y - mid.y)) / depth / halfTan / 2,
            };
          };
          // Fill the frame: scale until the area's edges meet it, and repeat
          // -- the turn foreshortens and brings part of it nearer, so it is
          // iterated against the camera until it lands within 0.1%.
          let zoom = base.zoom;
          for (let pass = 0; pass < 20; pass++) {
            const [l, r, t2, b] = edges.map((p) => onFrame(p, zoom));
            const fill = Math.max(Math.abs(r.u - l.u), Math.abs(t2.v - b.v));
            if (!(fill > 0)) break;
            zoom /= fill;
            if (Math.abs(fill - 1) < 1e-3) break;
          }
          // Part of the way in, all of it, or past it -- measured from the
          // wide shot, so 50% is halfway between the wide and a full frame.
          zoom = base.zoom + (zoom - base.zoom) * focusZoom;
          zoom = Math.min(
            RANGES.zoom.max,
            Math.max(RANGES.zoom.min, zoom * push),
          );
          return {
            zoom,
            panX: (-zoom * mid.x) / 0.2,
            panY: (zoom * mid.y) / 0.2,
            xAxis: pitch,
            yAxis: yaw,
            zAxis: roll,
          };
        };
        const wide = {
          zoom: base.zoom,
          panX: base.panX,
          panY: base.panY,
          xAxis: base.xAxis,
          yAxis: base.yAxis,
          zAxis: base.zAxis,
        };

        /*
         * Timed for the move, not squeezed into whatever the clip was: a
         * travel of 1.4s and a hold of 1.2s per area. Three areas in the old
         * 3s gave each move a third of a second, which is the snap.
         */
        const TRAVEL = 1.4;
        const HOLD = 1.2;
        const total = TRAVEL * (focusPoints.length + 1) + HOLD * focusPoints.length;
        /*
         * Per-span curves, not the spline. "Smooth" is one monotone spline
         * through every key, and a hold's two nearly-equal keys pin it flat
         * there -- so the camera stopped dead on arrival AND again leaving,
         * which reads as stop-and-go. Travels get a long cinematic in-out,
         * holds a straight line, so the push-in through a hold never stops.
         */
        const TRAVEL_EASE: Easing = { kind: "cubic", p: [0.45, 0, 0.2, 1] };
        const HOLD_EASE: Easing = { kind: "cubic", p: [0, 0, 1, 1] };
        const keys = {
          zoom: [] as Keyframe[],
          panX: [] as Keyframe[],
          panY: [] as Keyframe[],
          xAxis: [] as Keyframe[],
          yAxis: [] as Keyframe[],
          zAxis: [] as Keyframe[],
        };
        // The easing on a key is the curve of the span it STARTS.
        const put = (time: number, shot: typeof wide, easing: Easing) => {
          for (const k of Object.keys(keys) as (keyof typeof keys)[])
            keys[k].push({ time, value: shot[k], easing });
        };
        put(0, wide, TRAVEL_EASE);
        let at = 0;
        const arrive: number[] = [];
        const leave: number[] = [];
        focusPoints.forEach((r, i) => {
          const sideOf = i % 2 === 0 ? 1 : -1;
          // Arrive, then drift: a little tighter and a little further round
          // by the end of the hold, the way a hand-held camera settles in.
          const seenX = toScreen(
            new Vector3(r.cx, r.cy, 0),
            base,
            frameAspect,
          ).x;
          const drift =
            focusTilt > 0
              ? 3 *
                (Math.abs(0.5 - seenX) < 0.04 ? sideOf : Math.sign(0.5 - seenX))
              : 0;
          at += TRAVEL;
          arrive.push(at);
          put(at, frame(r, 0, 1, sideOf), HOLD_EASE);
          at += HOLD;
          leave.push(at);
          put(at, frame(r, drift, 1.05, sideOf), TRAVEL_EASE);
        });
        put(total, wide, TRAVEL_EASE);
        return {
          ...prev,
          animation: {
            ...prev.animation,
            durationSec: Math.max(prev.animation.durationSec, total),
            tracks: { ...prev.animation.tracks, ...keys },
          },
          /*
           * Depth of field without keyframes. Blur cannot be keyed, and does
           * not need to be: every area is brought to the MIDDLE of the frame,
           * so a radial blur focused on the middle keeps whatever the camera
           * is looking at sharp and softens the rest -- and follows the move
           * from area to area on its own.
           */
          // With depth of field, the schedule it follows; without, none.
          focusFollow:
            focusDof > 0
              ? { areas: focusPoints, arrive, leave, end: total }
              : null,
          ...(focusDof > 0
            ? {
                motionBlur: {
                  ...(prev.motionBlur ?? DEFAULT_BLUR),
                  mode: "radial" as const,
                  strength: Math.round(focusDof * 100),
                  focusX: 0.5,
                  focusY: 0.5,
                  focusSize: 0.35,
                  falloff: 0.5,
                },
              }
            : {}),
        };
      });
      playheadRef.current = 0;
      setParkedAt(0);
      setPlaying(true);
    },
    [edit, focusPoints, focusTilt, focusZoom, focusDof],
  );

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
      // The move it followed is gone, so is the schedule.
      focusFollow: null,
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
      // Cover screen
      coverSrc,
      coverName,
      uploadCover,
      clearCover,
      // Background
      uploadBackground,
      clearBackground,
      // Mirror
      broadcast,
      liveStream,
      screenTexture,
      coverTexture,
      screenFit,
      // Export
      captureRef,
      recorderRef,
      stageCanvasRef,
      exportImage,
      exportVideo,
      exporting,
      // Direct handling
      turn,
      nudgeRotation,
      nudgeZoom,
      nudgePan,
      // Snapping
      guides,
      snapField,
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
      toggleKey,
      deleteKey,
      setKeyEasing,
      setKeyValue,
      setDuration,
      motionMode,
      setMotionMode,
      focusDrafting,
      setFocusDrafting,
      focusPoints,
      setFocusPoints,
      focusTilt,
      setFocusTilt,
      focusZoom,
      setFocusZoom,
      focusDof,
      setFocusDof,
      composeFocus,
      setEasing,
      exportScale,
      setExportScale,
      exportFps,
      setExportFps,
      watermark,
      setWatermark,
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
      // Cover screen
      coverSrc,
      coverName,
      uploadCover,
      clearCover,
      uploadBackground,
      clearBackground,
      broadcast,
      liveStream,
      screenTexture,
      coverTexture,
      screenFit,
      exportImage,
      exportVideo,
      exporting,
      turn,
      nudgeRotation,
      nudgeZoom,
      nudgePan,
      guides,
      snapField,
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
      toggleKey,
      deleteKey,
      setKeyEasing,
      setKeyValue,
      setDuration,
      focusDrafting,
      motionMode,
      setMotionMode,
      focusPoints,
      focusTilt,
      focusZoom,
      focusDof,
      composeFocus,
      setEasing,
      exportScale,
      exportFps,
      watermark,
    ],
  );
}
