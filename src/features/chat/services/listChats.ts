import { api } from "../../../shared/utils/api";
import type { ListChatsResponse } from "../types/chat";
import { USE_CHAT_MOCK } from "./chatServiceConfig";
import { mockListChats } from "./mockChatApi";

export type { ChatSummary, ListChatsResponse } from "../types/chat";

export const CHAT_HISTORY_QUERY_KEY = ["chat-history"] as const;

export async function listChats(
    page = 1,
    pageSize = 20
): Promise<ListChatsResponse> {
    if (USE_CHAT_MOCK) {
        return mockListChats(page, pageSize);
    }

    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    return api<ListChatsResponse>(`/api/chat?${params}`, {
        method: "GET",
    });
}
