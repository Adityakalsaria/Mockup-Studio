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
import { getDevice } from "../devices";
import { finishForDevice, finishesFor } from "../finishes";
import { preloadBackgroundImage } from "../backgrounds";
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

/**
 * Its own slot in storage.
 *
 * Not the editor's `ks-shot`. The two shells expose different subsets of the
 * same state — this one has no timeline and no cover screen — so sharing a slot
 * would mean one of them silently reverting fields the other cannot see. Two
 * shots, two keys, and neither can surprise the other.
 */
const SHOT_KEY = "mocraft-shot";
/** A background image is a data URL and can be megabytes; storage is small and
    allowed to refuse. Failing to save is not worth breaking the studio over. */
const SHOT_LIMIT = 2_000_000;

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

/** The frame the studio opens on, and what a canvas panel's reset goes back
    to. Named because two places now need to agree on it. */
export const DEFAULT_RATIO_ID = "1:1";

function loadShot(): EditorState {
  if (typeof window === "undefined") return DEFAULT_EDITOR_STATE;
  try {
    const raw = window.localStorage.getItem(SHOT_KEY);
    if (!raw) return DEFAULT_EDITOR_STATE;
    // Merged over the defaults rather than replacing them, so a shot saved
    // before a field existed still opens once it does.
    return { ...DEFAULT_EDITOR_STATE, ...(JSON.parse(raw) as Partial<EditorState>) };
  } catch {
    return DEFAULT_EDITOR_STATE;
  }
}

/** Read a picked file as a data URL — it outlives the `File` and survives into
    a client-side export, which an object URL does neither of. */
function readFile(file: File, onLoad: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.readAsDataURL(file);
}

export type Studio = ReturnType<typeof useStudio>;

export function useStudio() {
  const [state, setState] = useState<EditorState>(loadShot);

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

  /* ---------------------------------------------------------------- storage */

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const raw = JSON.stringify(state);
        if (raw.length <= SHOT_LIMIT) window.localStorage.setItem(SHOT_KEY, raw);
      } catch {
        // Full, blocked, or private mode. Nothing to do but carry on.
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [state]);

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
      entries.length >= HISTORY_LIMIT ? [...entries.slice(1), prev] : [...entries, prev],
    );
  }, []);

  const edit = useCallback(
    (f: (prev: EditorState) => EditorState) => {
      record();
      setState((prev) => f(prev));
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
    setState((prev) => ({ ...DEFAULT_EDITOR_STATE, background: prev.background }));
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
  const pickDevice = useCallback((deviceId: string) => {
    edit((prev) => ({
      ...prev,
      deviceId,
      finishId: finishForDevice(getDevice(deviceId).finishIds, prev.finishId).id,
    }));
  }, [edit]);

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
      edit((prev) => ({
        ...prev,
        yAxis: prev.yAxis + dxDeg,
        xAxis: prev.xAxis + dyDeg,
      }));
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
      edit((prev) => ({
        ...prev,
        zoom: Math.max(
          RANGES.zoom.min,
          Math.min(RANGES.zoom.max, prev.zoom + deltaPct / 100),
        ),
      }));
    },
    [edit],
  );

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
  const [presetId, setPresetId] = useState<string | null>(null);

  /**
   * Apply a preset and play it once.
   *
   * This shell has no transport — no timeline, no play button — so a preset
   * that only loaded keyframes would be a control that appears to do nothing.
   * Playing it through on selection is what makes the tile mean something, and
   * it is the same gesture as flipping through a gallery.
   */
  const pickPreset = useCallback((id: string) => {
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
        // Park on the last frame rather than snapping back to the first: the
        // preset's final pose is the composition it was chosen for.
        playheadRef.current = duration;
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

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
  return useMemo(() => ({
    state,
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
  }), [
    state,
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
    turn,
    nudgeRotation,
    nudgeZoom,
    ratioId,
    ratio,
    presetId,
    pickPreset,
    playing,
  ]);
}
