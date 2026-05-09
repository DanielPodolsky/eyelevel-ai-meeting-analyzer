# Tamtzit · תמצית

> **Hebrew meeting analyzer.** Audio in, structured Hebrew analysis out — summary, participants, decisions, action items, open items. RTL-first. Word export with proper bidi rendering. Built for the Eye Level AI screening task (~5h brief; actual ~17–18h with deliberate over-investment in the system prompt and a differentiation pass).

📺 **Walkthrough**

[![Watch the Tamtzit walkthrough on YouTube](https://img.youtube.com/vi/J_TxxnENBaI/hqdefault.jpg)](https://www.youtube.com/watch?v=J_TxxnENBaI)

🌐 **Repo:** https://github.com/DanielPodolsky/eyelevel-ai-meeting-analyzer

---

## Quick demo

You don't need to record anything to try the app — three hardcoded Hebrew sample transcripts ship in the UI. Click **"או נסה דוגמא"** ("or try a sample") on the upload screen and pick one. The samples skip Whisper entirely (`POST /analyze-text`) so you see results in ~5 seconds instead of ~45.

If you want to run the full Whisper pipeline, drag-drop any Hebrew `.mp3`/`.wav`/`.m4a` (≤25 MB) onto the upload zone.

---

## Run locally (<2 minutes)

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.11
- **ffmpeg** ≥ 4 (`brew install ffmpeg` on macOS, `apt install ffmpeg` on Debian) — required by pydub for audio chunking on files >25MB
- **`ANTHROPIC_API_KEY`** ([get one](https://console.anthropic.com))
- **`OPENAI_API_KEY`** ([get one](https://platform.openai.com))

### Backend (terminal 1)

```bash
cd backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # then edit .env with your two API keys
uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Health check: `curl http://127.0.0.1:8000/health` → `{"status":"ok"}`. OpenAPI docs at `/docs`.

### Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`. Open it, drag-drop audio (or click "או נסה דוגמא"), watch SSE events stream in DevTools → Network → EventStream.

---

## What it does

- **Hebrew transcription** via OpenAI Whisper (`language="he"` hint)
- **Structured analysis** via Claude Sonnet 4.6 — five sections: summary · participants · decisions · action items · open items
- **Server-Sent Events** for live progress: `transcribing → summarizing → result → done`
- **Word (`.docx`) export** with proper RTL Hebrew rendering (font slot via `complex_script=True`, paragraph direction via OOXML `w:bidi`)
- **Provenance highlighting** — click any decision/action/open item, the transcript jumps to the source page and highlights the matched line
- **Demo mode** — three Hebrew sample transcripts skip the upload + Whisper round-trip
- **Book-style paginated transcript** with paragraph- and sentence-aware page boundaries (~1000 chars/page)
- **Anthropic prompt caching** — invariant system prompt cached, only the transcript varies per call (verified ~10× cost reduction on cached tokens)
- **Long-meeting support** — files >25MB (Whisper's per-request hard limit) are server-side chunked at silence boundaries via pydub and transcribed in parallel; verified end-to-end on a 31MB / 8-min Hebrew file in ~67s

---

## Architecture decisions

The non-obvious calls, each with the reasoning that drove them.

### 1. Contract-first design (system prompt schema → everything else)

The system prompt's XML output schema (`<summary>`, `<participants>`, `<decisions>`, `<action_items>`, `<open_items>`) was locked in **Phase 1**, before any backend or frontend code was written. Pydantic models (`backend/app/contracts.py`), TypeScript types (`frontend/src/types/contracts.ts`), `.docx` headings (`backend/app/services/export.py`), and the SSE `result` event payload all derive from that single decision.

**Dividend paid mid-build:** Round 8 of prompt iteration found that modal recommendations had no structured destination; the schema needed a fifth section. Round 9 added `<open_items>` at ~30 min cost. The same change *after* Phase 2/3 code existed would have been a 4–6 file refactor across Pydantic, FastAPI, TypeScript, and `.docx` exporter. Locking the contract first turns expensive cross-layer refactors into single-file edits.

### 2. Server-Sent Events for the 30–60s endpoint

The `POST /analyze` pipeline takes ~45–75 seconds (Whisper + Claude). The user has three options:

- **Sync POST + spinner:** 60s of blank loading state, no signal whether the system is working or stuck.
- **Polling on a job-state model:** server-side state to track + clean up + secure.
- **SSE (chosen):** the connection IS the state container — no shared store, no TTL, no cleanup. Status events drive a Hebrew progress pill (*"מתמלל..." → "מסכם..."*) so the user sees real progression.

SSE also gives Asher engineering signal during code review (typed event union, hand-rolled parser handling CRLF correctly per RFC 6202) even when fast-paced during a live demo.

### 3. Lazy `.docx` generation

`.docx` could be generated eagerly during `/analyze` and stored server-side keyed by a `job_id`, OR generated lazily on a separate `POST /export` endpoint when the user clicks Download. Eager would re-introduce the exact server-side state SSE was chosen to avoid.

Lazy preserves the stateless-server architecture end-to-end: `/analyze` emits the `result` event and closes. Frontend holds the `MeetingAnalysis`. When the user clicks Download, the frontend POSTs the JSON back to `/export`, which returns binary. JSON in, binary out, no in-flight state.

### 4. Anthropic prompt caching on the system prompt

The system prompt (`<role>` · `<task>` · `<output_format>` · `<rules>` · `<example>`) is invariant; only `<transcript>` in the user message varies per call. Marking the system block with `cache_control: {"type": "ephemeral"}` caches the stable prefix.

**Verified empirically:** Call 1 returned `cache_create=3549, cache_read=0` (cold cache, 3549-token write). Call 2 returned `cache_read=3549, cache_create=1536, input=3` (warm cache — 100% hit, only 3 tokens of fresh user-message processing). At Anthropic Sonnet 4.6 pricing (`$3` → `$0.30` per million tokens for cache reads vs. regular input), that's ~10× cost reduction on the cached portion plus meaningfully lower latency on every call after the first.

### 5. Silence-aware chunking for files >25MB

OpenAI's Whisper API enforces a hard 25MB per-request ceiling. Real meetings are 30–90+ minutes — easily 30–80MB at typical phone-recording bitrates. The architectural choice was between three options:

- **Refuse uploads >25MB** (the lazy path) — punts the problem to the user with no mitigation.
- **Re-encode to lower bitrate** (compression-only) — works for ≤90 min meetings at 32kbps mono but loses fidelity and breaks at very long recordings.
- **Chunk at silence boundaries + parallel-transcribe** (chosen — OpenAI's own recommended pattern) — preserves fidelity, scales linearly with meeting length, no quality compromise.

`backend/app/services/transcription.py` now has a fast-path/slow-path split. Files ≤25MB go through Whisper in a single call (unchanged behavior). Files between 25MB and 100MB are loaded into pydub, split at silence boundaries (pauses ≥500ms quieter than meeting-mean − 16dBFS), and the resulting chunks are transcribed in parallel via `ThreadPoolExecutor`. Empty chunks (long silence stretches) are skipped, not failed. Concatenation preserves submission order, not completion order — verified empirically on a 31MB Hebrew test file (8:26 duration → 2 chunks → 12,830 chars in 67s).

The 100MB ceiling is a practical pydub-in-memory bound (it loads the entire file into PCM during chunking, which costs ~3GB RAM for a 90-min stereo recording). Beyond 100MB, the next mitigation is a direct ffmpeg subprocess invocation that streams chunks without buffering the full PCM in memory — listed as a future enhancement.

### 6. Single-responsibility backend services

`backend/app/services/` contains three files, each with one job:

- `transcription.py` — bytes in, Hebrew text out. Whisper SDK wrapper. Typed errors at the boundary (`OVERSIZE_FILE`, `EMPTY_AUDIO`, `WHISPER_FAILED`).
- `summarization.py` — text in, `MeetingAnalysis` out. Claude SDK wrapper with prompt caching + try-strict-then-fallback XML parsing for unescaped `&` characters in Hebrew content.
- `export.py` — `MeetingAnalysis` in, `.docx` bytes out. python-docx wrapper with the OOXML `w:bidi` drop-down for RTL paragraphs.

`main.py` is the only file that knows the wire format. Services raise typed exceptions; `main.py`'s SSE generator catches each and translates to `ErrorEvent(code, message)`. Adding a new error code is one change in two places — not five.

---

## Project structure

```
.
├── README.md                       # This file
├── PROCESS.md                      # How the system was planned, how AI was used, where I got stuck, how long it took
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app: POST /analyze (SSE) · POST /analyze-text (demo) · POST /export (.docx)
│   │   ├── contracts.py            # Pydantic models — locked Phase 1.D
│   │   ├── sse_schema.py           # Typed SSE events — locked Phase 1
│   │   └── services/
│   │       ├── transcription.py    # OpenAI Whisper wrapper (Hebrew)
│   │       ├── summarization.py    # Anthropic Claude wrapper (cached)
│   │       └── export.py           # python-docx with RTL bidi
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # 4-state machine: idle → processing → done → error
│   │   ├── api.ts                  # SSE-over-fetch with hand-rolled CRLF/LF parser
│   │   ├── types/contracts.ts      # TypeScript mirror of backend Pydantic
│   │   ├── components/             # 16 single-purpose components (Header, DropZone, ResultsPanel, etc.)
│   │   ├── lib/
│   │   │   ├── fuzzyMatch.ts       # 3-tier provenance matching cascade
│   │   │   └── paginate.ts         # Paragraph/sentence-aware transcript pagination
│   │   └── data/samples.ts         # 3 hardcoded Hebrew demo transcripts
│   ├── package.json
│   └── index.html
└── prompts/
    └── summary_system_prompt.md    # The system prompt + design rationale + iteration log (submission #4 — centerpiece)
```

---

## Tech stack

All versions verified via live dependency lookup at `/own:init` on 2026-05-08, then locked into `requirements.txt` and `package.json`.

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.2.5 |
| Build tooling | Vite | 8.0.10 |
| Language | TypeScript | 6.0.2 |
| Styling | Tailwind CSS | 4.3.0 |
| Animation | motion (formerly Framer Motion) | 12.38.0 |
| Backend framework | FastAPI | 0.136.1 |
| ASGI server | Uvicorn | 0.46.0 |
| File upload | python-multipart | 0.0.27 |
| SSE wire layer | sse-starlette | 3.4.2 |
| Word export | python-docx | 1.2.0 |
| Audio chunking | pydub | 0.25.1 |
| LLM SDK | anthropic | 0.100.0 |
| Speech-to-text SDK | openai | 2.36.0 |
| Language model | Claude Sonnet 4.6 | (API) |
| Speech model | Whisper | (API) |

---

## Known limitations & future enhancements

Honest about what's not in scope (yet) — and the path forward for each.

| Limitation | Mitigation path |
|---|---|
| **100 MB upload ceiling** (pydub PCM-in-memory bound during chunking — files between 25–100MB are silence-chunked and parallel-transcribed; beyond 100MB risks OOM on dev hardware) | Direct ffmpeg subprocess for streaming chunk extraction (no PCM buffering); production deployment can lift the cap by extracting chunks lazily |
| **No speaker diarization** — speakers identified only when explicitly named in speech | AssemblyAI Universal-1 (built-in diarization), WhisperX (self-hosted with diarization), or pre-upload UX hint asking user to list expected participants |
| **Hebrew-only** — UI strings, system prompt rules, and test transcripts all assume Hebrew | UI: ~2.5h with i18next. Analysis: ~12–16h per new language (each language needs its own prompt iteration arc against representative transcripts) |
| **No automated tests** — manual smoke tests only | Unit tests for `lib/fuzzyMatch.ts` + `lib/paginate.ts` (pure functions, easy first targets). Integration tests for the SSE event sequence. Snapshot tests for `.docx` output. |
| **Local demo only** — not deployed | FastAPI behind nginx + frontend on Vercel/Netlify. Out of scope for screening; ~1–2h of work. |
| **Hedge concatenation** — when two speakers contribute consecutive hedges, both are preserved verbatim per prompt rule #8 | Future Phase 1.E iteration could distinguish "hedge followed by commitment" from "two independent hedges" — needs a representative transcript first. |
| **One commit message hedged** — `feat: differentiation pass` is more jargon-y than the [Commit Pitch](PROCESS.md) standard the rest of `git log` follows | Left as-is to avoid force-pushing `main`. Future commits use full Commit Pitch format. |

---

## Documentation map

- **[`PROCESS.md`](./PROCESS.md)** — Live engineering log. Covers the four brief sections: planning · AI usage with real prompt examples · stuck-and-solved log · actual time table. **Submission #3.**
- **[`prompts/summary_system_prompt.md`](./prompts/summary_system_prompt.md)** — Full system prompt + design rationale + 16-round iteration log across 3 Hebrew transcripts. The brief explicitly calls this "a critical part." **Submission #4 — centerpiece.**

---

## Acknowledgments

Built with **[OwnYourCode](https://github.com/DanielPodolsky/ownyourcode)** — my own AI-mentored development framework that enforces *Active Typist* (the developer writes every line) + *Socratic guidance* (max 8 lines of example code) + *Evidence-Based docs lookups* + *6-Gate code review*. The framework's evidence — real prompts, real stuck-and-solved moments, real time spent — feeds into `PROCESS.md`.

Powered by **[Anthropic Claude](https://anthropic.com)** (Sonnet 4.6 for analysis) and **[OpenAI Whisper](https://openai.com)** (transcription).

---

*Built by [Daniel Podolsky](https://github.com/DanielPodolsky) · Eye Level AI screening · 2026-05-09*
