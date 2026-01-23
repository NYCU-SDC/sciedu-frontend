export type Role = "user" | "assistant" | "system";

export interface RichChatMessage extends BasicChatMessage {
    id: string;
    conversationId: string;
}

export interface BasicChatMessage {
    role: Role;
    content: string;
}
