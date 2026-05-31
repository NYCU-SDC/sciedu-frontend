export interface ApiChatChunk {
    content: string;
    isFinished?: boolean;
}

export interface ApiChatStreamEvent {
    content?: string;
    delta?: string;
    isFinished?: boolean;
}

export interface ApiChatStreamEvent {
    content?: string;
    delta?: string;
    isFinished?: boolean;
}
