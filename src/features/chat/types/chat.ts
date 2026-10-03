export type MessageRole = "user" | "assistant";
export type MessageStatus = "streaming" | "completed" | "failed";

export type Message = {
    id: string;
    content: string;
    parts?: MessagePart[];
    characters?: Character[];
    agentRuns?: AgentRun[];
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

export type Character = { id: string; displayName: string; role: string };
export type AgentRun = {
    id: string;
    agent: string;
    parentRunID?: string;
    summonedBy?: string;
};
export type MessagePart = {
    type: "text" | "reasoning" | "tool_call" | "tool_result";
    id: string;
    agent: string;
    agentRunID?: string;
    internal?: boolean;
    text?: string;
    tool_call_id?: string;
    name?: string;
    arguments?: unknown;
    status?: string;
    content?: unknown;
};

/** View-only metadata; never part of the REST request or persisted message. */
export type MessageView = Message & { activeAgents?: string[] };
