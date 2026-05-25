export type MessageRole = "user" | "assistant";
export type MessageStatus = "streaming" | "completed" | "failed";

export type Message = {
    id: string;
    content: string;
    role: MessageRole;
    previousID?: string;
    status: MessageStatus;
    createdAt: string;
};

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

// Go's `omitempty` doesn't skip zero-valued [16]byte arrays, so the backend
// serializes a missing previousID as the all-zero UUID rather than omitting
// the field. Normalize to `undefined` so the rest of the frontend can treat
// root messages uniformly (buildChildrenMap keys them under ROOT_BRANCH_KEY).
export function normalizeMessage(message: Message): Message {
    if (message.previousID === ZERO_UUID) {
        const { previousID: _previousID, ...rest } = message;
        return rest;
    }
    return message;
}

export type ChatSummary = {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};

export type ListChatsResponse = {
    items: ChatSummary[];
    totalPages: number;
    totalItems: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
};
