interface Props {
  message: string;
  onReset: () => void;
}

export function ErrorCard({ message, onReset }: Props) {
  return (
    <div className="fade-rise rounded-2xl border border-bad/40 bg-bad/5 px-7 py-7">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bad/60 text-bad text-sm font-medium"
        >
          !
        </span>
        <div className="flex-1">
          <p className="font-display text-xl text-fg mb-2 font-medium">
            שגיאה
          </p>
          <p className="text-muted text-[15px] leading-relaxed mb-5">
            {message}
          </p>
          <button
            onClick={onReset}
            className="rounded-full border border-line bg-card text-fg px-4 py-2 text-sm font-medium transition-colors hover:border-line-strong"
          >
            נסה שוב
          </button>
        </div>
      </div>
    </div>
  );
}
