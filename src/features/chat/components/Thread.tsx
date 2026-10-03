import { useEffect, useRef } from "react";
import type { BranchDirection, MessageView } from "../types/chat";
import MessageTurn from "./MessageTurn";
import styles from "./Thread.module.css";

type Props = {
    messages: MessageView[];
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
    const pinnedRef = useRef(true);
    const countRef = useRef(messages.length);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keep pinned to the bottom as messages arrive / stream.
    const lastMessage = messages.at(-1);
    useEffect(() => {
        const el = scrollRef.current;
        if (countRef.current !== messages.length) {
            pinnedRef.current = true;
            countRef.current = messages.length;
        }
        if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
    }, [messages.length, lastMessage?.content, lastMessage?.parts]);

    return (
        <div
            className={styles.scroll}
            ref={scrollRef}
            onScroll={() => {
                const el = scrollRef.current;
                if (el)
                    pinnedRef.current =
                        el.scrollHeight - el.scrollTop - el.clientHeight < 64;
            }}
        >
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
