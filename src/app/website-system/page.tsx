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

import { useState } from "react";
import {
  ChevronIcon,
  CloseIcon,
  ColorRow,
  DesignSystem,
  Field,
  Glass,
  Glyph,
  Header,
  ParamRow,
  PlusIcon,
  Row,
  Segmented,
  Slider,
} from "@/design/ui";
import { color, control, font, radius, space } from "@/design/system";

const DEVICES = [
  "iMac",
  "iPad Pro",
  "MacBook Neo",
  "MacBook Pro 14’",
  "Studio Display XDR",
  "iPhone 17",
  "iPhone 17 Pro",
  "iPhone 17 Pro Max",
  "Flat Canvas",
];

const LAYERS = ["Transform", "Effects", "Camera", "Background", "Drop shadow", "Gradient", "Dots", "Image"];

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

export default function WebsiteSystem() {
  const [device, setDevice] = useState("iPhone 17 Pro");
  const [tab, setTab] = useState<"crafting" | "presets">("crafting");
  const [shadow, setShadow] = useState({ x: 2.4, y: 2.4, blur: 2.4, opacity: 2.4, spread: 2.4 });
  const [hex, setHex] = useState("#000000");
  const [open, setOpen] = useState<string[]>(["Background", "Drop shadow", "Gradient", "Dots", "Image"]);

  return (
    <>
      <DesignSystem />
      <main
        className="min-h-screen w-full p-[48px]"
        style={{
          font: "var(--mo-text-title)",
          // The test surface. See the note at the top of this file.
          background: `
            radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.07) 1px, transparent 0) 0 0 / 22px 22px,
            linear-gradient(160deg, #f2f2f4, #e6e6e9)`,
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

          <Section title="Material" note="Blur, wash, rim and shadow. Only correct together — that is why it is one class.">
            <Glass width={220}>
              <Header icon={<PlusIcon />}>Glass panel</Header>
              <div style={{ padding: "0 var(--mo-space-2) var(--mo-space-2)" }}>
                <span className="mo-code">backdrop-blur 98px</span>
              </div>
            </Glass>
            <Glass shape="rail">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="grid w-full place-items-center"
                  style={{
                    padding: "10px var(--mo-space-3)",
                    borderRadius: i === 0 ? "var(--mo-r-selected)" : "var(--mo-r-row)",
                    background: i === 0 ? "var(--mo-selected)" : undefined,
                    boxShadow: i === 0 ? "var(--mo-selected-shadow)" : undefined,
                  }}
                >
                  <Glyph muted={i !== 0}>
                    <ChevronIcon />
                  </Glyph>
                </div>
              ))}
            </Glass>
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

          <Section title="Rows" note="Selection changes background, radius and ink at once — all three are the state.">
            <Glass>
              {DEVICES.map((d) => (
                <Row
                  key={d}
                  icon={<ChevronIcon />}
                  trailing={<ChevronIcon />}
                  selected={d === device}
                  onClick={() => setDevice(d)}
                >
                  {d}
                </Row>
              ))}
            </Glass>

            <Glass>
              {LAYERS.map((l) => {
                const on = open.includes(l);
                return (
                  <Row
                    key={l}
                    icon={<ChevronIcon />}
                    trailing={on ? <CloseIcon /> : <PlusIcon />}
                    selected={l === "Drop shadow"}
                    onClick={() => setOpen((v) => (on ? v.filter((x) => x !== l) : [...v, l]))}
                  >
                    {l}
                  </Row>
                );
              })}
            </Glass>
          </Section>

          <Section title="Popup" note="A header plus param rows. Every popup in the file is this shape.">
            <Glass style={{ gap: "var(--mo-space-4)" }}>
              <Header icon={<PlusIcon />} onClose={() => undefined}>
                Drop shadow
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

          <Section title="Parts">
            <div className="flex flex-col gap-[12px]">
              <Chip label="Slider" value={`track ${control.slider.trackH} · knob ${control.slider.knobW}x${control.slider.knobH}`} />
              <div style={{ width: 200 }}>
                <Slider label="demo" value={shadow.x} min={0} max={10} step={0.1} onChange={(n) => setShadow((s) => ({ ...s, x: n }))} />
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
