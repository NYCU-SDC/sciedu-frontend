import type { Message } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import "./ChatMessage.css";

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div
            className={`chat-message ${
                isUser ? "chat-message-user" : "chat-message-assistant"
            }`}
        >
            {/* For assistant messages, render markdown */}
            {isUser ? (
                <span>{message.content}</span>
            ) : (
                <ReactMarkdown>{message.content}</ReactMarkdown>
            )}
        </div>
    );
}
