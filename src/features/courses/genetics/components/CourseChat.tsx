import { Sparkles, RefreshCcw } from "lucide-react";
import Thread from "../../../chat/components/Thread";
import Composer from "../../../chat/components/Composer";
import type { CourseChatController } from "./useCourseChatController";
import styles from "./CourseChat.module.css";

type Props = {
    controller: CourseChatController;
    title?: string;
};

export default function CourseChat({
    controller,
    title = "教材內容討論",
}: Props) {
    const {
        chat,
        messages,
        busy,
        creating,
        draft,
        setDraft,
        editingMessageId,
        editingDraft,
        setEditingDraft,
        errorMessage,
        demoThinking,
        handleSend,
        handleEdit,
        handleSubmitEdit,
        handleCancelEdit,
        handleRegenerate,
        handleRefresh,
    } = controller;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.chatTitle}>
                    <Sparkles className={styles.icon} />
                    <div className={styles.title}>{title}</div>
                </div>
                <button
                    type="button"
                    className={styles.refresh}
                    onClick={handleRefresh}
                    title="重新開始"
                    aria-label="重新開始"
                >
                    <RefreshCcw className={styles.icon} />
                </button>
            </header>

            {messages.length === 0 ? (
                <div className={styles.welcome}>
                    <h1 className={styles.heading}>您好，歡迎回來</h1>
                    {(creating || chat.status === "loading") && (
                        <p className={styles.status} role="status">
                            {creating ? "正在建立對話…" : "正在載入對話…"}
                        </p>
                    )}
                    {errorMessage && (
                        <p className={styles.error} role="alert">
                            {errorMessage}
                        </p>
                    )}
                </div>
            ) : (
                <>
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
                    {demoThinking && (
                        <p className={styles.status} role="status">
                            正在思考…
                        </p>
                    )}
                    {errorMessage && (
                        <p className={styles.error} role="alert">
                            {errorMessage}
                        </p>
                    )}
                </>
            )}

            <div className={styles.dock}>
                <Composer
                    value={draft}
                    onChange={setDraft}
                    onSubmit={handleSend}
                    busy={demoThinking || chat.status === "streaming"}
                    onStop={chat.abort}
                    disabled={creating || chat.status === "loading"}
                />
            </div>
        </div>
    );
}
