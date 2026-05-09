import logging
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from io import BytesIO

from openai import APIError, OpenAI
from pydub import AudioSegment
from pydub.silence import detect_silence

logger = logging.getLogger(__name__)

# OpenAI Whisper API hard ceiling per request (server-enforced).
WHISPER_API_LIMIT_BYTES = 25 * 1024 * 1024
# Target chunk size with safety margin under the API limit.
CHUNK_TARGET_BYTES = 20 * 1024 * 1024
# Sanity ceiling on total upload — pydub loads PCM into memory during chunking,
# so a 90-min stereo meeting at 128kbps (~85MB MP3) peaks ~3GB RAM. 100MB caps
# us at realistic meeting lengths without OOM risk on dev machines.
MAX_UPLOAD_BYTES = 100 * 1024 * 1024
# Silence detection — pauses ≥500ms quieter than (mean - 16dBFS) are split candidates.
MIN_SILENCE_LEN_MS = 500
SILENCE_THRESH_DBFS_OFFSET = -16
# Search window around each target boundary: ±15% of the chunk's time span.
SILENCE_SEARCH_WINDOW_FRACTION = 0.15
# Whisper API calls are I/O-bound; parallelism gives near-linear speedup up to
# rate-limit ceilings. 4 workers keeps us well under default tier limits.
MAX_CHUNK_WORKERS = 4


class TranscriptionError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


@lru_cache(maxsize=1)
def _get_client() -> OpenAI:
    return OpenAI()


def transcribe(audio_bytes: bytes, filename: str) -> str:
    """
    Transcribe audio bytes to Hebrew text.

    Files up to WHISPER_API_LIMIT_BYTES go through Whisper in a single call
    (fast path). Larger files (up to MAX_UPLOAD_BYTES) are split at silence
    boundaries via pydub, transcribed in parallel, and concatenated.
    """
    size = len(audio_bytes)

    if size > MAX_UPLOAD_BYTES:
        max_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise TranscriptionError(
            "OVERSIZE_FILE",
            f'הקובץ גדול מדי — מקסימום {max_mb} מ"ב',
        )

    if size <= WHISPER_API_LIMIT_BYTES:
        return _transcribe_single(audio_bytes, filename)

    logger.info("audio_oversize_chunking filename=%s size=%d", filename, size)
    chunks = _split_audio_at_silences(audio_bytes, filename)
    logger.info(
        "audio_chunked filename=%s chunk_count=%d", filename, len(chunks)
    )
    return _transcribe_chunks_parallel(chunks, filename)


def _transcribe_single(audio_bytes: bytes, filename: str) -> str:
    """Single Whisper API call. Used for both small files and individual chunks."""
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


def _split_audio_at_silences(audio_bytes: bytes, filename: str) -> list[bytes]:
    """
    Split audio at silence boundaries into chunks ≤ CHUNK_TARGET_BYTES each.
    Falls back to time-based splitting at the exact target if no silence is
    found in the search window. Each chunk is exported as 64kbps mono MP3 —
    Whisper-supported, format-normalized, compact (~480KB/min).
    """
    try:
        audio = AudioSegment.from_file(BytesIO(audio_bytes))
    except Exception as exc:
        logger.exception("pydub_load_error filename=%s", filename)
        raise TranscriptionError(
            "CHUNKING_FAILED",
            "שגיאה בפיצול הקובץ — נסה פורמט אחר",
        ) from exc

    bytes_per_ms = len(audio_bytes) / max(1, len(audio))
    target_chunk_ms = int(CHUNK_TARGET_BYTES / bytes_per_ms)

    chunks: list[bytes] = []
    cursor_ms = 0
    while cursor_ms < len(audio):
        ideal_end_ms = cursor_ms + target_chunk_ms
        if ideal_end_ms >= len(audio):
            split_ms = len(audio)
        else:
            split_ms = _find_silence_near(audio, cursor_ms, ideal_end_ms)

        chunk_segment = audio[cursor_ms:split_ms]
        buf = BytesIO()
        chunk_segment.export(
            buf, format="mp3", bitrate="64k", parameters=["-ac", "1"]
        )
        chunks.append(buf.getvalue())
        cursor_ms = split_ms

    return chunks


def _find_silence_near(
    audio: AudioSegment, lower_bound_ms: int, target_ms: int
) -> int:
    """
    Find a silence range whose midpoint is closest to target_ms within a ±window
    around the target. Returns the silence midpoint as the split point, or
    target_ms exactly if no silence is detected in the window.
    """
    span_ms = target_ms - lower_bound_ms
    window_ms = max(5000, int(span_ms * SILENCE_SEARCH_WINDOW_FRACTION))
    search_start = max(lower_bound_ms, target_ms - window_ms)
    search_end = min(len(audio), target_ms + window_ms)

    silences = detect_silence(
        audio[search_start:search_end],
        min_silence_len=MIN_SILENCE_LEN_MS,
        silence_thresh=audio.dBFS + SILENCE_THRESH_DBFS_OFFSET,
    )
    if not silences:
        return target_ms

    closest = min(
        silences,
        key=lambda s: abs(
            (search_start + (s[0] + s[1]) // 2) - target_ms
        ),
    )
    return search_start + (closest[0] + closest[1]) // 2


def _transcribe_chunks_parallel(
    chunks: list[bytes], original_filename: str
) -> str:
    """
    Transcribe chunks in parallel via ThreadPoolExecutor (I/O-bound work).
    Skips empty chunks (long silence stretches) instead of failing the whole
    job — only raises EMPTY_AUDIO if every chunk is empty. Concatenates results
    in submission order (not completion order) to preserve transcript continuity.
    """
    with ThreadPoolExecutor(max_workers=MAX_CHUNK_WORKERS) as pool:
        futures = [
            pool.submit(
                _transcribe_single,
                chunk,
                f"{original_filename}.chunk{i:03d}.mp3",
            )
            for i, chunk in enumerate(chunks)
        ]
        results: list[str] = []
        for i, future in enumerate(futures):
            try:
                results.append(future.result())
            except TranscriptionError as exc:
                if exc.code == "EMPTY_AUDIO":
                    logger.info("chunk_empty index=%d, skipping", i)
                    continue
                raise

    if not results:
        raise TranscriptionError(
            "EMPTY_AUDIO",
            "לא זוהה דיבור בקובץ",
        )
    return " ".join(results)
