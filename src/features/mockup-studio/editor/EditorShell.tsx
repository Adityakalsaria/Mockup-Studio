"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePhoneLink } from "../gyro/usePhoneLink";
import PhoneStage3D, { type StageCapture, type StageRecorder } from "../PhoneStage3D";
import { backgroundCss, paintBackground, preloadBackgroundImage } from "../backgrounds";
import { pickRecordingFormat, recordStageVideo } from "../recordVideo";
import { renderVideoExact, supportsExactRender } from "../renderVideoExact";
import {
  hasKeys,
  keyAt,
  putKey,
  removeKey,
  sampleAnimation,
  type AnimatableKey,
  type Easing,
} from "../animation";
import { Timeline } from "./Timeline";
import { fitToClip, getMotionPreset } from "./motionPresets";
import { useFilmstrip } from "./useFilmstrip";
import { useScreenTexture } from "../useScreenTexture";
import { RightPanel } from "./RightPanel";
import { getRatio } from "./framing";
import { EditorTheme, EditorThemeContext } from "./theme";
import { Tabs, useEditorTheme } from "./primitives";
import { Icon } from "./icons";
import {
  DEFAULT_EDITOR_STATE,
  MIRROR_SCREEN_FIT,
  RANGES,
  type EditorState,
} from "./editorState";

/**
 * The editor, laid out as the KOSH frame lays it out: a top bar with the
 * canvas taking the whole column beneath it, and a fixed 290px panel down the
 * right. Every gap is the frame's 14px.
 */
/**
 * One of the two stage-level actions.
 *
 * Disabled rather than hidden when there is nothing to undo, so the cluster
 * does not resize and reflow the moment history empties -- a control that
 * appears and disappears is harder to aim at than one that greys out.
 */
function StageAction({
  icon,
  label,
  hint,
  disabled,
  onClick,
}: {
  icon: "undo" | "redo" | "resetAll";
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={hint}
      className="ks-press grid h-[28px] w-[28px] place-items-center rounded-full"
      style={{
        color: "var(--ks-text-dim)",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <Icon name={icon} />
    </button>
  );
}

/** Long enough to swallow a drag, short enough that two deliberate edits a
    moment apart stay separate. */
const HISTORY_COALESCE_MS = 450;
const HISTORY_LIMIT = 60;

export default function EditorShell() {
  const [theme, toggleTheme] = useEditorTheme();
  const [state, setState] = useState<EditorState>(DEFAULT_EDITOR_STATE);

  /*
   * Undo history.
   *
   * Recorded by WATCHING `state` rather than by wrapping the setter. There are
   * ten setState call sites in here and only some go through `change()`, so
   * anything that intercepts one path would silently miss the rest -- and a
   * wrapper that mutated a ref inside the updater would double-count under
   * StrictMode, which calls updaters twice.
   *
   * Consecutive edits inside one gesture collapse into a single entry. A slider
   * drag fires a change per frame, so without that, undo would walk back
   * through a drag one pixel at a time and feel broken. The window extends
   * itself while the gesture continues, so the whole drag costs one entry and
   * the state pushed is the one from before it started.
   */
  const [past, setPast] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);
  const prevStateRef = useRef(state);
  /** The live state, for pushing onto the opposite stack when stepping. */
  const stateRef = useRef(state);
  const fromUndoRef = useRef(false);
  const lastEditAt = useRef(0);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    stateRef.current = state;
    if (prev === state) return;
    // An undo is not itself an edit; recording it would make undo a no-op that
    // pushed what it had just popped.
    if (fromUndoRef.current) {
      fromUndoRef.current = false;
      return;
    }
    // A fresh edit forks history: whatever you had redone your way back from
    // is no longer reachable, and keeping it would let redo jump to a state
    // that never followed from this one.
    setFuture((entries) => (entries.length ? [] : entries));
    const now = performance.now();
    const sameGesture = now - lastEditAt.current < HISTORY_COALESCE_MS;
    lastEditAt.current = now;
    if (sameGesture) return;
    setPast((entries) =>
      entries.length >= HISTORY_LIMIT
        ? [...entries.slice(1), prev]
        : [...entries, prev],
    );
  }, [state]);

  /** Park the playhead at a time, stopping playback so it stays there. */
  const seekTo = useCallback((time: number) => {
    setPlaying(false);
    setPlayhead(time);
    // The transport reads its clock from the ref, so a seek has to move that
    // too or pressing play would resume from wherever it had got to.
    playheadRef.current = time;
  }, []);

  const undo = useCallback(() => {
    if (!past.length) return;
    fromUndoRef.current = true;
    // Reopen the window, or the next edit would be folded into the gesture
    // that was just undone.
    lastEditAt.current = 0;
    setFuture((entries) => [stateRef.current, ...entries]);
    setState(past[past.length - 1]);
    setPast((entries) => entries.slice(0, -1));
  }, [past]);

  const redo = useCallback(() => {
    if (!future.length) return;
    fromUndoRef.current = true;
    lastEditAt.current = 0;
    setPast((entries) => [...entries, stateRef.current]);
    setState(future[0]);
    setFuture((entries) => entries.slice(1));
  }, [future]);

  /** Back to defaults, and itself undoable -- the watcher above records it
      like any other change, so a mis-click costs one undo rather than the
      afternoon. The loaded image or video is deliberately left alone: it is
      the one thing here that cannot be recreated by moving a slider. */
  const resetAll = useCallback(() => {
    lastEditAt.current = 0;
    setState(DEFAULT_EDITOR_STATE);
  }, []);

  // Cmd/Ctrl+Z, but never while a field has focus -- undoing the whole shot
  // when someone meant to undo their typing is worse than no shortcut.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Space is play/pause. Not while a field has focus, and not while a
      // button or select does either -- space is how those are activated from
      // the keyboard, and stealing it would break the panel for anyone not
      // using a mouse.
      if (event.key === " " || event.code === "Space") {
        const el = event.target as HTMLElement | null;
        const tag = el?.tagName;
        if (
          el &&
          (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "SELECT" || el.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        setPlaying((p) => !p);
        return;
      }
      // B and E jump the playhead to the beginning and the end. Bare keys, so
      // they are ignored the moment a modifier is held -- cmd+E and friends
      // belong to the browser, and taking them would be a surprise.
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        const jump = event.key.toLowerCase();
        if (jump === "b" || jump === "e") {
          const el = event.target as HTMLElement | null;
          const tag = el?.tagName;
          if (el && (tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable)) return;
          event.preventDefault();
          seekTo(jump === "b" ? 0 : durationRef.current);
          return;
        }
      }
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const el = event.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      event.preventDefault();
      // Shift+Cmd+Z is redo everywhere on this platform; Cmd+Y is the Windows
      // spelling and is not worth a second branch in a Mac-first tool.
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, seekTo]);

  const [sourceSrc, setSourceSrc] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  /** Where the source layer starts on the timeline, in seconds. */
  const [sourceStart, setSourceStart] = useState(0);
  /** How long it occupies. null means "its own length" — a video's duration,
      or the one second a still gets until someone drags it longer. */
  const [sourceSpan, setSourceSpan] = useState<number | null>(null);
  // null when idle; 0..1 while recording, which is also what disables Export.
  const [recordProgress, setRecordProgress] = useState<number | null>(null);

  const [timelineOpen, setTimelineOpen] = useState(false);
  const [exportFps, setExportFps] = useState(60);
  const [exportScale, setExportScale] = useState(2);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [ratioId, setRatioId] = useState("fill");
  // null = Fill: the canvas takes the whole workspace instead of letterboxing.
  const ratio = getRatio(ratioId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  /** Which of the two mobile steps is showing. Ignored above `laptop`, where
      both panels are on screen at once. */
  const [mobileStep, setMobileStep] = useState<"device" | "scene">("device");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<StageCapture | null>(null);
  const recorderRef = useRef<StageRecorder | null>(null);
  const screenHostRef = useRef<HTMLDivElement>(null);

  // A live window capture, when one is running. See `startMirror` below.
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  // Phone pairing. Off until the panel is opened, so a session that never
  // pairs opens no event stream and fetches no QR.
  const [pairing, setPairing] = useState(false);
  const [liveMotion, setLiveMotion] = useState(false);
  const phone = usePhoneLink(pairing);
  // Resolved in an effect, not during render: this route is prerendered, and
  // `navigator` does not exist on the server. Starting false also means the
  // control never flashes in before we know the browser can honour it.
  const [canMirror, setCanMirror] = useState(false);
  useEffect(() => {
    setCanMirror(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia);
  }, []);

  // autoPlay off: the timeline drives the clip, see the sync effect below.
  const screenTexture = useScreenTexture(
    screenHostRef,
    sourceSrc ?? undefined,
    2,
    false,
    liveStream,
  );
  const screenVideo = (screenTexture as { image?: HTMLVideoElement } | null)?.image;
  // three's own flag rather than `instanceof HTMLVideoElement`. This runs
  // during render, and render happens on the server too, where that global
  // does not exist — the prerender of /mockup-studio failed on exactly that.
  //
  // A live mirror is deliberately NOT a video screen. It is backed by the same
  // VideoTexture, but everything downstream of this flag — the filmstrip, the
  // clip length, seeking the element to the playhead — assumes a file with a
  // duration you can scrub. A stream has neither, so treating it as a clip
  // gives a timeline of NaN and seeks that throw.
  const isVideoScreen = Boolean(
    (screenTexture as { isVideoTexture?: boolean } | null)?.isVideoTexture &&
      screenVideo &&
      !liveStream,
  );

  // Owned here rather than in the timeline because the clip's length is not
  // just a drawing detail: it decides the timeline's duration and it is what
  // the playhead is wrapped against. Reading `video.duration` off the live
  // element instead looked simpler and silently never updated — `duration`
  // goes from NaN to a number when metadata lands, and that is a mutation on
  // an object React has no reason to re-render for.
  // 0 frames: the timeline draws a plain bar now, so only the duration is
  // wanted. Ten seeks and ten canvas reads per source change, to end up
  // reading one number off the metadata, was work nothing consumed.
  const clip = useFilmstrip(isVideoScreen ? sourceSrc : null, 0);

  // Read at click time, not capture time: keeping the backdrop in a ref stops
  // `exportPng` taking a new identity on every colour nudge.
  // Read at click time so `exportPng` keeps a stable identity.
  const exportScaleRef = useRef(exportScale);
  useEffect(() => {
    exportScaleRef.current = exportScale;
  }, [exportScale]);

  const backgroundRef = useRef(state.background);
  useEffect(() => {
    backgroundRef.current = state.background;
  }, [state.background]);

  const { animation } = state;

  // Callbacks below must stay identity-stable (PointerDragRotation binds them
  // once), so anything they need to read live goes through a ref.
  const playheadRef = useRef(0);
  /** Read by the B/E shortcut, so its listener never has to re-subscribe. */
  const durationRef = useRef(DEFAULT_EDITOR_STATE.animation.durationSec);
  const playingRef = useRef(false);
  const animatedRef = useRef(false);
  const clipVideoRef = useRef<HTMLVideoElement | null>(null);
  const clipLengthRef = useRef(0);
  // The playback loop is bound once, so it reaches the current mapping through
  // a ref rather than closing over a stale one.
  const clipTimeRef = useRef<(time: number) => number>(() => 0);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    // Only follow React while paused: during playback the ref is the source
    // of truth and the state is the copy, not the other way round.
    if (!playingRef.current) playheadRef.current = playhead;
  }, [playhead]);

  // What the stage and the panel actually show.
  //
  // A property with keys is owned by its track — its static value is only a
  // fallback for the properties that have none. Doing this at the point of
  // use rather than by writing sampled values back into state is what keeps
  // scrubbing from destroying the poses you keyed.
  const sampled = useMemo(
    () => sampleAnimation(animation, playhead),
    [animation, playhead],
  );
  const effective = useMemo(() => ({ ...state, ...sampled }), [state, sampled]);
  const effectiveRef = useRef(effective);
  useEffect(() => {
    effectiveRef.current = effective;
  }, [effective]);

  // Editing a value that is already animated writes a key at the playhead
  // rather than a static value — otherwise the edit would appear to do
  // nothing, because the track would immediately sample over the top of it.
  const change = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const tracks = { ...prev.animation.tracks };
      let touched = false;
      for (const [name, value] of Object.entries(patch)) {
        const key = name as AnimatableKey;
        if (typeof value !== "number" || !tracks[key]?.length) continue;
        tracks[key] = putKey(tracks[key], playheadRef.current, value);
        touched = true;
      }
      return touched ? { ...next, animation: { ...prev.animation, tracks } } : next;
    });
  }, []);

  // Cursor-drag rotation. The functional update matters: a drag fires a move
  // per frame, and reading `state` from the render closure would drop every
  // delta React batched into the same render.
  const nudgeRotation = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      // Reads the sampled value, not the stored one, so dragging an animated
      // axis continues from where it looks rather than snapping to its static
      // value first.
      const base = effectiveRef.current;
      change({ yAxis: base.yAxis + dx * 0.4, xAxis: base.xAxis + dy * 0.4 });
    },
    [change],
  );

  // Wheel / pinch zoom, matching the "Scroll" hint on the Zoom row. The stage
  // reports scale in percentage points; editor zoom is the same number over
  // 100, and it is clamped to the slider's own range so the two agree.
  const nudgeZoom = useCallback(
    (deltaPct: number) => {
      const current = effectiveRef.current.zoom;
      change({
        zoom: Math.max(
          RANGES.zoom.min,
          Math.min(RANGES.zoom.max, current + deltaPct / 100),
        ),
      });
    },
    [change],
  );

  const setAnimation = useCallback((patch: Partial<typeof DEFAULT_EDITOR_STATE.animation>) => {
    setState((prev) => ({ ...prev, animation: { ...prev.animation, ...patch } }));
  }, []);

  /** The diamond: key this property here, or drop the key that is already here. */
  const toggleKey = useCallback((property: AnimatableKey) => {
    setState((prev) => {
      const time = playheadRef.current;
      const keys = prev.animation.tracks[property];
      const existing = keyAt(keys, time);
      const value = sampleAnimation(prev.animation, time)[property] ?? prev[property];
      const nextKeys = existing
        ? removeKey(keys, time)
        : putKey(keys, time, value as number);
      const tracks = { ...prev.animation.tracks };
      // An empty array and no track are the same thing; keeping the empty one
      // would leave a lane in the timeline with nothing in it.
      if (nextKeys.length) tracks[property] = nextKeys;
      else delete tracks[property];
      return { ...prev, animation: { ...prev.animation, tracks } };
    });
  }, []);

  /**
   * Set the easing for the segment starting at `time`.
   *
   * Written onto the leading keyframe, so it travels with that key when it is
   * dragged and disappears with it when it is deleted.
   */
  const setKeyEasing = useCallback(
    (property: AnimatableKey, time: number, easing: Easing) => {
      setState((prev) => {
        const keys = prev.animation.tracks[property];
        if (!keys) return prev;
        const next = keys.map((k) => (k.time === time ? { ...k, easing } : k));
        return {
          ...prev,
          animation: { ...prev.animation, tracks: { ...prev.animation.tracks, [property]: next } },
        };
      });
    },
    [],
  );

  const moveKey = useCallback((property: AnimatableKey, from: number, to: number) => {
    setState((prev) => {
      const keys = prev.animation.tracks[property];
      const moving = keyAt(keys, from);
      if (!moving) return prev;
      const clamped = Math.max(0, Math.min(prev.animation.durationSec, to));
      return {
        ...prev,
        animation: {
          ...prev.animation,
          tracks: {
            ...prev.animation.tracks,
            [property]: putKey(removeKey(keys, from), clamped, moving.value),
          },
        },
      };
    });
  }, []);

  const dropKey = useCallback((property: AnimatableKey, time: number) => {
    setState((prev) => {
      const nextKeys = removeKey(prev.animation.tracks[property], time);
      const tracks = { ...prev.animation.tracks };
      if (nextKeys.length) tracks[property] = nextKeys;
      else delete tracks[property];
      return { ...prev, animation: { ...prev.animation, tracks } };
    });
  }, []);

  // Playback.
  //
  // The clock lives in a ref and the scene reads it inside its own frame loop.
  // React is told the time roughly ten times a second, and only so the
  // readout and the playhead marker move — pushing it every frame re-rendered
  // the whole editor at 60Hz and that reconciliation was the stutter.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let lastUiPush = 0;
    const startedAt = performance.now();
    const from = playheadRef.current >= animation.durationSec ? 0 : playheadRef.current;
    const tick = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const next = from + elapsed;
      // Loops, because a mockup animation is something you watch repeat while
      // you tune it, not something you play once.
      const wrapped = next >= animation.durationSec;
      playheadRef.current = wrapped ? next % animation.durationSec : next;
      // The clip is free-running during playback, so when the timeline loops
      // it has to be brought back too. Without this a 3-second timeline over
      // a 12-second clip plays a different slice of footage on every pass.
      if (wrapped && clipVideoRef.current && clipLengthRef.current) {
        clipVideoRef.current.currentTime = clipTimeRef.current(playheadRef.current);
      }
      if (now - lastUiPush > 90) {
        lastUiPush = now;
        setPlayhead(playheadRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Land the UI on wherever the clock actually stopped.
      setPlayhead(playheadRef.current);
    };
  }, [playing, animation.durationSec]);

  const keyedNow = useMemo(() => {
    const out: Partial<Record<AnimatableKey, boolean>> = {};
    for (const [property, keys] of Object.entries(animation.tracks)) {
      out[property as AnimatableKey] = Boolean(keyAt(keys, playhead));
    }
    return out;
  }, [animation.tracks, playhead]);

  const animated = hasKeys(animation);

  useEffect(() => {
    animatedRef.current = animated;
  }, [animated]);

  useEffect(() => {
    durationRef.current = state.animation.durationSec;
  }, [state.animation.durationSec]);

  // ── The timeline owns the clip ──────────────────────────────────────────
  //
  // Left to itself a video element just loops, and what the phone shows has
  // nothing to do with where the playhead is. You cannot key a camera move
  // against a moment in the footage you cannot navigate to. So the playhead
  // is the clock for both: scrub and the clip lands on that frame, play and
  // it runs alongside, pause and it stops where you stopped.
  const clipLength = clip.duration;

  /**
   * How long the source occupies the timeline.
   *
   * A video is as long as it is. A still has no length of its own, so it gets
   * one second — enough to exist as a bar you can see and, later, drag longer.
   * Zero would be indistinguishable from having no source at all, which is
   * the one thing the row is there to tell you.
   */
  const naturalLength = isVideoScreen ? clipLength : sourceSrc ? 1 : 0;
  const sourceLength = sourceSpan ?? naturalLength;

  /**
   * The clip time for a moment on the timeline.
   *
   * The layer can sit anywhere, so the footage no longer starts when the
   * timeline does. Before the layer begins the clip holds its first frame and
   * after it ends its last, rather than the screen going blank — a mockup with
   * nothing on it reads as broken, where a held frame reads as a still.
   *
   * Inside the span it wraps, so a layer dragged longer than its footage
   * repeats instead of freezing.
   */
  const clipTimeFor = useCallback(
    (time: number) => {
      if (!clipLength || sourceLength <= 0) return 0;
      const local = time - sourceStart;
      if (local <= 0) return 0;
      // Held a hair inside the end rather than on it. Seeking to exactly the
      // duration lands past the last frame and a decoder hands back a blank —
      // which is what a black phone screen at the end of a clip actually was.
      const capped = Math.min(local, sourceLength - 1e-3);
      const wrapped = capped % clipLength;
      return wrapped < 0 ? 0 : wrapped;
    },
    [clipLength, sourceStart, sourceLength],
  );

  const clipVideo = isVideoScreen && screenVideo ? screenVideo : null;

  useEffect(() => {
    clipVideoRef.current = clipVideo;
    clipLengthRef.current = clipLength;
  }, [clipVideo, clipLength]);

  useEffect(() => {
    clipTimeRef.current = clipTimeFor;
  }, [clipTimeFor]);

  // Transport: start and stop, and nothing else.
  //
  // This used to be one effect with `playhead` in its dependencies, which
  // meant every UI tick during playback — ten a second — re-ran it and
  // re-seeked a video that was already playing. Ten seeks a second is not
  // playback; the decoder spent its time jumping rather than decoding, and
  // the clip stuttered and stalled. Starting is a one-off, so it lives in an
  // effect that only reacts to starting.
  useEffect(() => {
    if (!clipVideo || !clipLength) return;
    if (!playing) {
      clipVideo.pause();
      return;
    }
    clipVideo.currentTime = clipTimeRef.current(playheadRef.current);
    void clipVideo.play().catch(() => {});
    return () => clipVideo.pause();
  }, [playing, clipVideo, clipLength]);

  // Scrubbing: only while paused. During playback the clip and the playhead
  // are both running off the wall clock, so they stay together on their own
  // and any correction here would be a seek fighting the decoder.
  useEffect(() => {
    if (!clipVideo || !clipLength || playing) return;

    const target = clipTimeFor(playhead);

    // Seeks are coalesced, and this is what makes scrubbing usable.
    //
    // Assigning `currentTime` straight from this effect meant one seek per
    // pointermove. A seek is not cheap — the decoder has to find the nearest
    // keyframe and roll forward — so a drag queued dozens of them, each
    // arriving after the pointer had already moved on, and the preview
    // lurched between stale frames instead of following the cursor.
    //
    // Deferring to the next animation frame collapses a burst of moves into
    // one seek, because a newer playhead cancels this effect before its frame
    // runs. Retrying while `seeking` is true means the LAST position always
    // lands, rather than being dropped because the decoder happened to be
    // busy when the drag ended.
    let raf = 0;
    const apply = () => {
      raf = 0;
      if (clipVideo.seeking) {
        raf = requestAnimationFrame(apply);
        return;
      }
      if (Math.abs(clipVideo.currentTime - target) > 1 / 120) {
        clipVideo.currentTime = target;
      }
    };
    raf = requestAnimationFrame(apply);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [playing, playhead, clipVideo, clipLength, clipTimeFor]);

  // A clip's own length is the only duration that means anything when one is
  // loaded, so adopt it — but only while nothing has been keyed yet, or this
  // would move the ground under an animation someone had already built.
  const adoptedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!clipLength || !sourceSrc || adoptedFor.current === sourceSrc) return;
    adoptedFor.current = sourceSrc;
    if (animatedRef.current) return;
    setState((prev) => ({
      ...prev,
      animation: {
        ...prev.animation,
        durationSec: Math.min(30, Math.max(0.5, Number(clipLength.toFixed(2)))),
      },
    }));
    setTimelineOpen(true);
  }, [clipLength, sourceSrc]);

  // Presets are built from the pose on screen, so applying one keeps the shot
  // you framed and only decides how the camera gets there.
  const applyMotionPreset = useCallback((id: string) => {
    const preset = getMotionPreset(id);
    if (!preset) return;
    const pose = effectiveRef.current;
    setPlaying(false);
    setPlayhead(0);
    setState((prev) => ({
      ...prev,
      animation: {
        // The chosen easing survives; only the tracks and length change.
        easing: prev.animation.easing,
        ...fitToClip(
          preset.build({
            xAxis: pose.xAxis,
            yAxis: pose.yAxis,
            zAxis: pose.zAxis,
            zoom: pose.zoom,
            panX: pose.panX,
            panY: pose.panY,
          }),
          clipLengthRef.current,
        ),
      },
    }));
  }, []);

  const pickSource = () => fileInputRef.current?.click();
  const pickBackgroundImage = () => backgroundInputRef.current?.click();

  const onBackgroundFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    // A data URL rather than an object URL: the background has to survive into
    // an export taken on a canvas, and it outlives the File either way.
    reader.onload = () => {
      const imageSrc = String(reader.result);
      change({ background: { ...backgroundRef.current, kind: "image", imageSrc } });
      void preloadBackgroundImage({ ...backgroundRef.current, kind: "image", imageSrc });
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  };

  const stopMirror = useCallback(() => {
    setLiveStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    // Back to a neutral crop: the mirror preset exists to cancel a mirror
    // window's chrome, and leaving it on would quietly crop the next upload.
    setState((prev) => ({
      ...prev,
      screenScale: DEFAULT_EDITOR_STATE.screenScale,
      screenOffsetX: DEFAULT_EDITOR_STATE.screenOffsetX,
      screenOffsetY: DEFAULT_EDITOR_STATE.screenOffsetY,
    }));
  }, []);

  // The picker itself is the OS window chooser, so anything the system will
  // share works: a phone mirrored over USB, a simulator, another browser tab.
  const startMirror = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        // Unconstrained, the browser hands back the window at full Retina
        // resolution and whatever frame rate it can manage — a texture upload
        // per frame far larger than a phone screen on screen can show. 1440
        // and 30fps is already more than the mesh resolves, and it is the
        // difference between the mirror sharing the GPU with a live pose and
        // fighting it.
        video: {
          frameRate: { ideal: 30, max: 30 },
          width: { max: 1440 },
          height: { max: 1440 },
          // Leave the pointer out of the capture. Without this the Mac cursor
          // is composited into the frame and ends up rendered onto the 3D
          // phone's screen — a mouse arrow sitting in an iOS app, which is the
          // one thing that gives away that the mockup is a mockup.
          //
          // Not in TypeScript's DisplayMediaStreamOptions, though it is in the
          // Screen Capture spec and Chromium honours it.
          cursor: "never",
        } as MediaTrackConstraints,
        audio: false,
      });
      // Ending the share from the browser's own "Stop sharing" bar fires here.
      // Without this the panel would keep claiming to mirror a window whose
      // track has already gone black.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => setLiveStream(null));
      setLiveStream((previous) => {
        previous?.getTracks().forEach((track) => track.stop());
        return stream;
      });
      // Start from the fit that suits a mirror window rather than from the
      // neutral crop, so the content lands in the right place without having
      // to be dialled in by hand every session. Still adjustable afterwards.
      setState((prev) => ({ ...prev, ...MIRROR_SCREEN_FIT }));
    } catch (error) {
      // Dismissing the picker rejects. That is a normal outcome, not a fault,
      // so it must not surface as an error.
      if ((error as DOMException)?.name === "NotAllowedError") return;
      console.warn("mockup-studio: could not start mirroring", error);
    }
  }, []);

  // Tracks outlive React, so an unmount without this leaves the browser's
  // "sharing your screen" bar up with nothing behind it.
  useEffect(() => stopMirror, [stopMirror]);

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    setSourceName(file.name);
    reader.onload = () => {
      setSourceSrc(String(reader.result));
      // A new file starts at zero at its own length. Inheriting the previous
      // layer's position would put footage somewhere nobody put it.
      setSourceStart(0);
      setSourceSpan(null);
    };
    reader.readAsDataURL(file);
  };

  // Export composites rather than just reading the canvas.
  //
  // The WebGL buffer contains the phone and nothing else — the backdrop is a
  // CSS layer sitting behind a transparent canvas, so a straight `toDataURL`
  // hands back a phone floating on nothing regardless of what the editor
  // shows. Painting the same backdrop underneath is what makes the file match
  // the screen. "None" paints nothing, and the PNG keeps its alpha.
  const exportPng = useCallback(async () => {
    // The painter is synchronous, so the image has to be in the cache before
    // it runs or the export comes out with the base colour where the
    // background should be.
    await preloadBackgroundImage(backgroundRef.current);
    const scale = exportScaleRef.current;
    const url = captureRef.current?.(scale);
    if (!url) return;

    const shot = new Image();
    shot.src = url;
    try {
      await shot.decode();
    } catch {
      return;
    }

    const out = document.createElement("canvas");
    out.width = shot.width;
    out.height = shot.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    paintBackground(ctx, backgroundRef.current, out.width, out.height, scale);
    ctx.drawImage(shot, 0, 0);

    const link = document.createElement("a");
    link.href = out.toDataURL("image/png");
    link.download = "mockup-studio.png";
    link.click();
  }, []);

  // Video export.
  //
  // Length comes from the clip on the screen rather than a setting, because
  // for a mockup that is the only length that means anything: one clean loop
  // of whatever is playing. With no video loaded there is nothing moving to
  // record, so this stays disabled rather than producing five seconds of a
  // still image.
  const exportVideo = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recordProgress !== null) return;
    // Same reason as the still, and more so: this paints once per frame.
    await preloadBackgroundImage(backgroundRef.current);
    const video = isVideoScreen ? screenVideo : null;
    // `duration` is NaN until metadata lands, and Infinity for a stream.
    const clipLength = video && Number.isFinite(video.duration) ? video.duration : 0;
    // With both a keyed animation and a video screen, the animation is the
    // one someone authored a length for, so it wins; the clip loops under it.
    const length = animated ? animation.durationSec : clipLength || 5;

    setPlaying(false);
    setRecordProgress(0);
    const durationSec = Math.min(30, Math.max(0.5, length));
    // Straight into the ref the scene samples from — no React render per
    // frame, the scene reads this clock itself inside its own frame loop.
    const onTime = animated
      ? (seconds: number) => {
          playheadRef.current = Math.min(seconds, animation.durationSec);
        }
      : undefined;

    try {
      let blob: Blob;
      let extension: string;

      if (supportsExactRender()) {
        // The good path: encode frame by frame with timestamps we choose, so
        // the file does not inherit this machine's stutters.
        blob = await renderVideoExact({
          recorder,
          background: backgroundRef.current,
          scale: exportScale,
          durationSec,
          fps: exportFps,
          video,
          videoTexture: isVideoScreen ? screenTexture : null,
          // Without this the export ignores where the layer was put and plays
          // the clip from zero, so the file stops matching the preview the
          // moment anyone moves it.
          clipTimeFor,
          onTime,
          onProgress: setRecordProgress,
        });
        extension = "mp4";
      } else {
        const result = await recordStageVideo({
          recorder,
          background: backgroundRef.current,
          scale: exportScale,
          durationSec,
          fps: exportFps,
          video,
          onTime,
          onProgress: setRecordProgress,
        });
        blob = result.blob;
        extension = result.format.extension;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mockup-studio.${extension}`;
      link.click();
      // Revoking immediately can cancel the download in some browsers; one
      // turn of the event loop is enough for the click to be picked up.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      console.warn("mockup-studio: video export failed", error);
    } finally {
      setRecordProgress(null);
      playheadRef.current = 0;
      setPlayhead(0);
    }
  }, [clipTimeFor, 
    isVideoScreen,
    screenVideo,
    screenTexture,
    recordProgress,
    animated,
    animation.durationSec,
    exportFps,
    exportScale,
  ]);

  /*
   * Two layouts, splitting at the project's `laptop` breakpoint (1000px).
   *
   * Above it: a fixed viewport with both panels floating over the stage. That
   * arrangement needs 992px before anything is cramped -- two 320px panels,
   * their gutters, and enough canvas left to hold a phone -- so 1000 is the
   * first breakpoint that fits it.
   *
   * Below it: the viewport is still locked, and the stage is pinned to the top
   * where it stays visible while you work. The two panels become two steps
   * under it, one at a time, and whichever is showing scrolls inside itself.
   * The alternative -- letting the page scroll, with both panels stacked --
   * put the thing you are adjusting off screen the moment you reached the
   * control that adjusts it.
   *
   * Which step is showing is a data attribute rather than a media query read
   * in JS: the panels both stay mounted and CSS hides one, so a step keeps its
   * expanded sections, and there is no first paint in the wrong layout while
   * the client works out how wide it is.
   *
   * Note the breakpoint names: this project sets `--breakpoint-lg: initial`
   * and defines tablet/laptop/desktop instead, so a stray `lg:` compiles to
   * nothing at all rather than failing loudly.
   */
  return (
    <div
      className="ks h-screen w-screen overflow-hidden"
      data-ks-theme={theme}
      data-ks-step={mobileStep}
    >
      <EditorThemeContext.Provider value={theme}>
      <EditorTheme />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={onFile}
        className="hidden"
      />
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/*"
        onChange={onBackgroundFile}
        className="hidden"
      />

      {/* The rasterise source for React-rendered screens. Offscreen, but not
          display:none — a hidden node has no box and captures blank. */}
      <div
        ref={screenHostRef}
        aria-hidden
        className="pointer-events-none fixed left-[-10000px] top-0"
      />

      <div className="flex h-full w-full flex-col gap-[var(--ks-gap)] p-[var(--ks-gap)]">
        {/* The panels FLOAT over the canvas rather than sitting beside it.
            Side by side, a translucent panel has nothing behind it but the
            page colour — blurring and refracting a flat grey produces a flat
            grey, so the material was invisible by construction. Floating them
            puts the stage behind the glass, which is also how Apple builds
            chrome: a layer with content running under it, not an opaque strip
            that consumes a column. */}
        <div className="flex min-h-0 w-full flex-1 flex-col gap-[var(--ks-gap)] laptop:relative laptop:flex-row laptop:gap-0">
        {/* The two steps. Hidden above `laptop`, where both panels are on
            screen at once and there is nothing to step between. Numbered
            because they are a sequence -- pick the device, then frame the
            shot -- rather than two equal views of the same thing. */}
        <div className="order-2 shrink-0 laptop:hidden">
          <Tabs
            value={mobileStep}
            onChange={setMobileStep}
            options={[
              { id: "device", label: "1  Device" },
              { id: "scene", label: "2  Shot" },
            ]}
          />
        </div>

        <div data-ks-panel="device" className="order-3 min-h-0 w-full flex-1 laptop:absolute laptop:left-0 laptop:top-0 laptop:z-20 laptop:h-full laptop:w-auto laptop:flex-none">
        <RightPanel side="left"
          state={effective}
          onChange={change}
          sourceSrc={sourceSrc}
          onPickSource={pickSource}
          onPickBackgroundImage={pickBackgroundImage}
          onClearSource={() => {
            setSourceSrc(null);
            setSourceName(null);
          }}
          isMirroring={Boolean(liveStream)}
          canMirror={canMirror}
          onStartMirror={startMirror}
          onStopMirror={stopMirror}
          onPair={() => setPairing(true)}
          phoneConnected={phone.connected}
          phoneQr={phone.qr}
          phoneSecure={phone.secure}
          phoneReason={phone.reason}
          phoneZeroed={phone.zeroed}
          liveMotion={liveMotion}
          onToggleLiveMotion={(next) => {
            setLiveMotion(next);
            if (next) {
              // Choosing Gyro is itself the intent to pair, so it arms the
              // link — otherwise the mode would sit there waiting for a phone
              // whose stream nobody had opened.
              setPairing(true);
              // Zeroing on the way in means the phone starts facing the camera
              // rather than facing magnetic north, which is what makes it feel
              // like it snapped to a sensible pose instead of a random one.
              phone.setZero();
            }
          }}
          onSetZero={phone.setZero}
          easing={animation.easing}
          onApplyPreset={applyMotionPreset}
          ratioId={ratioId}
          onRatioChange={setRatioId}
          onExportPng={exportPng}
          onExportVideo={exportVideo}
          canExportVideo={
            (isVideoScreen || animated) &&
            (supportsExactRender() || Boolean(pickRecordingFormat()))
          }
          recordProgress={recordProgress}
          theme={theme}
          onToggleTheme={toggleTheme}
          keyedNow={keyedNow}
          onToggleKey={toggleKey}
        />
        </div>

        <div className="order-1 flex h-[36vh] shrink-0 min-w-0 flex-col laptop:h-auto laptop:shrink laptop:flex-1 laptop:px-[calc(var(--ks-panel-w)+var(--ks-gap))]">
          {/* The workspace is the whole column; the framed canvas inside it is
              only as big as the chosen ratio allows. `container-type: size`
              is what lets the frame size itself off the workspace in CSS —
              `cqw`/`cqh` are the two numbers needed to fit a ratio inside a
              box, and reading them here avoids a resize observer that would
              re-render the scene on every drag of the window edge. */}
          <div
            className="relative grid min-h-0 flex-1 place-items-center"
            style={{ containerType: "size" }}
          >
            <div
              className="relative overflow-hidden rounded-[var(--ks-r-panel)] border"
              style={{
                ...backgroundCss(state.background),
                borderColor: "var(--ks-line-strong)",
                ...(ratio === null
                  ? { width: "100%", height: "100%" }
                  : {
                      aspectRatio: String(ratio),
                      // Whichever of the two constraints binds first wins, so
                      // the frame always fits and never overflows.
                      width: `min(100cqw, ${ratio} * 100cqh)`,
                    }),
              }}
            >
            {/* Sits on the stage rather than in a panel: it acts on the
                whole shot, and the panels are each only half of one. Top left,
                away from the loading capsule in the centre. */}
            <div
              className="absolute left-[8px] top-[8px] z-20 flex items-center gap-[2px] rounded-full p-[2px]"
              style={{
                background: "var(--ks-surface)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                boxShadow: "inset 0 0 0 1px var(--ks-line-strong)",
              }}
            >
              <StageAction
                icon="undo"
                label="Undo"
                hint={past.length ? "Undo the last change" : "Nothing to undo"}
                disabled={!past.length}
                onClick={undo}
              />
              <StageAction
                icon="redo"
                label="Redo"
                hint={future.length ? "Redo the last undone change" : "Nothing to redo"}
                disabled={!future.length}
                onClick={redo}
              />
              <StageAction
                icon="resetAll"
                label="Reset everything"
                hint="Reset every setting to its default"
                onClick={resetAll}
              />
            </div>
            <PhoneStage3D
              rail={undefined}
              screenTexture={screenTexture}
              deviceId={state.deviceId}
              finishId={state.finishId}
              blur={state.blur}
              rotateX={effective.xAxis}
              rotateY={effective.yAxis}
              rotateZ={effective.zAxis}
              livePose={liveMotion && phone.connected ? phone.poseRef : null}
              fov={effective.fov}
              shadow={state.shadow}
              lighting={state.lighting}
              screenFit={{
                scale: effective.screenScale,
                offsetX: effective.screenOffsetX,
                offsetY: effective.screenOffsetY,
                // A mirrored device screen already contains its own island.
                sourceHasNotch: Boolean(liveStream),
              }}
              offsetX={effective.panX * 100}
              offsetY={effective.panY * 100}
              scale={effective.zoom * 100}
              // Easing is a lag filter — right for a slider nudge, wrong for
              // playback, where it would smear every keyframe 0.18s late and
              // round off the poses that were keyed deliberately.
              // Scrubbing counts as immediate too. The transform easing is a
              // 0.18s lag filter, and under a drag that is not smoothing —
              // it is the phone arriving where the cursor was a moment ago.
              immediate={playing || scrubbing || recordProgress !== null}
              animation={animation}
              timeRef={playheadRef}
              playing={playing || recordProgress !== null}
              heightPct={100}
              canvasRef={canvasRef}
              captureRef={captureRef}
              recorderRef={recorderRef}
              onRotateDrag={nudgeRotation}
              onScaleWheel={nudgeZoom}
            />
            </div>
          </div>

        </div>

        {/* Device on the left, shot on the right. Both are the same
            component: which sections it draws is the only difference, and
            splitting the file would have duplicated every control to express
            that. */}
        <div data-ks-panel="scene" className="order-4 min-h-0 w-full flex-1 laptop:absolute laptop:right-0 laptop:top-0 laptop:z-20 laptop:h-full laptop:w-auto laptop:flex-none">
        <RightPanel side="right"
          state={effective}
          onChange={change}
          sourceSrc={sourceSrc}
          onPickSource={pickSource}
          onPickBackgroundImage={pickBackgroundImage}
          onClearSource={() => {
            setSourceSrc(null);
            setSourceName(null);
          }}
          isMirroring={Boolean(liveStream)}
          canMirror={canMirror}
          onStartMirror={startMirror}
          onStopMirror={stopMirror}
          onPair={() => setPairing(true)}
          phoneConnected={phone.connected}
          phoneQr={phone.qr}
          phoneSecure={phone.secure}
          phoneReason={phone.reason}
          phoneZeroed={phone.zeroed}
          liveMotion={liveMotion}
          onToggleLiveMotion={(next) => {
            setLiveMotion(next);
            if (next) {
              // Choosing Gyro is itself the intent to pair, so it arms the
              // link — otherwise the mode would sit there waiting for a phone
              // whose stream nobody had opened.
              setPairing(true);
              // Zeroing on the way in means the phone starts facing the camera
              // rather than facing magnetic north, which is what makes it feel
              // like it snapped to a sensible pose instead of a random one.
              phone.setZero();
            }
          }}
          onSetZero={phone.setZero}
          easing={animation.easing}
          onApplyPreset={applyMotionPreset}
          ratioId={ratioId}
          onRatioChange={setRatioId}
          onExportPng={exportPng}
          onExportVideo={exportVideo}
          canExportVideo={
            (isVideoScreen || animated) &&
            (supportsExactRender() || Boolean(pickRecordingFormat()))
          }
          recordProgress={recordProgress}
          theme={theme}
          onToggleTheme={toggleTheme}
          keyedNow={keyedNow}
          onToggleKey={toggleKey}
        />
        </div>
      </div>

      {/* Outside the row, so it spans the full width rather than being
          boxed in between the two panels. */}
        {timelineOpen || animated ? (
          <Timeline
            animation={animation}
            playhead={playhead}
            playing={playing}
            onSeek={seekTo}
            onTogglePlay={() => setPlaying((p) => !p)}
            onScrubbingChange={setScrubbing}
            onDurationChange={(durationSec) => setAnimation({ durationSec })}
            onMoveKey={moveKey}
            onRemoveKey={dropKey}
            onSetKeyEasing={setKeyEasing}
            onClear={() => {
              setPlaying(false);
              setPlayhead(0);
              setAnimation({ tracks: {} });
            }}
            onEasingChange={(easing) => setAnimation({ easing })}
            exportFps={exportFps}
            onExportFpsChange={setExportFps}
            exportScale={exportScale}
            onExportScaleChange={setExportScale}
            sourceLength={sourceLength}
            sourceStart={sourceStart}
            onSourceStartChange={setSourceStart}
            onSourceLengthChange={setSourceSpan}
            clipName={sourceName ?? "Source"}
          />
        ) : null}
      </div>
      </EditorThemeContext.Provider>
    </div>
  );
}
