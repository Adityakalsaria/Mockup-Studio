interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-surface-elevated px-3 py-1 text-caption text-muted ${className}`}
    >
      {children}
    </span>
  );
}
