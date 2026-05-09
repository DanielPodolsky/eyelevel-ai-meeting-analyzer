// Hebrew-tolerant fuzzy substring search. Finds the most likely span in
// `haystack` that corresponds to `query`, even when the query has been
// paraphrased by an LLM. Returns null when no reasonable match exists.
//
// Strategy tiers, in order of confidence:
//   1. Exact (case-insensitive) substring match
//   2. First N characters of query as substring
//   3. Word-level: largest contiguous run of query words present in haystack
//
// Each tier accepts more paraphrase tolerance than the previous.
// Position offsets are returned in ORIGINAL haystack indices (not normalized).

export interface MatchResult {
  start: number;
  end: number;
}

export function findBestMatch(
  haystack: string,
  query: string,
): MatchResult | null {
  if (!haystack || !query) return null;
  const cleanQuery = query.trim();
  if (cleanQuery.length < 4) return null;

  const lowerHay = haystack.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();

  // ── Tier 1: exact substring ─────────────────────────────────────────────
  let idx = lowerHay.indexOf(lowerQuery);
  if (idx >= 0) return { start: idx, end: idx + cleanQuery.length };

  // ── Tier 2: longest leading prefix that exists in haystack ──────────────
  // Try progressively shorter prefixes (down to ~25 chars) — handles cases
  // where the LLM appended a clarification at the end of the extracted text.
  for (let n = Math.min(60, cleanQuery.length); n >= 25; n -= 5) {
    const prefix = lowerQuery.slice(0, n);
    idx = lowerHay.indexOf(prefix);
    if (idx >= 0) return { start: idx, end: idx + n };
  }

  // ── Tier 3: word-level n-gram search ───────────────────────────────────
  // Split into words ≥3 chars, look for the longest contiguous run that
  // appears verbatim in haystack. Hebrew tokenizes on whitespace cleanly.
  const queryWords = cleanQuery
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (queryWords.length < 2) return null;

  for (let n = Math.min(6, queryWords.length); n >= 3; n--) {
    for (let i = 0; i <= queryWords.length - n; i++) {
      const phrase = queryWords.slice(i, i + n).join(" ");
      const lowerPhrase = phrase.toLowerCase();
      idx = lowerHay.indexOf(lowerPhrase);
      if (idx >= 0) return { start: idx, end: idx + phrase.length };
    }
  }

  return null;
}
