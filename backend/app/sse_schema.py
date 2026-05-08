from typing import Literal, Union
from pydantic import BaseModel, Field
from .contracts import Decision, ActionItem, OpenItem


class StatusEvent(BaseModel):
    step: Literal["transcribing", "summarizing", "exporting"] = Field(..., description="Current pipeline step")


class TranscriptEvent(BaseModel):
    text: str


class ErrorEvent(BaseModel):
    code: str # e.g. "WHISPER_FAILED", "OVERSIZE_FILE", "EMPTY_AUDIO"
    message: str # user-facing Hebrew message


class DoneEvent(BaseModel):
    pass


class ResultEvent(BaseModel):
    summary: str
    participants: list[str]
    decisions: list[Decision]
    action_items: list[ActionItem]
    open_items: list[OpenItem]


SSEEvent = Union[StatusEvent, TranscriptEvent, ErrorEvent, DoneEvent, ResultEvent]