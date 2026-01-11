import { ChatMessage } from "./ChatMessage";
import type { Message } from "../types";
import "./ChatMessageList.css";

interface ChatMessageListProps {
    messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
    return (
        <div className="chat-message-list-scroll">
            <div className="chat-message-list-container">
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}
            </div>
        </div>
    );
}
