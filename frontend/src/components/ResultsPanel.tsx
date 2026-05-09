import { motion } from "motion/react";
import type { MeetingAnalysis } from "../types/contracts";
import { ActionItemsTable } from "./ActionItemsTable";
import { DecisionsList } from "./DecisionsList";
import { OpenItemsList } from "./OpenItemsList";
import { ParticipantsList } from "./ParticipantsList";
import { SummarySection } from "./SummarySection";

// Stagger result sections — each fades + rises in sequence. Apple System
// Settings panes use the same 80ms cadence.
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

interface Props {
  result: MeetingAnalysis;
  transcript: string;
  isDownloading: boolean;
  onDownload: () => void;
  onReset: () => void;
}

export function ResultsPanel({
  result,
  transcript,
  isDownloading,
  onDownload,
  onReset,
}: Props) {
  return (
    <div>
      {/* Header bar — title + actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6 mb-14"
      >
        <h2 className="font-display text-[34px] text-fg font-medium leading-none">
          תוצאות
        </h2>
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

      {/* Optional collapsed transcript */}
      {transcript && (
        <details className="group mb-12">
          <summary className="cursor-pointer list-none font-mono text-[12px] tracking-[0.20em] uppercase text-faint hover:text-fg transition-colors flex items-center gap-2 select-none">
            <span className="inline-block transition-transform duration-200 group-open:rotate-90">
              ›
            </span>
            תמלול מלא
          </summary>
          <p className="mt-4 text-muted text-[15px] leading-[1.85] whitespace-pre-wrap">
            {transcript}
          </p>
        </details>
      )}

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
          <DecisionsList decisions={result.decisions} />
        </motion.div>
        <motion.div variants={sectionItem}>
          <ActionItemsTable items={result.action_items} />
        </motion.div>
        <motion.div variants={sectionItem}>
          <OpenItemsList items={result.open_items} />
        </motion.div>
      </motion.div>
    </div>
  );
}
