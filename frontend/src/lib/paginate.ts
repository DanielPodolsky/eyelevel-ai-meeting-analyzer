// Transcript pagination — splits long meeting transcripts into "pages" of
// roughly equal character count, while respecting natural break points
// (paragraph boundaries when present, sentence boundaries otherwise).
//
// Each page tracks its global character offsets in the original transcript so
// downstream features (provenance highlighting) can map a global match to a
// specific page + local offset.

export interface Page {
  text: string;
  startOffset: number; // index in original transcript where this page begins
  endOffset: number; // index in original transcript where this page ends
}

const DEFAULT_CHARS_PER_PAGE = 1000;

export function paginate(
  transcript: string,
  charsPerPage: number = DEFAULT_CHARS_PER_PAGE,
): Page[] {
  if (transcript.length <= charsPerPage) {
    return [
      { text: transcript, startOffset: 0, endOffset: transcript.length },
    ];
  }

  // Sample data has speaker-turn paragraphs separated by blank lines.
  // Whisper output is one continuous paragraph. Pick the right strategy.
  const hasParagraphs = /\n\n/.test(transcript);
  return hasParagraphs
    ? paginateByParagraphs(transcript, charsPerPage)
    : paginateByChunks(transcript, charsPerPage);
}

function paginateByParagraphs(text: string, max: number): Page[] {
  const pages: Page[] = [];
  let pos = 0;
  let pageStart = 0;
  let pageContent = "";

  while (pos < text.length) {
    let paraEnd = text.indexOf("\n\n", pos);
    if (paraEnd === -1) paraEnd = text.length;

    const paraText = text.slice(pos, paraEnd);

    // If adding this paragraph would overflow the page, flush first.
    if (pageContent.length + paraText.length > max && pageContent.length > 0) {
      pages.push({
        text: pageContent,
        startOffset: pageStart,
        endOffset: pos,
      });
      pageContent = "";
      pageStart = pos;
    }

    if (pageContent === "") {
      pageStart = pos;
    }
    pageContent += (pageContent ? "\n\n" : "") + paraText;
    pos = paraEnd + 2; // skip past the "\n\n" separator
  }

  if (pageContent) {
    pages.push({
      text: pageContent,
      startOffset: pageStart,
      endOffset: text.length,
    });
  }

  return pages;
}

function paginateByChunks(text: string, max: number): Page[] {
  const pages: Page[] = [];
  let i = 0;

  while (i < text.length) {
    let end = Math.min(i + max, text.length);

    // If we're not at the end of text, try to break at the last sentence
    // boundary in the back third of the page so the page doesn't end mid-sentence.
    if (end < text.length) {
      const minBoundary = i + Math.floor(max * 0.7);
      const candidates = [
        text.lastIndexOf(". ", end),
        text.lastIndexOf("? ", end),
        text.lastIndexOf("! ", end),
        text.lastIndexOf(".\n", end),
        text.lastIndexOf("?\n", end),
        text.lastIndexOf("!\n", end),
      ].filter((idx) => idx >= minBoundary);

      if (candidates.length > 0) {
        end = Math.max(...candidates) + 2; // include the punctuation+space
      }
    }

    pages.push({
      text: text.slice(i, end).trim(),
      startOffset: i,
      endOffset: end,
    });
    i = end;
  }

  return pages;
}

// Find which page contains the given highlight offsets. Returns -1 if no page
// fully contains the highlight (shouldn't happen with well-formed input).
export function findPageForOffsets(
  pages: Page[],
  start: number,
  end: number,
): number {
  for (let i = 0; i < pages.length; i++) {
    if (start >= pages[i].startOffset && end <= pages[i].endOffset) return i;
  }
  return -1;
}
