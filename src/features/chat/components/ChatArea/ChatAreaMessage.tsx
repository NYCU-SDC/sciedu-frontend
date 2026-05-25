import { useMemo } from "react";
import type { Message } from "../../types/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
    ChevronLeft,
    ChevronRight,
    Edit,
    RefreshCcw,
    TriangleAlert,
} from "lucide-react";
import styles from "./ChatAreaMessage.module.css";
import type { MessageBranchState } from "./ChatArea.types";
import { parseAssistantContent } from "../../utils/parseAssistantContent";
import ThinkingSection from "./ThinkingSection";

type ChatAreaMessageProps = {
    message: Message;
    branchState?: MessageBranchState;
    onSwitchBranch?: (messageId: string, direction: "prev" | "next") => void;
    onEdit?: (messageId: string) => void;
    onResend?: (messageId: string) => void;
};

export default function ChatAreaMessage({
    message,
    branchState,
    onSwitchBranch,
    onEdit,
    onResend,
}: ChatAreaMessageProps) {
    const isUser = message.role === "user";
    const isFailed = message.status === "failed";

    const assistantContent = useMemo(
        () => (isUser ? null : parseAssistantContent(message.content)),
        [isUser, message.content]
    );

    const totalBranches = branchState?.total ?? 1;
    const currentBranchIndex = branchState?.currentIndex ?? 1;

    const canGoPrev = branchState?.canGoPrev ?? false;
    const canGoNext = branchState?.canGoNext ?? false;

    return (
        <div className={isUser ? styles.userRow : styles.assistantRow}>
            <div className={styles.messageShell}>
                <div
                    className={
                        isUser ? styles.userBubble : styles.assistantBubble
                    }
                >
                    {isUser ? (
                        <span>{message.content}</span>
                    ) : isFailed ? (
                        <div className={styles.failedNotice}>
                            <TriangleAlert className={styles.failedIcon} />
                            <span>回覆失敗，請重試。</span>
                        </div>
                    ) : (
                        <>
                            {assistantContent?.thought ||
                            assistantContent?.isThinking ? (
                                <ThinkingSection
                                    key={
                                        assistantContent.isThinking
                                            ? "thinking"
                                            : "complete"
                                    }
                                    thought={assistantContent.thought}
                                    isThinking={assistantContent.isThinking}
                                />
                            ) : null}

                            {assistantContent?.answer ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        table: (props) => (
                                            <div
                                                className={styles.tableWrapper}
                                            >
                                                <table {...props} />
                                            </div>
                                        ),
                                    }}
                                >
                                    {assistantContent.answer}
                                </ReactMarkdown>
                            ) : null}
                        </>
                    )}
                </div>
                {isUser && (
                    <div className={styles.actions}>
                        <div className={styles.switchWrapper}>
                            <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() =>
                                    onSwitchBranch?.(message.id, "prev")
                                }
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
                                onClick={() =>
                                    onSwitchBranch?.(message.id, "next")
                                }
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
                            aria-label="Edit message"
                        >
                            <Edit className={styles.icon} />
                        </button>
                        <button
                            type="button"
                            className={styles.actionButton}
                            onClick={() => onResend?.(message.id)}
                            aria-label="Resend message"
                        >
                            <RefreshCcw className={styles.icon} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
