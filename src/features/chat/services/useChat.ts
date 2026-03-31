import { useState, useRef, useEffect } from "react";
import type { BasicChatMessage, RichChatMessage } from "../types/chat";
import { streamChatCompletions } from "../services/chatStream";

export default function useChat() {
    const [messages, setMessages] = useState<RichChatMessage[]>([]);
    const [streamingMessage, setStreamingMessage] = useState<string | null>(
        null
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [status, setStatus] = useState<
        "idle" | "submitting" | "streaming" | "error"
    >("idle");

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

    const onSend = (content: string) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        // Safety check: Prevents race conditions. Even if the UI blocks input,
        // we explicitly abort existing streams to ensure a clean slate.
        if (status == "streaming") abortRef.current?.abort();

        // Will be changed to the new type called Message
        const userMsg: RichChatMessage = {
            id: crypto.randomUUID(),
            conversationId,
            role: "user",
            content: trimmed,
            // createdAt,
        };

        setMessages((prev) => [...prev, userMsg]);

        // handle error message and status
        setErrorMessage(null);
        setStatus("submitting");
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
                    setStatus("idle");
                    abortRef.current = null;
                }
            },
            (error) => {
                console.error("Chat error", error);
                setStatus("error");
                setErrorMessage(error.message);
                setStreamingMessage(null);
            }
        );
    };

    const onAbort = () => {
        abortRef.current?.abort();
        abortRef.current = null;

        // save partial assistant message
        if (streamingMessage) {
            const assistantMsg: RichChatMessage = {
                id: crypto.randomUUID(),
                conversationId,
                role: "assistant",
                content: streamingMessage,
            };
            setMessages((prev) => [...prev, assistantMsg]);
        }

        setStreamingMessage(null); // clear the streaming cache
        setStatus("idle"); // if user stop streaming, the status will become "idle".
        setErrorMessage(null); // no error message generated when user abort the streaming
    };

    const onRefresh = () => {
        abortRef.current?.abort();
        abortRef.current = null;

        setMessages([]);
        setStreamingMessage(null);
        setErrorMessage(null);
        setStatus("idle");
    };

    return {
        messages,
        streamingMessage,
        errorMessage,
        status,
        onSend,
        onAbort,
        onRefresh,
    };
}
