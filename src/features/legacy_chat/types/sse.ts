/**
 * Legacy SSE chunk shape, used only by the relocated `streamMessage.ts`.
 * The active feature streams `StreamDelta` (see `chat/types/sse.ts`).
 */
export interface ApiChatChunk {
    content: string;
}
