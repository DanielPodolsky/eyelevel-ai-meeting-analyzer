from typing import Optional
from pydantic import BaseModel, Field


class OpenItem(BaseModel):
    text: str = Field(..., description="Surfaced topic in Hebrew — modal recommendation, unresolved question, surfaced concern, pending follow-up, or consequential implication of a decision; transcript-grounded; one specific topic per item")

    
class Decision(BaseModel):
    text: str = Field(..., description="The decision in original Hebrew wording (positive verdict)")
    context: Optional[str] = Field(
        None,
        description="Optional supporting detail — populated when the transcript adds detail beyond <text>; omitted when <text> captures everything; transcript-grounded"
    )


class ActionItem(BaseModel):
    who: str = Field(..., description="Person responsible (named) or 'לא צוין' if owner is implied but not named")
    what: str = Field(..., description="The action in Hebrew")
    when: str = Field(..., description="Deadline in Hebrew (hedge phrases like 'אני מקווה' preserved verbatim), or 'לא צוין'")


class MeetingAnalysis(BaseModel):
    summary: str = Field(..., description="4–7 Hebrew sentences capturing meeting flow")                                                                                                                                   
    participants: list[str] = Field(..., description="Names or 'דובר א' / 'דובר ב' labels (role titles stripped)")
    decisions: list[Decision] = Field(default_factory=list, description="Positive verdicts — explicit decision language required")                                                                                                     
    action_items: list[ActionItem] = Field(default_factory=list, description="Explicit commitments — first-person future or task-assignment-with-confirmation")
    open_items: list[OpenItem] = Field(default_factory=list, description="Surfaced topics that did not become decisions or action items") 