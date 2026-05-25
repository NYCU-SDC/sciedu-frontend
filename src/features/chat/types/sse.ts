// Matches `Chat.StreamDelta` in api.yaml — spec says `{ content }`, but the
// running backend currently emits `{ delta, isFinished }`. Accept both shapes
// here and resolve in the consumer (see useChat.attachStream onChunk).
// TODO(spec-alignment): drop the `delta` / `isFinished` fields once the
// backend ships the spec shape.
export interface ApiChatChunk {
    content?: string;
    delta?: string;
    isFinished?: boolean;
}
