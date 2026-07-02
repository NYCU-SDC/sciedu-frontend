/**
 * A content delta chunk from the SSE stream (`Chat.StreamDelta` in api-1.yaml).
 * `delta` is the streamed fragment; it is empty when `isFinished` is true.
 */
export interface StreamDelta {
    delta: string;
    isFinished: boolean;
}
