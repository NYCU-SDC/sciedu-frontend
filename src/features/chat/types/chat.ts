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
