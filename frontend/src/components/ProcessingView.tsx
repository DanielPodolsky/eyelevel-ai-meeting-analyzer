import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Spinner } from "./Spinner";

interface Props {
  filename: string | null;
  fileSize: number | null;
  step: "transcribing" | "summarizing" | null;
  transcript: string;
  startTime: number;
}

const STAGES = [
  { key: "uploading", label: "שליחה" },
  { key: "transcribing", label: "תמלול" },
  { key: "summarizing", label: "ניתוח" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

const STAGE_DESCRIPTION: Record<StageKey, string> = {
  uploading: "שולח את הקובץ לשרת",
  transcribing: "מתמלל את האודיו לעברית",
  summarizing: "מנתח את התוכן ומחלץ החלטות, משימות ונושאים",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export function ProcessingView({
  filename,
  fileSize,
  step,
  transcript,
  startTime,
}: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100); // 10x/sec — smooth counter without overhead
    return () => clearInterval(interval);
  }, [startTime]);

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const currentKey: StageKey = step ?? "uploading";
  const currentIndex = STAGES.findIndex((s) => s.key === currentKey);
  const isLong = elapsedSec > 90;

  return (
    <div className="fade-rise space-y-5">
      {/* ─── File header + elapsed timer ─────────────────────────── */}
      <div className="rounded-2xl border border-line bg-card px-7 py-6">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div className="min-w-0 flex-1">
            {filename && (
              <p
                className="font-mono text-[12px] text-fg truncate mb-1.5"
                dir="ltr"
              >
                {filename}
              </p>
            )}
            {fileSize != null && (
              <p className="font-mono text-[11px] text-faint tracking-wider">
                {formatBytes(fileSize)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-[28px] tabular-nums text-fg leading-none font-medium h-[28px] overflow-hidden relative">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={elapsedSec}
                  dir="ltr"
                  initial={{ opacity: 0, y: -14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block"
                >
                  {formatElapsed(elapsedSec)}
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint mt-2">
              elapsed
            </p>
          </div>
        </div>

        {/* ─── Stepper ─────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 mb-6"
          dir="ltr" /* keep stepper LTR so progression flows left→right visually */
        >
          {STAGES.map((stage, i) => {
            const isComplete = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div
                key={stage.key}
                className="flex items-center gap-3 flex-1 last:flex-initial"
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    aria-hidden
                    className={[
                      "h-2.5 w-2.5 rounded-full transition-all duration-500",
                      isComplete && "bg-accent",
                      isCurrent &&
                        "bg-accent ring-4 ring-accent/30 animate-pulse",
                      !isComplete && !isCurrent && "bg-line",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <span
                    className={[
                      "text-[12px] font-medium font-mono uppercase tracking-[0.14em] transition-colors duration-300",
                      isComplete && "text-fg",
                      isCurrent && "text-accent",
                      !isComplete && !isCurrent && "text-faint",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    dir="rtl"
                  >
                    {stage.label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className="flex-1 h-px bg-line relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-accent transition-all duration-700 ease-out"
                      style={{
                        width: isComplete ? "100%" : isCurrent ? "55%" : "0%",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Active stage description ───────────────────────────── */}
        <div className="flex items-start gap-3 pt-5 border-t border-line">
          <div className="pt-1">
            <Spinner size={14} />
          </div>
          <div className="flex-1">
            <p className="text-fg text-[15px] leading-relaxed">
              {STAGE_DESCRIPTION[currentKey]}
            </p>
            {isLong && (
              <p className="text-muted text-[13px] mt-2 leading-relaxed">
                לוקח קצת יותר מהרגיל… ניתוחים מורכבים יכולים להגיע עד שתי דקות.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Live transcript card ────────────────────────────────── */}
      {transcript && (
        <div className="fade-in rounded-2xl border border-line bg-card px-7 py-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-faint">
              תמלול
            </p>
            <p className="font-mono text-[11px] text-faint tabular-nums">
              <span dir="ltr">{transcript.length}</span> תווים
            </p>
          </div>
          <p className="text-fg text-[16px] leading-[1.85] whitespace-pre-wrap">
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
}
