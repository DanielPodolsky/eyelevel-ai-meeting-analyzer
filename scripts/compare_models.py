"""
Empirical comparison: same Hebrew transcript through Opus 4.7 / Sonnet 4.6 / Haiku 4.5.

Reuses the locked production system prompt from summary_system_prompt.md
(via the existing summarization service) so the comparison is *exactly* what
the app would produce on each model — no test-time prompt drift.

Captures per-call latency, token usage (input · cached · output), schema
compliance (does the output parse?), and structural counts (decisions,
action_items, open_items, participants). Full raw output is saved to JSON
for qualitative review.

Run from repo root:
    cd backend && source venv/bin/activate
    cd .. && python scripts/compare_models.py

Cost note: this script makes 3 real Anthropic API calls. At sample_03's size
(~3KB transcript), expect <$0.20 total across all three models.
"""

import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "backend" / ".env")

# Reuse the production summarization service so the comparison uses the
# canonical SYSTEM_PROMPT and USER_TEMPLATE — single source of truth.
sys.path.insert(0, str(REPO_ROOT / "backend"))
from anthropic import Anthropic  # noqa: E402

from app.services.summarization import (  # noqa: E402
    SYSTEM_PROMPT,
    USER_TEMPLATE,
    _parse_claude_response,
)

MODELS = [
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
]

# sample_03 (CTO announcement) is the most discriminating test —
# it contains the K8s anti-decision marker that exercises rule R12.
# A weaker model is likely to miss the marker and classify "K8s continues"
# as a decision.
SAMPLE = REPO_ROOT / "prompts" / "test_transcripts" / "sample_03_announcement.txt"
OUTPUT_JSON = Path(__file__).parent / "model_comparison_results.json"


def run_one(client: Anthropic, model: str, transcript: str) -> dict:
    user_message = USER_TEMPLATE.replace("{{HEBREW_TRANSCRIPT}}", transcript)

    # Opus 4.7 deprecated `temperature` (always uses extended thinking,
    # which makes per-call temperature meaningless). Sonnet and Haiku
    # still accept it. Emit it only where supported to keep the comparison
    # honest about the API surface differences.
    kwargs = {
        "model": model,
        "max_tokens": 4096,
        "system": [
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        "messages": [{"role": "user", "content": user_message}],
    }
    if not model.startswith("claude-opus-4-7"):
        kwargs["temperature"] = 0

    start = time.time()
    response = client.messages.create(**kwargs)
    elapsed_s = round(time.time() - start, 2)

    text = "".join(b.text for b in response.content if b.type == "text")

    result = {
        "model": model,
        "elapsed_s": elapsed_s,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "cache_create": getattr(
            response.usage, "cache_creation_input_tokens", 0
        ) or 0,
        "cache_read": getattr(
            response.usage, "cache_read_input_tokens", 0
        ) or 0,
        "raw_output": text,
        "parsed": None,
        "parse_error": None,
        "counts": None,
    }

    try:
        parsed = _parse_claude_response(text)
        dump = parsed.model_dump()
        result["parsed"] = dump
        result["counts"] = {
            "participants": len(dump["participants"]),
            "decisions": len(dump["decisions"]),
            "action_items": len(dump["action_items"]),
            "open_items": len(dump["open_items"]),
            "summary_chars": len(dump["summary"]),
        }
    except Exception as exc:  # noqa: BLE001 — capture any parse failure
        result["parse_error"] = f"{type(exc).__name__}: {exc}"

    return result


def main() -> None:
    transcript = SAMPLE.read_text(encoding="utf-8")
    print(f">>> transcript: {SAMPLE.name} · {len(transcript)} chars")

    client = Anthropic()
    results = []
    for model in MODELS:
        print(f"\n>>> calling {model}...")
        result = run_one(client, model, transcript)
        results.append(result)
        c = result["counts"]
        if c is None:
            print(f"    PARSE FAIL: {result['parse_error']}")
        else:
            print(
                f"    elapsed={result['elapsed_s']}s · "
                f"in={result['input_tokens']} cache_r={result['cache_read']} "
                f"out={result['output_tokens']} · "
                f"decisions={c['decisions']} actions={c['action_items']} "
                f"open={c['open_items']} participants={c['participants']}"
            )

    OUTPUT_JSON.write_text(
        json.dumps(results, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\n>>> wrote {OUTPUT_JSON}")

    print("\n=== SUMMARY TABLE ===")
    print(
        f"{'model':32} | {'time':>6} | {'in':>5} {'cache':>6} {'out':>5} | "
        f"{'dec':>3} {'act':>3} {'open':>4} {'parts':>5}"
    )
    print("-" * 90)
    for r in results:
        c = r["counts"] or {
            "decisions": "?",
            "action_items": "?",
            "open_items": "?",
            "participants": "?",
        }
        print(
            f"{r['model']:32} | {r['elapsed_s']:>5}s | "
            f"{r['input_tokens']:>5} {r['cache_read']:>6} {r['output_tokens']:>5} | "
            f"{c['decisions']:>3} {c['action_items']:>3} "
            f"{c['open_items']:>4} {c['participants']:>5}"
        )


if __name__ == "__main__":
    main()
