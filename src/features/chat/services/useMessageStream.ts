import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../../shared/utils/api";
import { useQueryClient } from "@tanstack/react-query";
import {
    openStream,
    CHAT_HISTORY_QUERY_KEY,
    getChat,
} from "../../../shared/network/chat";
import type { GetChatResponse } from "../types/chat";
import { chatQueryKey, reconcileChat } from "./useChatMessages";
import {
    initialSnapshot,
    reduceEvent,
    type AgentSnapshot,
} from "./agentStream";

export type StreamState = {
    account?: string;
    chatID: string;
    messageID: string;
    snapshot: AgentSnapshot;
    paused?: boolean;
} | null;
export function useMessageStream(
    messageID: string | null,
    chatID: string,
    attempt: number,
    account?: string
) {
    const [state, setState] = useState<StreamState>(null);
    const client = useQueryClient();
    const pauseRef = useRef<(() => void) | null>(null);
    useEffect(() => {
        if (!messageID) return;
        let snapshot = initialSnapshot();
        let live = true;
        let settled = false;
        const publish = () =>
            setState({ chatID, messageID, snapshot, account });
        const cache = () =>
            client.setQueryData<GetChatResponse>(
                chatQueryKey(chatID, account),
                (previous) =>
                    previous
                        ? {
                              ...previous,
                              messages: previous.messages.map((message) =>
                                  message.id === messageID
                                      ? {
                                            ...message,
                                            content: snapshot.content,
                                            ...(snapshot.parts
                                                ? { parts: snapshot.parts }
                                                : {}),
                                            ...(snapshot.characters
                                                ? {
                                                      characters:
                                                          snapshot.characters,
                                                  }
                                                : {}),
                                            status:
                                                snapshot.phase === "done" &&
                                                !message.learning
                                                    ? "completed"
                                                    : message.status,
                                        }
                                      : message
                              ),
                          }
                        : previous
            );
        // Keep learning replies pending in cache until the canonical GET supplies
        // their committed teaching state; otherwise resumeId disappears and
        // cleanup cancels the very request that makes the next action available.
        const reconcile = () => {
            cache();
            // Terminal events can precede DB persistence. Poll a bounded number of
            // times; fresh canonical snapshots supply run IDs rather than cache fallback.
            void (async () => {
                for (const delay of [0, 150, 400, 1000, 2000]) {
                    if (delay)
                        await new Promise((resolve) =>
                            setTimeout(resolve, delay)
                        );
                    if (!live) return;
                    try {
                        const incoming = await getChat(chatID);
                        if (!live) return;
                        client.setQueryData<GetChatResponse>(
                            chatQueryKey(chatID, account),
                            (previous) => reconcileChat(incoming, previous)
                        );
                        if (
                            incoming.messages.find((m) => m.id === messageID)
                                ?.status !== "streaming"
                        )
                            return;
                    } catch {
                        return;
                    }
                }
            })();
            void client.invalidateQueries({ queryKey: CHAT_HISTORY_QUERY_KEY });
        };
        publish();
        const close = openStream(messageID, {
            onEvent: (event) => {
                if (!live || settled) return;
                try {
                    snapshot = reduceEvent(snapshot, event);
                } catch {
                    snapshot = {
                        ...snapshot,
                        phase: "failed",
                        error: "回覆格式不完整，請重新載入結果。",
                    };
                }
                publish();
                if (snapshot.phase !== "streaming") {
                    settled = true;
                    close();
                    reconcile();
                }
            },
            onEnded: (error) => {
                if (!live || settled) return;
                settled = true;
                snapshot = {
                    ...snapshot,
                    phase: "failed",
                    activeAgents: [],
                    error: error.message,
                    httpStatus:
                        error instanceof ApiError ? error.status : undefined,
                };
                publish();
                reconcile();
            },
        });
        pauseRef.current = () => {
            settled = true;
            close();
            setState({
                chatID,
                account,
                messageID,
                snapshot: { ...snapshot, activeAgents: [] },
                paused: true,
            });
            cache();
        };
        return () => {
            live = false;
            close();
            pauseRef.current = null;
        };
    }, [messageID, chatID, attempt, client, account]);
    const abort = useCallback(() => pauseRef.current?.(), []);
    return { state, abort };
}
