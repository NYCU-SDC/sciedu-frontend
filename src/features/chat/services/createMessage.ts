import { api } from "../../../shared/utils/api";
import type { Message } from "../types/chat";
import { USE_CHAT_MOCK } from "./chatServiceConfig";
import { mockCreateMessage } from "./mockChatApi";

type CreateMessageResponse = {
    message: Message;
    replyMessageID: string;
};

export async function createMessage(
    chatID: string,
    content: string,
    previousID?: string
): Promise<CreateMessageResponse> {
    if (USE_CHAT_MOCK) {
        return mockCreateMessage(chatID, content, previousID);
    }

    const payload = {
        content,
        previousID,
    };
    return api<CreateMessageResponse>(`/chat/${chatID}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
