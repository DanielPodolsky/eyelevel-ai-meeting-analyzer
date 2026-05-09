import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { downloadDocx, streamAnalyze } from "./api";
import { DropZone } from "./components/DropZone";
import { ErrorCard } from "./components/ErrorCard";
import { Header } from "./components/Header";
import { ProcessingView } from "./components/ProcessingView";
import { ResultsPanel } from "./components/ResultsPanel";
import { Toast, type ToastTone } from "./components/Toast";
import type {
  ErrorEvent as AnalyzerErrorEvent,
  MeetingAnalysis,
} from "./types/contracts";

// Apple-style cross-fade between phases. mode="wait" ensures the exiting
// element finishes its exit before the entering one starts — no flash of
// overlapping content.
const phaseTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
};

type Phase = "idle" | "processing" | "done" | "error";
type Step = "transcribing" | "summarizing" | null;

const ACCEPTED_EXTENSIONS = [".mp3", ".wav", ".m4a"];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<Step>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [result, setResult] = useState<MeetingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
  } | null>(null);

  function resetAll() {
    setPhase("idle");
    setStep(null);
    setTranscript("");
    setResult(null);
    setError(null);
    setFilename(null);
    setFileSize(null);
    setStartTime(0);
  }

  function validateFile(file: File): string | null {
    const lowerName = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      return `פורמט לא נתמך — רק ${ACCEPTED_EXTENSIONS.join(" / ")}`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'הקובץ גדול מדי — מקסימום 25 מ"ב';
    }
    if (file.size === 0) {
      return "הקובץ ריק";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setPhase("error");
      return;
    }

    setFilename(file.name);
    setFileSize(file.size);
    setStartTime(Date.now());
    setTranscript("");
    setResult(null);
    setError(null);
    setStep(null);
    setPhase("processing");

    await streamAnalyze(file, {
      onStatus: (e) => setStep(e.step),
      onTranscript: (e) => setTranscript(e.text),
      onResult: (e) => setResult(e),
      onError: (e: AnalyzerErrorEvent) => {
        setError(`${e.message} (${e.code})`);
        setPhase("error");
      },
      onDone: () => {
        setStep(null);
        setPhase("done");
      },
      onNetworkError: (msg) => {
        setError(msg);
        setPhase("error");
      },
    });
  }

  async function handleDownload() {
    if (!result) return;
    setIsDownloading(true);
    try {
      await downloadDocx(result);
      setToast({ message: "המסמך הורד בהצלחה", tone: "success" });
    } catch (e) {
      setToast({
        message: `שגיאה בהורדה: ${(e as Error).message}`,
        tone: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 pb-32">
      <Header />

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" {...phaseTransition}>
            <DropZone onFile={handleFile} />
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div key="processing" {...phaseTransition}>
            <ProcessingView
              filename={filename}
              fileSize={fileSize}
              step={step}
              transcript={transcript}
              startTime={startTime}
            />
          </motion.div>
        )}

        {phase === "done" && result && (
          <motion.div key="done" {...phaseTransition}>
            <ResultsPanel
              result={result}
              transcript={transcript}
              isDownloading={isDownloading}
              onDownload={handleDownload}
              onReset={resetAll}
            />
          </motion.div>
        )}

        {phase === "error" && error && (
          <motion.div key="error" {...phaseTransition}>
            <ErrorCard message={error} onReset={resetAll} />
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "success"}
        onDismiss={() => setToast(null)}
      />
    </main>
  );
}

export default App;
