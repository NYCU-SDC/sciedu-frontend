export type Role = "user" | "assistant" | "system";

export interface RichChatMessage extends ChatMessage {
    id: string;
    conversationId: string;
}

export interface ChatMessage {
    role: Role;
    content: string;
}
