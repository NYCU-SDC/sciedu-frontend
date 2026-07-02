import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { MoreHorizontal, PanelLeft, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "../../../shared/auth";
import Logo from "../../../shared/components/Logo";
import {
    CHAT_HISTORY_QUERY_KEY,
    listChats,
    type ChatSummary,
} from "../../../shared/network/chat";
import styles from "./Sidebar.module.css";

const PAGE_SIZE = 20;

type Props = {
    open: boolean;
    mobile: boolean;
    activeChatId: string | null;
    deletingChatId: string | null;
    onSelect: (chat: ChatSummary) => void;
    onDelete: (chat: ChatSummary) => void;
    onNewChat: () => void;
    onClose: () => void;
};

type Group = { label: string; items: ChatSummary[] };

const DAY = 24 * 60 * 60 * 1000;

/** Bucket chats into 今天 / 過去 7 天 / 更早 by their last-updated time. */
function groupChats(chats: ChatSummary[]): Group[] {
    const now = Date.now();
    const today: ChatSummary[] = [];
    const week: ChatSummary[] = [];
    const older: ChatSummary[] = [];

    for (const chat of chats) {
        const age = now - new Date(chat.updatedAt).getTime();
        if (age < DAY) today.push(chat);
        else if (age < 7 * DAY) week.push(chat);
        else older.push(chat);
    }

    return [
        { label: "今天", items: today },
        { label: "過去 7 天", items: week },
        { label: "更早", items: older },
    ].filter((group) => group.items.length > 0);
}

export default function Sidebar({
    open,
    mobile,
    activeChatId,
    deletingChatId,
    onSelect,
    onDelete,
    onNewChat,
    onClose,
}: Props) {
    const { session } = useAuth();
    const [query, setQuery] = useState("");
    const { ref, inView } = useInView({ rootMargin: "80px 0px" });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: CHAT_HISTORY_QUERY_KEY,
        initialPageParam: 1,
        queryFn: ({ pageParam }) => listChats(pageParam, PAGE_SIZE),
        getNextPageParam: (lastPage) =>
            lastPage.hasNextPage ? lastPage.currentPage + 1 : undefined,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const groups = useMemo(() => {
        const chats = data?.pages.flatMap((page) => page.items) ?? [];
        const filtered = query
            ? chats.filter((chat) => chat.title.includes(query))
            : chats;
        return groupChats(filtered);
    }, [data, query]);

    const isEmpty =
        !isLoading && !isError && groups.every((group) => !group.items.length);

    const username = session?.username ?? "訪客";
    const email = session?.email ?? "請登入以使用 SciEdu";
    const initial = username.slice(0, 1) || "客";

    return (
        <>
            {mobile && open ? (
                <div
                    className={styles.scrim}
                    onClick={onClose}
                    aria-hidden="true"
                />
            ) : null}
            <aside
                className={styles.sidebar}
                data-open={open}
                data-mobile={mobile}
                aria-label="對話側欄"
            >
                <div className={styles.top}>
                    <span className={styles.brand}>
                        <Logo className={styles.brandIcon} />
                        <span className={styles.brandWord}>SCIEDU</span>
                    </span>
                    <button
                        type="button"
                        className={styles.ghostBtn}
                        title="收合側欄"
                        aria-label="收合側欄"
                        onClick={onClose}
                    >
                        <PanelLeft size={19} strokeWidth={1.6} />
                    </button>
                </div>

                <button
                    type="button"
                    className={styles.newchat}
                    onClick={onNewChat}
                >
                    <Plus size={18} strokeWidth={1.6} />
                    <span>新對話</span>
                </button>

                <div className={styles.search}>
                    <Search size={16} strokeWidth={1.6} />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="搜尋對話"
                        aria-label="搜尋對話"
                    />
                </div>

                <nav className={styles.history}>
                    {isLoading ? (
                        <div className={styles.historyEmpty}>載入中…</div>
                    ) : null}
                    {isError ? (
                        <div className={styles.historyEmpty}>載入失敗</div>
                    ) : null}
                    {isEmpty ? (
                        <div className={styles.historyEmpty}>
                            {query ? "找不到符合的對話" : "尚無對話紀錄"}
                        </div>
                    ) : null}

                    {groups.map((group) => (
                        <div className={styles.histGroup} key={group.label}>
                            <div className={styles.histLabel}>
                                {group.label}
                            </div>
                            {group.items.map((chat) => (
                                <button
                                    key={chat.id}
                                    type="button"
                                    className={styles.histItem}
                                    data-active={chat.id === activeChatId}
                                    onClick={() => onSelect(chat)}
                                    title={chat.title}
                                >
                                    <span className={styles.histTitle}>
                                        {chat.title}
                                    </span>
                                    <span
                                        className={styles.histDel}
                                        role="button"
                                        tabIndex={-1}
                                        title="刪除"
                                        aria-label={`刪除對話 ${chat.title}`}
                                        data-busy={deletingChatId === chat.id}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onDelete(chat);
                                        }}
                                    >
                                        <Trash2 size={15} strokeWidth={1.6} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    ))}

                    <div
                        ref={ref}
                        className={styles.sentinel}
                        aria-hidden="true"
                    />
                </nav>

                <div className={styles.user}>
                    <span className={styles.avatar}>{initial}</span>
                    <span className={styles.userInfo}>
                        <span className={styles.userName}>{username}</span>
                        <span className={styles.userPlan}>{email}</span>
                    </span>
                    <MoreHorizontal size={18} strokeWidth={1.6} />
                </div>
            </aside>
        </>
    );
}
