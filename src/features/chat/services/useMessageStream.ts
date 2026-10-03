import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    openStream,
    CHAT_HISTORY_QUERY_KEY,
} from "../../../shared/network/chat";
import type { GetChatResponse } from "../types/chat";
import { chatQueryKey } from "./useChatMessages";
import {
    initialSnapshot,
    reduceEvent,
    type AgentSnapshot,
} from "./agentStream";

export type StreamState = {
    chatID: string;
    messageID: string;
    snapshot: AgentSnapshot;
    paused?: boolean;
} | null;
export function useMessageStream(
    messageID: string | null,
    chatID: string,
    attempt: number
) {
    const [state, setState] = useState<StreamState>(null);
    const client = useQueryClient();
    const pauseRef = useRef<(() => void) | null>(null);
    useEffect(() => {
        if (!messageID) return;
        let snapshot = initialSnapshot();
        let live = true;
        let settled = false;
        const publish = () => setState({ chatID, messageID, snapshot });
        const cache = () =>
            client.setQueryData<GetChatResponse>(
                chatQueryKey(chatID),
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
                                                snapshot.phase === "done"
                                                    ? "completed"
                                                    : message.status,
                                        }
                                      : message
                              ),
                          }
                        : previous
            );
        const reconcile = () => {
            cache();
            void client.invalidateQueries({ queryKey: chatQueryKey(chatID) });
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
    }, [messageID, chatID, attempt, client]);
    const abort = useCallback(() => pauseRef.current?.(), []);
    return { state, abort };
}
