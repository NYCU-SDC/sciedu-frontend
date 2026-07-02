import { useEffect, useRef } from "react";
import type { BranchDirection, Message } from "../types/chat";
import MessageTurn from "./MessageTurn";
import styles from "./Thread.module.css";

type Props = {
    messages: Message[];
    actionsDisabled: boolean;
    editingMessageId: string | null;
    editingDraft: string;
    getBranchState: (messageId: string) => {
        currentIndex: number;
        total: number;
        canGoPrev: boolean;
        canGoNext: boolean;
    };
    onSwitchBranch: (messageId: string, direction: BranchDirection) => void;
    onEdit: (messageId: string) => void;
    onEditingDraftChange: (text: string) => void;
    onCancelEdit: () => void;
    onSubmitEdit: () => void;
    onRegenerate: (userMessageId: string) => void;
};

export default function Thread({
    messages,
    actionsDisabled,
    editingMessageId,
    editingDraft,
    getBranchState,
    onSwitchBranch,
    onEdit,
    onEditingDraftChange,
    onCancelEdit,
    onSubmitEdit,
    onRegenerate,
}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keep pinned to the bottom as messages arrive / stream.
    const lastMessage = messages.at(-1);
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, lastMessage?.content]);

    return (
        <div className={styles.scroll} ref={scrollRef}>
            <div className={styles.thread}>
                {messages.map((message) => (
                    <MessageTurn
                        key={message.id}
                        message={message}
                        branchState={getBranchState(message.id)}
                        actionsDisabled={actionsDisabled}
                        isEditing={editingMessageId === message.id}
                        editingDraft={editingDraft}
                        onSwitchBranch={onSwitchBranch}
                        onEdit={onEdit}
                        onEditingDraftChange={onEditingDraftChange}
                        onCancelEdit={onCancelEdit}
                        onSubmitEdit={onSubmitEdit}
                        onRegenerate={onRegenerate}
                    />
                ))}
            </div>
        </div>
    );
}
