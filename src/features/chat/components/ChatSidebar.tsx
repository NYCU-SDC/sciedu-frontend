import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Plus, TestTubeDiagonal, Trash2 } from "lucide-react";
import { useInView } from "react-intersection-observer";
import {
    CHAT_HISTORY_QUERY_KEY,
    listChats,
    type ChatSummary,
} from "../services/listChats";
import styles from "./ChatSidebar.module.css";

const CHAT_HISTORY_PAGE_SIZE = 20;

type ChatSidebarProps = {
    isOpen: boolean;
    currentChatId: string | null;
    disabled?: boolean;
    deletingChatId?: string | null;
    onSelectChat: (chat: ChatSummary) => void;
    onDeleteChat: (chat: ChatSummary) => void;
    onNewChat: () => void;
};

export default function ChatSidebar({
    isOpen,
    currentChatId,
    disabled = false,
    deletingChatId = null,
    onSelectChat,
    onDeleteChat,
    onNewChat,
}: ChatSidebarProps) {
    const { ref, inView } = useInView({
        rootMargin: "80px 0px",
    });

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isError,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: CHAT_HISTORY_QUERY_KEY,
        initialPageParam: 1,
        enabled: isOpen,
        queryFn: ({ pageParam }) =>
            listChats(pageParam, CHAT_HISTORY_PAGE_SIZE),
        getNextPageParam: (lastPage) =>
            lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

    const chats = data?.pages.flatMap((page) => page.items) ?? [];
    const actionsDisabled = disabled || isLoading;

    return (
        <aside className={styles.sidebar} aria-label="Chat history">
            <div className={styles.brand}>
                <TestTubeDiagonal className={styles.brandIcon} />
                <span>SCIEDU</span>
            </div>

            <div className={styles.sectionTitle}>對話紀錄</div>

            <div className={styles.chatList}>
                {isLoading ? <div className={styles.status}>載入中</div> : null}

                {isError ? (
                    <div className={styles.status}>
                        {error instanceof Error ? error.message : "載入失敗"}
                    </div>
                ) : null}

                {!isLoading && !isError && chats.length === 0 ? (
                    <div className={styles.status}>沒有對話紀錄</div>
                ) : null}

                {chats.map((chat) => {
                    const isDeleting = deletingChatId === chat.id;
                    const itemDisabled = actionsDisabled || isDeleting;

                    return (
                        <div
                            key={chat.id}
                            className={styles.chatItem}
                            data-active={chat.id === currentChatId}
                            data-disabled={itemDisabled}
                        >
                            <button
                                type="button"
                                className={styles.chatSelect}
                                disabled={itemDisabled}
                                onClick={() => onSelectChat(chat)}
                                title={chat.title}
                            >
                                <span className={styles.chatTitle}>
                                    {chat.title}
                                </span>
                            </button>
                            <button
                                type="button"
                                className={styles.deleteButton}
                                disabled={itemDisabled}
                                onClick={() => onDeleteChat(chat)}
                                aria-label={`刪除對話 ${chat.title}`}
                                title="刪除對話"
                            >
                                <Trash2 className={styles.deleteIcon} />
                            </button>
                        </div>
                    );
                })}

                <div ref={ref} className={styles.sentinel} aria-hidden="true" />

                {isFetchingNextPage ? (
                    <div
                        className={styles.loadingDots}
                        aria-label="載入更多對話"
                    >
                        <span />
                        <span />
                        <span />
                    </div>
                ) : null}
            </div>

            <button
                type="button"
                className={styles.newChatButton}
                onClick={onNewChat}
            >
                <Plus className={styles.newChatIcon} />
                <span>新對話</span>
            </button>
        </aside>
    );
}
