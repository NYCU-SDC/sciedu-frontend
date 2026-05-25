import { api } from "../../../shared/utils/api";
import { normalizeMessage, type Message } from "../types/chat";

type ListMessagesResponse = {
    messages: Message[];
};

export async function listMessages(
    chatID: string,
    signal?: AbortSignal
): Promise<ListMessagesResponse> {
    const response = await api<ListMessagesResponse>(`/api/chat/${chatID}`, {
        method: "GET",
        signal,
    });
    return {
        ...response,
        messages: response.messages.map(normalizeMessage),
    };
}
