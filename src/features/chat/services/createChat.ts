import { api } from "../../../shared/utils/api";
import { USE_CHAT_MOCK } from "./chatServiceConfig";
import { mockCreateChat } from "./mockChatApi";

type CreateChatResponse = {
    chatID: string;
};

export async function createChat(): Promise<CreateChatResponse> {
    if (USE_CHAT_MOCK) {
        return mockCreateChat();
    }

    return api<CreateChatResponse>("/chat", {
        method: "POST",
    });
}
