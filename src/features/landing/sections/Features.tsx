import { LIGHTING_PRESETS } from "@/features/mockup-studio/lighting";
import { COLUMN, Ic, SectionHead } from "../parts";

/* The studio's own icons and rows; every line describes something the studio does. */
const FEATURES = [
  { icon: "transform", title: "Transform", copy: "Position, rotation and scale on every axis." },
  { icon: "camera", title: "Camera controls", copy: "Focal length and framing, wide and dramatic or long and flat." },
  { icon: "lighting", title: "Lighting", copy: `${LIGHTING_PRESETS.length} presets, from Studio to Rim, and a light you can turn.` },
  { icon: "depth-of-field", title: "Depth of field", copy: "Blur the frame and keep the focus where it counts." },
  { icon: "drop-shadow", title: "Drop shadow", copy: "Colour, offset, blur and spread under the device." },
  { icon: "effects", title: "Overlay", copy: "Lay an overlay across the whole shot." },
  { icon: "gradient", title: "Gradients", copy: "Two colours and an angle, behind any device." },
  { icon: "dots", title: "Dot pattern", copy: "Any colour, any spacing, for a designer's desk of a background." },
  { icon: "image", title: "Custom image background", copy: "Use your own image as the ground the device stands on.", filled: true },
] as const;

/** All the features: a three-by-three of the studio's rows, each with its own icon. */
export function Features() {
  return (
    <section id="features" className={`${COLUMN} flex flex-col gap-[56px]`}>
      <SectionHead title={"All the features like your\ndaily life design tools."}>
        Position it, light it, blur it and set it against a ground of your own, all from one studio.
      </SectionHead>
      <div className="grid grid-cols-1 gap-8 tablet:grid-cols-2 laptop:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`flex flex-col gap-[15px] rounded-[24px] px-6 pb-7 pt-5 ${"filled" in f ? "bg-[#eee]" : "bg-[#fafafa]"}`}
          >
            <span className="grid h-[40px] w-[40px] place-items-center">
              <Ic name={f.icon} size={32} />
            </span>
            <div className="flex flex-col gap-[7px]">
              <p className="text-[16px] font-medium leading-[21.76px] tracking-[-0.13px] text-black">{f.title}</p>
              <p className="text-[16px] leading-[23.2px] tracking-[-0.13px] text-[#636161]">{f.copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
