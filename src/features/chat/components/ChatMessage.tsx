import type { Message } from "../types/chat";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
    Brain,
    ChevronLeft,
    ChevronRight,
    Edit,
    RefreshCcw,
} from "lucide-react";
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
    isEditing?: boolean;
    editingDraft?: string;
    onSwitchBranch?: (messageId: string, direction: BranchDirection) => void;
    onEdit?: (messageId: string) => void;
    onEditingDraftChange?: (text: string) => void;
    onCancelEdit?: () => void;
    onSubmitEdit?: () => void;
    onResend?: (messageId: string) => void;
};

type ParsedAssistantContent = {
    answer: string;
    thought: string;
    isThinking: boolean;
};

const THINK_OPEN_TAG = "<think>";
const THINK_CLOSE_TAG = "</think>";

function parseAssistantContent(content: string): ParsedAssistantContent {
    const answerParts: string[] = [];
    const thoughtParts: string[] = [];
    let cursor = 0;
    let hasThinkTag = false;
    let isThinking = false;

    while (cursor < content.length) {
        const openIndex = content.indexOf(THINK_OPEN_TAG, cursor);

        if (openIndex === -1) {
            answerParts.push(content.slice(cursor));
            break;
        }

        hasThinkTag = true;
        answerParts.push(content.slice(cursor, openIndex));

        const thoughtStart = openIndex + THINK_OPEN_TAG.length;
        const closeIndex = content.indexOf(THINK_CLOSE_TAG, thoughtStart);

        if (closeIndex === -1) {
            const partialThoughtContent = content.slice(thoughtStart).trim();

            if (partialThoughtContent) {
                thoughtParts.push(partialThoughtContent);
            }

            isThinking = true;
            break;
        }

        const thoughtContent = content.slice(thoughtStart, closeIndex).trim();

        if (thoughtContent) {
            thoughtParts.push(thoughtContent);
        }

        cursor = closeIndex + THINK_CLOSE_TAG.length;
    }

    return {
        answer: hasThinkTag ? answerParts.join("").trim() : content,
        thought: thoughtParts.join("\n\n"),
        isThinking,
    };
}

type ThinkingSectionProps = {
    thought: string;
    isThinking: boolean;
};

function ThinkingSection({ thought, isThinking }: ThinkingSectionProps) {
    const [isExpanded, setIsExpanded] = useState(isThinking);
    const hasThought = thought.trim().length > 0;

    return (
        <section className={styles.thinkingSection}>
            <button
                type="button"
                className={styles.thinkingHeader}
                onClick={() => {
                    if (hasThought) {
                        setIsExpanded((value) => !value);
                    }
                }}
                aria-expanded={hasThought ? isExpanded : undefined}
                disabled={!hasThought}
            >
                <Brain className={styles.thinkingIcon} />
                <span className={styles.thinkingLabel}>
                    {isThinking ? "正在思考" : "思考了一陣子"}
                </span>
                {isThinking ? (
                    <span className={styles.thinkingDots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                ) : null}
            </button>

            {hasThought && isExpanded ? (
                <div className={styles.thinkingBody}>{thought}</div>
            ) : null}
        </section>
    );
}

export default function ChatMessage({
    message,
    branchState,
    actionsDisabled,
    isEditing,
    editingDraft,
    onSwitchBranch,
    onEdit,
    onEditingDraftChange,
    onCancelEdit,
    onSubmitEdit,
    onResend,
}: Props) {
    const editInputRef = useRef<HTMLTextAreaElement | null>(null);
    const isUser = message.role === "user";
    const draftValue = editingDraft ?? message.content;
    const currentBranchIndex = branchState?.currentIndex ?? 1;
    const totalBranches = branchState?.total ?? 1;
    const canGoPrev =
        !actionsDisabled &&
        !!onSwitchBranch &&
        (branchState?.canGoPrev ?? false);
    const canGoNext =
        !actionsDisabled &&
        !!onSwitchBranch &&
        (branchState?.canGoNext ?? false);
    const canEdit = !actionsDisabled && !!onEdit;
    const canResend = !actionsDisabled && !!onResend;
    const canSubmitEdit =
        !actionsDisabled && !!onSubmitEdit && draftValue.trim().length > 0;
    const assistantContent = isUser
        ? null
        : parseAssistantContent(message.content);

    useEffect(() => {
        if (!isEditing) return;

        const input = editInputRef.current;
        input?.focus();
        input?.setSelectionRange(input.value.length, input.value.length);
    }, [isEditing]);

    if (isUser && isEditing) {
        return (
            <div className={`${styles.messageShell} ${styles.userShell}`}>
                <form
                    className={styles.editPanel}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSubmitEdit) {
                            onSubmitEdit?.();
                        }
                    }}
                >
                    <div className={styles.editFieldInner}>
                        <div className={styles.editMirror}>
                            {draftValue + " "}
                        </div>
                        <textarea
                            ref={editInputRef}
                            className={styles.editField}
                            value={draftValue}
                            onChange={(event) =>
                                onEditingDraftChange?.(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key === "Enter" &&
                                    (event.metaKey || event.ctrlKey)
                                ) {
                                    event.preventDefault();
                                    if (canSubmitEdit) {
                                        onSubmitEdit?.();
                                    }
                                }
                            }}
                            disabled={actionsDisabled}
                            rows={1}
                        />
                    </div>
                    <div className={styles.editActions}>
                        <button
                            type="button"
                            className={styles.editCancelButton}
                            onClick={onCancelEdit}
                            disabled={actionsDisabled}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className={styles.editSubmitButton}
                            disabled={!canSubmitEdit}
                        >
                            送出
                        </button>
                    </div>
                </form>
            </div>
        );
    }

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
                                    table: ({ node, ...props }) => (
                                        <div className={styles.tableWrapper}>
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
