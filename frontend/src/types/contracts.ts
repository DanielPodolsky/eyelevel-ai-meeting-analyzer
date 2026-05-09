// Mirror of backend/app/contracts.py and backend/app/sse_schema.py.
// Single source of truth for the wire format on the frontend side.

export interface Decision {
  text: string;
  context?: string | null;
}

export interface ActionItem {
  who: string;
  what: string;
  when: string;
}

export interface OpenItem {
  text: string;
}

export interface MeetingAnalysis {
  summary: string;
  participants: string[];
  decisions: Decision[];
  action_items: ActionItem[];
  open_items: OpenItem[];
}

// SSE event payloads — match backend/app/sse_schema.py.

export interface StatusEvent {
  step: "transcribing" | "summarizing";
}

export interface TranscriptEvent {
  text: string;
}

export type ResultEvent = MeetingAnalysis;

export interface ErrorEvent {
  code: string;
  message: string;
}

export type SSEEventName =
  | "status"
  | "transcript"
  | "result"
  | "error"
  | "done";
