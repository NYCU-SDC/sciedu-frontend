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

export type Chat = {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};

/** Direction passed to branch navigation. */
export type BranchDirection = "prev" | "next";

/** Where a message sits among its sibling branches, for the `‹ n/total ›` switcher. */
export type MessageBranchState = {
    currentIndex: number;
    total: number;
    canGoPrev: boolean;
    canGoNext: boolean;
};

/** GET /api/chat/:chatId — full chat plus its messages. */
export type GetChatResponse = Chat & {
    messages: Message[];
};

/** Structurally identical to {@link Chat}; kept for the history sidebar. */
export type ChatSummary = Chat;

export type ListChatsResponse = {
    items: ChatSummary[];
    totalPages: number;
    totalItems: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
};
