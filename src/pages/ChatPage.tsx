import { useState } from "react";
import { Box } from "@radix-ui/themes";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import type { Message } from "@/types/chat";
import "./ChatPage.css";

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const userName = "您好"; // TODO

    const handleSend = (content: string) => {
        // Add user message
        const userMessage: Message = {
            id: crypto.randomUUID(),
            conversationID: "temp",
            role: "user",
            content,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // a mock assistant message (with markdown) for visual testing
        const assistantMessage: Message = {
            id: crypto.randomUUID(),
            conversationID: "temp",
            role: "assistant",
            content: `# Header 1
## Header 2
### Header 3
#### Header 4
##### Header 5
###### Header 6

Regular Text Lorem ipsum dolor sit amet consectetur.

**Bold Text** Lorem ipsum dolor sit amet consectetur.

*Italic Text* Lorem ipsum dolor sit amet consectetur.

- Bullet Point 1
- Bullet Point 2
- Bullet Point 3

1. Numbered Point 1
2. Numbered Point 2
3. Numbered Point 3
`,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // TODO: Call streamApi() to get assistant response
    };

    const hasMessages = messages.length > 0;

    return (
        <Box className="chat-page-container">
            {/* Content area */}
            <Box className="chat-page-content">
                {hasMessages ? (
                    <>
                        <ChatMessageList messages={messages} />
                        <Box className="chat-page-input-wrapper">
                            <ChatInput onSend={handleSend} />
                        </Box>
                    </>
                ) : (
                    <WelcomeScreen userName={userName} onSend={handleSend} />
                )}
            </Box>
        </Box>
    );
}
