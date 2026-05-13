import ChatMessage from "./ChatMessage";
import type { Message } from "../types/chat";
import styles from "./ChatMessageList.module.css";

type BranchDirection = "prev" | "next";

type MessageBranchState = {
    currentIndex: number;
    total: number;
    canGoPrev: boolean;
    canGoNext: boolean;
};

type Props = {
    messages: Message[];
    streamingMessage?: string | null;
    actionsDisabled?: boolean;
    editingMessageId?: string | null;
    editingDraft?: string;
    getBranchState?: (messageId: string) => MessageBranchState;
    onSwitchBranch?: (messageId: string, direction: BranchDirection) => void;
    onEditMessage?: (messageId: string) => void;
    onEditingDraftChange?: (text: string) => void;
    onCancelEditMessage?: () => void;
    onSubmitEditMessage?: () => void;
    onResendMessage?: (messageId: string) => void;
};

export default function ChatMessageList({
    messages,
    streamingMessage,
    actionsDisabled,
    editingMessageId,
    editingDraft,
    getBranchState,
    onSwitchBranch,
    onEditMessage,
    onEditingDraftChange,
    onCancelEditMessage,
    onSubmitEditMessage,
    onResendMessage,
}: Props) {
    return (
        <div className={styles.scroll}>
            <div className={styles.container}>
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        actionsDisabled={actionsDisabled}
                        isEditing={editingMessageId === message.id}
                        editingDraft={editingDraft}
                        branchState={getBranchState?.(message.id)}
                        onSwitchBranch={onSwitchBranch}
                        onEdit={onEditMessage}
                        onEditingDraftChange={onEditingDraftChange}
                        onCancelEdit={onCancelEditMessage}
                        onSubmitEdit={onSubmitEditMessage}
                        onResend={onResendMessage}
                    />
                ))}

                {streamingMessage !== null &&
                    streamingMessage !== undefined && (
                        <ChatMessage
                            message={{
                                id: "streaming-temp-id",
                                role: "assistant",
                                content: streamingMessage,
                                status: "streaming",
                                createdAt: new Date().toISOString(),
                            }}
                        />
                    )}
            </div>
        </div>
    );
}
