import { motion } from "motion/react";
import { useRef, useState } from "react";
import { findBestMatch, type MatchResult } from "../lib/fuzzyMatch";
import type { MeetingAnalysis } from "../types/contracts";
import { ActionItemsTable } from "./ActionItemsTable";
import { DecisionsList } from "./DecisionsList";
import { OpenItemsList } from "./OpenItemsList";
import { ParticipantsList } from "./ParticipantsList";
import { SummarySection } from "./SummarySection";
import { TranscriptDisplay } from "./TranscriptDisplay";

interface Props {
  result: MeetingAnalysis;
  transcript: string;
  completedInMs: number | null;
  audioDuration: number | null;
  isDownloading: boolean;
  onDownload: () => void;
  onReset: () => void;
}

const sectionContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const sectionItem = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ResultsPanel({
  result,
  transcript,
  completedInMs,
  audioDuration,
  isDownloading,
  onDownload,
  onReset,
}: Props) {
  // Provenance highlighting state — when the user clicks a decision /
  // action / open item, we expand the transcript and highlight the source.
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [highlight, setHighlight] = useState<MatchResult | null>(null);
  const [matchFailed, setMatchFailed] = useState(false);
  const transcriptSectionRef = useRef<HTMLDetailsElement>(null);

  function handleProvenance(query: string) {
    const match = findBestMatch(transcript, query);
    setHighlight(match);
    setMatchFailed(match === null);
    setTranscriptOpen(true);

    // Wait one frame so the transcript has actually expanded before scrolling
    // — otherwise scrollIntoView targets a hidden element.
    requestAnimationFrame(() => {
      if (match) {
        // TranscriptDisplay's own useEffect handles scrolling to the span
        // — we just need the section to be visible first.
      } else {
        // Match failed: just scroll the transcript section into view so the
        // user can read manually.
        transcriptSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }

  return (
    <div>
      {/* Header bar — title + actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6 mb-14"
      >
        <div className="flex items-baseline gap-4 flex-wrap">
          <h2 className="font-display text-[34px] text-fg font-medium leading-none">
            תוצאות
          </h2>
          {completedInMs != null && (
            <motion.span
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono text-[11px] tracking-[0.18em] uppercase text-faint flex items-center gap-2"
            >
              <motion.span
                aria-hidden
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block h-1.5 w-1.5 rounded-full bg-good"
              />
              <span dir="ltr">
                הושלם · {formatDuration(completedInMs / 1000)}
                {audioDuration != null && (
                  <>
                    {" · "}
                    <span className="opacity-60">
                      audio {formatDuration(audioDuration)}
                    </span>
                  </>
                )}
              </span>
            </motion.span>
          )}
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={onDownload}
            disabled={isDownloading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="rounded-full bg-accent text-canvas px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? "מוריד…" : "הורד כ-Word"}
          </motion.button>
          <motion.button
            onClick={onReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="rounded-full border border-line bg-card text-fg px-5 py-2.5 text-sm font-medium hover:border-line-strong"
          >
            ניתוח חדש
          </motion.button>
        </div>
      </motion.div>

      {/* Result sections — staggered entry, generous vertical rhythm */}
      <motion.div
        className="space-y-14"
        variants={sectionContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={sectionItem}>
          <SummarySection summary={result.summary} />
        </motion.div>
        <motion.div variants={sectionItem}>
          <ParticipantsList participants={result.participants} />
        </motion.div>
        <motion.div variants={sectionItem}>
          <DecisionsList
            decisions={result.decisions}
            onProvenance={handleProvenance}
          />
        </motion.div>
        <motion.div variants={sectionItem}>
          <ActionItemsTable
            items={result.action_items}
            onProvenance={handleProvenance}
          />
        </motion.div>
        <motion.div variants={sectionItem}>
          <OpenItemsList
            items={result.open_items}
            onProvenance={handleProvenance}
          />
        </motion.div>
      </motion.div>

      {/* Transcript — collapsed by default, opens on provenance click */}
      {transcript && (
        <details
          ref={transcriptSectionRef}
          open={transcriptOpen}
          onToggle={(e) =>
            setTranscriptOpen((e.target as HTMLDetailsElement).open)
          }
          className="group mt-16 pt-8 border-t border-line"
        >
          <summary className="cursor-pointer list-none font-mono text-[12px] tracking-[0.20em] uppercase text-faint hover:text-fg transition-colors flex items-center gap-2 select-none">
            <span
              className="inline-block transition-transform duration-200 group-open:rotate-90"
              aria-hidden
            >
              ›
            </span>
            תמלול מלא
            {highlight && (
              <span className="text-accent normal-case tracking-[0.05em]">
                · מקור מסומן
              </span>
            )}
            {matchFailed && (
              <span className="text-bad normal-case tracking-[0.05em]">
                · מקור לא זוהה
              </span>
            )}
          </summary>
          <div className="mt-5">
            <TranscriptDisplay
              transcript={transcript}
              highlight={highlight}
              open={transcriptOpen}
            />
          </div>
        </details>
      )}
    </div>
  );
}
