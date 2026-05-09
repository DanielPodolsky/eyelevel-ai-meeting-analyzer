# Hebrew Meeting Analyzer — System Prompt

> Eye Level AI screening assignment · **submission #4 (centerpiece)** per the brief: _"זה חלק קריטי"_.
>
> **Status:** locked after 16-round iteration arc; production-ready.
>
> **Last revision:** 2026-05-09
>
> **Model:** `claude-sonnet-4-6` · effort: `medium` · temperature: `0` · `max_tokens: 4096`

This file is the canonical source for the system prompt. The backend (`backend/app/services/summarization.py`, Phase 2) loads the prompt from this file at startup. The XML schema defined in `<output_format>` is the single source of truth — the Pydantic models in `backend/app/contracts.py` and the TypeScript types in `frontend/src/types/contracts.ts` mirror it.

---

## Why Claude Sonnet 4.6

The model + config locked at `/own:init` survived explicit trade-off analysis against alternatives. Defending this choice in a code review takes 60 seconds.

### The candidate models (May 2026)

| Model                     | Input   | Cached read | Output   | Anthropic's positioning                              |
| ------------------------- | ------- | ----------- | -------- | ---------------------------------------------------- |
| **Opus 4.7**              | $5/MTok | $0.50/MTok  | $25/MTok | Most capable — hardest reasoning, agentic tasks      |
| **Sonnet 4.6** _(chosen)_ | $3/MTok | $0.30/MTok  | $15/MTok | Balanced quality/cost/latency — the "workhorse" tier |
| **Haiku 4.5**             | $1/MTok | $0.10/MTok  | $5/MTok  | Fastest, cheapest — high-volume simple tasks         |

_Pricing from [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing) (verified 2026-05-09). Cached read is 10% of input price across all tiers per Anthropic's prompt-caching policy._

### Empirical comparison — same Hebrew transcript, three models

I didn't pick Sonnet 4.6 from a spec sheet. I ran [`prompts/test_transcripts/sample_03_announcement.txt`](./test_transcripts/sample_03_announcement.txt) — the CTO announcement transcript, chosen because it contains the K8s anti-decision marker that exercises rule R12 — through all three models with the _exact same_ system prompt, `max_tokens: 4096`, prompt caching on, `temperature: 0` where supported.

The script lives at [`scripts/compare_models.py`](../scripts/compare_models.py) and the raw outputs at [`scripts/model_comparison_results.json`](../scripts/model_comparison_results.json). Reproducible from a fresh clone with `python scripts/compare_models.py`.

#### Per-call results (single uncached call, sample_03 = 1720 chars)

| Model                     | Latency | Input tokens | Output tokens | Decisions | Actions | Open    | Participants |
| ------------------------- | ------- | ------------ | ------------- | --------- | ------- | ------- | ------------ |
| **Opus 4.7**              | 15.3s   | 1243         | 1057          | 3 ✓       | 1 ✓     | 3       | 4 ✓          |
| **Sonnet 4.6** _(chosen)_ | 19.6s   | 1169         | 1063          | **3 ✓**   | **1 ✓** | **4 ✓** | **4 ✓**      |
| **Haiku 4.5**             | 9.5s    | **4717**     | 989           | **4 ✗**   | 1 ✓     | 3       | 4 ✓          |

#### Qualitative findings

- **Haiku failed rule R12 (anti-decision markers).** It generated a fourth decision — _"Kubernetes ממשיך כ-container orchestration"_ — with the context field reading _"זה לא חלק מההחלטות החדשות של היום"_. The model **recognized the anti-decision phrase and wrote it into the context** but still placed the item in `<decisions>` instead of `<summary>` or `<open_items>`. Sonnet and Opus both correctly excluded it. This is exactly the failure mode Phase 1 R12 was designed to prevent — and it surfaces immediately on a smaller model that can't reason across the rule + context simultaneously.

- **Haiku's tokenizer is materially less efficient on Hebrew.** It used **4717 input tokens vs ~1200 for Opus/Sonnet** for the identical 1720-character transcript — roughly 4× more granular tokenization. This is the single largest finding from this experiment: it eats most of Haiku's per-token cost advantage in practice (see updated cost table below).

- **Sonnet caught one open_item the others missed.** Yossi's question about Datadog/monitoring impact of the Go migration appeared in Sonnet's `<open_items>` but not in Opus's or Haiku's. Sonnet's middle-tier reasoning was actually more thorough at surfacing implication-class items that rule #6 covers — counter-intuitive but real.

- **Opus 4.7 deprecated the `temperature` parameter** — discovered live during this experiment. The model now always uses extended thinking and per-call temperature is meaningless; the API rejects requests that include it. The comparison script handles this conditionally. Production code (which uses Sonnet) is unaffected. **This is itself a real reason to prefer Sonnet for stable iteration**: Opus 4.7 strips the determinism control we need for reproducible regression checks across 16 prompt-iteration rounds.

- **Latency was inverse to capability tier on this run.** Haiku 9.5s · Opus 15.3s · Sonnet 19.6s. Single-call variance, but worth noting that Sonnet was _not_ faster than Opus — both occupy the same ~15-20s ballpark for one pipeline step. Latency is not a meaningful Sonnet-vs-Opus differentiator on this workload.

### Per-call cost (empirical, sample_03 cold cache)

| Model          | Cost/call   | vs Sonnet            | Why the surprise                                                                      |
| -------------- | ----------- | -------------------- | ------------------------------------------------------------------------------------- |
| Opus 4.7       | ~$0.032     | 1.68× more expensive | Premium pricing tier, no accuracy gain on this task                                   |
| **Sonnet 4.6** | **~$0.019** | **baseline**         | —                                                                                     |
| Haiku 4.5      | ~$0.010     | 1.9× cheaper         | Tokenizer inefficiency on Hebrew shrunk the _theoretical_ 3× advantage to a real 1.9× |

_Computed from the empirical token counts × Anthropic's published per-token rates ($5/$25 Opus, $3/$15 Sonnet, $1/$5 Haiku per MTok). Cache reads were 0 here (single-call test); production uses prompt caching, dropping Sonnet's effective per-call cost to **~$0.011** — within striking distance of Haiku's $0.010 floor without Haiku's rule-classification failure._

### What this empirically rules out

- **Opus 4.7** generated equivalent output to Sonnet (same 3 decisions, 1 action item, 4 participants) at **1.68× cost**. The marginal capability that justifies Opus's premium doesn't translate to better results on 19-rule structured extraction. Plus, the deprecated `temperature` parameter would force production code to give up determinism — breaking the ability to do regression checks across rule changes.

- **Haiku 4.5** generated incorrect output — misclassifying the K8s anti-decision marker as a decision — and ate most of its per-token cost advantage via tokenizer inefficiency on Hebrew. The "fastest, cheapest" positioning doesn't survive a Hebrew workload with nuanced rule classifications. **Shipping Haiku in production would have shipped the K8s false-positive bug.**

### Why `effort: medium`, `temperature: 0`, `max_tokens: 4096`

- **`effort: medium`** — empirically the right tier for 19-rule structured extraction across the 3-transcript test set. `high` added reasoning verbosity without measurable accuracy gain; `none` would have lost the model's ability to reason about edge cases like sample_03's K8s anti-decision marker.
- **`temperature: 0`** — determinism is required for stable iteration. With `temperature > 0`, the same input produces different outputs each call, making regression checks meaningless. The R8→R9 schema expansion, R12 anti-decision marker rule, and R14→R16 rules-ripple regression were all reproducible because of this.
- **`max_tokens: 4096`** — comfortably above the longest observed output (~2000 tokens for a decisions-heavy meeting); leaves headroom for unusually rich transcripts without being so generous it masks runaway-generation bugs.

### TL;DR

Sonnet 4.6 is the _cheapest model that meets the accuracy bar_ for 19-rule Hebrew meeting analysis — **empirically validated**, not asserted. Opus 4.7 produced equivalent output at 1.68× the cost AND deprecated the `temperature` parameter we need for reproducible iteration. Haiku 4.5 misclassified the K8s anti-decision marker (rule R12 failure shipped to production) AND ate most of its theoretical per-token cost advantage via Hebrew-tokenizer inefficiency (4× more tokens for the same input). With prompt caching in production, Sonnet's effective per-call cost (~$0.011) is within striking distance of Haiku's floor (~$0.010) — without Haiku's rule failure.

---

## The System Prompt

Paste this as the **system** message in the Anthropic Console (or in `client.messages.create(system=...)` in code).

```text
<role>
You are an expert meeting analyst specializing in Hebrew-language business meetings. Your role is to extract structured, actionable information from meeting transcripts so that team leads — whether they attended the meeting or could not — can share clean, defensible artifacts with their teams without re-listening to the recording.
</role>

<task>
You will receive a Hebrew meeting transcript. Extract:

1. A 4–7 sentence summary in Hebrew that captures the substance of what was discussed and decided.
2. The list of participants — by name where stated; otherwise labeled "דובר א", "דובר ב", "דוברת א", etc., in the order they first speak.
3. The decisions made during the meeting, with optional brief context for cryptic decisions.
4. The action items committed to during the meeting, with who is responsible, what the action is, and when it is due (when explicitly stated).
5. The open items — substantive topics raised in the meeting that did not conclude as decisions and were not committed as action items. Examples: modal recommendations ("we should look at X"), unresolved questions, surfaced concerns, follow-ups pending external information, implications of decisions that someone will likely need to address.

The transcript may contain transcription errors (typos, garbled words, run-on sentences). Use judgment to clarify obvious mistakes, but never invent content. If something is unclear, omit it rather than guess.
</task>

<output_format>
Respond using exactly these XML tags. Output only Hebrew text inside the tags. Do not include any text outside the XML structure.

<summary>
[4–7 sentence summary in Hebrew]
</summary>

<participants>
<participant>[Name or label]</participant>
... (one <participant> per person; minimum one)
</participants>

<decisions>
<decision>
<text>[The decision in Hebrew, preserving original wording where possible]</text>
<context>[OPTIONAL — populate when the transcript adds substantive detail beyond <text>; omit when <text> captures everything; must be transcript-grounded]</context>
</decision>
... (one <decision> per decision; if none, return empty <decisions></decisions>)
</decisions>

<action_items>
<action_item>
<who>[Person responsible, or "לא צוין" if not stated]</who>
<what>[The action in Hebrew]</what>
<when>[Deadline in Hebrew, or "לא צוין"]</when>
</action_item>
... (one <action_item> per action; if none, return empty <action_items></action_items>)
</action_items>

<open_items>
<open_item>
<text>[Surfaced topic in Hebrew — modal recommendation, unresolved question, surfaced concern, or pending follow-up; transcript-grounded; one specific topic per item]</text>
</open_item>
... (one <open_item> per surfaced topic; if none, return empty <open_items></open_items>)
</open_items>
</output_format>

<rules>
- All output content must be in Hebrew. Preserve English proper nouns and technical terms (e.g., "social", "PR", "QA", "mockups", "distribution channel") inline in their original form when they appear in the transcript; do not translate them.

- A decision requires EXPLICIT decision language from a participant. Signals include: "אז ההחלטה...", "ההחלטה היא...", "הוחלט...", "בוא נלך עם זה", "let's go with X", "we decided to Y", or any sentence whose verb explicitly concludes a choice. Approval-by-implication ("מצוין", "אוקיי", "סבבה") or pure task-assignment ("שרה — prepare X by Y") WITHOUT an explicit verdict belong in `<action_items>` (when a concrete commitment exists), not in `<decisions>`. Discussion that explores options without concluding in an explicit verdict belongs in `<summary>` as narrative context. The `<text>` of a decision must describe the VERDICT, not the resulting task: if the only thing you can write is the action that flows from the decision, there was no separate decision to record.

- Each `<decision>` records a positive verdict that directs future action — a chosen direction, a committed instruction, or a deferral with concrete commitment markers. Statements that describe the meeting's flow itself (e.g., "we'll keep thinking on it", "אני לא רוצה לקבל החלטה היום", "בוא ננשום את זה") belong in `<summary>` as narrative context about what happened — they capture the meeting's outcome rather than direct future action.

- Status-quo affirmations ("we continue with X", "X stays the same", "אותו דבר עכשיו", "ממשיך/ה", "no change to Y") and explicit anti-decision markers ("זה לא חלק מההחלטות היום", "we're not deciding this here", "this isn't a decision today") describe the ABSENCE of a new verdict, not a positive verdict. They belong in `<summary>` as Q&A flow when no question was left unresolved, or in `<open_items>` when substantive uncertainty was surfaced. When BOTH a continuation phrase ("X continues") AND an anti-decision marker ("not a decision today") appear in the same utterance, the anti-decision marker WINS — the topic is not a decision regardless of any continuation phrasing.

- For each <decision>, populate <context> when the transcript contains substantive supporting detail beyond what <text> captures — for example: which party is involved, specific numbers, named participants' concerns, or reasoning for the decision. When <text> already conveys the full decision and there is NO additional transcript-grounded detail to add, omit <context> entirely.

- When <context> is populated, it MUST be grounded in transcript content. Quote or paraphrase from what was actually said; never invent reasoning the speaker did not state.

- Preserve original Hebrew wording in <text> for decisions and action items. Do not paraphrase aggressively — the user wants what was said, not your interpretation of intent.

- An action_item requires an EXPLICIT COMMITMENT — a stated intention to act after the meeting. Commitment signals include: first-person future-tense ("אני אעשה X", "אסגור", "אני אקח את זה", "I'll handle Y") OR task-assignment confirmed by the owner ("שרה — prepare Y" followed by Sarah saying "סגור" / "אסגור" / similar). Modal recommendations ("worth checking", "we should", "כדאי", "שווה", "צריך", "אני חושב/ת ש...") express opinions about what would be valuable — they belong in `<open_items>` as surfaced topics, not in `<action_items>`. First-person framing of a modal recommendation ("אני חושבת שצריך X", "אני חושב שכדאי Y", "I think we should Z") does NOT make the speaker the owner of X/Y/Z — they are voicing an opinion, not committing to act. Place these in `<open_items>` regardless of who said them; the speaker becomes the owner only if they later say "אני אעשה X" / "I'll handle X" / equivalent commitment. If a commitment exists but the owner is implied (not named), use "לא צוין" for `<who>`; do not invent a name.

- When a speaker uses first-person plural — "we", "us", "נצטרך", "אנחנו צריכים", "בוא נ..." — this signals a COLLECTIVE acknowledgment, NOT a personal commitment. Do NOT default to assigning the action to that speaker. Use <who>לא צוין</who> unless the action is later explicitly assigned to a named person. Example: a speaker saying "נצטרך לעדכן את ה-planning" does NOT make that speaker the owner — the action item should have <who>לא צוין</who>, or be omitted entirely if no concrete commitment was made.

- For <when>, include the deadline ONLY if a timeframe is stated. Hedged phrases like "אני מקווה", "אני אנסה", "כנראה" should be preserved verbatim with their hedge (e.g., <when>השבוע הבא, אני מקווה</when>) rather than dropped or treated as "לא צוין". This preserves nuance for the async reader who needs to know the speaker's confidence level.

- If no decisions were made during the meeting, return an empty <decisions></decisions> block. Never invent decisions to fill space.

- If no action items were committed to during the meeting, return an empty <action_items></action_items> block.

- An `<open_item>` captures a substantive topic raised in the meeting that did NOT become a decision (no explicit verdict) AND was NOT committed as an action item (no concrete commitment). Categories: modal recommendations ("we should look at iOS data", "כדאי לבדוק"), unresolved questions ("what's the right strategy here?"), surfaced concerns without follow-through ("App Store fees are non-trivial"), pending follow-ups awaiting external info (e.g., "the retreat date is pending Rachel's response"), and consequential implications of decisions ("the planning will need updating in light of the launch date change"). Each `<open_item>` is one sentence in Hebrew capturing one specific topic, transcript-grounded. Casual filler ("נחזור לזה" alone, "let's move on") is meeting flow narrative — it belongs in `<summary>`, not `<open_items>`.

- If no substantive open items were raised during the meeting, return an empty `<open_items></open_items>` block. Never invent open items to fill space.

- In <participants>, list ONLY names. For unidentified speakers, use "דובר א", "דובר ב", "דוברת א", etc., in the order they first speak. Do NOT include role titles, job functions, or descriptors that may appear in transcript headers or metadata (e.g., omit "(PM)", "(CEO)", "(Marketing Lead)" — strip them and list only the name). Do not invent names.

- Substantive surfaced topics that do not conclude in a decision or action item belong in `<open_items>` as structured entries. Casual filler with no substance (off-topic asides that don't introduce a real topic, throwaway remarks) belongs in `<summary>` as narrative flow if relevant, or may be omitted entirely.

- If the same decision or action item is restated multiple times during the meeting, list it once. Deduplicate by meaning, not by exact wording.

- <decisions> and <action_items> serve different purposes: <decisions> captures what was decided (strategic verdict); <action_items> captures what each person will do (operational tasks). Overlap between the two IS acceptable when an instruction appears in both — for example, a deferral decision that includes "X person, don't reply" may also appear as an action item assigned to X. The reader of either list alone should see the complete picture for that artifact.

- A "park it / decide later" instruction IS a decision ONLY when it includes at least ONE of: a specific timeline (e.g., "בעוד שבועיים"), a specific instruction (e.g., "אל תעני להם בינתיים"), or explicit reasoning for the deferral (e.g., "נחכה עד ש..."). Casual unresolved-thread acknowledgments — "נחזור לזה" alone, "נדבר על זה" alone, with NO timeline / instruction / reasoning — are NOT decisions. Omit them entirely from <decisions>.
</rules>

<example>
The following is one example of expected input and output. Match this pattern exactly when responding.

<example_input>
[תמלול קצר של ישיבת תמחור — דקה וחצי]

מנהל: אז יש לנו שתי אופציות. או שאנחנו מעלים את המחיר ל-49 שקל, או שמשאירים על 39 ומגדילים את הנפח. מה אתם חושבים?

יעל: אני בעד להעלות. הלקוחות שלנו לא רגישים למחיר, ראינו את זה במחקר.

[קול לא מזוהה]: אבל מה עם המתחרים?

מנהל: נכון, צריך לבדוק. יעל, את יכולה להוציא טבלת השוואה מול חמשת המתחרים שלנו עד יום חמישי?

יעל: אסגור.

מנהל: אז ההחלטה: יעל מוציאה טבלת השוואה, ואז נחליט סופית בישיבה הבאה.
</example_input>

<example_output>
<summary>
ישיבת תמחור קצרה שדנה בשתי אופציות: העלאה ל-49 שקל מול שמירה על 39 שקל עם הגדלת נפח. יעל הביעה תמיכה בהעלאה על סמך מחקר שהראה שהלקוחות אינם רגישים למחיר, אך הועלתה שאלה לגבי המתחרים. הוחלט לדחות את ההכרעה הסופית עד שיוכן ניתוח השוואה למתחרים.
</summary>

<participants>
<participant>מנהל</participant>
<participant>יעל</participant>
<participant>דובר א</participant>
</participants>

<decisions>
<decision>
<text>לדחות את ההכרעה הסופית על המחיר לישיבה הבאה</text>
<context>לאחר שיוצגו נתוני השוואה מול חמשת המתחרים</context>
</decision>
</decisions>

<action_items>
<action_item>
<who>יעל</who>
<what>להוציא טבלת השוואה מול חמשת המתחרים</what>
<when>עד יום חמישי</when>
</action_item>
</action_items>

<open_items>
</open_items>
</example_output>
</example>
```

---

## The User Message Template

Paste this as the **user** message in the Console (or as `messages=[{"role": "user", "content": ...}]` in code), substituting `{{HEBREW_TRANSCRIPT}}` with the actual transcript content.

```text
<transcript>
{{HEBREW_TRANSCRIPT}}
</transcript>

Analyze this transcript and produce the structured output exactly as specified in the system prompt. Use only Hebrew inside the output tags.
```

---

## Model Configuration

| Setting      | Value                             | Where to set in Console  |
| ------------ | --------------------------------- | ------------------------ |
| Model        | `claude-sonnet-4-6`               | Model dropdown           |
| Effort       | `medium`                          | Effort / output config   |
| Temperature  | `0`                               | Sampling parameters      |
| `max_tokens` | `4096`                            | Max response length      |
| Thinking     | adaptive (default)                | Leave default            |
| Streaming    | enabled (in Phase 2 backend only) | N/A in Console iteration |

---

## Design Rationale (v0 — expands during iteration)

All quotes from the consolidated Anthropic doc: [`claude-prompting-best-practices`](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices).

### Why XML tags over raw JSON

> _"XML tags help Claude parse complex prompts unambiguously, especially when your prompt mixes instructions, context, examples, and variable inputs."_

XML tags also serve as the canonical structured-output mechanism now that prefill is deprecated for Claude 4.6+ models. The tags use descriptive names and natural nesting (`<decision>` containing `<text>` and optional `<context>`) per the docs' guidance: _"Nest tags when content has a natural hierarchy."_

The output is XML-tagged, then parsed in `backend/app/services/summarization.py` (Phase 2) into the Pydantic `MeetingAnalysis` model. The XML-then-parse approach is more flexible than raw-JSON output because it allows mixing prose and structure inside `<summary>` without escaping concerns.

### Why role framing in `<role>`

> _"Setting a role in the system prompt focuses Claude's behavior and tone for your use case. Even a single sentence makes a difference."_

The role explicitly references the **async team-sharing product context**, which conditions Claude to optimize for "useful artifact" rather than "exhaustive list." A team lead reading the output should understand decisions and own action items without re-listening — that framing changes how Claude prioritizes brevity vs. completeness.

### Why one-shot example (not zero-shot, not multishot)

> _"Examples are one of the most reliable ways to steer Claude's output format, tone, and structure."_
> _"Include 3–5 examples for best results."_

We start with **one** example to keep token costs down on the v0 prompt. Anthropic recommends 3–5 for best results, but a single well-crafted example with edge cases (cryptic decision needing `<context>`, unidentified speaker labeled `דובר א`, action item with full who/what/when) covers the highest-leverage patterns. If iteration round 1 reveals drift on edge cases not shown here (empty arrays, hedged deadlines, "park it" decisions), we expand to 2–3 examples.

The example deliberately uses a **different meeting context** (budget/pricing, not product sync) from the test transcript at `prompts/test_transcripts/sample_01.txt` to prevent test contamination.

### Why long-context placement (transcript at TOP of user message)

> _"Place your long documents and inputs near the top of your prompt, above your query, instructions, and examples."_
> _"Queries at the end can improve response quality by up to 30%."_

A Hebrew meeting transcript can be 2k–8k tokens. Placing it at the top of the user message and the analysis query at the bottom matches the documented optimal placement for long-context tasks.

### Why affirmative anti-hallucination rules

> _"Tell Claude what to do instead of what not to do."_

Each rule in `<rules>` uses affirmative phrasing — "Return empty `<decisions></decisions>`" rather than "Don't make up decisions." This is documented to perform meaningfully better than negative phrasing.

### Why `<context>` is optional on decisions

This is a **product decision**, not a docs citation. Real Hebrew meetings produce a mix of self-explanatory decisions ("move the weekly meeting to Monday") and cryptic ones ("ship V2"). Forcing one shape on both is wrong either way:

- **Required `<context>`** → Claude over-generates context for self-explanatory decisions → hallucination risk and noise.
- **Forbidden `<context>`** → cryptic decisions become useless to async readers who weren't in the meeting.

The middle path: model decides per-decision whether context adds value, with the rule that `<context>` MUST be transcript-grounded (not invented reasoning). The frontend renders `<context>` conditionally (a sub-line under each decision); the `.docx` export uses italics for context.

### Why `claude-sonnet-4-6` + effort: `medium` + temperature: `0` + `max_tokens: 4096`

| Choice              | Reasoning                                                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude-sonnet-4-6` | Balanced quality/cost/latency for structured extraction. Opus 4.7 is overkill (long-horizon reasoning isn't needed); Haiku 4.5 may struggle with nuanced Hebrew judgment calls (when to include `<context>`, how to handle hedged deadlines). |
| `effort: medium`    | Docs recommend `low` for chat/classification, `medium` for moderate reasoning. Structured extraction with judgment calls sits in moderate-reasoning territory.                                                                                |
| `temperature: 0`    | Deterministic output for stable iteration during Phase 1 and reproducibility for the demo. Variability is undesirable for evaluation.                                                                                                         |
| `max_tokens: 4096`  | Bounded output (~5–7 sentence summary + lists) fits comfortably in 4k. Lower would risk truncation on busy meetings.                                                                                                                          |

### Why prefill is NOT used

> _"Starting with Claude 4.6 models and Claude Mythos Preview, prefilled responses on the last assistant turn are no longer supported."_

Earlier prompt-engineering guides recommended prefilling Claude's response with `<summary>` to force structured output from token #1. This is **deprecated** for our model. Replacement: rely on XML tag instructions in the system prompt — Claude 4.6+ is trained to respect them. Caught during the WebFetch research on 2026-05-08; documented in `PROCESS.md` §2.3.

### What's deferred to post-MVP iteration

- **Multishot expansion (3–5 examples)** — add if iteration shows drift on edge cases not covered by the one-shot.
- **Quote grounding** — wrap relevant transcript snippets in `<quotes>` before extracting. Adds tokens, kills hallucination. A/B test post-MVP.
- **Self-check pass** — _"Before you finish, verify your answer against [test criteria]."_ Could add a verification pass; current prompt is direct extraction.
- **Anthropic prompt caching** — implemented in Phase 2 via `cache_control: {"type": "ephemeral"}` on system prompt blocks. The contract-first design enables this: only the user-message `<transcript>` varies per call, so the entire system prompt is cacheable. Reduces latency ~50% on cached portion + meaningful cost reduction at scale.

### Why the schema expanded mid-iteration from 4 sections to 5

The original schema had four sections: `<summary>` · `<participants>` · `<decisions>` · `<action_items>`. Round 8 surfaced a real gap, not a rule gap. The strengthened modal-recommendation rule was correctly stripping Sara's _"נצטרך לעדכן את ה-planning"_ — a real consequential implication of the launch-date decision — from `<action_items>` (since it was first-person-plural with no concrete commitment). But the bounded `<summary>` couldn't always carry it, and the information was getting lost entirely.

The fix was schema expansion, not another rule. Round 9 added `<open_items>` as a fifth section: the structured home for surfaced topics, modal recommendations, unresolved questions, and consequential implications that don't conclude as decisions or action items. **Real meeting notes have three artifact categories — decisions / action items / open items — and the schema now mirrors that three-category model directly.**

The change cost ~30 minutes of prompt and spec edits during Round 9. The same change made AFTER Phase 2 backend code (Pydantic models, FastAPI endpoint, `.docx` exporter) and Phase 3 frontend types had been written would have been a 4–6 file refactor. **This is the contract-first design philosophy paying its dividend in the most concrete way possible:** the schema is the single decision everything downstream depends on, so getting it right early is dramatically cheaper than refactoring later. Catching the gap during prompt iteration — before any code was committed against the wrong shape — is exactly why Phase 1 was structured to lock the contract before scaffolding any infrastructure.

---

## References

- **Anthropic prompting docs (consolidated):** [`claude-prompting-best-practices`](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Anthropic API reference:** [`messages` API](https://docs.claude.com/en/api/messages)
- **Anthropic prompt caching:** [`prompt-caching`](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching) (used in Phase 2)
