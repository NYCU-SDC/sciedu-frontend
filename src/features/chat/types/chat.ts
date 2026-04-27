// export type Role = "user" | "assistant" | "system";

// export interface RichChatMessage extends BasicChatMessage {
//     id: string;
//     conversationId: string;
// }

// export interface BasicChatMessage {
//     role: Role;
//     content: string;
// }

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
