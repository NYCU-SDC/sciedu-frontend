export interface Message {
    id: string;
    conversationID: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
}

export interface Conversation {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface SSEChunkEvent {
    type: "chunk";
    content: string;
}

export interface SSEDoneEvent {
    type: "done";
    messageID: string;
}

export interface SSEErrorEvent {
    type: "error";
    message: string;
}

export type SSEEvent = SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;
