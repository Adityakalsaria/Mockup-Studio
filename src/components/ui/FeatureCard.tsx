interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  className = "",
}: FeatureCardProps) {
  return (
    <div
      className={`flex flex-col gap-[var(--spacing-sm)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--spacing-md)] tablet:p-[var(--spacing-lg)] ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-foreground)]">
        {icon}
      </div>
      <h3
        className="type-h3 text-[var(--color-foreground)]"
        style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
      >
        {title}
      </h3>
      <p
        className="type-body-m text-[var(--color-text-muted)]"
        style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
      >
        {description}
      </p>
    </div>
  );
}
