interface TrustBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export default function TrustBadge({
  icon,
  title,
  description,
  className = "",
}: TrustBadgeProps) {
  return (
    <div className={`flex flex-col items-center gap-[var(--spacing-xs)] text-center ${className}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] text-[var(--color-foreground)]">
        {icon}
      </div>
      <h3
        className="type-action text-[var(--color-foreground)]"
        style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
      >
        {title}
      </h3>
      <p
        className="type-micro max-w-[240px] text-[var(--color-text-muted)]"
        style={{ fontFeatureSettings: "'lnum' 1, 'pnum' 1" }}
      >
        {description}
      </p>
    </div>
  );
}
