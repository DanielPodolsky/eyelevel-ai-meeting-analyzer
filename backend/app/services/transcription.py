import logging
from functools import lru_cache

from openai import APIError, OpenAI

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # OpenAI Whisper hard limit


class TranscriptionError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


@lru_cache(maxsize=1)
def _get_client() -> OpenAI:
    return OpenAI()


def transcribe(audio_bytes: bytes, filename: str) -> str:
    if len(audio_bytes) > MAX_FILE_SIZE_BYTES:
        raise TranscriptionError(
            "OVERSIZE_FILE",
            'הקובץ גדול מדי — מקסימום 25 מ"ב',
        )

    client = _get_client()

    try:
        response = client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-1",
            language="he",
        )
    except APIError as exc:
        logger.exception("whisper_api_error filename=%s", filename)
        raise TranscriptionError(
            "WHISPER_FAILED",
            "שגיאה בתמלול — נסה שוב",
        ) from exc

    transcript = (response.text or "").strip()
    if not transcript:
        raise TranscriptionError(
            "EMPTY_AUDIO",
            "לא זוהה דיבור בקובץ",
        )

    logger.info(
        "whisper_call filename=%s bytes=%d chars=%d",
        filename,
        len(audio_bytes),
        len(transcript),
    )
    return transcript
