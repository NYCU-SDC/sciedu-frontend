import { api } from "../../../shared/utils/api";

export async function deleteChat(chatID: string): Promise<void> {
    await api<unknown>(`/api/chat/${chatID}`, {
        method: "DELETE",
    });
}
