import { useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useChatMessages } from "../services/useChatMessages";
import { useDocumentTitle } from "../../../shared/hooks";
import {
    CHAT_HISTORY_QUERY_KEY,
    deleteChat,
    type ChatSummary,
} from "../../../shared/network/chat";
import styles from "./ChatLayout.module.css";

const MOBILE_QUERY = "(max-width: 53.75rem)";

export default function ChatLayout() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { chatID } = useParams<{ chatID: string }>();

    const [isMobile, setIsMobile] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia(MOBILE_QUERY).matches
    );
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY);
        const apply = () => {
            setIsMobile(mql.matches);
            setSidebarOpen(!mql.matches);
        };
        apply();
        mql.addEventListener("change", apply);
        return () => mql.removeEventListener("change", apply);
    }, []);

    // The title for the top bar / document: read from the shared chat cache.
    const { data: chat } = useChatMessages(chatID ?? "");
    const title = chatID ? (chat?.title ?? "對話") : "新對話";
    useDocumentTitle(title);

    const closeOnMobile = () => {
        if (isMobile) setSidebarOpen(false);
    };

    const handleSelect = (selected: ChatSummary) => {
        closeOnMobile();
        navigate(`/chat/${selected.id}`);
    };

    const handleNewChat = () => {
        closeOnMobile();
        navigate("/");
    };

    const handleDelete = async (target: ChatSummary) => {
        if (deletingChatId) return;
        setDeletingChatId(target.id);
        try {
            await deleteChat(target.id);
            await queryClient.invalidateQueries({
                queryKey: CHAT_HISTORY_QUERY_KEY,
            });
            toast.success("已刪除對話");
            if (target.id === chatID) navigate("/chat");
        } catch (error) {
            toast.error(
                `刪除對話失敗: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        } finally {
            setDeletingChatId(null);
        }
    };

    return (
        <div className={styles.root}>
            <Sidebar
                open={sidebarOpen}
                mobile={isMobile}
                activeChatId={chatID ?? null}
                deletingChatId={deletingChatId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onNewChat={handleNewChat}
                onClose={() => setSidebarOpen(false)}
            />
            <main className={styles.main}>
                <TopBar
                    title={title}
                    showExpand={!sidebarOpen || isMobile}
                    onExpandSidebar={() => setSidebarOpen(true)}
                />
                <div className={styles.outlet}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
