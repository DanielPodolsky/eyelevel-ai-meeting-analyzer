import { useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".m4a"];

interface Props {
  onFile: (file: File) => void;
}

export function DropZone({ onFile }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={[
        "fade-rise group cursor-pointer",
        "rounded-3xl border bg-card",
        "px-12 py-20 text-center",
        "transition-all duration-300 ease-out",
        isDragOver
          ? "border-accent bg-card-2 scale-[1.005]"
          : "border-line hover:border-line-strong hover:bg-card-2/60",
      ].join(" ")}
    >
      <div
        className={[
          "mb-6 inline-flex h-14 w-14 items-center justify-center",
          "rounded-full border border-line text-xl",
          "transition-colors duration-300",
          isDragOver ? "border-accent text-accent" : "text-muted group-hover:text-fg",
        ].join(" ")}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path
            d="M10 14V4M10 4L5 9M10 4L15 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 16h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-display text-2xl text-fg mb-3 font-medium">
        גרור קובץ אודיו
      </p>
      <p className="text-muted text-sm">
        או לחץ לבחירה
        <span className="mx-2 text-faint">·</span>
        <span className="font-mono text-[13px]">mp3 · wav · m4a</span>
        <span className="mx-2 text-faint">·</span>
        <span dir="ltr">עד 25 מ"ב</span>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleSelect}
        className="sr-only"
      />
    </div>
  );
}
