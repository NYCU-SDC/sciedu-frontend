import { parseSSE } from "./SSEParser";
import type { ApiChatChunk } from "../types/sse";
import type { ApiChatMessage } from "../types/chat";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

async function safeReadProblemDetail(res: Response) {
    try {
        const data = await res.json();
        return data?.detail || data?.title || `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
}

export function streamChatCompletions(
    message: ApiChatMessage[],
    onChunk: (chunk: ApiChatChunk) => void
): AbortController {
    const controller = new AbortController();

    (async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message, stream: true }),
                signal: controller.signal,
            });

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
        } catch (e: any) {
            if (e.name == "AbortError") return;
        }
    })();

    return controller;
}
