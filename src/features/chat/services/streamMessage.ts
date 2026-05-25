import { streamSSE } from "../../../shared/utils/api";
import type { ApiChatChunk } from "../types/sse";

export function streamMessage(
    messageID: string,
    onChunk: (chunk: ApiChatChunk) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
): AbortController {
    return streamSSE<ApiChatChunk>(`/api/chat/stream/${messageID}`, {
        onChunk,
        onComplete,
        onError,
    });
}
