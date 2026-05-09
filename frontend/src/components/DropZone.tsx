import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { SAMPLES, type Sample } from "../data/samples";

const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".m4a"];

interface Props {
  onFile: (file: File) => void;
  onSample: (sample: Sample) => void;
}

export function DropZone({ onFile, onSample }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
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
    <div className="fade-rise space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={[
          "group cursor-pointer",
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

      {/* Demo mode toggle + sample list */}
      <div className="flex flex-col items-center pt-2">
        <button
          onClick={() => setShowSamples(!showSamples)}
          className="font-mono text-[13px] tracking-[0.18em] uppercase text-muted hover:text-fg transition-colors flex items-center gap-2.5 py-2"
        >
          <span
            className={`inline-block transition-transform duration-200 ${showSamples ? "rotate-90" : ""}`}
            aria-hidden
          >
            ›
          </span>
          או נסה דוגמא
        </button>

        <AnimatePresence>
          {showSamples && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="w-full overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                {SAMPLES.map((sample, i) => (
                  <motion.button
                    key={sample.id}
                    onClick={() => onSample(sample)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.06,
                      duration: 0.32,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-line bg-card hover:border-line-strong hover:bg-card-2/60 px-5 py-4 text-start transition-colors flex flex-col"
                  >
                    <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint mb-2">
                      {sample.duration}
                    </p>
                    <p className="font-display text-[16px] text-fg font-medium leading-tight mb-2 min-h-[2.6em]">
                      {sample.title}
                    </p>
                    <p className="text-muted text-[12px] leading-[1.5] min-h-[3em]">
                      {sample.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
