import type { Message } from "../types/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ChevronLeft, ChevronRight, Edit, RefreshCcw } from "lucide-react";
import styles from "./ChatMessage.module.css";

type BranchDirection = "prev" | "next";

type MessageBranchState = {
    currentIndex: number;
    total: number;
    canGoPrev: boolean;
    canGoNext: boolean;
};

type Props = {
    message: Message;
    branchState?: MessageBranchState;
    actionsDisabled?: boolean;
    onSwitchBranch?: (messageId: string, direction: BranchDirection) => void;
    onEdit?: (messageId: string) => void;
    onResend?: (messageId: string) => void;
};

export default function ChatMessage({
    message,
    branchState,
    actionsDisabled,
    onSwitchBranch,
    onEdit,
    onResend,
}: Props) {
    const isUser = message.role === "user";
    const currentBranchIndex = branchState?.currentIndex ?? 1;
    const totalBranches = branchState?.total ?? 1;
    const canGoPrev =
        !actionsDisabled && !!onSwitchBranch && (branchState?.canGoPrev ?? false);
    const canGoNext =
        !actionsDisabled && !!onSwitchBranch && (branchState?.canGoNext ?? false);
    const canEdit = !actionsDisabled && !!onEdit;
    const canResend = !actionsDisabled && !!onResend;

    return (
        <div
            className={`${styles.messageShell} ${
                isUser ? styles.userShell : styles.assistantShell
            }`}
        >
            <div
                className={`${styles.message} ${
                    isUser ? styles.user : styles.assistant
                }`}
            >
                {/* For assistant messages, render markdown */}
                {isUser ? (
                    <span>{message.content}</span>
                ) : (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            table: ({ node, ...props }) => (
                                <div className={styles.tableWrapper}>
                                    <table {...props} />
                                </div>
                            ),
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                )}
            </div>

            {isUser && (
                <div className={styles.actions}>
                    <div className={styles.switchWrapper}>
                        <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => onSwitchBranch?.(message.id, "prev")}
                            disabled={!canGoPrev}
                            aria-label="Previous branch"
                        >
                            <ChevronLeft className={styles.icon} />
                        </button>
                        <span className={styles.branchIndicator}>
                            {currentBranchIndex}
                            <span className={styles.branchDivider}>/</span>
                            {totalBranches}
                        </span>
                        <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => onSwitchBranch?.(message.id, "next")}
                            disabled={!canGoNext}
                            aria-label="Next branch"
                        >
                            <ChevronRight className={styles.icon} />
                        </button>
                    </div>
                    <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => onEdit?.(message.id)}
                        disabled={!canEdit}
                        aria-label="Edit message"
                    >
                        <Edit className={styles.icon} />
                    </button>
                    <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => onResend?.(message.id)}
                        disabled={!canResend}
                        aria-label="Resend message"
                    >
                        <RefreshCcw className={styles.icon} />
                    </button>
                </div>
            )}
        </div>
    );
}
