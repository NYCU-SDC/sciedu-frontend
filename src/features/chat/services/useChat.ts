import { useState, useRef, useEffect } from "react";
import type { Message } from "../types/chat";
import { createChat } from "./createChat";
import { createMessage } from "./createMessage";
import { streamMessage } from "./streamMessage";

export default function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [streamingMessage, setStreamingMessage] = useState<string | null>(
        null
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [status, setStatus] = useState<
        "idle" | "submitting" | "streaming" | "error"
    >("idle");

    const abortRef = useRef<AbortController | null>(null);
    const messageRef = useRef<Message[]>([]);
    const chatIdRef = useRef<string | null>(null);
    const replyMessageIdRef = useRef<string | null>(null);
    const previousMessageIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        messageRef.current = messages;
        previousMessageIdRef.current = messages.at(-1)?.id;
    }, [messages]);

    // cleanup
    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    const onSend = async (content: string) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        // Safety check: Prevents race conditions. Even if the UI blocks input,
        // we explicitly abort existing streams to ensure a clean slate.
        if (status === "submitting" || status === "streaming") {
            abortRef.current?.abort();
        }

        // handle error message and status
        setErrorMessage(null);
        setStatus("submitting");
        setStreamingMessage("");
        let fullResponse = "";

        try {
            if (!chatIdRef.current) {
                const { chatID } = await createChat();
                chatIdRef.current = chatID;
            }

            const { message, replyMessageID } = await createMessage(
                chatIdRef.current,
                trimmed,
                previousMessageIdRef.current
            );

            setMessages((prev) => [...prev, message]);
            replyMessageIdRef.current = replyMessageID;
            previousMessageIdRef.current = replyMessageID;
            setStatus("streaming");

            abortRef.current = streamMessage(
                replyMessageID,
                (chunk) => {
                    fullResponse += chunk.content;
                    setStreamingMessage((prev) => (prev || "") + chunk.content);
                },
                () => {
                    const assistantMsg: Message = {
                        id: replyMessageID,
                        role: "assistant",
                        content: fullResponse,
                        previousID: message.id,
                        status: "done",
                        createdAt: new Date().toISOString(),
                    };

                    setMessages((prev) => [...prev, assistantMsg]);
                    setStreamingMessage(null);
                    setStatus("idle");
                    abortRef.current = null;
                    replyMessageIdRef.current = null;
                },
                (error) => {
                    console.error("Chat error", error);
                    setStatus("error");
                    setErrorMessage(error.message);
                    setStreamingMessage(null);
                    abortRef.current = null;
                    replyMessageIdRef.current = null;
                }
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setStatus("error");
            setErrorMessage(message);
            setStreamingMessage(null);
        }
    };

    const onAbort = () => {
        abortRef.current?.abort();
        abortRef.current = null;

        // save partial assistant message
        if (streamingMessage && replyMessageIdRef.current) {
            const assistantMsg: Message = {
                id: replyMessageIdRef.current,
                role: "assistant",
                content: streamingMessage,
                previousID: messageRef.current.at(-1)?.id,
                status: "done",
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
        }

        setStreamingMessage(null); // clear the streaming cache
        setStatus("idle"); // if user stop streaming, the status will become "idle".
        setErrorMessage(null); // no error message generated when user abort the streaming
        replyMessageIdRef.current = null;
    };

    const onRefresh = () => {
        abortRef.current?.abort();
        abortRef.current = null;

        setMessages([]);
        setStreamingMessage(null);
        setErrorMessage(null);
        setStatus("idle");
        chatIdRef.current = null;
        replyMessageIdRef.current = null;
        previousMessageIdRef.current = undefined;
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
