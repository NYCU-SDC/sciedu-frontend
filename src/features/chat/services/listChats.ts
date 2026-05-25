import { api } from "../../../shared/utils/api";
import type { ListChatsResponse } from "../types/chat";

export type { ChatSummary, ListChatsResponse } from "../types/chat";

export const CHAT_HISTORY_QUERY_KEY = ["chat-history"] as const;

export async function listChats(
    page = 1,
    pageSize = 20
): Promise<ListChatsResponse> {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    return api<ListChatsResponse>(`/api/chat?${params}`, {
        method: "GET",
    });
}
