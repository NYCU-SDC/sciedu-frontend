import type { GetChatResponse } from "../types/chat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChat } from "../../../shared/network/chat";

/** Query key for a single chat's full payload (chat + messages). */
export function chatQueryKey(chatID: string) {
    return ["chat", chatID] as const;
}

/**
 * Server state for one chat. The historical messages live in the React Query
 * cache — the single source of truth — so there is no second local array to
 * reconcile. Resume-on-load is a derivation off the result, not extra state:
 * `data?.messages.find(m => m.status === "streaming")`.
 */
export function useChatMessages(chatID: string) {
    const client = useQueryClient();
    return useQuery({
        queryKey: chatQueryKey(chatID),
        queryFn: async () => {
            const incoming = await getChat(chatID);
            const previous = client.getQueryData<GetChatResponse>(
                chatQueryKey(chatID)
            );
            return reconcileChat(incoming, previous);
        },
        enabled: Boolean(chatID),
    });
}

export function reconcileChat(
    incoming: GetChatResponse,
    previous?: GetChatResponse
): GetChatResponse {
    return {
        ...incoming,
        messages: incoming.messages.map((message) => {
            const old = previous?.messages.find((m) => m.id === message.id);
            if (!old) return message;
            // A terminal SSE snapshot can arrive before its database transaction finishes.
            if (old.status === "completed" && message.status === "streaming")
                return old;
            if (
                message.status === "streaming" &&
                old.parts &&
                old.content.length > message.content.length
            )
                return { ...old, status: message.status };
            return {
                ...message,
                characters: message.characters ?? old.characters,
                agentRuns: message.agentRuns ?? old.agentRuns,
            };
        }),
    };
}
