interface SectionBlockProps {
  id?: string;
  title: string;
  summary?: string;
  children: React.ReactNode;
}

export default function SectionBlock({
  id,
  title,
  summary,
  children,
}: SectionBlockProps) {
  return (
    <section id={id} className="scroll-mt-20">
      <header className="mb-6 border-b border-border pb-4">
        <h2 className="text-[28px] font-semibold leading-tight text-foreground sm:text-[32px]">
          {title}
        </h2>
        {summary ? (
          <p className="mt-2 max-w-[760px] text-[14px] leading-[1.5] text-muted sm:text-[15px]">
            {summary}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
