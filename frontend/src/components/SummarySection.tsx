interface Props {
  summary: string;
}

export function SummarySection({ summary }: Props) {
  return (
    <section>
      <SectionHeading number="01" label="סיכום" />
      <p className="text-fg text-[17px] leading-[1.85]">{summary}</p>
    </section>
  );
}

interface SectionHeadingProps {
  number: string;
  label: string;
  count?: number;
}

export function SectionHeading({ number, label, count }: SectionHeadingProps) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3 mb-3">
        <span
          dir="ltr"
          className="font-mono text-[12px] text-faint tabular-nums tracking-[0.05em]"
        >
          {number}
        </span>
        <span className="text-faint text-[12px]" aria-hidden>
          —
        </span>
        <h3 className="font-display text-[22px] font-medium text-fg leading-none">
          {label}
        </h3>
        {count !== undefined && (
          <span
            dir="ltr"
            className="font-mono text-[11px] text-faint tabular-nums ms-1"
          >
            · {count}
          </span>
        )}
      </div>
      <div className="h-px bg-line" />
    </div>
  );
}
