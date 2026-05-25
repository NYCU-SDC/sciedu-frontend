import type { ChatSummary, ListChatsResponse, Message } from "../types/chat";
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
const MOCK_CHAT_HISTORY_DELAY_MS = 1000;
const SEEDED_CHAT_COUNT = 100;
const DEFAULT_CHAT_TITLE = "New chat";

const chats = new Map<string, Message[]>();
const chatSummaries = new Map<string, ChatSummary>();
const pendingReplies = new Map<string, PendingReply>();

function generateID(prefix: string) {
    return `${prefix}-${crypto.randomUUID()}`;
}

function delay(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildChatTitle(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return DEFAULT_CHAT_TITLE;

    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

function upsertChatSummary(chatID: string, timestamp: string, title?: string) {
    const existing = chatSummaries.get(chatID);

    chatSummaries.set(chatID, {
        id: chatID,
        title: title ?? existing?.title ?? DEFAULT_CHAT_TITLE,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
    });
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

function seedMockHistory() {
    for (let index = 0; index < SEEDED_CHAT_COUNT; index += 1) {
        const chatID = generateID("chat");
        const userMessageID = generateID("msg");
        const assistantMessageID = generateID("reply");
        const createdAt = new Date(
            Date.now() - index * 60 * 1000
        ).toISOString();
        const title = `Mock chat history ${String(index + 1).padStart(2, "0")}`;

        const userMessage: Message = {
            id: userMessageID,
            content: title,
            role: "user",
            status: "done",
            createdAt,
        };
        const assistantMessage: Message = {
            id: assistantMessageID,
            content: buildMockReply(title),
            role: "assistant",
            previousID: userMessageID,
            status: "done",
            createdAt,
        };

        chats.set(chatID, [userMessage, assistantMessage]);
        chatSummaries.set(chatID, {
            id: chatID,
            title,
            createdAt,
            updatedAt: createdAt,
        });
    }
}

seedMockHistory();

export async function mockCreateChat(): Promise<CreateChatResponse> {
    const chatID = generateID("chat");
    const createdAt = new Date().toISOString();

    chats.set(chatID, []);
    upsertChatSummary(chatID, createdAt);

    return { chatID };
}

export async function mockCreateMessage(
    chatID: string,
    content: string,
    previousID?: string
): Promise<CreateMessageResponse> {
    const createdAt = new Date().toISOString();
    const chatMessages = chats.get(chatID) ?? [];
    const existingSummary = chatSummaries.get(chatID);
    const isFirstUserMessage = !chatMessages.some(
        (message) => message.role === "user"
    );

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
    upsertChatSummary(
        chatID,
        createdAt,
        isFirstUserMessage || !existingSummary
            ? buildChatTitle(content)
            : existingSummary.title
    );
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

export async function mockListChats(
    page = 1,
    pageSize = 20
): Promise<ListChatsResponse> {
    await delay(MOCK_CHAT_HISTORY_DELAY_MS);

    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const sortedChats = Array.from(chatSummaries.values()).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
    );
    const totalItems = sortedChats.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
    const startIndex = (safePage - 1) * safePageSize;

    return {
        items: sortedChats.slice(startIndex, startIndex + safePageSize),
        totalPages,
        totalItems,
        currentPage: safePage,
        pageSize: safePageSize,
        hasNextPage: safePage < totalPages,
    };
}

export async function mockDeleteChat(chatID: string): Promise<void> {
    chats.delete(chatID);
    chatSummaries.delete(chatID);

    for (const [messageID, pendingReply] of pendingReplies) {
        if (pendingReply.chatID === chatID) {
            pendingReplies.delete(messageID);
        }
    }
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
            upsertChatSummary(pending.chatID, new Date().toISOString());
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
