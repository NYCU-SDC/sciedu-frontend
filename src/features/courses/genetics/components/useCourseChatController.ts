import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Message } from "../../../chat/types/chat";
import useChat from "../../../chat/services/useChat";
import { startChat } from "../../../chat/services/startChat";
import { CHAT_HISTORY_QUERY_KEY } from "../../../../shared/network/chat";

export function useCourseChatController() {
    const queryClient = useQueryClient();
    const [chatID, setChatID] = useState<string | null>(null);
    const chat = useChat(chatID ?? "");
    const [draft, setDraft] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
    );
    const [editingDraft, setEditingDraft] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const chatGenerationRef = useRef(0);

    useEffect(
        () => () => {
            chatGenerationRef.current += 1;
        },
        []
    );

    const {
        messages: baseMessages,
        streamingMessageId,
        streamingContent,
    } = chat;

    const busy =
        creating || chat.status === "streaming" || chat.status === "loading";

    const messages = useMemo<Message[]>(() => {
        if (streamingContent === null || !streamingMessageId) {
            return baseMessages;
        }

        if (baseMessages.some((message) => message.id === streamingMessageId)) {
            return baseMessages.map((message) =>
                message.id === streamingMessageId
                    ? {
                          ...message,
                          content: streamingContent,
                          status: "streaming",
                      }
                    : message
            );
        }

        return [
            ...baseMessages,
            {
                id: streamingMessageId,
                role: "assistant",
                content: streamingContent,
                previousID: baseMessages.at(-1)?.id,
                status: "streaming",
                createdAt: new Date().toISOString(),
            },
        ];
    }, [baseMessages, streamingMessageId, streamingContent]);

    const handleSend = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || busy) return;

        setDraft("");
        setErrorMessage(null);

        if (!chatID) {
            const generation = chatGenerationRef.current;
            setCreating(true);

            try {
                const { chatID: newID } = await startChat(queryClient, trimmed);
                if (generation !== chatGenerationRef.current) return;

                void queryClient.invalidateQueries({
                    queryKey: CHAT_HISTORY_QUERY_KEY,
                });
                setChatID(newID);
            } catch (error) {
                if (generation !== chatGenerationRef.current) return;

                const message =
                    error instanceof Error ? error.message : String(error);
                setErrorMessage(message);
                setDraft(trimmed);
                toast.error(`建立對話失敗: ${message}`);
            } finally {
                if (generation === chatGenerationRef.current) {
                    setCreating(false);
                }
            }

            return;
        }

        try {
            await chat.sendMessage({ content: trimmed });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setErrorMessage(message);
            setDraft(trimmed);
            toast.error(`傳送失敗: ${message}`);
        }
    };

    const handleEdit = (messageId: string) => {
        const target = baseMessages.find((message) => message.id === messageId);
        if (!target) return;

        setEditingDraft(target.content);
        setEditingMessageId(messageId);
    };

    const handleSubmitEdit = async () => {
        if (!editingMessageId) return;

        try {
            setErrorMessage(null);
            await chat.editAndSend(editingMessageId, editingDraft);
            setEditingMessageId(null);
            setEditingDraft("");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setErrorMessage(message);
            toast.error(`傳送失敗: ${message}`);
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingDraft("");
    };

    const handleRegenerate = async (userMessageId: string) => {
        try {
            setErrorMessage(null);
            await chat.resend(userMessageId);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setErrorMessage(message);
            toast.error(`重新產生失敗: ${message}`);
        }
    };

    const handleRefresh = () => {
        chatGenerationRef.current += 1;
        chat.abort();
        setChatID(null);
        setCreating(false);
        setDraft("");
        setEditingMessageId(null);
        setEditingDraft("");
        setErrorMessage(null);
    };

    return {
        chat,
        messages,
        busy,
        creating,
        draft,
        setDraft,
        editingMessageId,
        editingDraft,
        setEditingDraft,
        errorMessage: errorMessage ?? chat.error?.message ?? null,
        handleSend,
        handleEdit,
        handleSubmitEdit,
        handleCancelEdit,
        handleRegenerate,
        handleRefresh,
    };
}

export type CourseChatController = ReturnType<typeof useCourseChatController>;
