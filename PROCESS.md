# PROCESS.md — Eye Level AI Screening Task

> Live engineering log for the Full-Stack AI-Powered Developer screening assignment from Eye Level AI.
> This document is updated as work happens — not written after the fact.
> A final pass before submission consolidates and polishes for presentation.

**Author:** Daniel Podolsky
**Assignment:** Full Stack AI-Powered Developer screening, Eye Level AI
**Submitted to:** Asher (CTO)
**Stack constraints from brief:** React (frontend), Python (backend), Whisper API, Claude API / LLM
**Started:** 2026-05-07
**Submitted:** _<filled at submission>_
**Total elapsed:** _<filled at submission>_

---

## 0. The Source Materials

### 0.1 Asher's WhatsApp message (Hebrew, original)

> היי דניאל
> כאן אשר ה cto של eye level ai
> היה נעים לשוחח איתך
> מצ״ב המשימה שלך
>
> אני זמין אם יש שאלות או משהו לא ברור
> סומך עליך, בהצלחה!

### 0.2 The brief (translated from Hebrew)

> **Full-Stack AI-Powered Developer — Screening Task** (~5 hours)
>
> **What to build:** a meeting transcription & summarization system. The user uploads an audio file (mp3/wav) and the system returns:
>
> - Full transcription of the recording
> - Meeting summary
> - Participant list (if identifiable)
> - Decisions made
> - Action items
>
> **Technical requirements:** Python (backend), React (frontend), Whisper API or alternative transcription, Claude API or another LLM for processing/summarization. Output displayed in a clean interface. Option to download as a Word file.
>
> **Deliverables:**
>
> 1. **GitHub repo** with working code
> 2. **Live demo** — local with run instructions, or deployed
> 3. **`PROCESS.md`** documenting: how the system was planned, how AI was used in development (with prompt examples), where the developer got stuck and how they solved it, how long it actually took
> 4. **The System Prompt** for the summarization LLM — full prompt + an explanation of the design choices
>
> **What they're looking for:**
>
> - **Smart use of AI** — not blind copy-paste; thoughtful work that shows you know _when_ and _how_ to use tools.
> - **Independent thinking** — taking a brief, making decisions, breaking down problems without hand-holding.
> - **Quality system prompt** — explicitly called _"a critical part."_ They want to see you understand how to communicate with models and extract maximum value.

### 0.3 Reading between the lines

Eye Level AI is an Israeli AI-implementation consultancy that helps Hebrew-speaking organizations adopt AI tools. A meeting-transcription product is _exactly_ the kind of tool they sell to clients — so this assignment isn't generic CRUD; it's adjacent to their real offerings. That informs decisions like:

- **Hebrew-first** is the right default for audio language, system-prompt output, and UI direction.
- **The system prompt is the centerpiece** of the evaluation — most candidates will write a generic "summarize this meeting" prompt; that's the wedge to differentiate on.

---

## 1. How I Planned the System Before Starting

_(Maps to brief requirement: "איך תכננת את המערכת לפני שהתחלת")_

### 1.1 Reading the brief carefully

The brief lists three evaluation axes — but they're not equal weight. The phrase **"זה חלק קריטי"** ("this is a critical part") appears next to the system prompt requirement. That's the primary signal. The other axes (smart AI use, independent thinking) are corroborating; the prompt is the centerpiece.

### 1.2 Constraints I locked in upfront

Before any code, I made these decisions deliberately so they would shape the rest of the work:

- **Hebrew-primarily audio** (Eye Level AI's market is Hebrew-speaking). Drives Whisper's `language="he"` parameter, system-prompt output language, frontend RTL handling, and test data.
- **Local demo only** (not deployed). The brief allows either; deployment would eat 1–2 hours from a 5-hour budget without proportional return for a screening task.
- **System prompt designed BEFORE backend code.** The prompt defines the output schema (whichever tags or keys are used for summary / participants / decisions / action items). Both backend parsing and frontend rendering depend on that shape. Designing the prompt last would force rework. Designing it first makes the rest fall out cleanly.
- **OwnYourCode as the development scaffold.** This is my own AI-mentored development framework (https://github.com/DanielPodolsky/ownyourcode). Active Typist protocol means I write the code; the AI provides Socratic guidance, doc-grounded references, and 6-Gate code review. The framework's evidence — real prompts, real stuck-and-solved moments, real time spent — feeds directly into this `PROCESS.md`.

### 1.3 The planning conversation (with Claude, before any setup)

I treated planning as an interactive design session, not a prompt-and-go. Highlights:

- Claude initially tried to pre-commit to specific stack versions (React 18, Python 3.11, FastAPI, Vite, Tailwind, etc.) directly in the plan. **I pushed back.** OwnYourCode's `/own:init` already establishes stack via MCP-verified version lookup (Context7 + Octocode `packageSearch`); pre-deciding versions in a plan risks shipping stale information. **Lesson:** in any plan for a OwnYourCode project, defer stack decisions to `/own:init`.
- Claude initially asserted that `/own:retro` "generates `PROCESS.md`." I corrected this — `/own:retro` writes patterns/failures/insights into a _global_ learning registry at `~/ownyourcode/learning/`, not into a per-project process doc. **Lesson:** verify before claiming. Read the actual command file at `/Users/lambodol/ownyourcode/.claude/commands/own/retro.md`. The principle of "Evidence-Based Engineering" cuts both ways.
- I directed that `PROCESS.md` be **created at the start and maintained live** throughout the build, not written retroactively at the end. Texture (specific error messages, doc pages that unstuck me, prompts I sent) evaporates within hours; a live log captures the truth.

The full plan (with phases, risks, verification, and OwnYourCode integration) is at `/Users/lambodol/.claude/plans/users-lambodol-downloads-assignment-pdf-shimmying-flute.md`.

#### 1.3.1 `/own:init` session (2026-05-08)

Run on day 2 — post-planning, pre-coding — to convert the plan into structured `ownyourcode/product/` artifacts and a junior-profile mentor configuration. Key decisions made or refined:

- **Problem framing (mine, not Asher's brief):** "Hebrew-speaking team leads at growing Israeli organizations pay twice for missing meeting artifacts — losing participation by taking notes instead of leading, or spending 30+ minutes re-listening at 1.5× to find one decision — because existing tools deliver English summaries that have to be retranslated before sharing with Hebrew-speaking teams." Frames the project as breaking a false choice (lead OR capture), not as a feature gap.

- **Audience locked: employers (Eye Level AI screening).** Every decision — commit messages, README onboarding bar, code organization — is defensible to a hiring manager first. End-user UX is secondary.

- **Definition of Done — 8 checkboxes, three categories:**
  - _Functional:_ Hebrew analysis pipeline (~60s); .docx export with correct RTL Hebrew rendering; edge cases (oversize file / network failure / silent audio) surfaced cleanly.
  - _Quality:_ system prompt documented at `prompts/summary_system_prompt.md` with rationale (submission #4); single-responsibility backend services (transcription · summarization · .docx export, no monolith).
  - _Deliverables:_ `PROCESS.md` covering all 4 brief sections (submission #3); `README.md` gets a stranger from `git clone` to running stack in <2 min; public repo + Loom (60–90s) + Commit Pitch hygiene on every message.

- **Stack confirmed and MCP-verified (Octocode `packageSearch`, 2026-05-08):**
  - Frontend: React 19.2.6 · Vite 8.0.11 · TypeScript 6.0.3 (npm).
  - Backend: FastAPI 0.136.1 · Uvicorn 0.46.0 · python-multipart 0.0.27.
  - LLM/SDKs: anthropic 0.100.0 · openai 2.36.0 (Whisper).
  - Export: python-docx 1.2.0.
  - Versions verified at this date specifically to avoid teaching outdated patterns from training data.

- **Architecture: SSE for the long-running endpoint.** Pipeline takes ~45–75s per request (Whisper + Claude). Claude pushed three challenges (first-time-SSE risk, fallback plan, polling-vs-SSE delta). I defended: total budget is ~30h to Saturday evening, not the brief's 5h heuristic, so 90 min for SSE is 5% of budget; Octocode supplies production patterns so first-time risk drops to "first-time with doc-grounded support"; the streaming infrastructure is engineering signal for code review (Asher reads the repo) even though I'll skip/fast-pace it during the live demo. Risk acknowledged: if SSE fights me at hour 8, fallback to polling on the same job-state model.

- **Profile activated:** Junior · full career extraction · design involvement on · no analogies. Live in `.claude/ownyourcode-manifest.json`; `CLAUDE.md` now imports `@ownyourcode/profiles/junior.md`.

- **Phase 1 specs locked** (via `/own:feature`, same session). `ownyourcode/specs/active/phase-1-lock-the-contract/` contains `spec.md` (5 acceptance criteria · locked schema · 10 codified edge cases), `design.md` (prompt structure · Pydantic + SSE event type definitions · Anthropic doc citations), and `tasks.md` (5 sub-phases: Setup → Draft v0 → Iterate ≥5 → Lock contracts in code → Document rationale).

- **Schema field decision: middle-path `context` on decisions.** After explicit trade-off analysis (text-only vs. always-required vs. middle), `<decision><context>` is included as an **optional** field — populated only when the decision is cryptic without it. The prompt rule enforces "context must reference transcript content, not invented reasoning." Rationale: real Hebrew meetings produce a mix of self-explanatory ("move the weekly meeting to Monday") and cryptic ("ship V2") decisions; forcing one shape on both is wrong either way. The product story for the interview: "the model decides per-decision whether context adds value."

- **Anthropic doc finding (today, 2026-05-08).** All per-topic prompt-engineering pages have been consolidated into ONE living reference: [`claude-prompting-best-practices`](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices). Old per-topic URLs (`system-prompts`, `use-xml-tags`, `multishot-prompting`, `chain-of-thought`, `prefill-claudes-response`) all 301-redirect to it. Critical correction surfaced: **prefilled responses on the last assistant turn are deprecated for Claude 4.6+ models** — this invalidated the pre-research plan to use prefill for forcing structured output. Replacement: rely on XML tag instructions in the system prompt (Claude is trained to respect tags as section markers), or use Anthropic's new Structured Outputs feature. **Lesson:** even within-cutoff knowledge can be stale; WebFetch the current docs before drafting any prompt.

- **Model + config locked for Phase 1 prompt iteration:** `claude-sonnet-4-6` · `effort: medium` · `temperature: 0` · `max_tokens: 4096`. Rationale: balanced quality/cost/latency for structured extraction; deterministic for stable iteration; medium effort gives moderate-reasoning headroom without the verbosity of `high`.

- **Production enhancement queued: Anthropic prompt caching (Phase 2).** The system prompt (`<role>` · `<task>` · `<output_format>` · `<rules>` · `<example>`) is invariant across every call; only `<transcript>` in the user message varies. That's the textbook prompt-caching setup. In Phase 2, mark the system prompt blocks with `cache_control: {"type": "ephemeral"}` so the stable prefix is cached and only the transcript is processed fresh. Wins: ~50% latency reduction on the cached portion (compounds across iteration), meaningful cost reduction at scale, and a real production-thinking signal in `services/summarization.py`. Note for that phase's research: `WebFetch https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching` first to confirm current API surface (TTL options, beta headers, model support) — same Evidence-Based discipline that caught the prefill deprecation. **The contract-first design we locked today enables this** — caching only works because the prompt shape keeps the invariant prefix separate from the variable input.

#### 1.3.2 Phase 1 iteration arc — 16 rounds, 3 transcripts, 1 mid-flight schema expansion (2026-05-08)

The system prompt iterated through 16 rounds across three Hebrew test transcripts representing distinct meeting genres: a product sync (mixed content), a brainstorming meeting (zero decisions / zero action items), and an announcement meeting (decisions-heavy / actions-light). The arc ended with a 19-rule prompt and a 5-section schema validated clean across all three.

The most engineering-significant moments along the way:

- **Round 1 → Round 2: the "park it" tightening.** Baseline output classified a casual _"נחזור לזה"_ tangent as a deferral decision. Real deferrals have at least one concrete commitment marker (specific timeline, specific instruction, or explicit reasoning); casual filler doesn't. Rule update added the marker requirement, retreat dropped on Round 2.

- **Round 3: first-person plural ownership inference.** Sara's _"נצטרך לעדכן את ה-planning"_ was being attributed to Sara as owner just because she was the speaker. Added a rule that first-person plural ("we" / "נצטרך" / "אנחנו") signals collective acknowledgment, not personal commitment — default to `<who>לא צוין</who>` unless the action is later explicitly assigned.

- **Round 4: explicit decision language requirement.** Approval-by-implication ("מצוין", "אוקיי") and pure task-assignment without an explicit verdict were getting promoted to decisions. Tightened rule #2: a decision requires explicit decision language ("אז ההחלטה", "הוחלט", "בוא נלך עם זה"). The `<text>` of a decision must describe the verdict, not the resulting task — _"if the only thing you can write is the action that flows from the decision, there was no separate decision to record."_

- **Round 8 → Round 9: schema expansion mid-iteration.** This is the most consequential moment of the arc. Round 8 was a regression check on `sample_01.txt` — the score was correct on every individual rule, but **information was being lost**: Sara's _"נצטרך לעדכן את ה-planning"_ was correctly stripped from `<action_items>` (modal recommendation, no commitment) but the bounded summary couldn't reliably carry it. The schema didn't have a structured destination for "topic raised but not committed by anyone." Rather than patch with more rules, the right answer was to expand the schema. **Round 9 added `<open_items>` as a fifth section** — the home for surfaced topics, modal recommendations, unresolved questions, and consequential implications of decisions. Real meeting notes have three artifact categories (decisions / action items / open items), and the schema now mirrors that. The change cost ~30 minutes of prompt + spec edits during Round 9; the same change AFTER Phase 2 backend code (Pydantic, FastAPI, `.docx` exporter) and Phase 3 frontend types had been written would have been a 4–6 file refactor. **This is contract-first design paying its full dividend** — schemas are the single decision everything downstream depends on, so getting them right early is dramatically cheaper than fixing them later.

- **Round 11 → Round 12: status-quo / anti-decision marker rule.** The third transcript (`sample_03_announcement.txt`, the CTO announcement meeting) caught an edge case the first two transcripts didn't have. Avi said _"K8s ממשיך, זה לא חלק מההחלטות היום"_ — Claude classified "K8s continues" as a decision, ignoring the explicit anti-decision disclaimer in the same utterance. Added a rule: status-quo affirmations and anti-decision markers describe the **absence** of a verdict; when both signals appear in the same utterance, the anti-decision marker wins. The "three test fixtures > two" instinct paid for itself here — the first two transcripts produced clean output across 10 rounds, but `sample_03` caught the bug on attempt #1. Without that fixture, the prompt would have shipped with the K8s false positive and produced inappropriate output on real announcement meetings in production.

- **Round 14 → Round 16: rules-ripple and the Path B diagnostic.** Adding the Round 12 status-quo rule shifted Claude's attention weights enough to cause a regression on `sample_02`: a first-person modal that had been correctly placed in earlier rounds (_"אני חושבת שצריך לאסוף feedback"_) snuck through into `<action_items>` with Sara as inferred owner. Two paths to fix: (a) tighten the rules and re-test, or (b) test sample_01 first to scope the regression. **Path B saved us from over-engineering.** Sample_01 ran clean with the new rule, proving the regression was sample_02-specific (the first-person-modal pattern). Surgical strengthening to rule #6 (modal recommendations clause) restored correctness across all three transcripts, no further iteration needed.

The arc shape is itself a senior engineering signal: each rule fix targeted a _broader category_ than the surface form of the bug — first-person plural, anti-decisions, modal recommendations, status-quo affirmations. **The rules generalize rather than chase individual surface forms.** Final state: 19 rules, all affirmatively phrased per Anthropic's "tell what to do, not what not to do" principle, validated clean across three meeting genres.

#### 1.3.3 Sub-phase 1.D — translating the locked schema into typed Python (2026-05-08)

After the prompt was locked, sub-phase 1.D translated both schemas into typed Python:

- `backend/app/contracts.py` — Pydantic models for `Decision`, `ActionItem`, `OpenItem`, and the parent `MeetingAnalysis` with all 5 sections
- `backend/app/sse_schema.py` — Pydantic event types for `StatusEvent`, `TranscriptEvent`, `ResultEvent`, `ErrorEvent`, `DoneEvent`, plus the `SSEEvent = Union[...]` type alias

This was Active Typist work — me writing every line of Python from a near-zero starting point. Each Pydantic concept was taught and applied in turn: `BaseModel` inheritance, type hints, `Field(..., description=...)`, `Optional[str]` vs `str`, `default_factory=list` (and the famous mutable-default-argument gotcha it solves), `Literal` types for enum-like fields, relative imports for intra-package references, the `pass` statement for empty class bodies, `Union` types, and Pydantic v2 method signatures (`model_json_schema()`, `model_dump()`).

A real engineering catch happened during 1.D itself: `design.md` had drafted `ResultEvent` with `list[dict]` (untyped, plain dictionaries) for the nested decisions / action_items / open_items lists. The right choice — caught before any code was written against the wrong spec — was `list[Decision]` / `list[ActionItem]` / `list[OpenItem]` using the typed Pydantic classes. Pydantic auto-serializes typed objects to JSON dicts on the wire, so the typed approach gives full type safety in Python AND clean dicts on the wire — best of both. `design.md` was corrected inline, and an explicit design note was added documenting the choice for future readers. **This is exactly the kind of spec-vs-implementation drift that catches errors when you write code soon after specs;** it would have shipped uncaught if implementation had been deferred.

The 1.D verification step (per `tasks.md`):

```bash
python -c "from app.contracts import MeetingAnalysis; print(MeetingAnalysis.model_json_schema())"
```

prints the locked 5-section JSON schema with `$defs` for the nested `Decision` / `ActionItem` / `OpenItem` classes. The Python contracts are now a faithful runtime materialization of the system prompt's `<output_format>` block — when Phase 2 backend parses Claude's XML response, Pydantic will validate the data shape at the boundary before any of it flows downstream to `.docx` export, frontend rendering, or the SSE result event payload. **Fail-fast at the boundary, trust downstream.**

#### 1.3.4 Phase 2 — Backend Pipeline (2026-05-09)

The backend ships as a single FastAPI app at `backend/app/main.py` exposing two endpoints — `POST /analyze` (SSE-streaming Whisper → Claude pipeline) and `POST /export` (stateless `MeetingAnalysis` → `.docx` renderer) — sitting on top of three single-responsibility services (`transcription.py` · `summarization.py` · `export.py`). The SSE wire layer uses `sse-starlette`'s `EventSourceResponse` rather than a hand-rolled `StreamingResponse`; Octocode's production-pattern survey returned 9-of-10 examples using the library, and reinventing the `data: / event: / \n\n` framing inside a 5-hour screening task is the wrong place to spend the budget. The new dependency (`sse-starlette==3.4.2`) is the only addition to the stack locked at `/own:init`.

**Phase 1 contract refinement before any Phase 2 code was written.** During `/own:feature` for Phase 2, the SSE event lifecycle was specified end-to-end: `StatusEvent(transcribing)` → `TranscriptEvent` → `StatusEvent(summarizing)` → `ResultEvent` → `DoneEvent` for the success path; `ErrorEvent(code, message)` instead of `DoneEvent` for failures. That walkthrough surfaced an inconsistency in the locked Phase 1 schema: `StatusEvent.step` was typed as `Literal["transcribing", "summarizing", "exporting"]`, but the chosen architecture (Lazy `.docx` generation on a separate `/export` endpoint) means the runtime never emits `"exporting"` over `/analyze`. The schema reflected an aspirational stage that never fired. **Applying the "types should be a faithful map of the runtime" principle:** the Literal was tightened to `["transcribing", "summarizing"]` before any consumer code was written. Cost: 1 character. Avoided cost: a frontend `switch (event.step)` with a dead `"exporting"` branch in 90 minutes' time. Schema pruning is cheap before consumption, expensive after — same dividend curve as the R8→R9 schema expansion, just running the other direction.

**Lazy `.docx` generation preserves the SSE-as-state-container principle.** The architecture choice on whether `.docx` generation happens inline during `/analyze` (eager) or only on a separate `/export` endpoint triggered by the user click (lazy) was the most consequential design decision in Phase 2. Eager generation would require storing the prepared `.docx` server-side keyed by some `job_id` between when `/analyze` finishes and when the user clicks download — exactly the state-management problem that SSE was chosen to avoid in `/own:init` ("the connection IS the state container, no shared store, no TTL, no cleanup"). Lazy generation keeps `/analyze` stateless: emit the `ResultEvent` payload, close the connection, done. The frontend holds the `MeetingAnalysis` and POSTs it to `/export` when the user clicks download; the server takes JSON in, returns binary out, no in-flight state. The architectures fight each other if you mix them — picking lazy preserves the layered design end-to-end.

**Services raise typed exceptions; `main.py` is the only file that knows the wire format.** Each service defines its own typed error class (`TranscriptionError`, `SummarizationError`, `ExportError`) with a stable English `code` (e.g., `OVERSIZE_FILE`, `WHISPER_FAILED`, `MALFORMED_RESPONSE`) and a Hebrew user-facing `message`. Services raise these at boundary failures (file-size check, OpenAI API error, XML parse failure, Pydantic validation failure); they never construct an `ErrorEvent`. The `event_generator` in `main.py` catches each typed exception type and translates it to `ErrorEvent(code, message)` for the SSE stream. **Single error-translation point** — adding a new error code is one change in two places (the service that raises it, the generator that catches it), not five. This is the *fail-fast at the boundary, trust downstream* principle applied to error handling: each layer enforces its own contract, and the wire-format layer is the single place where exceptions become user-visible.

**Whisper integration.** The `openai` SDK's `audio.transcriptions.create` accepts in-memory bytes via tuple form (`file=(filename, audio_bytes)`), which lets `transcription.transcribe(audio_bytes, filename)` stay pure — no temp files, no disk I/O, just bytes-in / Hebrew-text-out. The 25 MB Whisper limit is enforced before the API call to avoid wasted round-trips, with the typed `OVERSIZE_FILE` error carrying a Hebrew message ("הקובץ גדול מדי — מקסימום 25 מ\"ב"). Empty results from Whisper (silent or non-speech audio) raise `EMPTY_AUDIO`; OpenAI SDK exceptions surface as `WHISPER_FAILED`. The `language="he"` hint goes on every call.

**Claude integration with prompt caching — empirically verified.** The Anthropic SDK call uses the system message as a list of typed blocks (`[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]`) — not a plain string — because `cache_control` only attaches to the block-list form. WebFetch against the Anthropic prompt-caching docs on 2026-05-09 confirmed the current API: no beta header required (caching is GA), 5-minute default TTL, Sonnet 4.6 supported. The system prompt loads once at module-load time from the canonical `prompts/summary_system_prompt.md` (extracted from the first `\`\`\`text` block via regex; the user template comes from the second). XML parsing uses stdlib `xml.etree.ElementTree` (no extra dependency) wrapped in a synthetic `<root>` to handle the 5 sibling sections; Pydantic validation at `MeetingAnalysis` construction is the boundary fail-fast. Smoke test against `sample_01.txt`: **Call 1 returned `cache_create=3549, cache_read=0` (cold cache, wrote a 3549-token entry); Call 2 returned `cache_read=3549, cache_create=1536, input=3` (warm cache — 100% hit on the system prompt, only 3 tokens of fresh user-message processing).** That's the production-thinking signal made concrete: ~10× cost reduction on the cached portion at Anthropic's pricing (`$3 → $0.30` per million tokens for cache reads vs. regular input on Sonnet 4.6), and meaningfully lower latency on every call after the first.

**python-docx RTL Hebrew — the OOXML drop-down.** python-docx 1.2.0 has no public API for setting paragraph direction to RTL; the standard pattern (Octocode multi-repo confirmation) is to drop into the underlying lxml layer and append a `w:bidi` element to the paragraph's `pPr` (paragraph properties): `pPr.append(OxmlElement("w:bidi"))`. The hack is ugly; abstracting it behind a private `_set_paragraph_rtl(paragraph)` helper keeps the rest of `export.py` reading as plain document construction (`_add_rtl_heading`, `_add_rtl_paragraph`). The `.complex_script = True` flag on each run tells Word to use the Hebrew/Arabic font slot rather than the Latin slot. Visual verification on the Phase 2 smoke-test output (real Claude analysis of `sample_01.txt`): H1 title right-aligned, all H2 section headings right-aligned, Hebrew paragraphs reading right-to-left and right-justified, italicized `<context>` sub-lines on cryptic decisions rendered correctly, mixed Hebrew-English code-switching ("social", "PR", "mockups", "onboarding", "distribution channel") preserved inline as Latin script within Hebrew sentences. The bullet glyphs (manual `•` prefix) appear at the visual left rather than the visual right — a known cosmetic of using a manual bullet character inside an RTL paragraph; replacing the manual `•` with Word's native `style="List Bullet"` paragraph style would place bullets at the visual right and is logged as a Phase 4 polish item.

**Smoke-test inventory at Phase 2 completion:** FastAPI app boots cleanly (`uvicorn app.main:app`); `GET /health` returns `{"status": "ok"}`; OpenAPI docs render at `/docs`. Parser tested with synthetic Hebrew XML (3 decisions, 1 action item, 1 open item — clean). Live Claude integration tested with `sample_01.txt` (3 decisions, 4 action items, 3 open items, 4 participants — matches the Phase 1 iteration log expectations for that transcript). Cache hit verified across two consecutive calls. `.docx` exports tested with both synthetic and live data — 37 KB output, RTL Hebrew rendering confirmed visually. Live Whisper integration deferred until Phase 4 (when the test recording is captured); the structural code is in place and the boundary failure paths are wired through to `ErrorEvent`.

### 1.4 Architecture sketch

**Pipeline:**

```
audio file (mp3/wav)
    ↓ multipart upload
FastAPI: POST /analyze
    ↓
Whisper API (language="he", via openai SDK)
    ↓ Hebrew transcript text
Claude API (system prompt + transcript → structured JSON)
    ↓ {summary, participants, decisions, action_items, open_items}
SSE stream → frontend EventSource
    ↓ events: status / transcript / result / error / done
React renders each section (RTL Hebrew)
    ↓ "Download" click
python-docx → .docx with RTL formatting
```

**The contract is the system prompt's output schema.** Backend response shape, frontend rendering, .docx headings, and the SSE `result` event payload are all downstream of one decision: the JSON keys/structure Claude returns. That's why the system prompt is designed first (Phase 1 of the roadmap) — locking it last would force three rounds of refactoring across backend and frontend.

**SSE event schema is the second contract** — designed before any FastAPI streaming code or any EventSource handler is written. Concrete event types finalized during Phase 1; schema lives in a single source-of-truth module and is honored on both ends to keep them in sync.

### 1.5 Edge cases identified upfront

_Filled during `/own:feature`. Anticipated: oversized audio files, non-Hebrew audio, no detectable participants, no clear decisions, empty action items, network failure mid-call, Whisper rate-limits, malformed XML in Claude response._

---

## 2. How I Used AI in the Development Process

_(Maps to brief requirement: "איך השתמשת ב-AI בתהליך הפיתוח (דוגמאות לפרומפטים)")_

This section demonstrates judgment about _when_ and _how_ AI was used — the explicit "smart use of AI" axis the brief calls out.

### 2.1 Tooling

- **OwnYourCode** — my own AI-mentored development framework. Repo: https://github.com/DanielPodolsky/ownyourcode. Slash commands (`/own:init`, `/own:feature`, `/own:guide`, `/own:stuck`, `/own:done`, `/own:retro`) enforce that I write every line; the AI's role is guidance, not generation. Built around four protocols: Active Typist, Socratic Teaching, Evidence-Based, Systematic Debugging. Code passes 6 quality Gates before completion.
- **Claude (Anthropic API + Claude Code)** — primary collaborator for planning, code review, prompt engineering iteration.
- **Context7 MCP** — pulls live official documentation at the moment a library is referenced. Prevents stale-knowledge errors.
- **Octocode MCP** — production code examples for verification; `packageSearch` for current stable versions.
- **Whisper API** — speech-to-text for the actual product feature.
- **Claude API (system-prompted)** — analysis/summarization for the actual product feature.

### 2.2 Where I deliberately used AI vs deliberately didn't

_Filled live as work happens._

Anticipated split:

- **AI-assisted**: refresh on syntax / framework idioms after 2.5 months of miluim, system-prompt iteration, edge-case brainstorming, doc lookups via Context7.
- **Not AI-assisted**: the actual code writing (Active Typist), the high-level architecture, the "is this prompt actually good" judgment — those require ownership.

### 2.3 Real prompt examples (selected from the build)

_Filled live. Each entry will include: the prompt I sent, what the AI returned, what I did with it (accepted, rejected, modified), and why._

Pre-build sample of corrections I issued during planning (illustrating the "judicious use" the brief asks for):

> **Me:** _"Listen, in the stack and overall you've suggested very outdated information (React 18, python 3.11 and more). OctoCode MCP has a research and more tools that you should use that prevent that..."_
>
> **Outcome:** Claude removed all hard-coded version numbers from the plan and deferred stack decisions to `/own:init`'s MCP-verified flow. This is the "smart use of AI" the brief is looking for — not accepting first-pass output, but redirecting the AI to evidence-based grounding.

> **Me:** _"retro doesn't generate PROCESS.md... not a good assumption from you (do not assume at all...) fact check always."_
>
> **Outcome:** Claude read the actual command file at `~/ownyourcode/.claude/commands/own/retro.md`, confirmed `/own:retro` writes to a global learning registry, and corrected three references in the plan. **The principle:** verify against source-of-truth before claiming what a tool does.

> **Me (defending architecture choice during `/own:init`):** I chose SSE over sync-POST and polling for the long-running endpoint. Claude pushed back hard with three challenges: first-time SSE, fallback at hour 4, and what SSE buys you that polling doesn't.
>
> **My defense:** First-time with SSE — yes — but with Octocode supplying production patterns, the real risk profile is "first-time with doc-grounded support," not "first-time alone." Time budget is ~30h to Saturday evening, not the brief's 5h heuristic, so 90 min for SSE is 5% of total. Falling back to polling if SSE breaks is straightforward (same job-state model). What SSE buys: real engineering signal during code review (Asher reads the repo even if I skip/fast-pace the streaming during the live demo).
>
> **Outcome:** SSE locked. Risks documented in §1.3.1. Schema designed before any code, per the locked contract.
>
> **The principle:** AI pushback is a stress test. If I can't defend the architecture in three sentences, I shouldn't ship it. If I can, the AI's job is to keep me honest about the tradeoffs and let me ship.

---

## 3. Where I Got Stuck and How I Solved It

_(Maps to brief requirement: "איפה נתקעת ואיך פתרת")_

Captured live via OwnYourCode's `/own:stuck` framework: **READ → ISOLATE → DOCS → FIX**.

| #             | Symptom                       | What I tried | What worked | Time lost |
| ------------- | ----------------------------- | ------------ | ----------- | --------- |
| _placeholder_ | _filled live as issues arise_ | _ditto_      | _ditto_     | _ditto_   |

---

## 4. How Long It Actually Took

_(Maps to brief requirement: "כמה זמן לקח בפועל")_

| Phase                             | Planned | Actual | Variance | Notes                                                               |
| --------------------------------- | ------- | ------ | -------- | ------------------------------------------------------------------- |
| 0 — Setup & OwnYourCode bootstrap | 20 min  |        |          |                                                                     |
| 1 — `/own:feature` architecture   | 30 min  |        |          |                                                                     |
| 2 — System prompt design          | 60 min  |        |          | Centerpiece — extra time here is deliberate, not slippage.          |
| 3 — Backend                       | 90 min  |        |          |                                                                     |
| 4 — Frontend                      | 60 min  |        |          |                                                                     |
| 5 — E2E + docs                    | 75 min  |        |          |                                                                     |
| 6 — Submit                        | 15 min  |        |          |                                                                     |
| **Total**                         | **~6h** |        |          | Brief estimates 5h; +1h buffer for rust after 2.5 months of miluim. |

---

## Appendix — System Prompt + Design Rationale

The full system prompt and its design rationale live in `prompts/summary_system_prompt.md` (path locked at `/own:init`). Linked here for completeness — that file is **submission #4**.
