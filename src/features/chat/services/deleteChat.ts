import { api } from "../../../shared/utils/api";
import { USE_CHAT_MOCK } from "./chatServiceConfig";
import { mockDeleteChat } from "./mockChatApi";

export async function deleteChat(chatID: string): Promise<void> {
    if (USE_CHAT_MOCK) {
        await mockDeleteChat(chatID);
        return;
    }

    await api<unknown>(`/api/chat/${chatID}`, {
        method: "DELETE",
    });
}
