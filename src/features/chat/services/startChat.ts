import type {
    CourseContext,
    LearningInput,
} from "../../../shared/network/learning";
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
    content: string,
    options: {
        account?: string;
        onCreated?: (id: string) => void;
        courseContext?: CourseContext;
        learning?: LearningInput;
    } = {}
): Promise<StartChatResult> {
    const { chatID } = await (options.courseContext
        ? createChat(options.courseContext)
        : createChat());
    options.onCreated?.(chatID);
    const { message, replyMessageID } = await (options.learning
        ? createMessage(chatID, content, undefined, undefined, options.learning)
        : createMessage(chatID, content));

    const now = new Date().toISOString();
    const optimistic: GetChatResponse = {
        id: chatID,
        courseContext: options.courseContext,
        title: message.content.slice(0, 40),
        createdAt: now,
        updatedAt: now,
        messages: [
            message,
            {
                id: replyMessageID,
                learning: message.learning,
                content: "",
                previousID: message.id,
                role: "assistant",
                status: "streaming",
                createdAt: now,
            },
        ],
    };
    queryClient.setQueryData(chatQueryKey(chatID, options.account), optimistic);

    return { chatID, replyMessageID };
}
