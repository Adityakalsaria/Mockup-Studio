"use client";

import { Button, Glass, PlusIcon, RowGroup, Row, Glyph, Segmented } from "@/design/ui";
import { B, Opener } from "../Chapter";
import { ActionStack, DOTS, FloatCard, GlassPill, Ic } from "../parts";

const noop = () => {};

/** One row of the studio's stack, with its glyph and a plus at the edge. */
function Item({ icon, children, selected }: { icon: string; children: string; selected?: boolean }) {
  return (
    <Row
      icon={
        <Glyph>
          <Ic name={icon} />
        </Glyph>
      }
      trailing={
        <Glyph muted>
          <PlusIcon />
        </Glyph>
      }
      selected={selected}
    >
      {children}
    </Row>
  );
}

function Tab({ value }: { value: "crafting" | "motion" }) {
  return (
    <Segmented
      width={250}
      value={value}
      onChange={noop}
      options={[
        { id: "crafting", label: "Crafting" },
        { id: "motion", label: "Motion" },
      ]}
    />
  );
}

function ExportBlock({ title, options, action }: { title: string; options: string[]; action: string }) {
  return (
    <div className="mt-[var(--space-24)] flex flex-col gap-[var(--space-8)]">
      <p className="type-caption px-[var(--space-8)] text-[var(--mo-ink)]">{title}</p>
      <Segmented width="100%" height={32} value={options[1]} onChange={noop} options={options.map((o) => ({ id: o, label: o }))} />
      <Button width="100%">{action}</Button>
    </div>
  );
}

/**
 * The core of the product, laid out as the two halves of the studio: the
 * Crafting stack on one side, the Motion stack on the other, and the asset they
 * both act on floating between them. Real components, at their real size.
 */
export function Craft() {
  return (
    <section id="craft" className="bg-white ds-page-gutter py-[var(--spacing-section)]">
      <Opener eyebrow="One studio, two halves" title={"Craft the shot.\nThen set it in motion."}>
        <B>Crafting</B> frames the device, the light and the lens. <B>Motion</B> keys it over time and exports a clip.
      </Opener>

      <div className={`layout-media relative mt-[var(--space-56)] overflow-hidden rounded-[32px] ring-1 ring-black/5 ${DOTS}`}>
        <div className="grid grid-cols-1 items-center justify-items-center gap-[var(--space-48)] px-[var(--space-24)] py-[var(--space-64)] laptop:grid-cols-[250px_minmax(0,1fr)_250px] laptop:gap-[var(--space-32)] laptop:px-[var(--space-48)]">
          <div className="flex flex-col gap-[var(--space-12)]">
            <Tab value="crafting" />
            <Glass width={250}>
              <RowGroup>
                <Item icon="transform">Transform</Item>
                <Item icon="camera">Camera</Item>
                <Item icon="depth-of-field">Depth of Field</Item>
                <Item icon="lighting">Lighting</Item>
                <Item icon="drop-shadow" selected>
                  Drop Shadow
                </Item>
                <Item icon="background">Background</Item>
              </RowGroup>
              <ExportBlock title="Export craft" options={["1x", "2x", "3x", "4x"]} action="Export image" />
            </Glass>
          </div>

          <div className="relative w-full max-w-[520px]">
            <FloatCard shot="trio-17pro-deep-blue" alt="iPhone 17 Pro in Deep Blue, from the back, the front and an angle" name="iphone_17_pro_deep_blue.png" size={[1600, 1200]} className="aspect-[4/3] w-full" />
            <ActionStack icons={["image", "expand", "play", "effects"]} className="absolute -right-[52px] top-0 hidden laptop:flex" />
            <GlassPill icon="camera" className="absolute -bottom-[17px] left-[var(--space-24)]">
              Framed in Crafting
            </GlassPill>
            <GlassPill icon="play" className="absolute -bottom-[17px] right-[var(--space-24)]">
              Keyed in Motion
            </GlassPill>
          </div>

          <div className="flex flex-col gap-[var(--space-12)]">
            <Tab value="motion" />
            <Glass width={250}>
              <RowGroup>
                <Item icon="styles">Presets</Item>
                <Item icon="focus-point" selected>
                  Focus points
                </Item>
                <Item icon="transform">Transform</Item>
                <Item icon="camera">Camera</Item>
                <Item icon="lighting">Lighting</Item>
                <Item icon="depth-of-field">Depth of Field</Item>
              </RowGroup>
              <ExportBlock title="Export" options={["1x", "2x", "3x", "4x"]} action="Export video" />
            </Glass>
          </div>
        </div>
      </div>

      <div className="layout-media mt-[var(--space-32)] grid grid-cols-1 gap-[var(--space-24)] tablet:grid-cols-2">
        <p className="type-copy text-text-secondary-dark">
          <B>Crafting.</B> Position, rotation and scale on every axis, focal length, lighting, depth of field, a shadow and a background behind it.
        </p>
        <p className="type-copy text-text-secondary-dark">
          <B>Motion.</B> Start from a preset or key your own moves, aim the camera with focus points, and export the clip as an MP4.
        </p>
      </div>
    </section>
  );
}
