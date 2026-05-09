import logging
import re
import xml.etree.ElementTree as ET
from functools import lru_cache
from pathlib import Path

from anthropic import Anthropic, APIError
from pydantic import ValidationError

from ..contracts import ActionItem, Decision, MeetingAnalysis, OpenItem

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Load locked prompts from the canonical .md file at module load.
# Two ```text fences inside summary_system_prompt.md:
#   block[0] = system prompt   (role · task · output_format · rules · example)
#   block[1] = user template   (with {{HEBREW_TRANSCRIPT}} placeholder)
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[3]
PROMPT_FILE = REPO_ROOT / "prompts" / "summary_system_prompt.md"

_content = PROMPT_FILE.read_text(encoding="utf-8")
_blocks = re.findall(r"```text\n(.*?)\n```", _content, re.DOTALL)
if len(_blocks) < 2:
    raise RuntimeError(
        f"Expected ≥2 ```text blocks in {PROMPT_FILE}, found {len(_blocks)}"
    )

SYSTEM_PROMPT = _blocks[0]
USER_TEMPLATE = _blocks[1]


class SummarizationError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


@lru_cache(maxsize=1)
def _get_client() -> Anthropic:
    return Anthropic()


def analyze(transcript: str) -> MeetingAnalysis:
    client = _get_client()
    user_message = USER_TEMPLATE.replace("{{HEBREW_TRANSCRIPT}}", transcript)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            temperature=0,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_message}],
        )
    except APIError as exc:
        logger.exception("claude_api_error")
        raise SummarizationError(
            "CLAUDE_FAILED",
            "שגיאה בניתוח — נסה שוב",
        ) from exc

    usage = response.usage
    logger.info(
        "claude_call cache_read=%s cache_create=%s input=%d output=%d",
        getattr(usage, "cache_read_input_tokens", 0) or 0,
        getattr(usage, "cache_creation_input_tokens", 0) or 0,
        usage.input_tokens,
        usage.output_tokens,
    )

    text = "".join(block.text for block in response.content if block.type == "text")

    try:
        return _parse_claude_response(text)
    except (ET.ParseError, ValidationError) as exc:
        logger.error("claude_malformed_response sample=%r", text[:500])
        raise SummarizationError(
            "MALFORMED_RESPONSE",
            "תגובה לא תקינה מהמודל — נסה שוב",
        ) from exc


_AMP_ENTITY_PATTERN = re.compile(
    r"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)"
)


def _parse_claude_response(text: str) -> MeetingAnalysis:
    # Synthetic root: Claude returns 5 sibling sections, not a single root.
    wrapped = f"<root>{text}</root>"

    try:
        root = ET.fromstring(wrapped)
    except ET.ParseError:
        # Real meeting content can include literal '&' characters (e.g., "Q&A",
        # "AT&T", "R&D") which Claude correctly preserves verbatim per the
        # prompt's "preserve original wording" rule — but unescaped '&' breaks
        # strict XML parsing. Escape any '&' that isn't already an entity
        # reference and retry. Try-then-fallback keeps the happy path fast.
        sanitized = _AMP_ENTITY_PATTERN.sub("&amp;", wrapped)
        root = ET.fromstring(sanitized)

    return MeetingAnalysis(
        summary=(root.findtext("summary") or "").strip(),
        participants=[
            (p.text or "").strip()
            for p in root.findall("participants/participant")
            if (p.text or "").strip()
        ],
        decisions=[
            Decision(
                text=(d.findtext("text") or "").strip(),
                context=((d.findtext("context") or "").strip() or None),
            )
            for d in root.findall("decisions/decision")
        ],
        action_items=[
            ActionItem(
                who=(a.findtext("who") or "לא צוין").strip(),
                what=(a.findtext("what") or "").strip(),
                when=(a.findtext("when") or "לא צוין").strip(),
            )
            for a in root.findall("action_items/action_item")
        ],
        open_items=[
            OpenItem(text=(o.findtext("text") or "").strip())
            for o in root.findall("open_items/open_item")
        ],
    )
