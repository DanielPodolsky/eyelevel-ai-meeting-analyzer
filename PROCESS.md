# PROCESS.md — Tamtzit (Eye Level AI Screening)

> Live engineering log for the Full-Stack AI-Powered Developer screening assignment from Eye Level AI.
> Written as work happened — not reconstructed after.

**Author:** Daniel Podolsky
**Submitted to:** Asher (CTO, Eye Level AI)
**Stack constraints from brief:** React (frontend), Python (backend), Whisper API, Claude API
**Started:** 2026-05-07 · **Submitted:** 2026-05-09

---

## How It Started

Asher's WhatsApp message landed mid-week — friendly, brief, with the assignment attached. The brief listed three evaluation axes, but they weren't equal weight. One phrase did all the work: **"זה חלק קריטי"** ("this is a critical part") — attached to the system prompt requirement. That phrase reframed everything. Most candidates would write a generic _"summarize this meeting"_ prompt and move on; the wedge to differentiate on was treating the prompt as the centerpiece, not a footnote.

Eye Level AI is an Israeli AI-implementation consultancy that helps Hebrew-speaking organizations adopt AI tools. A meeting-transcription product is _exactly_ the kind of tool they sell to clients — so the brief isn't generic CRUD; it's adjacent to their real offerings. That informs every default: **Hebrew-first** for audio, prompt output, and UI direction. **Local demo only** (deployment would eat 1–2 hours from the budget without proportional return for a screening task). And **the system prompt designed before any code**, so backend parsing, frontend rendering, and `.docx` headings would all derive cleanly from one locked decision.

I gave myself ~30 hours to Saturday evening — the brief's "5 hours" is a heuristic, not a ceiling. The real budget is "as much as the deadline allows for deliberate over-investment in the centerpiece."

---

## 1. How I Planned It

> _Maps to brief requirement:_ **"איך תכננת את המערכת לפני שהתחלת"**

### The five-phase plan

I sequenced the build so every downstream phase had a locked contract upstream of it:

1. **Lock the contracts** — system prompt's XML output schema + SSE event schema. Both are decisions everything else depends on. Locking them last would force three rounds of refactoring across backend and frontend.
2. **Backend pipeline** — FastAPI with one streaming endpoint (`POST /analyze`) on top of three single-responsibility services (transcription · summarization · `.docx` export). No monolithic handler.
3. **Frontend MVP** — React + Vite + TypeScript with a 4-state machine (idle / processing / done / error), drag-and-drop upload, SSE event consumption, structured RTL Hebrew result panel, Word download.
4. **Differentiation pass** — features that signal taste beyond the brief's checklist. Provenance highlighting, demo mode, paginated transcript, brand identity, polish.
5. **End-to-end + submission** — real Hebrew recording test, edge-case verification, `README.md` + this `PROCESS.md`, Loom walkthrough, push.

### Architecture decisions locked before any code

These shaped everything that followed. Each was a defensible trade-off, not a default:

- **Contract-first design.** The system prompt's XML output schema is the single decision everything downstream depends on — Pydantic models, TypeScript types, `.docx` headings, and the SSE `result` event payload all derive from it. The dividend hit on Round 8 of prompt iteration (see §3.2 below).

- **SSE for the long-running endpoint.** The pipeline takes ~45–75s per request (Whisper + Claude). Polling would re-introduce server-side state (job IDs, cleanup, TTL). SSE makes the connection itself the state container — emit, close, done. _"AI pushback is a stress test"_: when Claude challenged this choice with three counter-arguments during planning, I had to defend it in three sentences. If I couldn't, I shouldn't ship it. I could.

- **Lazy `.docx` generation on a separate `/export` endpoint.** Eager generation during `/analyze` would require storing the prepared `.docx` server-side keyed by some `job_id` — exactly the state-management problem SSE was chosen to avoid. Lazy preserves stateless: JSON in, binary out, no in-flight state.

- **Anthropic prompt caching.** The system prompt is invariant; only `<transcript>` varies per call. That's the textbook caching setup. Marking the system block with `cache_control: {"type": "ephemeral"}` cached the stable prefix. **Verified empirically:** Call 1 returned `cache_create=3549, cache_read=0` (cold, 3549-token write); Call 2 returned `cache_read=3549, cache_create=1536, input=3` (warm, 100% hit, 3 tokens of fresh user-message processing). At Sonnet 4.6 pricing, ~10× cost reduction on the cached portion plus meaningful latency drop on every call after the first.

- **Single-responsibility services raise typed exceptions; `main.py` is the only file that knows the wire format.** Each service raises its own typed error class (`TranscriptionError`, `SummarizationError`, `ExportError`) with a stable English `code` and a Hebrew user-facing `message`. `main.py`'s SSE generator catches each and translates to `ErrorEvent`. _Single error-translation point_ — adding a new code is one change in two places, not five.

### The OwnYourCode discipline

Built on top of [OwnYourCode](https://github.com/DanielPodolsky/ownyourcode) — my own AI-mentored development framework. Three protocols enforce the discipline:

- **Pair-engineering with discipline.** Claude and I worked together on architecture, prompt iteration, and the code itself.
- **Evidence-Based.** Before any library/API call, verify against current docs via Context7 + Octocode MCP. Never rely on memorized versions.
- **6 Gates.** Code passes Ownership, Security, Error-handling, Performance, Fundamentals, Testing review before completion.

---

## 2. How I Used AI

> _Maps to brief requirement:_ **"איך השתמשת ב-AI בתהליך הפיתוח (דוגמאות לפרומפטים)"**

### What I used AI for

- Refresh on syntax / framework idioms after 2.5 months of military reserve duty
- System-prompt iteration — generating predicted outputs to check against expected outputs (Approx 20 rounds)
- Edge-case brainstorming during `/own:feature` spec authoring
- Live documentation lookups via Context7/Octocode MCP to prevent stale-knowledge errors
- Strategic feature prioritization (the S/A/B/C tier matrix in the differentiation pass)
- Workflow scaffolding via [OwnYourCode](https://ownyourcode.dev) — my own framework that imposes spec-driven phases, gate-based code review, and structured retros so AI assistance stays disciplined across a multi-day build instead of devolving into ad-hoc prompt-and-paste

### What I refused to do blindly

AI never made a decision I didn't walk through. Every architectural choice, every prompt rule, every constant, every error message — I asked _why_ before accepting _what_. The SSE-vs-polling debate, the chunking-vs-compression trade-off, the dictionary-as-marketing-copy headline, even small calls like the silence-detection threshold for chunking — each was a discussion with the AI, never a delegation to it. I redirected first-pass output that was wrong, rejected suggestions that didn't survive my mental model of the problem, and rephrased explanations until I could give them back unprompted. **Smart use of AI is the inverse of blind copy-paste** — it's slower in the moment because every _"why?"_ costs a few seconds, and defensible across the entire project because I can explain every line that shipped.

### Four prompts that shaped the build

> **Me (correcting AI during planning):** _"Listen, in the stack you've suggested very outdated information (React 18, Python 3.11). OctoCode MCP has tools that prevent that..."_
>
> **Outcome:** Claude removed all hard-coded versions from the plan and deferred stack decisions to `/own:init`'s MCP-verified flow. _Smart use of AI = redirecting the AI when its first-pass output is grounded in stale data._

> **Me (defending an architecture choice during `/own:init`):** I chose SSE over polling for the long-running endpoint. Claude pushed back with three challenges: first-time-SSE risk, fallback plan, what SSE buys over polling.
>
> **My defense:** First-time risk is mitigated by Octocode supplying production patterns (it's "first-time with doc-grounded support"). The streaming infrastructure is engineering signal during code review even if I skip it during the live demo. Fallback to polling is straightforward.
>
> **The principle:** AI pushback is a stress test. If I can't defend the architecture in three sentences, I shouldn't ship it. If I can, the AI's job is to keep me honest about the tradeoffs.

> **Me (entering the differentiation pass after Phase 3 MVP shipped):** _"Before we continue, I want to focus on the frontend — let's brainstorm features that will surprise the viewer/user UI/UX-wise. I want to be the one Asher picks to get the job and not any other developer."_
>
> **What Claude returned:** ~15 candidate features ranked into four tiers (S = changes evaluation framework, A = strong polish, B = delight without depth, C = would HURT). The reasoning was as valuable as the features: _"differentiation isn't volume of features — three other candidates will probably ship 'drop file → see results → download.' Whatever you ship MORE of is mostly noise. What separates 'this is the one we hire' from 'good enough' is one or two unforgettable moments."_
>
> **What I picked:** S1 (provenance highlighting) + S3 (demo mode) + brand identity + polish. Explicitly skipped Tier-C ideas like animated background blobs, confetti, multi-file queue.
>
> **The principle:** AI is most valuable as a _strategy partner_, not a code generator. Asking _"which features are worth building?"_ and getting back a tiered framework is the kind of cheap thinking AI excels at. **Smart use ≠ delegation; it's amplifying the parts of thinking that are slow when done alone.**

> **Me (after realizing real meetings are 30–90 min, not 5–10):** _"We need to up the limit from 25MB to something else, because meetings are like 30–60 or even 70+ minutes... do a research about this, tell me your findings."_
>
> **What I got:** Confirmed-current research — OpenAI's 25MB ceiling unchanged across all audio models, OpenAI's own recommended pattern is silence-aware chunking + parallel transcribe + concat, AssemblyAI Universal-1 supports Hebrew + diarization as an alternative provider. A four-option trade-off table with deadline-vs-impact scoring for each. I picked the OpenAI-recommended chunking approach (see §3.5 below).
>
> **The principle:** AI for _scoped research with explicit trade-offs surfaced_ is high-leverage. The decision was mine; the homework that informed it was the AI's contribution.

---

## 3. Where I Got Stuck and How I Solved It

> _Maps to brief requirement:_ **"איפה נתקעת ואיך פתרת"**

Captured live via OwnYourCode's `/own:stuck` framework: **READ → ISOLATE → DOCS → FIX**. Five moments rate inclusion.

### 3.1 The CRLF parser bug — the longest single bug in the project

**Symptom.** Frontend stuck on the _"מתחיל"_ status indicator indefinitely while backend logs showed clean ~50-second completion. `curl` through both backend port and Vite proxy port streamed events incrementally; Chrome DevTools' Network tab showed the full response arriving; the EventStream tab parsed events progressively with timestamps. JavaScript console: silent — zero `[SSE]` log lines ever fired.

**What I tried.** Falsified three hypotheses cheaply with DevTools checks: (1) stale HMR — verified Request URL was the post-fix `127.0.0.1:8000/analyze`, ruling out cached old code; (2) service-worker caching — Application tab showed none registered; (3) silent JS error — Console with all severity levels enabled showed nothing. Bypassed Vite proxy entirely with no improvement. At that point I stopped randomly trying fixes and added bisection-style tracer logs at every `await` boundary in `api.ts`.

**What worked.** The traces revealed: chunks WERE arriving in JavaScript progressively, the buffer WAS growing — but the parser's `buffer.indexOf("\n\n")` never matched. Root cause: `sse-starlette` emits **CRLF** (`\r\n\r\n`) between events because that's HTTP-traditional; my parser only matched **LF**. The byte sequence `\r\n\r\n` does not contain `\n\n` as a substring. RFC 6202 says SSE clients MUST accept both — Chrome's built-in `EventSource` parser does, my hand-rolled one didn't. **Fix:** one line, normalize CRLF→LF on `decoder.decode()`.

### 3.2 R8→R9 — the mid-iteration schema expansion

**Symptom.** Round 8 of prompt iteration was a regression check on `sample_01.txt`. The score was correct on every individual rule, but **information was being lost**: Sara's _"נצטרך לעדכן את ה-planning"_ was correctly stripped from `<action_items>` (modal recommendation, no commitment) — but the bounded summary couldn't reliably carry it. The schema didn't have a structured destination for _"topic raised but not committed by anyone."_

**What I tried.** Patching with more rules. Each addition just shuffled the lost information into a different bucket.

**What worked.** Stopping rule-patching and asking the structural question: _what does real meeting output have categories for?_ Three: decisions, action items, **and a third bucket for everything that surfaced but didn't conclude.** Round 9 added `<open_items>` as a fifth section — the home for surfaced topics, modal recommendations, unresolved questions.

### 3.3 The Q&A XML-parser bug

**Symptom.** Demo-mode sample 3 (CTO announcement transcript) failed every run with `MALFORMED_RESPONSE` — but samples 1 and 2 worked. Claude returned HTTP 200; the response body looked correct on visual inspection.

**What I tried.** Logged the raw response body for sample 3 and read it character-by-character. The text contained _"Q&A"_ — Claude faithfully preserved this verbatim per the prompt's _"preserve original wording"_ rule. But `&` is a reserved XML metacharacter; unescaped, it breaks strict parsing.

**What worked.** Try-strict-then-fallback pattern: attempt `ElementTree.fromstring` first (happy path, fast); on `ParseError`, regex-substitute any unescaped `&` characters with `&amp;` and retry. **Common pattern:** any system parsing LLM-generated structured output will hit this exact issue eventually — a content-vs-syntax collision the prompt cannot fully prevent without compromising faithfulness.

### 3.4 React useEffect feedback loop (provenance vs user navigation)

**Symptom.** Provenance highlighting auto-jumped to a decision's source page correctly. But when the user then clicked a different page number, the transcript jumped _back_ to the highlighted page — overriding their navigation. _Repeatedly._

**What worked.** The auto-jump effect listed `currentPage` in its deps and called `setCurrentPage` inside. Every manual page navigation re-triggered the effect, which "fixed" the page back to where the highlight lived. **Fix:** drop `currentPage` from deps so the effect only fires on a NEW highlight, not on subsequent user navigation. Added a 3-line comment defending the missing dependency against future `react-hooks/exhaustive-deps` "well-meaning" fixes.

**Lesson:** when an effect calls `setState`, the state it sets should not be in its own deps unless you explicitly want a feedback loop. Knowing when to override the lint rule is a senior judgment call.

### 3.5 Late-stage chunking pivot — the 25MB → 100MB upgrade

**Symptom.** Mid-Phase-4, while reviewing the README's Known Limitations section, I realized the listed _"25 MB Whisper file limit"_ wasn't a footnote — it was a real-world blocker. Real meetings are 30–90 minutes, easily 30–80MB at typical phone-recording bitrates. Documenting it as a limitation when meetings are _exactly_ the use case is the wrong signal to send Asher.

**What I tried.** Researched current state: OpenAI's 25MB unchanged across all audio models (`whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`), OpenAI's own recommended pattern is silence-aware chunking + parallel transcribe + concat. Surveyed alternatives (AssemblyAI Universal-1 supports Hebrew + diarization; Deepgram pricier and Hebrew unconfirmed).

**What worked.** Picked OpenAI's recommended chunking approach. Refactored `transcription.py` into a fast-path/slow-path split: files ≤25MB go through Whisper unchanged; files between 25MB and 100MB are loaded into pydub, split at silence boundaries (pauses ≥500ms quieter than meeting-mean − 16dBFS), and the resulting chunks are transcribed in parallel via `ThreadPoolExecutor`. Empty chunks (long silence stretches) are skipped, not failed. Concatenation preserves submission order, not completion order.

**Empirically verified end-to-end:** a 31MB / 8:26 Hebrew test file produces 2 chunks, transcribed in parallel, total round-trip ~67s. A 47MB / 25:18 file produces 3 chunks. Order intact, seam clean.

**Sub-bug encountered:** Python 3.14 removed the stdlib `audioop` module that pydub depends on. Fixed via `audioop-lts==0.2.2; python_version >= "3.13"` — a community backport with the same API. **Lesson worth recording:** when Python deprecates a stdlib module, a community usually publishes an `*-lts` package backport. PEP 508 environment markers (`; python_version >= "3.13"`) are the modern way to handle this without runtime version-check hacks.

### 3.6 Multi-column transcript reversal — design course-correction

**Symptom.** First attempt at a "book-style" transcript layout used CSS `columns: 2` inside a scrollable container. Visually beautiful: hairline rule between columns, paragraphs flowing naturally. Functionally: terrible. Reading required scrolling DOWN to bottom of column 1, then UP to top of column 2, then DOWN again.

**What worked.** Admitting the design was wrong. CSS multi-column was _designed for fixed-height containers_ (printed pages, magazine spreads), not scrollable web. Reverted to single column with `max-w-[65ch]` for comfortable reading length, generous leading, Frank Ruhl Libre serif body, and pagination as the ergonomic substitute for "page-flip" — discrete pages of ~1000 chars each, navigated by mono-numbered controls.

---

## 4. How Long It Actually Took

> _Maps to brief requirement:_ **"כמה זמן לקח בפועל"**

| Phase                                   | Planned  | Actual    | Variance  | Notes                                                                                                                                                                                                       |
| --------------------------------------- | -------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Setup, planning, `/own:init`        | 20 min   | ~3 h      | +160 min  | Collaborative design dialog (problem framing, audience, DoD, stack, profile, schema decisions). Front-loaded so later phases moved fast.                                                                    |
| 1 — Lock the contract                   | 60 min   | ~6 h      | +5 h      | **Centerpiece.** 16 iteration rounds across 3 Hebrew test transcripts + R8→R9 mid-flight schema expansion + Pydantic + SSE schema translation. Extra time deliberately invested in the highest-graded axis. |
| 2 — Backend pipeline                    | 90 min   | ~3 h      | +90 min   | FastAPI + three single-responsibility services + Whisper + Anthropic with prompt caching + python-docx OOXML RTL drop-down. Live cache-hit verification.                                                    |
| 3 — Frontend MVP + differentiation pass | 60 min   | ~6 h      | +5 h      | MVP shipped in ~2 h; the differentiation pass (provenance, demo mode, paginated transcript, theme toggle, brand identity, polish) added ~4 h. Includes the ~30 min CRLF bug.                                |
| 4 — E2E + chunking pivot + docs         | 75 min   | ~3 h      | +90 min   | Real-recording smoke test, README authoring, this PROCESS.md, Loom recording, **late-stage chunking refactor (~90 min)** to lift the 25MB ceiling to 100MB.                                                 |
| 5 — Submit                              | 15 min   | ~15 min   | 0         | Push, Hebrew reply to Asher.                                                                                                                                                                                |
| **Total**                               | **~6 h** | **~21 h** | **+15 h** | Brief estimates 5 h; my own `/own:init` budget was ~30 h to Saturday evening.                                                                                                                               |

**Where the time actually went.** ~30% on the system prompt and schema (Phase 1 — the explicit centerpiece per the brief's _"זה חלק קריטי"_), ~30% on the frontend with its differentiation pass (Phase 3 — taste signal), ~15% on the backend pipeline (Phase 2 — necessary plumbing), ~15% on `/own:init` planning (Phase 0 — front-loaded so later phases moved fast), ~10% on docs + chunking pivot + submission (Phase 4 + 5). **The shape is intentional: heavier on the graded axes (prompt + UX taste), lighter on the plumbing.**

---

## Appendix — System Prompt + Design Rationale

The full system prompt and its full design rationale (16-round iteration log, schema decisions, the 19 affirmatively-phrased rules) live in [`prompts/summary_system_prompt.md`](./prompts/summary_system_prompt.md) — **submission #4, the centerpiece** of this evaluation per the brief's _"זה חלק קריטי"_.
