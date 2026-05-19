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

    const mockThought =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris quis nisi erat. Aliquam egestas, tellus at blandit semper, nisl odio viverra neque, in tincidunt nisl sem sed massa. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Ut fringilla risus vel tellus consequat vestibulum. Cras orci urna, efficitur vitae mi vitae, rutrum faucibus mauris. Donec cursus quam in ipsum tincidunt efficitur. Sed vitae sem efficitur, porta diam sit amet, viverra mi. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec bibendum varius sem, in convallis neque ultrices quis. Praesent eleifend suscipit enim, nec pellentesque purus pretium at.";
    return [
        "<think>",
        mockThought,
        "</think>",
        `Mock reply received: "${trimmed}".`,
        "This response is generated entirely on the frontend so you can test the thinking indicator before the backend streams model-generated thinking tags.",
        "The thought process should appear above this answer, and the raw tags should stay hidden from the final assistant message body.",
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
