import { Box } from "@radix-ui/themes";
import type { Message } from "@/types/chat";
import "./ChatMessage.css";

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <Box
            className={`chat-message ${
                isUser ? "chat-message-user" : "chat-message-assistant"
            }`}
        >
            {/* For assistant messages, render markdown */}
            {isUser ? (
                <span>{message.content}</span>
            ) : (
                <div
                    className="markdown-content"
                    dangerouslySetInnerHTML={{
                        __html: parseMarkdown(message.content),
                    }}
                />
            )}
        </Box>
    );
}

function parseMarkdown(text: string): string {
    // Basic implementation
    // TODO: consider using react-markdown for full support
    return text
        .replace(/^### (.*$)/gm, "<h3>$1</h3>")
        .replace(/^## (.*$)/gm, "<h2>$1</h2>")
        .replace(/^# (.*$)/gm, "<h1>$1</h1>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
        .replace(/^[•\-] (.*$)/gm, "<li>$1</li>");
}
