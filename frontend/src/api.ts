import type {
  ErrorEvent,
  MeetingAnalysis,
  ResultEvent,
  StatusEvent,
  TranscriptEvent,
} from "./types/contracts";

interface AnalyzeCallbacks {
  onStatus: (event: StatusEvent) => void;
  onTranscript: (event: TranscriptEvent) => void;
  onResult: (event: ResultEvent) => void;
  onError: (event: ErrorEvent) => void;
  onDone: () => void;
  onNetworkError: (message: string) => void;
}

const API_BASE = "http://127.0.0.1:8000";

const NETWORK_ERROR_MSG =
  "השרת לא מגיב — ודא שה-backend רץ על פורט 8000";

// EventSource only supports GET, but our endpoints are POST. So we use
// fetch() with a streaming reader and parse the SSE wire format manually.
async function consumeSSEStream(
  response: Response,
  callbacks: AnalyzeCallbacks,
): Promise<void> {
  if (!response.ok || !response.body) {
    callbacks.onNetworkError(`שגיאה מהשרת: HTTP ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Normalize CRLF → LF. sse-starlette emits \r\n\r\n between events;
    // RFC 6202 says clients MUST accept both, so we collapse to the LF form.
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    // SSE events are separated by a blank line (\n\n).
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const eventBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      let eventName = "message";
      let dataLine = "";
      for (const line of eventBlock.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataLine = line.slice(6).trim();
        // sse-starlette emits ': ping ...' keepalives — silently ignored.
      }
      if (!dataLine) continue;

      try {
        const data = JSON.parse(dataLine);
        console.log(`[SSE] ${eventName}`, data);
        switch (eventName) {
          case "status":
            callbacks.onStatus(data as StatusEvent);
            break;
          case "transcript":
            callbacks.onTranscript(data as TranscriptEvent);
            break;
          case "result":
            callbacks.onResult(data as ResultEvent);
            break;
          case "error":
            callbacks.onError(data as ErrorEvent);
            break;
          case "done":
            callbacks.onDone();
            return;
        }
      } catch (parseErr) {
        console.error("SSE parse error:", parseErr, dataLine);
      }
    }
  }
}

export async function streamAnalyze(
  file: File,
  callbacks: AnalyzeCallbacks,
): Promise<void> {
  const formData = new FormData();
  formData.append("audio", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      body: formData,
    });
  } catch {
    callbacks.onNetworkError(NETWORK_ERROR_MSG);
    return;
  }

  await consumeSSEStream(response, callbacks);
}

// Demo mode: analyze a Hebrew transcript directly, skipping Whisper. Used
// when the user clicks one of the pre-loaded sample meetings on the idle
// state. Reuses the same SSE stream consumer as the audio path.
export async function streamAnalyzeText(
  text: string,
  callbacks: AnalyzeCallbacks,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/analyze-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    callbacks.onNetworkError(NETWORK_ERROR_MSG);
    return;
  }

  await consumeSSEStream(response, callbacks);
}

export async function downloadDocx(analysis: MeetingAnalysis): Promise<void> {
  const response = await fetch(`${API_BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(analysis),
  });

  if (!response.ok) {
    throw new Error(`Export failed: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meeting_summary.docx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
