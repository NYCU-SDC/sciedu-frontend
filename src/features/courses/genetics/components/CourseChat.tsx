import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, RefreshCcw } from "lucide-react";
import type { Message } from "../../../chat/types/chat";
import useChat from "../../../chat/services/useChat";
import { startChat } from "../../../chat/services/startChat";
import { CHAT_HISTORY_QUERY_KEY } from "../../../../shared/network/chat";
import Thread from "../../../chat/components/Thread";
import Composer from "../../../chat/components/Composer";
import styles from "./CourseChat.module.css";

export default function CourseChat() {
    const queryClient = useQueryClient();
    const [chatID, setChatID] = useState<string | null>(null);
    const chat = useChat(chatID ?? "");

    const [draft, setDraft] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
    );
    const [editingDraft, setEditingDraft] = useState("");

    const {
        messages: baseMessages,
        streamingMessageId,
        streamingContent,
    } = chat;

    const busy =
        creating || chat.status === "streaming" || chat.status === "loading";

    // Overlay the live stream buffer onto its message (or append a placeholder
    // if the cache hasn't caught up to the streaming reply yet).
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

    const handleSend = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || busy) return;
        setDraft("");

        // First message: lazily create the chat, then hand off to useChat, which
        // picks up the streaming reply via its resume path.
        if (!chatID) {
            setCreating(true);
            startChat(queryClient, trimmed)
                .then(({ chatID: newID }) => {
                    void queryClient.invalidateQueries({
                        queryKey: CHAT_HISTORY_QUERY_KEY,
                    });
                    setChatID(newID);
                })
                .catch((error) => {
                    toast.error(
                        `建立對話失敗: ${
                            error instanceof Error
                                ? error.message
                                : String(error)
                        }`
                    );
                })
                .finally(() => setCreating(false));
            return;
        }

        void chat.sendMessage({ content: trimmed });
    };

    // Seed the editor draft when entering edit mode.
    const handleEdit = (messageId: string) => {
        const target = baseMessages.find((message) => message.id === messageId);
        if (!target) return;
        setEditingDraft(target.content);
        setEditingMessageId(messageId);
    };

    const handleSubmitEdit = () => {
        if (!editingMessageId) return;
        void chat.editAndSend(editingMessageId, editingDraft);
        setEditingMessageId(null);
        setEditingDraft("");
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingDraft("");
    };

    const handleRegenerate = (userMessageId: string) => {
        void chat.resend(userMessageId);
    };

    // Reset back to a fresh, empty chat.
    const handleRefresh = () => {
        chat.abort();
        setChatID(null);
        setDraft("");
        setEditingMessageId(null);
        setEditingDraft("");
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.chatTitle}>
                    <Sparkles className={styles.icon} />
                    <div className={styles.title}>基因性狀討論</div>
                </div>
                <button
                    type="button"
                    className={styles.refresh}
                    onClick={handleRefresh}
                    title="重新開始"
                    aria-label="重新開始"
                >
                    <RefreshCcw className={styles.icon} />
                </button>
            </header>

            {messages.length === 0 ? (
                <div className={styles.welcome}>
                    <h1 className={styles.heading}>您好，歡迎回來</h1>
                </div>
            ) : (
                <Thread
                    messages={messages}
                    actionsDisabled={busy}
                    editingMessageId={editingMessageId}
                    editingDraft={editingDraft}
                    getBranchState={chat.getBranchState}
                    onSwitchBranch={chat.switchBranch}
                    onEdit={handleEdit}
                    onEditingDraftChange={setEditingDraft}
                    onCancelEdit={handleCancelEdit}
                    onSubmitEdit={handleSubmitEdit}
                    onRegenerate={handleRegenerate}
                />
            )}

            <div className={styles.dock}>
                <Composer
                    value={draft}
                    onChange={setDraft}
                    onSubmit={handleSend}
                    busy={chat.status === "streaming"}
                    onStop={chat.abort}
                    disabled={creating}
                />
            </div>
        </div>
    );
}
