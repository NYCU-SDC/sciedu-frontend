import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { openStream } from "../../../shared/network/chat";
import type { GetChatResponse } from "../types/chat";
import { chatQueryKey } from "./useChatMessages";

/**
 * State of a single SSE lifecycle.
 *
 * - `idle`      — no stream open.
 * - `streaming` — receiving deltas; `buffer` is the partial reply.
 * - `done`      — finished cleanly. The buffer is ephemeral and discarded once
 *                 the canonical message is re-fetched from the server.
 * - `ended`     — transport closed without a clean finish (no active stream, or
 *                 a mid-stream drop). The server message `status` is the source
 *                 of truth for what to render after re-reading.
 */
export type StreamState =
    | { phase: "idle" }
    | { phase: "streaming"; buffer: string }
    | { phase: "done"; buffer: string }
    | { phase: "ended"; buffer: string };

export type UseMessageStreamResult = {
    state: StreamState;
    abort: () => void;
};

const IDLE: StreamState = { phase: "idle" };

/**
 * Owns one SSE lifecycle for `messageID`. On a clean finish we optimistically
 * promote the streamed buffer into the chat query cache — patching the pending
 * reply to its completed content/status so the finished message stays on screen
 * with no flicker — then invalidate to reconcile against the canonical server
 * message. A transport close without a clean finish only invalidates: the
 * partial buffer is discarded and the server `status` decides what to render.
 *
 * Pass `null` for `messageID` when there is no active stream (e.g. a fully
 * completed conversation). `onSettled` fires once the stream finishes or ends.
 */
export function useMessageStream(
    messageID: string | null,
    chatID: string,
    onSettled?: () => void
): UseMessageStreamResult {
    const [state, setState] = useState<StreamState>(IDLE);
    const queryClient = useQueryClient();
    const closeRef = useRef<(() => void) | null>(null);

    // Accumulate deltas in a ref so `settle` can read the final text
    // synchronously, without depending on the latest `state` in this closure.
    const bufferRef = useRef("");

    // Keep the latest settle callback without re-subscribing the stream.
    const onSettledRef = useRef(onSettled);
    useEffect(() => {
        onSettledRef.current = onSettled;
    }, [onSettled]);

    useEffect(() => {
        if (!messageID) return;

        bufferRef.current = "";

        const settle = (phase: "done" | "ended") => {
            // On a clean finish, push the completed reply into the cache *before*
            // clearing the ephemeral stream state and refetching. The UI renders
            // the live buffer only while streaming, so without this the finished
            // text would blank out in the window between done and the refetch.
            if (phase === "done") {
                queryClient.setQueryData<GetChatResponse>(
                    chatQueryKey(chatID),
                    (prev) =>
                        prev
                            ? {
                                  ...prev,
                                  messages: prev.messages.map((message) =>
                                      message.id === messageID
                                          ? {
                                                ...message,
                                                content: bufferRef.current,
                                                status: "completed",
                                            }
                                          : message
                                  ),
                              }
                            : prev
                );
            }
            setState({ phase, buffer: bufferRef.current });
            queryClient.invalidateQueries({ queryKey: chatQueryKey(chatID) });
            onSettledRef.current?.();
        };

        const close = openStream(messageID, {
            onDelta: (delta) => {
                bufferRef.current += delta;
                setState({ phase: "streaming", buffer: bufferRef.current });
            },
            onFinish: () => settle("done"),
            onEnded: () => settle("ended"),
        });
        closeRef.current = close;

        // Reset to idle on teardown — when `messageID` changes or clears, this
        // runs before the next stream opens, discarding the ephemeral buffer.
        return () => {
            close();
            closeRef.current = null;
            bufferRef.current = "";
            setState(IDLE);
        };
    }, [messageID, chatID, queryClient]);

    const abort = useCallback(() => {
        closeRef.current?.();
        closeRef.current = null;
        setState(IDLE);
        queryClient.invalidateQueries({ queryKey: chatQueryKey(chatID) });
    }, [chatID, queryClient]);

    return { state, abort };
}
