import { ScrollArea, Box } from "@radix-ui/themes";
import { ChatMessage } from "./ChatMessage";
import type { Message } from "@/types/chat";
import "./ChatMessageList.css";

interface ChatMessageListProps {
    messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
    return (
        <ScrollArea className="chat-message-list-scroll">
            <Box className="chat-message-list-container">
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}
            </Box>
        </ScrollArea>
    );
}
