export type Role = "user" | "assistant";

export interface Message {
    id: string;
    conversationId: string;
    role: Role;
    content: string;
}

export interface ApiChatMessage {
    role: Role;
    content: string;
}
