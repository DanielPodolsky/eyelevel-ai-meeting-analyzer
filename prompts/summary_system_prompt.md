# Hebrew Meeting Analyzer — System Prompt

> Eye Level AI screening assignment · **submission #4 (centerpiece)** per the brief: _"זה חלק קריטי"_.
>
> **Status:** v0 draft, pre-iteration. Iterate in the Anthropic Console at `platform.claude.com/dashboard`.
>
> **Last revision:** 2026-05-08
>
> **Model:** `claude-sonnet-4-6` · effort: `medium` · temperature: `0` · `max_tokens: 4096`

This file is the canonical source for the system prompt. The backend (`backend/app/services/summarization.py`, Phase 2) loads the prompt from this file at startup. The XML schema defined in `<output_format>` is the single source of truth — the Pydantic models in `backend/app/contracts.py` and the TypeScript types in `frontend/src/types/contracts.ts` mirror it.

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

| Setting | Value | Where to set in Console |
|---|---|---|
| Model | `claude-sonnet-4-6` | Model dropdown |
| Effort | `medium` | Effort / output config |
| Temperature | `0` | Sampling parameters |
| `max_tokens` | `4096` | Max response length |
| Thinking | adaptive (default) | Leave default |
| Streaming | enabled (in Phase 2 backend only) | N/A in Console iteration |

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

| Choice | Reasoning |
|---|---|
| `claude-sonnet-4-6` | Balanced quality/cost/latency for structured extraction. Opus 4.7 is overkill (long-horizon reasoning isn't needed); Haiku 4.5 may struggle with nuanced Hebrew judgment calls (when to include `<context>`, how to handle hedged deadlines). |
| `effort: medium` | Docs recommend `low` for chat/classification, `medium` for moderate reasoning. Structured extraction with judgment calls sits in moderate-reasoning territory. |
| `temperature: 0` | Deterministic output for stable iteration during Phase 1 and reproducibility for the demo. Variability is undesirable for evaluation. |
| `max_tokens: 4096` | Bounded output (~5–7 sentence summary + lists) fits comfortably in 4k. Lower would risk truncation on busy meetings. |

### Why prefill is NOT used

> _"Starting with Claude 4.6 models and Claude Mythos Preview, prefilled responses on the last assistant turn are no longer supported."_

Earlier prompt-engineering guides recommended prefilling Claude's response with `<summary>` to force structured output from token #1. This is **deprecated** for our model. Replacement: rely on XML tag instructions in the system prompt — Claude 4.6+ is trained to respect them. Caught during the WebFetch research on 2026-05-08; documented in `PROCESS.md` §2.3.

### What's deferred to post-MVP iteration

- **Multishot expansion (3–5 examples)** — add if iteration shows drift on edge cases not covered by the one-shot.
- **Quote grounding** — wrap relevant transcript snippets in `<quotes>` before extracting. Adds tokens, kills hallucination. A/B test post-MVP.
- **Self-check pass** — _"Before you finish, verify your answer against [test criteria]."_ Could add a verification pass; current prompt is direct extraction.
- **Anthropic prompt caching** — implemented in Phase 2 via `cache_control: {"type": "ephemeral"}` on system prompt blocks. The contract-first design enables this: only the user-message `<transcript>` varies per call, so the entire system prompt is cacheable. Reduces latency ~50% on cached portion + meaningful cost reduction at scale.

### Why the schema expanded mid-iteration from 4 sections to 5

The original schema had four sections: `<summary>` · `<participants>` · `<decisions>` · `<action_items>`. Round 8 surfaced a real gap, not a rule gap. The strengthened modal-recommendation rule was correctly stripping Sara's *"נצטרך לעדכן את ה-planning"* — a real consequential implication of the launch-date decision — from `<action_items>` (since it was first-person-plural with no concrete commitment). But the bounded `<summary>` couldn't always carry it, and the information was getting lost entirely.

The fix was schema expansion, not another rule. Round 9 added `<open_items>` as a fifth section: the structured home for surfaced topics, modal recommendations, unresolved questions, and consequential implications that don't conclude as decisions or action items. **Real meeting notes have three artifact categories — decisions / action items / open items — and the schema now mirrors that three-category model directly.**

The change cost ~30 minutes of prompt and spec edits during Round 9. The same change made AFTER Phase 2 backend code (Pydantic models, FastAPI endpoint, `.docx` exporter) and Phase 3 frontend types had been written would have been a 4–6 file refactor. **This is the contract-first design philosophy paying its dividend in the most concrete way possible:** the schema is the single decision everything downstream depends on, so getting it right early is dramatically cheaper than refactoring later. Catching the gap during prompt iteration — before any code was committed against the wrong shape — is exactly why Phase 1 was structured to lock the contract before scaffolding any infrastructure.

---

## Iteration Log

This section is filled during sub-phase 1.C (≥5 iteration rounds) and forms part of submission #4's interview-grade rationale. Each round records: what changed, why, what improved, what regressed.

### Round 1 — baseline ✓ COMPLETE (2026-05-08)

**Setup:** v0 system prompt + `prompts/test_transcripts/sample_01.txt` (Hebrew product sync, ~10 min, 3 named participants + 1 unidentified, 3 real decisions + 1 inconclusive thread, 4 action items + 1 ambiguous future-event).

**Result:** strong baseline — 6/10 edge cases handled correctly, 3/10 judgment-call interpretations, 1/10 critical bug.

**What worked:**

- All output in Hebrew. XML structure clean (no preamble/postscript).
- **Hedged-deadline rule (option A) validated:** "השבוע הבא, אני מקווה" preserved verbatim inside `<when>`. The hardest design call paid off.
- Self-explanatory decision (70-30 budget split) correctly omitted `<context>`.
- Action item with no deadline correctly used "לא צוין".
- Hebrew–English code-switching preserved (social, PR, mockups, onboarding, position, sync, input).
- Unidentified speaker labeled "דובר א".
- Summary at 5 sentences (within 4–7 range). `stop_reason: end_turn` (no truncation).
- Token usage: 3546 input + 1703 output ≈ 5.2k total.

**What failed (Round 2 fixes applied this revision):**

1. **🚨 Critical bug — retreat false-positive.** Claude classified the retreat tangent ("נחזור לזה" — no timeline, no instruction, no reasoning) as a deferral decision. The original "park it" rule was too loose. **Fix:** added _commitment markers_ (timeline / instruction / reasoning); a casual "נחזור לזה" without any of these is NOT a decision.
2. **⚠️ Medium — `<context>` over-populated** on the launch decision. The original "self-explanatory" rule was inconsistently applied. **Fix:** reframed to "layers detail" — populate `<context>` when the transcript contains substantive supporting detail beyond `<text>`; omit when `<text>` captures everything.

**Judgment calls locked (Round 2 rules updated to enforce):**

- **Participants:** names only. Strip role titles like "(PM)", "(CEO)", "(Marketing Lead)" from headers/metadata.
- **Decision–action overlap:** _allowed_ — different abstractions of the same fact serve different artifacts.
- **Future-event-as-action:** kept current behavior — "I'll do X this week" remains an action item with `<when>השבוע</when>`.

**Round 2 rule changes applied this revision:**

1. Tightened the "park it" rule with commitment markers.
2. Reframed `<context>` rule to "layers detail."
3. Added explicit names-only rule for `<participants>` with role-stripping guidance.
4. Added explicit clarification that decision–action overlap is acceptable.

**Diagnostic insight:** the **thinking block was diagnostic gold** — Claude explicitly listed the retreat as decision #4 in its reasoning. Without the thinking panel, this would have looked like an unexplained hallucination. The fix was a rule precision issue, not a model failure. Production code (Phase 2) will log thinking blocks server-side for similar diagnostics.

### Round 2 — anti-hallucination + rule tightening ✓ COMPLETE (2026-05-08)

**Setup:** Round 1 system prompt + 4 rule changes (commitment markers · layers-detail context · names-only participants · decision–action overlap explicit) + inline annotation fix in `<output_format>`.

**Result:** all 4 predictions hit. **9/10 clean wins · 1 soft over-extraction · 1 rule-consequence accepted.**

**Predictions verified:**

- ✅ Retreat DROPPED from `<decisions>` (commitment-markers rule fired correctly).
- ✅ Launch decision retains `<context>` (layers-detail rule fired correctly).
- ✅ Participants stripped of "(PM)" / "(CEO)" / "(Marketing Lead)".
- ✅ Hedge "השבוע הבא, אני מקווה" preserved verbatim.
- ✅ Decision–action overlap on PartnerCorp: both present and clean.

**Rule-consequence (intentional under layers-detail framing):**

The budget decision now has `<context>` populated with the 50-50 → 70-30 negotiation detail and target-audience reasoning. In Round 1 it was bare. The new rule fires correctly because the transcript contains substantive supporting detail. **Accepted:** richer-context-for-async-readers > strict-self-explanatory-omit. This is the trade-off the framing was designed for.

**New issue surfaced (soft over-extraction → Round 3 fix):**

Sara was assigned as `<who>` for "update planning" action item. Sara said "נצטרך לעדכן" — first-person plural, no explicit owner. Claude inferred Sara from her PM role (model-knowledge leak past the names-only stripping in `<participants>`). **Round 3 fix:** added a dedicated rule that first-person plural ("we" / "נצטרך" / "אנחנו" / "בוא נ...") signals collective acknowledgment, NOT personal commitment. Default to `<who>לא צוין</who>` or omit if no concrete commitment was made.

**Diagnostic insight:** the thinking block showed Claude DEBATED whether onboarding-rebuild was a separate decision and then changed its mind during output composition (final output had only the action item, not a separate decision). **Adaptive thinking can revise during output** — the thinking block is a snapshot of reasoning, not a guarantee of output content. Worth noting for production: don't rely on thinking-block content as a behavioral predictor.

**Token usage:** 3770 input + 2256 output ≈ 6.0k total (+770 vs Round 1; +224 input from rule additions, +553 output from richer `<context>` populated under layers-detail).

### Round 3 — first-person-plural ownership fix ✓ COMPLETE (2026-05-08)

**Setup:** Round 2 system prompt + 1 new rule (first-person plural signals collective acknowledgment, not personal commitment).

**Result:** critical fix landed; one regression surfaced at a different judgment boundary.

**Predictions verified:**

- ✅ Planning action item now `<who>לא צוין</who>` — first-person-plural rule fired correctly. "נצטרך לעדכן" no longer triggers Sara assignment.
- ✅ Other 4 action items remained stable.

**Regression surfaced (Round 4 fix):**

🚨 Onboarding now classified as a decision (4 decisions vs 3 in Round 2). Daniel's "מצוין" (approval-by-implication) + task assignment "שרה - mockups עד שלישי" caused Claude to synthesize a decision around what was actually just an action item. The decision text was poorly written — it restated the action verbatim ("שרה מכינה mockups... ואז מדברים על איך לממש") rather than describing a verdict. **That phrasing pattern was itself a tell that no real decision existed.**

**Hebrew quality nit (Round 5+ polish):**

⚠️ PartnerCorp action `<when>` became "עד בעוד שבועיים" — awkward Hebrew (literally "until in-two-weeks"). "עד" + "בעוד" collide grammatically. Should be "בעוד שבועיים" alone.

**Round 4 fix applied this revision:**

Tightened decision rule (#2) to require EXPLICIT decision language. Approval-by-implication ("מצוין", "אוקיי") and pure task-assignment do NOT qualify as decisions on their own. The `<text>` must describe the VERDICT, not the resulting task.

**Token usage:** 3920 input + 3081 output ≈ 7.0k total (+1.0k vs Round 2; growth from richer `<context>` blocks under layers-detail framing + the synthesized onboarding decision).

**Diagnostic insight:** when Claude can only write a future-tense narration of next steps as the decision text, that's a behavioral signal there's no real decision to record — only a task. Round 4 codifies this signal as an explicit rule.

### Round 4 — decision-detection tightening ✓ COMPLETE (2026-05-08)

**Setup:** Round 3 system prompt + tightened rule #2 (explicit decision language required; approval-by-implication and pure task-assignment do not qualify; `<text>` must describe verdict, not task).

**Result:** all 4 predictions hit. **12/12 edge cases passing on `sample_01.txt`.**

**Predictions verified:**

- ✅ Onboarding DROPPED from `<decisions>` (synthesized decision-from-action eliminated).
- ✅ Other 3 decisions retained, each anchored to explicit decision language: launch ("אז ההחלטה: מזיזים..."), budget ("בוא נלך עם זה"), PartnerCorp ("בוא נחזור לזה בעוד שבועיים. שרה, אל תעני").
- ✅ All 5 action items stable, including planning with `<who>לא צוין</who>`.
- ✅ Decision count clean: 3.

**Bonus improvements (not predicted):**

- 🎁 PartnerCorp action `<when>` upgraded from awkward "עד בעוד שבועיים" (R3) to clean "עד שיתקיים דיון חוזר בעוד שבועיים" (R4). Hebrew quality benefits from rule clarity even when the rule is not about Hebrew.
- 🎁 Summary now mentions the retreat as an unresolved topic ("נושא הריטריט נותר פתוח ותלוי בתגובת רחל") — tangent rule working as designed: not in `<decisions>` or `<action_items>`, but acknowledged in `<summary>` so async readers see the full meeting picture.

**Token usage:** 4056 input + 2324 output ≈ 6.4k total. Output DROPPED from R3 (-757) because the dropped onboarding decision saved ~600 tokens of XML+context. **Stricter rules → less work for Claude → faster + cheaper.** Counterintuitive but real.

**Diagnostic insight:** the prompt is now stable across all 12 documented edge cases on `sample_01.txt`. Round 5 tests robustness on a different transcript designed to tempt fabrication.

### Round 5 — empty-array behavior on `sample_02_no_decisions.txt` ✓ COMPLETE (2026-05-08)

**Setup:** Round 4 system prompt + new test fixture (`sample_02_no_decisions.txt` — 7-min Hebrew brainstorming meeting about mobile app, designed to tempt fabrication).

**Result:** **5/6 fabrication temptations resisted** — `<action_items>` empty as predicted. **One issue:** Claude classified "אני לא רוצה לקבל החלטה היום" as a meta-decision and surfaced it in `<decisions>`.

**Predictions verified (5/6):**

- ✅ `<action_items></action_items>`: **EMPTY** — first-person-plural rule and strict ownership rules held under temptation. No fabricated "Sara → collect feedback", "Daniel → check iOS data", or invitation-as-action.
- ✅ `<participants>`: 4 entries, names only (דניאל · שרה · תומר · דובר א).
- ✅ `<summary>`: 6 sentences capturing brainstorming substance + acknowledging the no-decision outcome ("מבלי לקבל החלטה בישיבה עצמה").
- ✅ Hebrew + code-switching preserved (responsive web, native, push notifications, App Store fees, codebases, etc.).
- ✅ No fabricated decisions about deferral, "let's breathe on it" filler, or owner-less actions.
- 🚨 `<decisions>`: contains 1 meta-decision ("לא לקבל החלטה על פיתוח אפליקציית מובייל היום") — NOT empty as predicted.

**Why the meta-decision slipped through:**

The thinking block shows Claude consciously debated this: *"Daniel's clear statement about not wanting to decide today is definitely a non-decision, but the deferral itself qualifies as a decision since it has both reasoning and a specific instruction to send additional thoughts via email."* Claude treated the *literal word* "החלטה" (decision) + "park it" framing as commitment markers. The original rule #2 didn't explicitly distinguish between **positive verdicts** and **meta-statements about not deciding**.

**Round 6 fix applied this revision:**

Added a new rule clause specifying that `<decisions>` records positive verdicts; flow statements ("we'll keep thinking", "אני לא רוצה לקבל החלטה היום", "בוא ננשום את זה") belong in `<summary>` as narrative context. **Phrased affirmatively** (placement-based) rather than as a prohibition, per Anthropic's "tell Claude what to do, not what not to do" principle. Daniel caught my initial draft violating this principle and we reframed.

**Token usage:** 3720 input + 1742 output ≈ 5.5k total. Output appropriately small — meeting genuinely produced little structured content.

**Diagnostic insight:** the literal word "החלטה" inside an anti-decision phrase ("אני לא רוצה לקבל **החלטה** היום") tricked Claude into classifying it as a decision. Round 6 codifies the **placement principle**: positive verdicts go in `<decisions>`; meta-statements about meeting flow go in `<summary>`. Both placements are described affirmatively.

### Round 6 — anti-decision placement reframe ✓ COMPLETE (2026-05-08)

**Setup:** Round 5 system prompt + extended rule #2 (positive verdicts → `<decisions>`; flow statements → `<summary>`, affirmatively framed per Anthropic's "tell what to do" principle).

**Result:** meta-decision DROPPED ✅ — but **two action_item false positives surfaced**. Rules-ripple.

**Predictions verified (1/2):**

- ✅ `<decisions></decisions>` empty. The affirmative placement reframe worked.
- 🚨 `<action_items></action_items>` NO LONGER empty — 2 false positives:
  - Action #1: "לבדוק את פילוח המשתמשים" with `<who>לא צוין</who>` ← Daniel's *"שווה לבדוק את זה איפשהו"* (passive modal suggestion)
  - Action #2: Sara → "לאסוף feedback ממשתמשים" ← Sara's *"אני חושבת שצריך לאסוף יותר feedback"* (opinion + impersonal modal "צריך")

**Why it slipped through:**

The first-person-plural rule (rule #7) covers explicit "we"/"us"/"נצטרך"/"אנחנו" tokens, but **not modal recommendations** in opinion form ("אני חושבת שצריך", "שווה", "כדאי"). Same root cause as Round 2's planning-update bug — the long tail of "I think we should..." patterns. **No thinking block in this response** (adaptive thinking decided the task was simple), which may have let modal-form action items slip past the careful first-person-plural check.

**Token usage:** 3853 input + 605 output ≈ 4.5k total (significantly leaner — no thinking, smaller output because most of the meeting was correctly classified as discussion).

**Round 7 fix applied this revision:**

Strengthened rule #6 (action_item definition) to require EXPLICIT COMMITMENT signals (first-person future-tense or confirmed task-assignment). Modal recommendations ("worth", "should", "כדאי", "שווה", "צריך", "אני חושב/ת ש") explicitly placed in `<summary>` as discussion content. **Affirmatively framed** — describes what counts as commitment + where recommendations belong, not what to exclude.

**Diagnostic insight:** the long tail of "I think we should..." patterns is convergent — Round 2's "נצטרך", Round 6's "אני חושבת שצריך" / "שווה" are surface variants of the same root cause. Rule #6 strengthening covers the broader category (modal recommendations) rather than chasing surface forms one at a time.

### Round 7 — modal-recommendation tightening ✓ COMPLETE (2026-05-08)

**Setup:** Round 6 system prompt + strengthened rule #6 (action_item requires explicit commitment; modal recommendations placed in `<summary>`, affirmative phrasing).

**Result:** all predictions hit. **Clean pass on `sample_02_no_decisions.txt`** — both `<decisions>` and `<action_items>` correctly empty.

**Predictions verified:**

- ✅ `<action_items></action_items>` **EMPTY** — both modal-recommendation false positives (*"שווה לבדוק"* and *"אני חושבת שצריך"*) dropped.
- ✅ `<decisions></decisions>` **EMPTY** — stable.
- ✅ `<summary>` captures brainstorming substance, now mentions engineering bandwidth and cost considerations as discussion content (not commitments).
- ✅ Daniel's anti-decision phrased correctly in summary: *"דניאל הכריע שאין לקבל החלטה היום, והזמין את המשתתפים לשלוח מחשבות נוספות במייל."*

**Token usage:** 4002 input + 421 output ≈ 4.4k total (continues to shrink — stricter rules + adaptive thinking skipping reasoning on simple cases). **No thinking block** for the second round in a row — rules are clear enough that Claude responds directly. Positive signal: cleaner cases produce lower-latency output in production.

**Diagnostic insight:** the iteration arc converged. Round 2 (first-person plural "נצטרך"), Round 6 (anti-decisions "אני לא רוצה לקבל החלטה"), Round 7 (modal recommendations "שווה" / "אני חושבת שצריך") were three surface forms of the same root pattern — opinion-without-commitment. Rule #6 strengthening covers the broader category rather than chasing individual surface forms.

### Round 8 — regression check on `sample_01.txt` ✓ COMPLETE (2026-05-08)

**Setup:** Round 7 system prompt re-applied to original `sample_01.txt`.

**Result:** rules-correct execution. **One nuanced change from Round 4 surfaced a real schema gap.**

**Predictions verified:**

- ✅ All 3 decisions stable: launch · budget · PartnerCorp deferral.
- ✅ Mockups action with `<who>שרה</who>` retained (task-assignment-with-confirmation rule held).
- ✅ Agency-this-week action retained (first-person future).
- ✅ Sales sync hedged "השבוע הבא, אני מקווה" preserved.
- ✅ Don't-reply-to-PartnerCorp action retained (decision-action overlap).
- ✅ Names-only participants.
- ✅ Onboarding NOT in decisions; retreat NOT in decisions.

**The nuanced change:**

⚠️ Sara's *"נצטרך לעדכן את ה-planning"* — Round 4 captured as action item with `<who>לא צוין</who>`; Round 8 strips it entirely (modal recommendation per strengthened rule #6). **Information loss noticed:** the planning-update implication doesn't appear in `<action_items>` AND wasn't mentioned in `<summary>`.

**Decision: schema expansion to 3-category model.**

Rather than accept the information loss, expanded the output schema with a new `<open_items>` section. Real meeting notes have three categories of artifacts: decisions (verdicts) · action items (commitments) · open items (surfaced topics not yet committed). The strict commitment-only rule for action_items is preserved; modal recommendations and surfaced topics now have a structured destination. Schema-first design absorbed this change cleanly because no downstream code (Pydantic, TS, `.docx`, frontend) was yet written.

**Token usage:** 4338 input + 1990 output ≈ 6.3k total. Adaptive thinking back on (sample_01 has more complexity than sample_02).

### Round 9 — schema expansion: open_items on `sample_01.txt`

_Pending. Re-run `sample_01.txt` against the expanded prompt (5-section output: summary · participants · decisions · action_items · open_items). Expected:_

- _3 decisions stable (launch · budget · PartnerCorp)._
- _4 action items stable (mockups · agency · sales sync · don't-reply-to-PartnerCorp)._
- _2 open items captured: (a) the planning will need updating in light of the launch-date change; (b) the retreat date is pending Rachel's response._
- _Summary continues to describe meeting flow at high level (no longer needs to enumerate every modal recommendation)._

### Round 10 — schema expansion: open_items on `sample_02_no_decisions.txt` ✓ COMPLETE (2026-05-08)

**Setup:** Round 9 system prompt re-applied to `sample_02_no_decisions.txt`.

**Result:** clean. **0 decisions · 0 action items · 6 open items** — all transcript-grounded.

**Open items captured:**

1. Responsive web vs native need for users (modal: *"אני חושבת שצריך לאסוף feedback"*)
2. Platform distribution data needs checking (modal: *"שווה לבדוק"*)
3. Bandwidth / hiring constraint surfaced (no commitment, real constraint)
4. Roadmap impact unresolved (mobile vs the 2 web features for summer)
5. App Store fees / distribution overhead surfaced as concerns
6. Cross-platform vs native debate (deferred topic — *"זה debate בפני עצמו"*)

**Token usage:** 4445 input + 889 output ≈ 5.3k total. No thinking block (adaptive decided clean case). Compact, well-formed.

---

## Sub-phase 1.C ✓ LOCKED (2026-05-08)

**Iteration arc:** 10 rounds across 2 Hebrew test transcripts. Final **5-section schema validated** end-to-end:

| Section | Content type |
|---|---|
| `<summary>` | Meeting flow narrative (4–7 sentences, Hebrew) |
| `<participants>` | Names only (role labels stripped) |
| `<decisions>` | Positive verdicts (explicit decision language required; deferrals require timeline / instruction / reasoning) |
| `<action_items>` | Explicit commitments (first-person future-tense OR task-assignment-with-confirmation) |
| `<open_items>` | Surfaced topics (modal recommendations · unresolved questions · surfaced concerns · pending follow-ups · consequential implications) |

**Final rule count:** 18 rules · all affirmatively phrased (placement-based) per Anthropic's "tell what to do" principle.

**Major iteration milestones:**

- **R1:** baseline (12/12 except retreat false-positive)
- **R2:** "park it" → commitment markers (retreat dropped)
- **R3:** first-person plural rule (planning ownership fixed)
- **R4:** explicit decision-language required (onboarding-as-decision dropped)
- **R5–7:** empty-array behavior · meta-decision reframe · modal-recommendations rule
- **R8:** regression check on R4 baseline → revealed real schema gap (information loss on modal-form planning comment)
- **R9–10: schema expansion to 5 sections.** Information loss fixed. 3-category artifact model (decisions / actions / open items) validated on both transcripts.

**Next: sub-phase 1.D.** Lock contracts in code — `backend/app/contracts.py` (Pydantic models with `MeetingAnalysis` including `OpenItem` and `open_items`) + `backend/app/sse_schema.py` (SSE event types with the 5-section result payload).

---

## Post-lock validation — sample_03 surfaces status-quo / anti-decision edge

Daniel requested one additional validation transcript before moving to 1.D. The "three test fixtures > two" instinct paid off: `sample_03_announcement.txt` (CTO announcement meeting, ~7 min, decisions-heavy / actions-light) revealed a real bug not caught by the first two transcripts.

### Round 11 — sample_03 baseline ✓ COMPLETE (2026-05-08)

**Setup:** Round 10 system prompt (5-section schema, 18 rules) applied to `sample_03_announcement.txt`.

**Result:** 4/5 sections clean. **2 false-positive decisions** in `<decisions>`:

- 🚨 **Decision #5 (K8s):** Avi explicitly said *"זה לא חלק מההחלטות היום"* — yet Claude classified the K8s continuation as a decision. **Speaker disclaimer ignored.**
- ⚠️ **Decision #4 (Datadog):** Avi confirmed status quo (*"ממשיכים עם Datadog"*). Borderline — confirmation of pre-existing budget is debatable as a decision.

**Failure mode identified:** status-quo affirmations ("X continues") + explicit anti-decision markers ("this is not a decision") in the same utterance — Claude weighted continuation phrasing higher than the disclaimer.

**Token usage:** 4411 input + 1093 output ≈ 5.5k. No thinking block (adaptive thinking may have contributed — without reasoning, Claude rule-fired on the continuation signal without weighing the disclaimer).

**Round 12 fix applied this revision:** new rule added (rule #4) — status-quo affirmations and explicit anti-decision markers belong in `<summary>` (or `<open_items>` if uncertainty surfaced); when both signals appear in the same utterance, the anti-decision marker wins. Affirmatively phrased per the placement principle.

**Total rules now:** 19 (was 18).

### Round 12 — status-quo / anti-decision rule fix on `sample_03`

_Pending. Re-run `sample_03_announcement.txt` against the updated rules. Expected deltas from Round 11:_

- _`<decisions>` drops from 5 → 3 (Datadog and K8s drop; only hiring freeze, Go stack migration, ProductX/Y sunset remain — all 3 have explicit decision verbs)_
- _`<action_items>` stable: 1 entry (Avi → Q&A doc by סוף השבוע)_
- _`<open_items>` may grow from 3 → 4: existing 3 + K8s status added (*"container orchestration not addressed today — status quo Kubernetes"*)_
- _Datadog moves to `<summary>` as Q&A flow (Yossi asked, Avi confirmed; no unresolved uncertainty)_
- _Names-only participants stable; Hebrew/English code-switching stable_

### Round 14 — regression check on `sample_02_no_decisions.txt` ✓ COMPLETE (2026-05-08)

**Setup:** Round 12 system prompt (19 rules including new status-quo rule #4) re-applied to `sample_02_no_decisions.txt`.

**Result:** **regression surfaced.** 0 decisions ✓, 0 action items expected → **1 false-positive action item**: Sara → "לאסוף feedback ממשתמשים" → לא צוין. Source: Sara said *"אני חושבת שצריך לאסוף יותר feedback"* — modal recommendation. Should have been routed to `<open_items>` per rule #6, but rule #6's modal-recommendation clause lost dominance against Sara's first-person framing.

**Diagnostic insight:** rule #4 (status-quo / anti-decision) added attention weight on `<open_items>` placement decisions but didn't strengthen rule #6's coverage of first-person-modal patterns. The surface form *"אני חושב/ת שצריך"* was in rule #6's example list but got over-ridden by Sara's role + perspective-haver framing.

**Open items grew to 7** (richer coverage of modal recommendations, all transcript-grounded). Token usage 4637 + 1012 ≈ 5.6k.

### Round 13 — regression check on `sample_01.txt` ✓ COMPLETE (2026-05-08)

**Setup:** Round 12 system prompt re-applied to `sample_01.txt` (after Round 14 had surfaced the sample_02 regression).

**Result:** **clean + improved.** 3 decisions stable · 4 action items stable · 5 open items (Round 9 had 4; the new 5th item captures Sara's QA status concern: *"סטטוס ה-QA על הפיצ'ר החדש בהינתן לוח הזמנים המקוצר — שרה העירה שהם עוד באמצע התהליך אך הנושא לא טופל"*).

**Diagnostic conclusion:** the regression is sample_02-specific. Rule #4 didn't cause widespread issues; rule #6's first-person-modal clause needed strengthening for Sara's specific phrasing pattern. **Path B diagnostic worked** — testing sample_01 first prevented over-engineering the fix.

**Round 15 fix applied this revision:** strengthened rule #6 with explicit clarification that first-person framing of a modal recommendation does NOT make the speaker the owner. Affirmative placement-based phrasing ("place these in `<open_items>` regardless of who said them"). Includes the path-back to action_item: explicit later commitment ("אני אעשה X").

**Total rules:** still 19 (rule #6 was strengthened in place, not appended).

### Round 15 — modal-recommendation strengthening verification on `sample_02_no_decisions.txt` ✓ COMPLETE (2026-05-08)

**Setup:** Round 14 system prompt + strengthened rule #6 (first-person framing of modal recommendations does NOT make speaker the owner; first-person becomes ownership only on later explicit commitment like "אני אעשה X" / "I'll handle X").

**Result:** clean. **`<action_items></action_items>` empty** — Sara's *"אני חושבת שצריך לאסוף feedback"* dropped from action_items, correctly placed as open_item. `<decisions></decisions>` empty (stable). `<open_items>` 7 entries (modal recommendations correctly routed). Claude even reframed Sara's first-person modal into the more neutral *"כדאי לאסוף feedback..."* form for the open_item — good editorial judgment.

**Token usage:** 4752 input + 987 output ≈ 5.7k. No thinking block. **The fix landed surgically.**

### Round 16 — regression check on `sample_01.txt` after rule #6 strengthening ✓ COMPLETE (2026-05-08)

**Setup:** Round 15 system prompt re-applied to `sample_01.txt` to verify the rule #6 strengthening did NOT break the task-assignment-with-confirmation pattern.

**Result:** clean. **3 decisions / 4 action items / 5 open items** — matching Round 13's structure. The at-risk case held perfectly: Sara's *"אני יכולה להכין mockups"* + Daniel's *"מצוין. שרה - mockups עד שלישי"* + Sara's *"סגור"* still classifies as `<who>שרה</who>` action item. The new rule clarification drew the right line: *"אני יכולה X"* followed by confirmation = commitment; *"אני חושבת שצריך X"* alone = opinion.

**Minor variance:** open_items selection differed slightly from Round 13 (R13 surfaced Sara's QA status concern; R16 surfaced the PartnerCorp interest tension). Both are legitimate substantive open items; both produce 5-item lists. Acceptable variance from the +60 tokens of rule #6 strengthening shifting Claude's attention slightly.

**Token usage:** 5088 input + 3231 output ≈ 8.3k.

---

## Sub-phase 1.C ✓ FULLY LOCKED (2026-05-08) — three-transcript validation

**Final iteration arc:** 16 rounds across 3 Hebrew test transcripts representing 3 meeting genres:

| Transcript | Genre | Decisions | Action items | Open items | Verdict |
|---|---|---|---|---|---|
| `sample_01.txt` | Product sync (mixed content) | 3 | 4 | 5 | ✓ clean |
| `sample_02_no_decisions.txt` | Brainstorming (no commitments) | 0 | 0 | 7 | ✓ clean |
| `sample_03_announcement.txt` | CTO announcement (decisions-heavy) | 3 | 1 | 4 | ✓ clean |

**Final rule count:** 19 rules · all affirmatively phrased (placement-based) per Anthropic's "tell what to do" principle.

**Final 5-section schema:** summary · participants · decisions · action_items · open_items.

**Major iteration milestones:**

- R1: baseline (12/12 except retreat false-positive)
- R2: "park it" → commitment markers
- R3: first-person plural rule
- R4: explicit decision-language requirement
- R5–7: empty arrays · meta-decision · modal recommendations
- R8: regression check → revealed schema gap
- **R9–10: schema expansion to 5 sections** (added `<open_items>`)
- R11: third-fixture surfaced status-quo bug
- R12: status-quo / anti-decision marker rule (rule #4)
- R13–14: regression checks revealed sample_02 first-person-modal regression
- **R15–16: rule #6 strengthening** — first-person modal clarification, surgical fix, no downstream regression

**Next sub-phase: 1.D.** Lock contracts in code — `backend/app/contracts.py` (Pydantic models with `MeetingAnalysis` including all 5 sections) + `backend/app/sse_schema.py` (SSE event types with the 5-section result payload). **Active Typist territory: Daniel writes the Python.**

### Round 3 — empty-array behavior

_Pending. Requires a second test transcript (`sample_02_no_decisions.txt`) with no decisions and no action items._

### Round 4 — Hebrew quality + format conformance

_Pending._

### Round 5+ — polish

_Pending._

---

## References

- **Anthropic prompting docs (consolidated):** [`claude-prompting-best-practices`](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Anthropic API reference:** [`messages` API](https://docs.claude.com/en/api/messages)
- **Anthropic prompt caching:** [`prompt-caching`](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching) (used in Phase 2)
