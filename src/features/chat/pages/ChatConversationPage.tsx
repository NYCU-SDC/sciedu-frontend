import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router";
import { usePostHog } from "@posthog/react";
import type { Message } from "../types/chat";
import useChat from "../services/useChat";
import Thread from "../components/Thread";
import Composer from "../components/Composer";
import styles from "./ChatConversationPage.module.css";

export default function ChatConversationPage() {
    const { chatID = "" } = useParams<{ chatID: string }>();
    const chat = useChat(chatID);
    const posthog = usePostHog();

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
        posthog.capture("message_sent", { chat_id: chatID });
        void chat.sendMessage({ content: text });
        setDraft("");
    };

    // Handlers are memoized so their identities survive streaming frames —
    // MessageTurn is memoized on shallow prop equality, and an inline handler
    // would force every turn to re-render each frame.

    // Seed the editor draft when entering edit mode.
    const handleEdit = useCallback(
        (messageId: string) => {
            const target = baseMessages.find(
                (message) => message.id === messageId
            );
            if (!target) return;
            setEditingDraft(target.content);
            setEditingMessageId(messageId);
        },
        [baseMessages]
    );

    const { editAndSend, resend } = chat;

    const handleSubmitEdit = useCallback(() => {
        if (!editingMessageId) return;
        posthog.capture("message_edited", {
            chat_id: chatID,
            message_id: editingMessageId,
        });
        void editAndSend(editingMessageId, editingDraft);
        setEditingMessageId(null);
        setEditingDraft("");
    }, [editingMessageId, editingDraft, editAndSend, posthog, chatID]);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditingDraft("");
    }, []);

    const handleRegenerate = useCallback(
        (userMessageId: string) => {
            posthog.capture("message_regenerated", {
                chat_id: chatID,
                message_id: userMessageId,
            });
            void resend(userMessageId);
        },
        [resend, posthog, chatID]
    );

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
                    SciLLM 有可能出錯，重要內容請對照課本。
                </div>
            </div>
        </div>
    );
}
