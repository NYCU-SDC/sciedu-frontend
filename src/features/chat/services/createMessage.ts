import { api } from "../../../shared/utils/api";
import { normalizeMessage, type Message } from "../types/chat";

type CreateMessageResponse = {
    message: Message;
    replyMessageID: string;
};

export async function createMessage(
    chatID: string,
    content: string,
    previousID?: string
): Promise<CreateMessageResponse> {
    const response = await api<CreateMessageResponse>(`/api/chat/${chatID}`, {
        method: "POST",
        body: JSON.stringify({ content, previousID }),
    });
    return { ...response, message: normalizeMessage(response.message) };
}
