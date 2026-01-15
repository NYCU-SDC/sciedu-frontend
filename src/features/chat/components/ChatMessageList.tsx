import { ChatMessage } from "./ChatMessage";
import type { RichChatMessage } from "../types/chat";
import "./ChatMessageList.css";

interface ChatMessageListProps {
    messages: RichChatMessage[];
    streamingMessage?: string | null;
}

export function ChatMessageList({
    messages,
    streamingMessage,
}: ChatMessageListProps) {
    return (
        <div className="chat-message-list-scroll">
            <div className="chat-message-list-container">
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}

                {streamingMessage !== null &&
                    streamingMessage !== undefined && (
                        <ChatMessage
                            message={{
                                id: "stream-temp-conversationId",
                                conversationId: "streaming-temp-id",
                                role: "assistant",
                                content: streamingMessage,
                            }}
                        />
                    )}
            </div>
        </div>
    );
}
