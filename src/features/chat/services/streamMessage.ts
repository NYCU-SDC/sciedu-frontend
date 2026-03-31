import { parseSSE } from "./SSEParser";
import type { ApiChatChunk } from "../types/sse";
import { USE_CHAT_MOCK } from "./chatServiceConfig";
import { mockStreamMessage } from "./mockChatApi";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

async function safeReadProblemDetail(res: Response) {
    try {
        const data = await res.json();
        return data?.title || data?.detail || `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
}

// chatStream.ts is the old stream vercice. Now, streamMessage take care of it.
export function streamMessage(
    messageID: string,
    onChunk: (chunk: ApiChatChunk) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
): AbortController {
    if (USE_CHAT_MOCK) {
        return mockStreamMessage(messageID, onChunk, onComplete, onError);
    }

    const controller = new AbortController();

    (async () => {
        try {
            const res = await fetch(
                `${BASE_URL}/api/chat/stream/${messageID}`,
                {
                    method: "GET",
                    signal: controller.signal,
                }
            );

            if (!res.ok) {
                const msg = await safeReadProblemDetail(res);
                throw new Error(msg);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No response body");

            await parseSSE(reader, (data) => {
                const chunk = JSON.parse(data) as ApiChatChunk;
                onChunk(chunk);
            });

            onComplete?.();
        } catch (e: unknown) {
            if (e instanceof Error && e.name === "AbortError") return;

            if (onError && e instanceof Error) {
                onError(e);
            } else if (onError) {
                onError(new Error(String(e)));
            }
        }
    })();

    return controller;
}
