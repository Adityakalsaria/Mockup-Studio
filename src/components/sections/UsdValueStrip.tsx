const DEFAULT_VALUE_ITEMS = [
  "ACH and WIRE support",
  "Supported in 90+ countries",
  "Faster settlement",
  "Open in under 5 minutes",
] as const;

const DASHED_HORIZONTAL_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(to right, var(--color-divider) 0, var(--color-divider) 4px, transparent 4px, transparent 8px)",
};

const DASHED_VERTICAL_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, var(--color-divider) 0, var(--color-divider) 4px, transparent 4px, transparent 8px)",
};

export default function UsdValueStrip({
  items = DEFAULT_VALUE_ITEMS,
}: {
  items?: ReadonlyArray<string>;
}) {
  return (
    <section
      id="usd-value-strip"
      className="w-full bg-black py-[var(--space-24)] desktop:py-[var(--space-48)]"
    >
      <div className="layout-content ds-page-gutter">
        <div className="flex flex-col laptop:grid laptop:grid-cols-4">
          <div
            aria-hidden
            className="h-[1px] w-full laptop:hidden"
            style={DASHED_HORIZONTAL_STYLE}
          />
          {items.map((item, index) => (
            <div key={item} className="relative flex flex-col">
              {index > 0 ? (
                <div
                  aria-hidden
                  className="h-[1px] w-full laptop:hidden"
                  style={DASHED_HORIZONTAL_STYLE}
                />
              ) : null}

              <div className="relative flex min-h-[96px] flex-1 items-center justify-center px-[var(--space-24)] py-[var(--space-20)] text-center laptop:min-h-0 laptop:px-[var(--space-32)] laptop:py-0">
                {index > 0 ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 hidden w-[1px] laptop:block"
                    style={DASHED_VERTICAL_STYLE}
                  />
                ) : null}
                <p className="type-action max-w-[28ch] text-text-primary">{item}</p>
              </div>
            </div>
          ))}
          <div
            aria-hidden
            className="h-[1px] w-full laptop:hidden"
            style={DASHED_HORIZONTAL_STYLE}
          />
        </div>
      </div>
    </section>
  );
}
