import { api } from "../utils/api";
import type {
    GetChatResponse,
    ListChatsResponse,
    Message,
} from "../../features/chat/types/chat";
import { openRealStream } from "./chatStream";
import type { OpenStreamHandlers } from "./chatStream";
export type { OpenStreamHandlers } from "./chatStream";
export const CHAT_MOCK_ENABLED = import.meta.env.VITE_CHAT_MODE === "mock";
const mock = () => import("../../features/chat/services/mockChat");

export type {
    ChatSummary,
    ListChatsResponse,
} from "../../features/chat/types/chat";

/** React Query key for the paginated chat-history list. */
export const CHAT_HISTORY_QUERY_KEY = ["chat-history"] as const;

/** The all-zero UUID the backend emits for a message with no parent. */
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Collapse the backend's "no parent" sentinels to `undefined` so a root message
 * keys to the branch tree's root. The branch resolver treats only `undefined`
 * as root (`toBranchKey`), but the API serializes an absent parent as either an
 * empty string or the nil UUID rather than omitting the field.
 */
function normalizeMessage(message: Message): Message {
    if (message.previousID && message.previousID !== NIL_UUID) {
        return message;
    }
    const { previousID: _previousID, ...rest } = message;
    return rest;
}

// ---------------------------------------------------------------------------
// REST
// ---------------------------------------------------------------------------

export type CreateChatResponse = {
    chatID: string;
};

/** POST /api/chat — create a new chat session. */
export async function createChat(): Promise<CreateChatResponse> {
    if (CHAT_MOCK_ENABLED) return (await mock()).createMockChat();
    return api<CreateChatResponse>("/api/chat", {
        method: "POST",
    });
}

export type CreateMessageResponse = {
    message: Message;
    replyMessageID: string;
};

/** POST /api/chat/:chatId — send a message and get the pending reply's id. */
export async function createMessage(
    chatID: string,
    content: string,
    previousID?: string,
    preset: string | undefined = import.meta.env.VITE_CHAT_PRESET || undefined
): Promise<CreateMessageResponse> {
    if (CHAT_MOCK_ENABLED)
        return (await mock()).createMockMessage(chatID, content, previousID);
    const response = await api<CreateMessageResponse>(`/api/chat/${chatID}`, {
        method: "POST",
        body: JSON.stringify({ content, previousID, preset }),
    });
    return { ...response, message: normalizeMessage(response.message) };
}

/** GET /api/chat/:chatId — the chat plus all of its messages. */
export async function getChat(chatID: string): Promise<GetChatResponse> {
    if (CHAT_MOCK_ENABLED) return (await mock()).getMockChat(chatID);
    const response = await api<GetChatResponse>(`/api/chat/${chatID}`, {
        method: "GET",
    });
    return { ...response, messages: response.messages.map(normalizeMessage) };
}

/** GET /api/chat — paginated list of the user's chats. */
export async function listChats(
    page = 1,
    pageSize = 20
): Promise<ListChatsResponse> {
    if (CHAT_MOCK_ENABLED) return (await mock()).listMockChats(page, pageSize);
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });
    return api<ListChatsResponse>(`/api/chat?${params}`, {
        method: "GET",
    });
}

/** DELETE /api/chat/:chatId. */
export async function deleteChat(chatID: string): Promise<void> {
    if (CHAT_MOCK_ENABLED) return (await mock()).deleteMockChat(chatID);
    await api<unknown>(`/api/chat/${chatID}`, {
        method: "DELETE",
    });
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

export function openStream(
    messageID: string,
    handlers: OpenStreamHandlers
): () => void {
    if (!CHAT_MOCK_ENABLED) return openRealStream(messageID, handlers);
    let closed = false;
    let cleanup: (() => void) | undefined;
    void mock()
        .then((module) => {
            if (!closed) cleanup = module.openMockStream(messageID, handlers);
        })
        .catch((error) => {
            if (!closed) handlers.onEnded(error);
        });
    return () => {
        closed = true;
        cleanup?.();
    };
}
