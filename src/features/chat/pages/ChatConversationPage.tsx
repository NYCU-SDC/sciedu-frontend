import { useMemo, useState } from "react";
import { useParams } from "react-router";
import type { Message } from "../types/chat";
import useChat from "../services/useChat";
import Thread from "../components/Thread";
import Composer from "../components/Composer";
import styles from "./ChatConversationPage.module.css";

export default function ChatConversationPage() {
    const { chatID = "" } = useParams<{ chatID: string }>();
    const chat = useChat(chatID);

    const [draft, setDraft] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
    );
    const [editingDraft, setEditingDraft] = useState("");

    const busy = chat.status === "streaming" || chat.status === "loading";

    const {
        messages: baseMessages,
        streamingMessageId,
        streamingContent,
    } = chat;

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
        void chat.sendMessage({ content: text });
        setDraft("");
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

    return (
        <div className={styles.conversation}>
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
            <div className={styles.dock}>
                <div className={styles.dockInner}>
                    <Composer
                        value={draft}
                        onChange={setDraft}
                        onSubmit={handleSend}
                        busy={chat.status === "streaming"}
                        onStop={chat.abort}
                    />
                </div>
                <div className={styles.dockNote}>
                    SCIEDU 有可能出錯，重要內容請對照課本。
                </div>
            </div>
        </div>
    );
}
