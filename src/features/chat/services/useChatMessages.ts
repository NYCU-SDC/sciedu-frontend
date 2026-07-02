import { useQuery } from "@tanstack/react-query";
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
    return useQuery({
        queryKey: chatQueryKey(chatID),
        queryFn: () => getChat(chatID),
        enabled: Boolean(chatID),
    });
}
