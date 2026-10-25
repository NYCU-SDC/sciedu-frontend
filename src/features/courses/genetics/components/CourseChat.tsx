import { ApiError } from "../../../../shared/utils/api";
import { Sparkles, RefreshCcw } from "lucide-react";
import ChatRecovery from "../../../chat/components/ChatRecovery";
import Thread from "../../../chat/components/Thread";
import Composer from "../../../chat/components/Composer";
import type { CourseChatController } from "./useCourseChatController";
import styles from "./CourseChat.module.css";

type Props = {
    controller: CourseChatController;
};

export default function CourseChat({ controller }: Props) {
    const {
        isArgumentation,
        teachingState,
        handleAction,
        configurationLoading,
        configurationError,
        chat,
        title,
        handleRecover,
        startupUncertain,
        messages,
        busy,
        creating,
        draft,
        setDraft,
        editingMessageId,
        editingDraft,
        setEditingDraft,
        errorMessage,
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

            {isArgumentation && teachingState && (
                <p className={styles.status} role="status">
                    論證階段：
                    {
                        (
                            {
                                claim: "Claim 主張",
                                warrant: "Warrant 理由",
                                backing: "Backing 依據",
                                rebuttal: "Rebuttal 反駁",
                            } as const
                        )[teachingState.stage]
                    }
                    {teachingState.phase === "completed"
                        ? "・本頁論證已完成"
                        : ""}
                </p>
            )}
            {configurationError && (
                <p className={styles.error} role="alert">
                    {configurationError}
                </p>
            )}
            {messages.length === 0 ? (
                <div className={styles.welcome}>
                    <h1 className={styles.heading}>
                        {isArgumentation
                            ? "開始本頁科學論證"
                            : "您好，歡迎回來"}
                    </h1>
                    {isArgumentation && (
                        <button
                            type="button"
                            disabled={
                                busy || startupUncertain || configurationLoading
                            }
                            onClick={() => void handleAction("start")}
                        >
                            開始論證
                        </button>
                    )}
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
                    {errorMessage && (
                        <p className={styles.error} role="alert">
                            {errorMessage}
                        </p>
                    )}
                </>
            )}

            <ChatRecovery
                chat={chat}
                onReload={handleRecover}
                onRestart={handleRefresh}
                extraError={errorMessage}
            />
            <div className={styles.dock}>
                {isArgumentation && teachingState?.phase === "choice" && (
                    <div className={styles.learningActions}>
                        <button
                            type="button"
                            disabled={busy || startupUncertain}
                            onClick={() => void handleAction("discuss")}
                        >
                            與 Bunny 討論
                        </button>
                        <button
                            type="button"
                            disabled={busy || startupUncertain}
                            onClick={() => void handleAction("continue")}
                        >
                            {teachingState.stage === "rebuttal"
                                ? "結束論證"
                                : "繼續下一階段"}
                        </button>
                    </div>
                )}
                {isArgumentation && teachingState?.phase === "discussion" && (
                    <button
                        type="button"
                        disabled={busy || startupUncertain}
                        onClick={() => void handleAction("finish_discussion")}
                    >
                        完成討論
                    </button>
                )}
                <Composer
                    value={draft}
                    onChange={setDraft}
                    onSubmit={handleSend}
                    busy={chat.status === "streaming"}
                    onStop={chat.abort}
                    disabled={
                        (chat.error instanceof ApiError &&
                            [401, 404].includes(chat.error.status)) ||
                        startupUncertain ||
                        configurationLoading ||
                        Boolean(configurationError) ||
                        (isArgumentation &&
                            (!teachingState ||
                                ["choice", "completed"].includes(
                                    teachingState.phase
                                ))) ||
                        creating ||
                        chat.status === "loading" ||
                        Boolean(chat.recoveryMessage)
                    }
                />
            </div>
        </div>
    );
}
