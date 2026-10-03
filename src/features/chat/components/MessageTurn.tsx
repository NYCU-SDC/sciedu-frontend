import { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ChevronLeft, ChevronRight, Pencil, RefreshCw } from "lucide-react";
import type {
    BranchDirection,
    MessageView,
    MessageBranchState,
} from "../types/chat";
import { parseAssistantContent } from "./parseAssistantContent";
import { normalizeMath } from "./normalizeMath";

import styles from "./MessageTurn.module.css";

type Props = {
    message: MessageView;
    branchState: MessageBranchState;
    actionsDisabled: boolean;
    isEditing: boolean;
    editingDraft: string;
    onSwitchBranch: (messageId: string, direction: BranchDirection) => void;
    onEdit: (messageId: string) => void;
    onEditingDraftChange: (text: string) => void;
    onCancelEdit: () => void;
    onSubmitEdit: () => void;
    onRegenerate: (userMessageId: string) => void;
};

function UserMeta({
    message,
    branchState,
    actionsDisabled,
    onSwitchBranch,
    onEdit,
    onRegenerate,
}: Pick<
    Props,
    | "message"
    | "branchState"
    | "actionsDisabled"
    | "onSwitchBranch"
    | "onEdit"
    | "onRegenerate"
>) {
    const { currentIndex, total, canGoPrev, canGoNext } = branchState;
    return (
        <div className={styles.userMeta}>
            {total > 1 ? (
                <div className={styles.branch}>
                    <button
                        type="button"
                        className={`${styles.iconbtn} ${styles.iconbtnSm}`}
                        onClick={() => onSwitchBranch(message.id, "prev")}
                        disabled={actionsDisabled || !canGoPrev}
                        aria-label="上一個版本"
                    >
                        <ChevronLeft size={15} strokeWidth={1.6} />
                    </button>
                    <span className={styles.branchCount}>
                        {currentIndex}/{total}
                    </span>
                    <button
                        type="button"
                        className={`${styles.iconbtn} ${styles.iconbtnSm}`}
                        onClick={() => onSwitchBranch(message.id, "next")}
                        disabled={actionsDisabled || !canGoNext}
                        aria-label="下一個版本"
                    >
                        <ChevronRight size={15} strokeWidth={1.6} />
                    </button>
                </div>
            ) : null}
            <button
                type="button"
                className={styles.iconbtn}
                onClick={() => onEdit(message.id)}
                disabled={actionsDisabled}
                aria-label="編輯訊息"
                title="編輯訊息"
            >
                <Pencil size={15} strokeWidth={1.6} />
            </button>
            <button
                type="button"
                className={styles.iconbtn}
                onClick={() => onRegenerate(message.id)}
                disabled={actionsDisabled}
                title="重新生成"
                aria-label="重新生成"
            >
                <RefreshCw size={16} strokeWidth={1.6} />
            </button>
        </div>
    );
}

function UserEditor({
    editingDraft,
    actionsDisabled,
    onEditingDraftChange,
    onCancelEdit,
    onSubmitEdit,
}: Pick<
    Props,
    | "editingDraft"
    | "actionsDisabled"
    | "onEditingDraftChange"
    | "onCancelEdit"
    | "onSubmitEdit"
>) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const canSubmit = !actionsDisabled && editingDraft.trim().length > 0;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, []);

    return (
        <div className={styles.editor}>
            <textarea
                ref={ref}
                className={styles.editorArea}
                value={editingDraft}
                rows={1}
                disabled={actionsDisabled}
                onChange={(event) => {
                    onEditingDraftChange(event.target.value);
                    event.target.style.height = "auto";
                    event.target.style.height = `${event.target.scrollHeight}px`;
                }}
                onKeyDown={(event) => {
                    if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                    ) {
                        event.preventDefault();
                        if (canSubmit) onSubmitEdit();
                    }
                    if (event.key === "Escape") onCancelEdit();
                }}
            />
            <div className={styles.editorActions}>
                <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={onCancelEdit}
                    disabled={actionsDisabled}
                >
                    取消
                </button>
                <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDark}`}
                    onClick={onSubmitEdit}
                    disabled={!canSubmit}
                >
                    送出
                </button>
            </div>
        </div>
    );
}

function RichText({ text }: { text: string }) {
    const normalized = useMemo(() => normalizeMath(text), [text]);
    return (
        <div className={styles.rich}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    table: ({ node: _node, ...props }) => (
                        <div className={styles.tableWrapper}>
                            <table {...props} />
                        </div>
                    ),
                }}
            >
                {normalized}
            </ReactMarkdown>
        </div>
    );
}
function AssistantMessage({ message }: Pick<Props, "message">) {
    const streaming = message.status === "streaming";
    const activeName = message.characters?.find(
        (character) => character.id === message.activeAgents?.at(-1)
    )?.displayName;
    const visibleParts = message.parts?.filter(
        (part) => part && !part.internal && part.type === "text" && part.text
    );
    const latestPublicPart = message.parts
        ?.filter((part) => part && !part.internal && part.type !== "reasoning")
        .at(-1);
    const tool = streaming && latestPublicPart?.type === "tool_call";
    const retrieval =
        tool && /search|retriev|rag/i.test(latestPublicPart?.name ?? "");
    const answer =
        message.parts === undefined
            ? parseAssistantContent(message.content).answer
            : "";
    return (
        <div className={styles.botWrap}>
            {visibleParts?.map((part) => {
                const character = message.characters?.find(
                    (c) => c.id === part.agent
                );
                return (
                    <section
                        className={styles.agentCard}
                        key={part.id}
                        aria-label={character?.displayName || "學習助手"}
                    >
                        <header className={styles.agentHeader}>
                            <span className={styles.avatar} aria-hidden="true">
                                {(character?.displayName || "助").slice(0, 1)}
                            </span>
                            <strong>
                                {character?.displayName || "學習助手"}
                            </strong>
                            {character?.role && (
                                <span className={styles.agentRole}>
                                    {character.role}
                                </span>
                            )}
                        </header>
                        <RichText text={part.text!} />
                    </section>
                );
            })}
            {answer && (
                <section className={styles.agentCard}>
                    <header className={styles.agentHeader}>
                        <strong>學習助手</strong>
                    </header>
                    <RichText text={answer} />
                </section>
            )}
            {streaming && (
                <div className={styles.activity} role="status">
                    <span className={styles.dots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                    {retrieval
                        ? "正在查找教材…"
                        : tool
                          ? "正在整理資料…"
                          : activeName
                            ? `${activeName}正在回覆…`
                            : "正在回覆…"}
                </div>
            )}
            {!streaming && !answer && !visibleParts?.length && (
                <p className={styles.activity}>
                    {message.status === "failed"
                        ? "回覆尚未完成。"
                        : "這次回覆沒有可顯示的內容。"}
                </p>
            )}
        </div>
    );
}

export default function MessageTurn(props: Props) {
    const { message, isEditing } = props;

    if (message.role === "user") {
        return (
            <div className={`${styles.row} ${styles.rowUser}`}>
                {isEditing ? (
                    <UserEditor {...props} />
                ) : (
                    <div className={styles.userWrap}>
                        <div className={styles.bubble}>{message.content}</div>
                        <UserMeta {...props} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`${styles.row} ${styles.rowBot}`}>
            <AssistantMessage {...props} />
        </div>
    );
}
