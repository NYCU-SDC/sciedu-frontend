import { api } from "../../../shared/utils/api";

// Backend emits snake_case `chat_id` (per the API spec); translate to the
// camelCase `chatID` we use everywhere on the frontend.
type CreateChatRawResponse = {
    chat_id: string;
};

type CreateChatResponse = {
    chatID: string;
};

export async function createChat(): Promise<CreateChatResponse> {
    const { chat_id: chatID } = await api<CreateChatRawResponse>("/api/chat", {
        method: "POST",
    });

    return { chatID };
}
