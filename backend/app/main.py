import asyncio
import logging
from typing import AsyncIterator

# Load .env before importing services (clients read env vars at module load).
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse

from .contracts import MeetingAnalysis
from .services import export, summarization, transcription
from .sse_schema import (
    DoneEvent,
    ErrorEvent,
    ResultEvent,
    StatusEvent,
    TranscriptEvent,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Eye Level AI — Hebrew Meeting Analyzer")

# Vite dev server (Phase 3) lives at :5173. CRA fallback at :3000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


def _sse(event_name: str, payload) -> dict:
    return {"event": event_name, "data": payload.model_dump_json()}


async def event_generator(
    audio_bytes: bytes, filename: str
) -> AsyncIterator[dict]:
    try:
        yield _sse("status", StatusEvent(step="transcribing"))
        transcript = await asyncio.to_thread(
            transcription.transcribe, audio_bytes, filename
        )
        yield _sse("transcript", TranscriptEvent(text=transcript))

        yield _sse("status", StatusEvent(step="summarizing"))
        analysis = await asyncio.to_thread(summarization.analyze, transcript)
        yield _sse("result", ResultEvent(**analysis.model_dump()))

        yield _sse("done", DoneEvent())

    except transcription.TranscriptionError as exc:
        logger.warning("transcription_error code=%s", exc.code)
        yield _sse("error", ErrorEvent(code=exc.code, message=exc.message))
    except summarization.SummarizationError as exc:
        logger.warning("summarization_error code=%s", exc.code)
        yield _sse("error", ErrorEvent(code=exc.code, message=exc.message))


@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    return EventSourceResponse(
        event_generator(audio_bytes, audio.filename or "audio")
    )


@app.post("/export")
async def export_docx(analysis: MeetingAnalysis):
    try:
        docx_bytes = await asyncio.to_thread(export.to_docx, analysis)
    except export.ExportError as exc:
        raise HTTPException(
            status_code=500,
            detail={"code": exc.code, "message": exc.message},
        )

    return Response(
        content=docx_bytes,
        media_type=(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ),
        headers={"Content-Disposition": 'attachment; filename="meeting_summary.docx"'},
    )
