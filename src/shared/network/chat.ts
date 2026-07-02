import { api } from "../utils/api";
import type {
    GetChatResponse,
    ListChatsResponse,
    Message,
} from "../../features/chat/types/chat";
import type { StreamDelta } from "../../features/chat/types/sse";

export type {
    ChatSummary,
    ListChatsResponse,
} from "../../features/chat/types/chat";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

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
    previousID?: string
): Promise<CreateMessageResponse> {
    const response = await api<CreateMessageResponse>(`/api/chat/${chatID}`, {
        method: "POST",
        body: JSON.stringify({ content, previousID }),
    });
    return { ...response, message: normalizeMessage(response.message) };
}

/** GET /api/chat/:chatId — the chat plus all of its messages. */
export async function getChat(chatID: string): Promise<GetChatResponse> {
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
    await api<unknown>(`/api/chat/${chatID}`, {
        method: "DELETE",
    });
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

export type OpenStreamHandlers = {
    /** A content fragment arrived. */
    onDelta: (delta: string) => void;
    /** The assistant reply finished cleanly (`isFinished` / `done` event). */
    onFinish: () => void;
    /**
     * The transport closed without a clean finish. This covers the spec's
     * "no active stream" responses (400/404) as well as a mid-stream drop —
     * EventSource exposes no HTTP status, so they are indistinguishable here.
     * Recovery is the same regardless: re-read messages and let the message
     * `status` (`completed` / `failed`) decide what to render. `hadData` tells
     * the caller whether any delta was received before the close.
     */
    onEnded: (info: { hadData: boolean }) => void;
};

/**
 * Open the assistant reply stream for a message using the browser-native
 * EventSource API. Returns a function that closes the stream; calling it
 * suppresses any further callbacks (used as the abort handle).
 */
export function openStream(
    messageID: string,
    handlers: OpenStreamHandlers
): () => void {
    const source = new EventSource(`${BASE_URL}/api/chat/stream/${messageID}`, {
        withCredentials: true,
    });

    let hadData = false;
    let settled = false;

    const close = () => {
        settled = true;
        source.close();
    };

    const handleDelta = (event: MessageEvent<string>) => {
        if (settled) return;
        let chunk: StreamDelta;
        try {
            chunk = JSON.parse(event.data) as StreamDelta;
        } catch {
            return;
        }

        if (chunk.delta) {
            hadData = true;
            handlers.onDelta(chunk.delta);
        }
        if (chunk.isFinished) {
            close();
            handlers.onFinish();
        }
    };

    const handleDone = () => {
        if (settled) return;
        close();
        handlers.onFinish();
    };

    // Default (unnamed) events carry StreamDelta JSON; tolerate the named
    // `delta` / `done` event form from the spec's sequence diagrams too.
    source.onmessage = handleDelta;
    source.addEventListener("delta", handleDelta as EventListener);
    source.addEventListener("done", handleDone);

    source.onerror = () => {
        if (settled) return;
        // EventSource auto-reconnects on transient errors (readyState
        // CONNECTING); only a CLOSED socket is terminal for us.
        if (source.readyState === EventSource.CLOSED) {
            close();
            handlers.onEnded({ hadData });
        }
    };

    return close;
}
