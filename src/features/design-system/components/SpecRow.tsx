interface SpecRowProps {
  label: string;
  value: string;
}

export default function SpecRow({ label, value }: SpecRowProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/50 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-[13px] text-muted sm:text-[14px]">{label}</span>
      <span className="text-[13px] font-medium text-foreground sm:text-[14px]">{value}</span>
    </div>
  );
}
