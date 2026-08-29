import type { ComponentSpecDoc } from "@/features/design-system/types";

interface ComponentSpecCardProps {
  spec: ComponentSpecDoc;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold uppercase tracking-wide text-foreground/80">
        {title}
      </h4>
      <ul className="mt-2 space-y-1 text-[13px] leading-[1.45] text-muted">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ComponentSpecCard({ spec }: ComponentSpecCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h3 className="text-[22px] font-semibold leading-tight text-foreground">{spec.name}</h3>
      <p className="mt-2 text-[14px] leading-[1.5] text-muted">{spec.purpose}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ListBlock title="Anatomy" items={spec.anatomy} />
        <ListBlock title="Variants" items={spec.variants} />
        <ListBlock title="States" items={spec.states} />
        <ListBlock title="Interaction" items={spec.interaction} />
        <ListBlock title="Accessibility" items={spec.accessibility} />
        <ListBlock title="Responsive" items={spec.responsive} />
      </div>

      <div className="mt-4 rounded-[12px] border border-border/70 bg-background px-3 py-2">
        <p className="text-[12px] uppercase tracking-wide text-muted">Usage</p>
        <code className="mt-1 block text-[12px] text-foreground">{spec.codeUsage}</code>
      </div>
    </article>
  );
}
