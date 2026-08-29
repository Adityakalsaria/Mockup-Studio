interface PreviewCardProps {
  label: string;
  theme?: "dark" | "light";
  children: React.ReactNode;
}

export default function PreviewCard({
  label,
  theme = "dark",
  children,
}: PreviewCardProps) {
  const isLight = theme === "light";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <div
        className={`rounded-[16px] border p-6 ${
          isLight
            ? "theme-light border-[#e5e5e5] bg-white"
            : "border-border bg-surface"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
