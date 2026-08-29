import type { ColorTokenDoc } from "@/features/design-system/types";

interface TokenSwatchProps {
  token: ColorTokenDoc;
}

const groupClassMap: Record<ColorTokenDoc["group"], string> = {
  base: "text-emerald-300",
  text: "text-sky-300",
  surface: "text-violet-300",
  button: "text-amber-300",
  header: "text-rose-300",
  material: "text-teal-300",
};

export default function TokenSwatch({ token }: TokenSwatchProps) {
  return (
    <article className="rounded-[16px] border border-border bg-surface p-4">
      <div
        className="h-16 rounded-[10px] border border-border"
        style={{ backgroundColor: token.value }}
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[14px] font-medium text-foreground">{token.name}</p>
        <span className={`text-[11px] uppercase tracking-wide ${groupClassMap[token.group]}`}>
          {token.group}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-muted">{token.displayValue ?? token.value}</p>
      <p className="mt-2 text-[12px] text-foreground/80">Use: {token.usage}</p>
    </article>
  );
}
