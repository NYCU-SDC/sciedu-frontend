import { useState, useRef, useEffect } from "react";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { ChatMessageList } from "../components/ChatMessageList";
import { ChatInput } from "../components/ChatInput";
import type { BasicChatMessage, RichChatMessage } from "../types/chat";
import "./ChatPage.css";
import { streamChatCompletions } from "../services/chatStream";
import { toast } from "sonner";

export default function ChatPage() {
    const [messages, setMessages] = useState<RichChatMessage[]>([]);
    const [streamingMessage, setStreamingMessage] = useState<string | null>(
        null
    );
    const [isStreaming, setIsStreaming] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const messageRef = useRef<RichChatMessage[]>([]);

    useEffect(() => {
        messageRef.current = messages;
    }, [messages]);

    // cleanup
    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    const conversationId = "temp"; // for now

    const handleSend = (content: string) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        // Safety check: Prevents race conditions. Even if the UI blocks input,
        // we explicitly abort existing streams to ensure a clean slate.
        if (isStreaming) abortRef.current?.abort();

        // Add user message
        const userMsg: RichChatMessage = {
            id: crypto.randomUUID(),
            conversationId,
            role: "user",
            content: trimmed,
            // createdAt,
        };

        setMessages((prev) => [...prev, userMsg]);

        setIsStreaming(true);
        setStreamingMessage("");

        const apiMessage: BasicChatMessage[] = [...messageRef.current, userMsg];

        let fullResponse = "";

        abortRef.current = streamChatCompletions(
            apiMessage,
            (chunk) => {
                if (chunk.delta) {
                    fullResponse += chunk.delta;
                    setStreamingMessage((prev) => (prev || "") + chunk.delta);
                }

                if (chunk.isFinished) {
                    const assistantMsg: RichChatMessage = {
                        id: crypto.randomUUID(),
                        conversationId,
                        role: "assistant",
                        content: fullResponse,
                    };

                    setMessages((prev) => [...prev, assistantMsg]);
                    setStreamingMessage(null); // which clear the streaming buffer
                    setIsStreaming(false);
                    abortRef.current = null;
                }
            },
            (error) => {
                console.error("Chat error", error);

                toast.error(`傳送失敗: ${error.message}`);

                setIsStreaming(false);
                setStreamingMessage(null);
            }
        );
    };

    const hasMessages = messages.length > 0;

    const messagesToDisplay = streamingMessage
        ? [
              ...messages,
              {
                  id: "streaming-temp-id",
                  conversationId,
                  role: "assistant",
                  content: streamingMessage,
              } as RichChatMessage,
          ]
        : messages;

    return (
        <div className="chat-page-container">
            {/* Content area */}
            <div className="chat-page-content">
                {hasMessages ? (
                    <>
                        <ChatMessageList messages={messagesToDisplay} />
                        <div className="chat-page-input-wrapper">
                            <ChatInput
                                onSend={handleSend}
                                disabled={isStreaming}
                            />
                        </div>
                    </>
                ) : (
                    <WelcomeScreen onSend={handleSend} />
                )}
            </div>
        </div>
    );
}
