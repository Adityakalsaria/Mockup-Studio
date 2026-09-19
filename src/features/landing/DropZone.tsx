"use client";

import { useContext, useRef, useState, type DragEvent } from "react";
import { Glass, Glyph } from "@/design/ui";
import { UserScreenContext } from "./LiveDevice";

const ICONS = "/figma-assets/mockup-studio/icons";

/**
 * Drop a design here and every live device on the page shows it -- the
 * studio's own way in, on the landing page. Nothing is uploaded: the file is
 * read into this tab as a data URL, the form the studio reads its uploads in.
 */
export function DropZone() {
  const { screen, setScreen } = useContext(UserScreenContext);
  const [over, setOver] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const read = (file: File | undefined) => {
    if (!file || !/^(image|video)\//.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScreen(String(reader.result));
      setName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setScreen(null);
    setName(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    read(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      style={{ transform: over ? "scale(1.02)" : "none", transition: "transform var(--duration-fast) var(--ease-out)" }}
    >
      <Glass shape="pill" width="100%">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative z-[1] flex h-[40px] w-full items-center gap-[var(--space-12)] px-[var(--space-12)] text-left"
        >
          <Glyph>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ICONS}/add-image.svg`} width={20} height={20} alt="" />
          </Glyph>
          <span className="type-copy min-w-0 flex-1 truncate" style={{ color: "var(--mo-ink)" }}>
            {name ? `${name} is on the device` : over ? "Drop it" : "Drop your design here, or browse"}
          </span>
          {screen ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  reset();
                }
              }}
              className="type-caption text-text-link"
            >
              Reset
            </span>
          ) : null}
        </button>
      </Glass>
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          read(e.currentTarget.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
      <p className="type-caption mt-[var(--space-12)] text-center text-text-muted-dark">
        Nothing is uploaded. Your design stays in this browser tab.
      </p>
    </div>
  );
}
