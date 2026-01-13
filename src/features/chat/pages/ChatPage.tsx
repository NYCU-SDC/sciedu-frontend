import { useState, useRef, useEffect } from "react";
import { WelcomeScreen, ChatMessageList, ChatInput } from "../components";
import type { ApiChatMessage, Message } from "../types/chat";
import "./ChatPage.css";
import {
    mockStreamChatCompletions,
    streamChatCompletions,
} from "../services/chatStream";

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const messageRef = useRef<Message[]>([]);

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

        // const now

        // Add user message
        const userMsg: Message = {
            id: crypto.randomUUID(),
            conversationId,
            role: "user",
            content: trimmed,
            // createdAt,
        };

        // Add assistant message
        const assistantId = crypto.randomUUID();
        const assistantMsg: Message = {
            id: assistantId,
            conversationId,
            role: "assistant",
            content: "",
            // createdAt,
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setIsStreaming(true); // disable the chat input for the UI

        const apiMessage: ApiChatMessage[] = [
            ...messageRef.current,
            userMsg,
        ].map((m) => ({ role: m.role, content: m.content }));

        // Using mock for UI testing - switch to streamChatCompletions when backend is ready
        abortRef.current = mockStreamChatCompletions(apiMessage, (chunk) => {
            if (chunk.delta) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id == assistantId
                            ? { ...m, content: m.content + chunk.delta }
                            : m
                    )
                );
            }

            if (chunk.isFinished) {
                setIsStreaming(false);
                abortRef.current = null;
            }
        });
    };

    const hasMessages = messages.length > 0;

    return (
        <div className="chat-page-container">
            {/* Content area */}
            <div className="chat-page-content">
                {hasMessages ? (
                    <>
                        <ChatMessageList messages={messages} />
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
