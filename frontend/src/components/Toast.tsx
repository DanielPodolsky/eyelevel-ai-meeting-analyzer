import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

export type ToastTone = "success" | "error" | "info";

interface Props {
  message: string | null;
  tone?: ToastTone;
  durationMs?: number;
  onDismiss: () => void;
}

const TONE_STYLES: Record<ToastTone, { bar: string; iconBg: string; iconFg: string; symbol: string }> = {
  success: {
    bar: "border-good/30 bg-card",
    iconBg: "bg-good/10",
    iconFg: "text-good",
    symbol: "✓",
  },
  error: {
    bar: "border-bad/40 bg-card",
    iconBg: "bg-bad/10",
    iconFg: "text-bad",
    symbol: "!",
  },
  info: {
    bar: "border-line bg-card",
    iconBg: "bg-accent/15",
    iconFg: "text-accent",
    symbol: "i",
  },
};

export function Toast({
  message,
  tone = "success",
  durationMs = 3200,
  onDismiss,
}: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  const styles = TONE_STYLES[tone];

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className={[
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-3 px-5 py-3.5",
            "rounded-full border shadow-2xl shadow-black/40",
            "backdrop-blur-md",
            styles.bar,
          ].join(" ")}
        >
          <span
            aria-hidden
            className={[
              "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
              styles.iconBg,
              styles.iconFg,
            ].join(" ")}
          >
            {styles.symbol}
          </span>
          <span className="text-fg text-[14px] font-medium">{message}</span>
          <button
            onClick={onDismiss}
            aria-label="סגור"
            className="text-faint hover:text-fg transition-colors text-[14px] ms-1 -me-1"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
