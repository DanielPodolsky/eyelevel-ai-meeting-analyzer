import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchResult } from "../lib/fuzzyMatch";
import { findPageForOffsets, paginate } from "../lib/paginate";
import { Pagination } from "./Pagination";

interface Props {
  transcript: string;
  highlight: MatchResult | null;
  open: boolean;
}

interface ParagraphHighlight {
  paraIndex: number;
  localStart: number;
  localEnd: number;
}

export function TranscriptDisplay({ transcript, highlight, open }: Props) {
  const highlightRef = useRef<HTMLSpanElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const pages = useMemo(() => paginate(transcript), [transcript]);

  // Reset to page 1 whenever the transcript changes (new analysis run).
  useEffect(() => {
    setCurrentPage(0);
  }, [transcript]);

  // When the user clicks a decision, the parent passes us a new `highlight`.
  // Find which page contains that highlight and auto-jump to it.
  //
  // CRITICAL: do NOT include `currentPage` in deps. If we did, this effect
  // would fire whenever the user navigates to a different page, see that
  // `highlight` is still set, and jump back — overriding the user's intent.
  // We only want to auto-jump on a NEW highlight (new decision click).
  useEffect(() => {
    if (!highlight) return;
    const targetPage = findPageForOffsets(pages, highlight.start, highlight.end);
    if (targetPage >= 0) {
      setCurrentPage(targetPage);
    }
  }, [highlight, pages]);

  const currentPageData = pages[currentPage] ?? pages[0];

  // Map the global highlight to local offsets within the current page.
  const localHighlight = useMemo(() => {
    if (!highlight || !currentPageData) return null;
    if (
      highlight.start < currentPageData.startOffset ||
      highlight.end > currentPageData.endOffset
    ) {
      return null;
    }
    return {
      start: highlight.start - currentPageData.startOffset,
      end: highlight.end - currentPageData.startOffset,
    };
  }, [highlight, currentPageData]);

  // Split the current page's text into speaker-turn paragraphs (or just one
  // big paragraph for Whisper output — split returns a single-element array).
  const pageParagraphs = useMemo(
    () => (currentPageData ? currentPageData.text.split(/\n\n+/) : []),
    [currentPageData],
  );

  // Map local highlight to a specific paragraph + offsets within it.
  const highlightInPara = useMemo<ParagraphHighlight | null>(() => {
    if (!localHighlight) return null;
    let consumed = 0;
    for (let i = 0; i < pageParagraphs.length; i++) {
      const start = consumed;
      const end = start + pageParagraphs[i].length;
      if (localHighlight.start >= start && localHighlight.end <= end) {
        return {
          paraIndex: i,
          localStart: localHighlight.start - start,
          localEnd: localHighlight.end - start,
        };
      }
      consumed = end + 2;
    }
    return null;
  }, [pageParagraphs, localHighlight]);

  // Scroll the highlighted span into view AFTER the page has rendered.
  useEffect(() => {
    if (highlight && open && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlight, open, currentPage]);

  // When the user clicks a different page (no highlight), scroll the page's
  // container back to the top so they see the page from its beginning.
  function handlePageChange(page: number) {
    setCurrentPage(page);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!open) return null;

  return (
    <div className="rounded-xl border border-line bg-card-2/40 p-6 md:p-8">
      <div
        ref={scrollAreaRef}
        className="max-h-[560px] overflow-y-auto scroll-clean"
      >
        <div className="max-w-[65ch] mx-auto">
          {pageParagraphs.map((para, i) => {
            const ph = highlightInPara;
            const isHighlighted = ph !== null && i === ph.paraIndex;

            if (isHighlighted && ph !== null && highlight !== null) {
              const before = para.slice(0, ph.localStart);
              const matched = para.slice(ph.localStart, ph.localEnd);
              const after = para.slice(ph.localEnd);

              return (
                <p
                  key={i}
                  className="font-display text-fg text-[17px] leading-[1.9] mb-5 last:mb-0"
                >
                  {before}
                  <motion.span
                    ref={highlightRef}
                    key={`${highlight.start}-${highlight.end}`}
                    initial={{ backgroundColor: "rgba(200, 152, 112, 0)" }}
                    animate={{
                      backgroundColor: "rgba(200, 152, 112, 0.32)",
                    }}
                    transition={{
                      duration: 0.35,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="rounded px-1 -mx-1"
                  >
                    {matched}
                  </motion.span>
                  {after}
                </p>
              );
            }

            return (
              <p
                key={i}
                className="font-display text-muted text-[17px] leading-[1.9] mb-5 last:mb-0"
              >
                {para}
              </p>
            );
          })}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={pages.length}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
