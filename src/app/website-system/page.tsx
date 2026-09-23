"use client";

/**
 * The website system — every token and component on one page.
 *
 * Somewhere to check a component against before hand-rolling one, and the only
 * place the system can actually be judged: a glass material cannot be reviewed
 * in a token file, because three of its four properties only do anything when
 * there is content behind them.
 *
 * Which is why this page has a busy background. Glass over flat colour looks
 * like a grey rectangle — the blur has nothing to work on and the material
 * reads as broken when it is fine. The dot grid here is not decoration; it is
 * the test surface.
 */

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronIcon,
  CircleButton,
  CloseIcon,
  ColorRow,
  DesignSystem,
  Field,
  Glass,
  GlassButton,
  Glyph,
  Header,
  HeaderButton,
  ResetIcon,
  TrashIcon,
  ParamRow,
  PlusIcon,
  RailItem,
  Row,
  RowGroup,
  Segmented,
  Slider,
} from "@/design/ui";
import { color, control, font, material, radius, space, type ButtonTone } from "@/design/system";

/**
 * The device list, with the glyph the design gives each row.
 *
 * The icons are the file's own exports, committed under `public/figma-assets`
 * — including the four that came across as SF Symbol references and had to be
 * pulled per node. None of them is drawn here: an approximated glyph is a
 * different glyph, and these read at 20px where a near miss is obvious.
 *
 * Several devices share one glyph because the design shares it: every iPhone
 * row and Flat Canvas are all the same `iphone` symbol.
 */
const DEVICES = [
  { name: "iMac", icon: "imac" },
  { name: "iPad Pro", icon: "ipad-pro" },
  { name: "MacBook Neo", icon: "laptop" },
  { name: "MacBook Pro 14’", icon: "macbook" },
  { name: "Studio Display XDR", icon: "display-xdr" },
  { name: "iPhone 17", icon: "iphone" },
  { name: "iPhone 17 Pro", icon: "iphone" },
  { name: "iPhone 17 Pro Max", icon: "iphone" },
  { name: "Flat Canvas", icon: "iphone" },
];

const LAYERS = ["Transform", "Effects", "Camera", "Background", "Drop shadow", "Gradient", "Dots", "Image"];

/**
 * One exported glyph, at icon size.
 *
 * `unoptimized` because these are SVGs: Next's optimiser refuses them unless
 * the whole app opts into `dangerouslyAllowSVG`, and turning that on globally
 * to serve seven of our own committed files is the wrong trade. `alt` is empty
 * because the row's label already names the thing.
 */
function FigmaGlyph({ name }: { name: string }) {
  return (
    <Image
      src={`/figma-assets/mockup-studio/icons/${name}.svg`}
      alt=""
      width={control.icon}
      height={control.icon}
      unoptimized
    />
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[2px]">
        <h2 style={{ font: "600 13px/18px var(--mo-font)", color: "#3a3a3a" }}>{title}</h2>
        {note ? <p style={{ font: "400 12px/17px var(--mo-font)", color: "#8a8a8a" }}>{note}</p> : null}
      </div>
      <div className="flex flex-wrap items-start gap-[24px]">{children}</div>
    </section>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[4px]">
      <span style={{ font: "500 11px/15px var(--mo-font)", color: "#3a3a3a" }}>{label}</span>
      <span style={{ font: "400 11px/15px var(--mo-font)", color: "#8a8a8a" }} className="tabular-nums">
        {value}
      </span>
    </div>
  );
}

/** What the popup demo's colour resets to — see its `Header`. */
const DEMO_HEX = "#000000";

/**
 * The backdrop this page was missing.
 *
 * Everything above sits on `linear-gradient(160deg, #f2f2f4, #e6e6e9)` — a
 * flat pale ground — and that is exactly why the panel material could be
 * tuned to look right and still vanish over a composition. A glass has two
 * jobs, softening what is behind it and staying legible in front of it, and a
 * pale ground tests neither: there is no detail to soften and nothing dark to
 * lose the ink in.
 *
 * So: saturated, dark, and full of fine high-contrast lines, which is the
 * hardest case a blur can be given. A blueprint grid drawn in CSS rather than
 * an exported image, because the lines have to stay 1px whatever the bench is
 * resized to — a scaled screenshot would soften them itself and quietly do the
 * blur's job for it.
 */
const BENCH_GROUND = {
  backgroundColor: "#0d5b63",
  backgroundImage: [
    "linear-gradient(rgb(94 234 234 / 0.55) 1px, transparent 1px)",
    "linear-gradient(90deg, rgb(94 234 234 / 0.55) 1px, transparent 1px)",
    "linear-gradient(rgb(94 234 234 / 0.22) 1px, transparent 1px)",
    "linear-gradient(90deg, rgb(94 234 234 / 0.22) 1px, transparent 1px)",
    "radial-gradient(120% 90% at 25% 15%, #14808a 0%, #06363c 100%)",
  ].join(", "),
  backgroundSize: "96px 96px, 96px 96px, 16px 16px, 16px 16px, auto",
} satisfies React.CSSProperties;

/**
 * Drag the panel around the bench.
 *
 * The point of a bench is judging the material against what is behind it, and
 * what is behind it changes across this one: pale ground, the seam, dense grid,
 * the dark corner where the vignette lands. A panel pinned to one spot answers
 * for one of those. Moving it is the difference between a screenshot and an
 * instrument.
 *
 * Position is committed to state per move — a panel is not the studio's phone
 * and a re-render of this section costs nothing — but the DRAG ORIGIN is a
 * ref: it is read inside the move handler and must not make the handler a new
 * function on every frame.
 */
function useDrag(bounds: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Where in the panel the grab landed, so it does not jump to its corner. */
  const grab = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    grab.current = { x: e.clientX - box.left, y: e.clientY - box.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const field = bounds.current?.getBoundingClientRect();
      const box = e.currentTarget.getBoundingClientRect();
      if (!field) return;
      // Clamped to the bench, or the panel can be dragged out of the one place
      // it is meant to be looked at.
      const x = Math.min(
        Math.max(e.clientX - field.left - grab.current.x, 0),
        Math.max(field.width - box.width, 0),
      );
      const y = Math.min(
        Math.max(e.clientY - field.top - grab.current.y, 0),
        Math.max(field.height - box.height, 0),
      );
      setPos({ x, y });
    },
    [dragging, bounds],
  );

  const end = useCallback(() => setDragging(false), []);

  return { pos, dragging, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end } };
}

function Bench() {
  const [tone, setTone] = useState<ButtonTone>("primary");
  const field = useRef<HTMLDivElement>(null);
  const panel = useDrag(field);
  const buttons = useDrag(field);

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div
        ref={field}
        className="relative w-full overflow-hidden"
        style={{
          height: 420,
          borderRadius: "var(--mo-r-panel)",
          // Or the drag selects the panel's labels on the way past.
          userSelect: panel.dragging || buttons.dragging ? "none" : undefined,
          ...BENCH_GROUND,
        }}
      >
        {/*
          Half the bench only. The right edge of this block is the seam that
          matters: a panel straddling it shows, in one view, whether the blur
          reaches the backdrop and whether the surface holds its own light --
          which two panels on two grounds never can.
        */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{ width: "58%", background: "linear-gradient(160deg, #f2f2f4, #cfd2d8)" }}
        />

        <div
          {...panel.handlers}
          className="absolute flex flex-col gap-[16px]"
          style={{
            left: panel.pos ? panel.pos.x : "38%",
            top: panel.pos ? panel.pos.y : 32,
            touchAction: "none",
            cursor: panel.dragging ? "grabbing" : "grab",
          }}
        >
          <Glass style={{ gap: "var(--mo-space-4)" }}>
            <Header icon={<PlusIcon />} onClose={() => undefined}>
              Straddling the seam
            </Header>
            <div className="flex flex-col gap-[8px] pb-[10px]">
              <Row selected>Ink over both halves</Row>
              <Row>Ink over both halves</Row>
            </div>
          </Glass>
        </div>

        {/* The button material, on the dark half where it has to work. */}
        <div
          {...buttons.handlers}
          className="absolute flex flex-col items-end gap-[12px]"
          style={{
            // Bottom-right until it is picked up, then wherever it is put. Two
            // draggables rather than one group: the whole question is how the
            // two materials read against the SAME patch of backdrop, and that
            // means being able to park them side by side anywhere.
            left: buttons.pos ? buttons.pos.x : undefined,
            top: buttons.pos ? buttons.pos.y : undefined,
            right: buttons.pos ? undefined : 32,
            bottom: buttons.pos ? undefined : 32,
            touchAction: "none",
            cursor: buttons.dragging ? "grabbing" : "grab",
          }}
        >
          <GlassButton variant={tone} onClick={() => undefined}>
            {tone}
          </GlassButton>
          <GlassButton variant={tone} size="icon" title={tone}>
            <PlusIcon />
          </GlassButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[8px]">
        {(["primary", "secondary", "prominent", "highlighted"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTone(t)}
            className="mo-code cursor-pointer"
            style={{
              padding: "4px 10px",
              borderRadius: "var(--mo-r-selected)",
              background: t === tone ? "var(--mo-selected)" : "transparent",
              color: t === tone ? "var(--mo-ink)" : "var(--mo-ink-muted)",
            }}
          >
            {t}
          </button>
        ))}
        <span className="mo-code" style={{ color: "#8a8a8a", marginLeft: 8 }}>
          {material.button.tones[tone].surface} · blur {material.button.blur}px
        </span>
      </div>
    </div>
  );
}

export default function WebsiteSystem() {
  const [device, setDevice] = useState("iPhone 17 Pro");
  const [tab, setTab] = useState<"crafting" | "presets">("crafting");
  const [shadow, setShadow] = useState({ x: 2.4, y: 2.4, blur: 2.4, opacity: 2.4, spread: 2.4 });
  const [hex, setHex] = useState(DEMO_HEX);
  const [open, setOpen] = useState<string[]>(["Background", "Drop shadow", "Gradient", "Dots", "Image"]);
  const [layer, setLayer] = useState("Drop shadow");
  const [tool, setTool] = useState(0);

  return (
    <>
      <DesignSystem />
      <main
        className="min-h-screen w-full p-[48px]"
        style={{
          font: "var(--mo-text-title)",
          // The test surface. See the note at the top of this file.
          // The same grid the studio uses — one token, not two copies of a
          // gradient that would drift the first time either was adjusted.
          backgroundImage: "var(--mo-dots), linear-gradient(160deg, #f2f2f4, #e6e6e9)",
          backgroundSize: "var(--mo-dots-pitch), auto",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-[56px]">
          <header className="flex flex-col gap-[4px]">
            <h1 style={{ font: "600 22px/28px var(--mo-font)", color: "#2a2a2a" }}>Mocraft website system</h1>
            <p style={{ font: "400 13px/19px var(--mo-font)", color: "#8a8a8a" }}>
              Generated from <code>src/design/system.ts</code>. Tokens read out of the Figma file; the
              glass material tuned against this page.
            </p>
          </header>

          <Section title="Space" note="0, 8 and 12 are published Figma variables; the rest are named here to keep one scale.">
            {Object.entries(space)
              .sort((a, b) => a[1] - b[1])
              .map(([k, v]) => (
                <div key={k} className="flex flex-col gap-[6px]">
                  <div style={{ width: Math.max(v, 2), height: 24, background: "#9a9aa2", borderRadius: 2 }} />
                  <Chip label={k} value={`${v}px`} />
                </div>
              ))}
          </Section>

          <Section title="Radius">
            {Object.entries(radius).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-[6px]">
                <div
                  style={{
                    width: 64,
                    height: 44,
                    background: "#dcdce0",
                    borderTopLeftRadius: Math.min(v, 44),
                    borderTopRightRadius: Math.min(v, 44),
                  }}
                />
                <Chip label={k} value={`${v}px`} />
              </div>
            ))}
          </Section>

          <Section title="Type" note="Four styles, all on a 20px line box — which is what lets mixed sizes share a baseline.">
            {(["title", "label", "code", "value"] as const).map((k) => (
              <div key={k} className="flex min-w-[180px] flex-col gap-[4px]">
                <span className={`mo-${k}`}>The quick brown fox</span>
                <Chip label={k} value={`${font[k].weight} ${font[k].size}/${font[k].leading}`} />
              </div>
            ))}
          </Section>

          <Section title="Colour" note="Ink is one hue at three strengths, off a single channel triple.">
            {[
              ["ink", color.ink],
              ["ink muted", color.inkMuted],
              ["field", color.field],
              ["selected", color.selected],
              ["knob", color.knob],
              ["accent red", color.accent.red],
              ["accent green", color.accent.green],
              ["accent blue", color.accent.blue],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-[6px]">
                <div
                  style={{
                    width: 64,
                    height: 44,
                    background: v,
                    borderRadius: 8,
                    boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.08)",
                  }}
                />
                <Chip label={k} value={v} />
              </div>
            ))}
          </Section>

          <Section
            title="Material"
            note="Two layers, as the file stacks them. Each panel below is the same component with the other layer's opacity at zero, so either can be judged on its own."
          >
            <Glass width={220}>
              <Header icon={<PlusIcon />}>Both layers</Header>
              <div style={{ padding: "0 var(--mo-space-2) var(--mo-space-2)" }}>
                <span className="mo-code">backdrop-blur {material.glass.blur}px</span>
              </div>
            </Glass>

            {/* Isolating a layer needs no new API: the layer opacities are
                already custom properties, so setting one to zero on the
                instance leaves the other rendering exactly as it ships. */}
            <Glass
              width={220}
              style={{ "--mo-glass-top-opacity": 0 } as React.CSSProperties}
            >
              <Header icon={<PlusIcon />}>Main base bottom</Header>
              <div style={{ padding: "0 var(--mo-space-2) var(--mo-space-2)" }}>
                <span className="mo-code">
                  2 fills · rim {material.glass.base.rimBlend}
                </span>
              </div>
            </Glass>

            <Glass
              width={220}
              style={{ "--mo-glass-base-opacity": 0 } as React.CSSProperties}
            >
              <Header icon={<PlusIcon />}>Main base top</Header>
              <div style={{ padding: "0 var(--mo-space-2) var(--mo-space-2)" }}>
                <span className="mo-code">
                  blur {material.glass.blur} · pane {material.glass.top.fillBlend} ·
                  bands {material.glass.top.depthBlend}
                </span>
              </div>
            </Glass>
            <Glass shape="rail">
              <RowGroup>
                {[0, 1, 2, 3, 4].map((i) => (
                  <RailItem
                    key={i}
                    icon={<ChevronIcon />}
                    title={`Tool ${i + 1}`}
                    selected={i === tool}
                    onClick={() => setTool(i)}
                  />
                ))}
              </RowGroup>
            </Glass>
          </Section>

          <Section
            title="Glass button"
            note="A plain white disc, ring and soft shadow, no tone logic -- `CircleButton`. Not `GlassButton` above; a new, separate component."
          >
            <CircleButton title="Next">
              <span style={{ transform: "scale(1.6)" }}>
                <ChevronIcon />
              </span>
            </CircleButton>
          </Section>

          <Section title="Switch">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { id: "crafting", label: "Crafting" },
                { id: "presets", label: "Presets" },
              ]}
            />
          </Section>

          <Section title="Rows" note="One lens for the column, sprung between rows — the label under it bends while it travels.">
            <Glass>
              <RowGroup>
                {DEVICES.map((d) => (
                  <Row
                    key={d.name}
                    icon={<FigmaGlyph name={d.icon} />}
                    trailing={<FigmaGlyph name="chevron" />}
                    selected={d.name === device}
                    onClick={() => setDevice(d.name)}
                  >
                    {d.name}
                  </Row>
                ))}
              </RowGroup>
            </Glass>

            <Glass>
              <RowGroup>
                {LAYERS.map((l) => {
                  const on = open.includes(l);
                  return (
                    <Row
                      key={l}
                      icon={<ChevronIcon />}
                      trailing={on ? <CloseIcon /> : <PlusIcon />}
                      selected={l === layer}
                      onClick={() => {
                        setLayer(l);
                        setOpen((v) => (on ? v.filter((x) => x !== l) : [...v, l]));
                      }}
                    >
                      {l}
                    </Row>
                  );
                })}
              </RowGroup>
            </Glass>
          </Section>

          <Section title="Popup" note="A header plus param rows. Every popup in the file is this shape.">
            <Glass style={{ gap: "var(--mo-space-4)" }}>
              {/* A popup's own acts go in `trailing` as `HeaderButton`s, in
                  front of the close. Reset here goes muted and inert once the
                  colour is back at its default — a header that reflowed
                  instead would move the close under the cursor. */}
              <Header
                icon={<PlusIcon />}
                trailing={
                  <>
                    <HeaderButton
                      label="Reset"
                      disabled={hex.toLowerCase() === DEMO_HEX}
                      onClick={() => setHex(DEMO_HEX)}
                    >
                      <ResetIcon />
                    </HeaderButton>
                    <HeaderButton label="Delete" onClick={() => undefined}>
                      <TrashIcon />
                    </HeaderButton>
                  </>
                }
                onClose={() => undefined}
              >
                {layer}
              </Header>
              <div className="flex flex-col" style={{ gap: "var(--mo-space-2)", paddingBottom: 10 }}>
                <ColorRow label="Color" value={hex} onChange={setHex} />
                {(
                  [
                    ["X", "x"],
                    ["Y", "y"],
                    ["Blur", "blur"],
                    ["Opacity", "opacity"],
                    ["Spread", "spread"],
                  ] as const
                ).map(([label, key]) => (
                  <ParamRow
                    key={key}
                    label={label}
                    value={shadow[key]}
                    min={0}
                    max={10}
                    step={0.1}
                    onChange={(n) => setShadow((s) => ({ ...s, [key]: n }))}
                  />
                ))}
              </div>
            </Glass>
          </Section>

          <Section
            title="Material bench"
            note="The one ground this page never had. Both materials over the same hard backdrop, judged against each other rather than against a pale gradient."
          >
            <Bench />
          </Section>

          <Section title="Parts">
            <div className="flex flex-col gap-[12px]">
              <Chip label="Slider" value={`track ${control.slider.trackH} · knob ${control.slider.knobW}x${control.slider.knobH}`} />
              <div style={{ width: 200 }}>
                <Slider
                  label="demo"
                  value={shadow.x}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={(n) => setShadow((s) => ({ ...s, x: n }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[12px]">
              <Chip label="Field" value={`${control.fieldW}px`} />
              <Field>2.4</Field>
            </div>
            <div className="flex flex-col gap-[12px]">
              <Chip label="Glyph" value={`${control.icon}px`} />
              <div className="flex gap-[8px]">
                <Glyph><ChevronIcon /></Glyph>
                <Glyph><CloseIcon /></Glyph>
                <Glyph><PlusIcon /></Glyph>
                <Glyph muted><PlusIcon /></Glyph>
              </div>
            </div>
          </Section>
        </div>
      </main>
    </>
  );
}
