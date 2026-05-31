import { api } from "../../../shared/utils/api";
import { normalizeMessage, type Message } from "../types/chat";
import { USE_CHAT_MOCK } from "./chatServiceConfig";
import { mockListMessages } from "./mockChatApi";

type ListMessagesResponse = {
    messages: Message[];
};

export async function listMessages(
    chatID: string
): Promise<ListMessagesResponse> {
    if (USE_CHAT_MOCK) {
        return mockListMessages(chatID);
    }

    const response = await api<ListMessagesResponse>(`/api/chat/${chatID}`, {
        method: "GET",
    });

    return {
        ...response,
        messages: response.messages.map(normalizeMessage),
    };
}
