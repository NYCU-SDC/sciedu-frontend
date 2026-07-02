import type { QueryClient } from "@tanstack/react-query";
import type { GetChatResponse } from "../types/chat";
import { createChat, createMessage } from "../../../shared/network/chat";
import { chatQueryKey } from "./useChatMessages";

export type StartChatResult = {
    chatID: string;
    replyMessageID: string;
};

/**
 * New-chat handoff: create the chat, post the first message, and prime the
 * `["chat", chatID]` cache so the detail page mounts with data already present
 * (no flash-refetch) and can immediately open the stream for `replyMessageID`.
 */
export async function startChat(
    queryClient: QueryClient,
    content: string
): Promise<StartChatResult> {
    const { chatID } = await createChat();
    const { message, replyMessageID } = await createMessage(chatID, content);

    const now = new Date().toISOString();
    const optimistic: GetChatResponse = {
        id: chatID,
        title: message.content.slice(0, 40),
        createdAt: now,
        updatedAt: now,
        messages: [message],
    };
    queryClient.setQueryData(chatQueryKey(chatID), optimistic);

    return { chatID, replyMessageID };
}
