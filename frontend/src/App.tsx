import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { downloadDocx, streamAnalyze, streamAnalyzeText } from "./api";
import { DropZone } from "./components/DropZone";
import { ErrorCard } from "./components/ErrorCard";
import { Header } from "./components/Header";
import { ProcessingView } from "./components/ProcessingView";
import { ResultsPanel } from "./components/ResultsPanel";
import { ThemeToggle } from "./components/ThemeToggle";
import { Toast, type ToastTone } from "./components/Toast";
import type { Sample } from "./data/samples";
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
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [completedInMs, setCompletedInMs] = useState<number | null>(null);
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
    setAudioDuration(null);
    setStartTime(0);
    setCompletedInMs(null);
  }

  // Read audio duration from the file via a hidden <audio> element. Returns
  // duration in seconds, or null if metadata can't be read (e.g., bad codec).
  async function readAudioDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      audio.src = url;
    });
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
    setAudioDuration(null);
    setStartTime(Date.now());
    setCompletedInMs(null);
    setTranscript("");
    setResult(null);
    setError(null);
    setStep(null);
    setPhase("processing");

    // Read duration in parallel with the upload — non-blocking
    readAudioDuration(file).then(setAudioDuration);

    const startedAt = Date.now();
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
        setCompletedInMs(Date.now() - startedAt);
        setPhase("done");
      },
      onNetworkError: (msg) => {
        setError(msg);
        setPhase("error");
      },
    });
  }

  // Demo mode: skip Whisper, run only the Claude summarization step on a
  // pre-loaded Hebrew transcript. Used so reviewers can play with the system
  // without finding a Hebrew audio file.
  async function handleSample(sample: Sample) {
    setFilename(`${sample.title} (דוגמא)`);
    setFileSize(null);
    setAudioDuration(null);
    setStartTime(Date.now());
    setCompletedInMs(null);
    setTranscript("");
    setResult(null);
    setError(null);
    setStep(null);
    setPhase("processing");

    const startedAt = Date.now();
    await streamAnalyzeText(sample.text, {
      onStatus: (e) => setStep(e.step),
      onTranscript: (e) => setTranscript(e.text),
      onResult: (e) => setResult(e),
      onError: (e: AnalyzerErrorEvent) => {
        setError(`${e.message} (${e.code})`);
        setPhase("error");
      },
      onDone: () => {
        setStep(null);
        setCompletedInMs(Date.now() - startedAt);
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
      <ThemeToggle />
      <Header />

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" {...phaseTransition}>
            <DropZone onFile={handleFile} onSample={handleSample} />
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div key="processing" {...phaseTransition}>
            <ProcessingView
              filename={filename}
              fileSize={fileSize}
              audioDuration={audioDuration}
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
              completedInMs={completedInMs}
              audioDuration={audioDuration}
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
