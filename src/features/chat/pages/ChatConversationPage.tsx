import { useState } from "react";
import { useParams } from "react-router";
import { usePostHog } from "@posthog/react";
import { toast } from "sonner";
import ChatRecovery from "../components/ChatRecovery";
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

    const messages = chat.messages;
    const baseMessages = messages;

    const handleSend = async (text: string) => {
        try {
            posthog.capture("message_sent", { chat_id: chatID });
            await chat.sendMessage({ content: text });
            setDraft("");
        } catch {
            toast.error("傳送失敗，請重試。");
        }
    };

    // Seed the editor draft when entering edit mode.
    const handleEdit = (messageId: string) => {
        const target = baseMessages.find((message) => message.id === messageId);
        if (!target) return;
        setEditingDraft(target.content);
        setEditingMessageId(messageId);
    };

    const handleSubmitEdit = async () => {
        if (!editingMessageId) return;
        posthog.capture("message_edited", {
            chat_id: chatID,
            message_id: editingMessageId,
        });
        try {
            await chat.editAndSend(editingMessageId, editingDraft);
            setEditingMessageId(null);
            setEditingDraft("");
        } catch {
            toast.error("編輯訊息傳送失敗，請重試。");
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingDraft("");
    };

    const handleRegenerate = (userMessageId: string) => {
        posthog.capture("message_regenerated", {
            chat_id: chatID,
            message_id: userMessageId,
        });
        void chat
            .resend(userMessageId)
            .catch(() => toast.error("重新生成失敗，請重試。"));
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
            <ChatRecovery chat={chat} />
            <div className={styles.dock}>
                <div className={styles.dockInner}>
                    <Composer
                        value={draft}
                        onChange={setDraft}
                        onSubmit={handleSend}
                        busy={chat.status === "streaming"}
                        disabled={
                            chat.status === "loading" ||
                            Boolean(chat.recoveryMessage)
                        }
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
