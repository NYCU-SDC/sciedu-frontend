import { parseSSE } from "./SSEParser";
import type { ApiChatChunk } from "../types/sse";
import type { ApiChatMessage } from "../types/chat";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

// Mock response for testing UI when backend is not ready
const MOCK_RESPONSE = `# Header 1

## Header 2

### Header 3

#### Header 4

##### Header 5

###### Header 6

Regular Text Lorem ipsum dolor sit amet consectetur.

**Bold Text Lorem ipsum dolor sit amet consectetur.**

*Italic Text Lorem ipsum dolor sit amet consectetur.*

- Bullet Point 1
- Bullet Point 2
- Bullet Point 3

1. Numbered Point 1
2. Numbered Point 2
3. Numbered Point 3`;

/**
 * Mock streaming function for UI testing
 * Simulates streaming response with configurable delay
 */
export function mockStreamChatCompletions(
    _messages: ApiChatMessage[],
    onChunk: (chunk: ApiChatChunk) => void,
    delayMs: number = 30
): AbortController {
    const controller = new AbortController();
    const words = MOCK_RESPONSE.split(/(?<=\s)/); // Split but keep spaces

    let index = 0;
    const interval = setInterval(() => {
        if (controller.signal.aborted) {
            clearInterval(interval);
            return;
        }

        if (index < words.length) {
            onChunk({ delta: words[index], isFinished: false });
            index++;
        } else {
            onChunk({ delta: "", isFinished: true });
            clearInterval(interval);
        }
    }, delayMs);

    return controller;
}

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
