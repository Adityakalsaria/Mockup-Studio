"use client";

/**
 * Renders every landing still through the studio's own pipeline.
 *
 * The frame is `PhoneStage3D` exactly as the studio mounts it, and the file is
 * composited the way `exportImage` in `mocraft/useStudio.ts` composites one:
 * background, shadow, phone. Development only -- see `app/landing-render`.
 */

import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import PhoneStage3D, { type StageCapture } from "@/features/mockup-studio/PhoneStage3D";
import { useScreenTexture } from "@/features/mockup-studio/useScreenTexture";
import { DEFAULT_BLUR } from "@/features/mockup-studio/blurStyles";
import { paintBackground } from "@/features/mockup-studio/backgrounds";
import { FRONT } from "./LiveDevice";
import { BOARD, BOARD_TURNED, COMPOSITES, SCREEN_DIR, SHOTS, shotSrc, type Composite, type Shot } from "./shots";

const SCALE = 2;

export default function RenderShots() {
  const only = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("only");
  const wanted = (id: string) => !only || only.split(",").includes(id);
  const queue = SHOTS.filter((s) => wanted(s.id));
  const composites = COMPOSITES.filter((c) => wanted(c.id));
  const [index, setIndex] = useState(0);
  const [board, setBoard] = useState<Screens | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([composeBoard(), composeGraphics()]).then(([b, g]) => setBoard({ ...b, ...g }));
  }, []);

  const current = queue[index];
  if (!board) return <p>Composing board…</p>;
  if (!current) return <Composites items={composites} log={log} />;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>
        {index + 1}/{queue.length} {current.id}
      </p>
      <ShotStage
        key={current.id}
        shot={current}
        board={board}
        onDone={(ok) => {
          setLog((l) => [...l, `${current.id}:${ok ? "ok" : "fail"}`]);
          setIndex((i) => i + 1);
        }}
      />
    </div>
  );
}

function ShotStage({
  shot,
  board,
  onDone,
}: {
  shot: Shot;
  board: Screens;
  onDone: (ok: boolean) => void;
}) {
  const captureRef = useRef<StageCapture | null>(null);
  const noSource = useRef<HTMLElement>(null);
  const texture = useScreenTexture(noSource, board[shot.screen] ?? `${SCREEN_DIR}/${shot.screen}`);
  const { active } = useProgress();
  const pose = { ...FRONT, ...shot.pose };

  useEffect(() => {
    if (!texture || active) return;
    const timer = window.setTimeout(async () => {
      const url = captureRef.current?.(SCALE);
      if (!url) return onDone(false);
      const frame = new Image();
      frame.src = url;
      await frame.decode();
      const out = document.createElement("canvas");
      out.width = frame.width;
      out.height = frame.height;
      const ctx = out.getContext("2d")!;
      if (shot.background) paintBackground(ctx, shot.background, out.width, out.height, SCALE);
      ctx.drawImage(frame, 0, 0);
      onDone(await save(shot.id, out));
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [texture, active, shot, onDone]);

  return (
    <div style={{ position: "relative", width: shot.width, height: shot.height, outline: "1px dashed #ccc" }}>
      <PhoneStage3D
        rail={undefined}
        captureRef={captureRef}
        screenTexture={texture}
        deviceId={shot.deviceId}
        finishId={shot.finishId}
        blur={shot.blur ?? DEFAULT_BLUR}
        fold={pose.fold}
        rotateX={pose.xAxis}
        rotateY={pose.yAxis}
        rotateZ={pose.zAxis}
        fov={pose.fov}
        offsetX={pose.panX * 100}
        offsetY={pose.panY * 100}
        offsetZ={pose.panZ}
        scale={pose.zoom * 100}
        heightPct={100}
        lighting={shot.lighting}
        immediate
      />
    </div>
  );
}

/**
 * A 16:10 board of four real phone screens -- the kind of canvas a design sits
 * on -- for the iPad and Mac panels, which no portrait screenshot fills.
 */
type Screens = Record<string, string>;

async function composeBoard(): Promise<Screens> {
  const W = 2880;
  const H = 1800;
  const files = ["dark.png", "confirm-payment.png", "dark-3.png", "dark-5.png"];
  const images = await Promise.all(
    files.map(async (f) => {
      const img = new Image();
      img.src = `${SCREEN_DIR}/${f}`;
      await img.decode();
      return img;
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1c1c1e";
  ctx.fillRect(0, 0, W, H);
  const h = H * 0.74;
  const gap = 96;
  const w = (images[0].width / images[0].height) * h;
  const x0 = (W - (w * images.length + gap * (images.length - 1))) / 2;
  images.forEach((img, i) => {
    const x = x0 + i * (w + gap);
    const y = (H - h) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 56);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  });
  const turned = document.createElement("canvas");
  turned.width = H;
  turned.height = W;
  const t = turned.getContext("2d")!;
  t.translate(H, 0);
  t.rotate(Math.PI / 2);
  t.drawImage(canvas, 0, 0);
  return { [BOARD]: canvas.toDataURL("image/jpeg", 0.92), [BOARD_TURNED]: turned.toDataURL("image/jpeg", 0.92) };
}

async function save(id: string, canvas: HTMLCanvasElement) {
  const res = await fetch("/api/landing-render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, dataUrl: canvas.toDataURL("image/png") }),
  });
  return res.ok;
}

/** After every shot is written: lay the transparent parts out on their grounds. */
function Composites({ items, log }: { items: Composite[]; log: string[] }) {
  const [done, setDone] = useState<string[] | null>(null);
  useEffect(() => {
    (async () => {
      const results: string[] = [];
      for (const c of items) results.push(`${c.id}:${(await compose(c)) ? "ok" : "fail"}`);
      setDone(results);
    })();
  }, [items]);
  if (!done) return <p>Compositing…</p>;
  return <p id="render-done">Done: {[...log, ...done].join(", ")}</p>;
}

async function compose(c: Composite) {
  const W = c.width * SCALE;
  const H = c.height * SCALE;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = c.ground;
  ctx.fillRect(0, 0, W, H);
  for (const p of c.parts) {
    const img = new Image();
    img.src = `${shotSrc(p.shot)}?v=${Date.now()}`;
    await img.decode();
    const box = opaqueBounds(img);
    const h = p.h * H;
    const w = (box.w / box.h) * h;
    ctx.drawImage(img, box.x, box.y, box.w, box.h, p.x * W - w / 2, p.y * H - h / 2, w, h);
  }
  return save(c.id, out);
}

/** The rectangle of a transparent render that actually holds the device. */
function opaqueBounds(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (data[(y * img.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < x0 ? { x: 0, y: 0, w: img.width, h: img.height } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/*
 * Graphic screens, for the showcase tiles: colour blocks and one stretched
 * word, set in the site's own Saans -- the placeholder-art look of a mockup
 * library, where the screen is there to show the device off rather than to be
 * read. Colours are the studio's BACKGROUND_PRESETS plus one lime.
 */
const INK = "#121214";
const LIME = "#d4f33a";
const BLUE = "#8fa3e8";
const PEACH = "#f7d9c4";
const ORANGE = "#e8a87c";
const GREEN = "#3f7d5c";
const WHITE = "#ffffff";

async function composeGraphics(): Promise<Screens> {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-saans").trim() || "sans-serif";
  await document.fonts.load(`600 200px ${family}`);
  const font = (px: number) => `600 ${px}px ${family}`;

  const phone = (main: string, side: string) => {
    const W = 1206;
    const H = 2622;
    const { canvas, ctx } = sheet(W, H);
    block(ctx, 0, 0, W, H, main);
    block(ctx, W * 0.66, 0, W * 0.34, H * 0.7, side);
    const row = [ORANGE, WHITE, GREEN, BLUE, PEACH, main === LIME ? BLUE : LIME];
    row.forEach((c, i) => block(ctx, (i % 3) * (W / 3), H * 0.78 + Math.floor(i / 3) * H * 0.11, W / 3, H * 0.11, c));
    ctx.save();
    ctx.translate(W * 0.36, H * 0.4);
    ctx.rotate(-Math.PI / 2);
    fitText(ctx, "Mocraaaft", H * 0.66, font);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const mac = (main: string, W = 2880, word = 0.84) => {
    const H = 1800;
    const { canvas, ctx } = sheet(W, H);
    block(ctx, 0, 0, W, H, main);
    [BLUE, WHITE, GREEN].forEach((c, i) => block(ctx, W * (0.52 + i * 0.16), 0, W * 0.16, H * 0.64, c));
    const rows = [
      [ORANGE, WHITE, BLUE, PEACH, main === LIME ? BLUE : LIME],
      [BLUE, main === LIME ? LIME : ORANGE, PEACH, GREEN, WHITE],
    ];
    rows.forEach((r, y) => r.forEach((c, x) => block(ctx, x * (W / 5), H * (0.64 + y * 0.18), W / 5, H * 0.18, c)));
    ctx.save();
    ctx.translate(W * 0.5, H * 0.3);
    ctx.rotate(Math.PI * 0.035);
    fitText(ctx, "Mocraaaft", W * word, font);
    ctx.restore();
    return canvas;
  };


  return {
    "graphic-phone-lime": phone(LIME, BLUE),
    "graphic-phone-blue": phone(BLUE, LIME),
    "graphic-mac-lime": mac(LIME).toDataURL("image/jpeg", 0.92),
    "graphic-mac-blue": mac(BLUE).toDataURL("image/jpeg", 0.92),
    // 4:3 before the turn: the iPad crops a 16:10 sheet down to its own panel.
    "graphic-mac-turned": turn(mac(LIME, 2400, 0.6)),
  };
}

function sheet(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w) + 1, Math.ceil(h) + 1);
}

/** One word, centred on the origin and scaled to `width`. */
function fitText(ctx: CanvasRenderingContext2D, text: string, width: number, font: (px: number) => string) {
  ctx.font = font(100);
  const size = (100 * width) / ctx.measureText(text).width;
  ctx.font = font(size);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
}

function turn(source: HTMLCanvasElement) {
  const { canvas, ctx } = sheet(source.height, source.width);
  ctx.translate(source.height, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(source, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}
