import { parseSSE } from "./SSEParser";
import type { ApiChatChunk } from "../types/sse";
import type { BasicChatMessage } from "../types/chat";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

async function safeReadProblemDetail(res: Response) {
    try {
        const data = await res.json();
        return data?.title || data?.detail || `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
}

export function streamChatCompletions(
    message: BasicChatMessage[],
    onChunk: (chunk: ApiChatChunk) => void
): AbortController {
    const controller = new AbortController();

    (async () => {
        try {
            const res = await fetch(`${BASE_URL}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: message, stream: true }),
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
