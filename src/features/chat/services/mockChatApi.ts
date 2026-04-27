import type { Message } from "../types/chat";
import type { ApiChatChunk } from "../types/sse";

type CreateChatResponse = {
    chatID: string;
};

type CreateMessageResponse = {
    message: Message;
    replyMessageID: string;
};

type ListMessagesResponse = {
    messages: Message[];
};

type PendingReply = {
    chatID: string;
    replyMessage: Message;
    fullContent: string;
};

const MOCK_DELAY_MS = 24;

const chats = new Map<string, Message[]>();
const pendingReplies = new Map<string, PendingReply>();

function generateID(prefix: string) {
    return `${prefix}-${crypto.randomUUID()}`;
}

function delay(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildMockReply(content: string) {
    const trimmed = content.trim();

    if (!trimmed) {
        return "I did not receive any content, but the mock chat service is working.";
    }

    return [
        `Mock reply received: "${trimmed}".`,
        "This response is generated entirely on the frontend so you can keep building the chat UI before the backend is ready.",
        "You can now test message layout, streaming behavior, abort, refresh, and chat-area interactions safely.",
    ].join(" ");
}

export async function mockCreateChat(): Promise<CreateChatResponse> {
    const chatID = generateID("chat");
    chats.set(chatID, []);
    return { chatID };
}

export async function mockCreateMessage(
    chatID: string,
    content: string,
    previousID?: string
): Promise<CreateMessageResponse> {
    const createdAt = new Date().toISOString();
    const chatMessages = chats.get(chatID) ?? [];

    const message: Message = {
        id: generateID("msg"),
        content,
        role: "user",
        previousID,
        status: "done",
        createdAt,
    };

    const replyMessageID = generateID("reply");
    const replyMessage: Message = {
        id: replyMessageID,
        content: "",
        role: "assistant",
        previousID: message.id,
        status: "streaming",
        createdAt,
    };

    chats.set(chatID, [...chatMessages, message]);
    pendingReplies.set(replyMessageID, {
        chatID,
        replyMessage,
        fullContent: buildMockReply(content),
    });

    return { message, replyMessageID };
}

export async function mockListMessages(
    chatID: string
): Promise<ListMessagesResponse> {
    return {
        messages: chats.get(chatID) ?? [],
    };
}

export function mockStreamMessage(
    messageID: string,
    onChunk: (chunk: ApiChatChunk) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
): AbortController {
    const controller = new AbortController();
    const pending = pendingReplies.get(messageID);

    if (!pending) {
        queueMicrotask(() => {
            onError?.(new Error("Mock reply message not found."));
        });
        return controller;
    }

    const words = pending.fullContent.split(/(\s+)/).filter(Boolean);

    (async () => {
        try {
            let built = "";

            for (const word of words) {
                if (controller.signal.aborted) return;

                built += word;
                onChunk({ content: word });
                await delay(MOCK_DELAY_MS);
            }

            const chatMessages = chats.get(pending.chatID) ?? [];
            const finishedReply: Message = {
                ...pending.replyMessage,
                content: built,
                status: "done",
            };

            chats.set(pending.chatID, [...chatMessages, finishedReply]);
            pendingReplies.delete(messageID);
            onComplete?.();
        } catch (error) {
            const err =
                error instanceof Error ? error : new Error(String(error));
            onError?.(err);
        }
    })();

    return controller;
}
