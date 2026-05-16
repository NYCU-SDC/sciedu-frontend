export type MessageRole = "user" | "assistant";
export type MessageStatus = "streaming" | "done" | "error";

export type Message = {
    id: string;
    content: string;
    role: MessageRole;
    previousID?: string;
    status: MessageStatus;
    createdAt: string;
};

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
