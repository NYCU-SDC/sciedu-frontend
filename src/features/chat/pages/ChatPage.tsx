import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ChatInput from "../components/ChatInput";
import ChatNavBar from "../components/ChatNavBar";
import ChatMessageList from "../components/ChatMessageList";
import ChatSidebar from "../components/ChatSidebar";
import WelcomeScreen from "../components/WelcomeScreen";
import { deleteChat } from "../services/deleteChat";
import { CHAT_HISTORY_QUERY_KEY } from "../services/listChats";
import useChat, { chatMessagesQueryKey } from "../services/useChat";
import type { ChatSummary } from "../types/chat";
import styles from "./ChatPage.module.css";

export default function ChatPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { chatId: chatIdParam } = useParams<{ chatId: string }>();
    const chatId = chatIdParam ?? null;

    const [chatTitle, setChatTitle] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

    const {
        messages,
        displayMessages,
        draftInput,
        editingDraft,
        editingMessageId,
        errorMessage,
        status,
        onSend,
        onDraftChange,
        onEditMessage,
        onEditingDraftChange,
        onCancelEditMessage,
        onSubmitEditMessage,
        onResendMessage,
        onRetryFailedAssistant,
        onSwitchBranch,
        getBranchState,
    } = useChat({
        chatId,
        onChatCreated: (newChatId) =>
            navigate(`/chat/${newChatId}`, { replace: true }),
    });

    useEffect(() => {
        if (status === "error" && errorMessage) {
            toast.error(errorMessage);
        }
    }, [status, errorMessage]);

    const isBusy =
        status === "submitting" ||
        status === "streaming" ||
        deletingChatId !== null;

    const closeSidebarOnCompactScreen = () => {
        if (window.matchMedia("(max-width: 40rem)").matches) {
            setSidebarOpen(false);
        }
    };

    const handleSelectChat = (chat: ChatSummary) => {
        if (isBusy) return;

        setChatTitle(chat.title);
        navigate(`/chat/${chat.id}`);
        closeSidebarOnCompactScreen();
    };

    const handleNewChat = () => {
        if (isBusy) return;

        setChatTitle(null);
        navigate("/chat");
        closeSidebarOnCompactScreen();
    };

    const handleDeleteChat = async (chat: ChatSummary) => {
        if (isBusy) return;

        setDeletingChatId(chat.id);

        try {
            await deleteChat(chat.id);
            await queryClient.invalidateQueries({
                queryKey: CHAT_HISTORY_QUERY_KEY,
            });
            queryClient.removeQueries({
                queryKey: chatMessagesQueryKey(chat.id),
            });

            if (chat.id === chatId) {
                setChatTitle(null);
                navigate("/chat");
            }

            toast.success("已刪除對話");
        } catch (error) {
            console.error("Delete chat failed", error);
            toast.error(
                `刪除對話失敗: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        } finally {
            setDeletingChatId(null);
        }
    };

    // Show the chat view whenever we're in a specific conversation (chatId
    // set) or actively sending — otherwise the WelcomeScreen would flash
    // while listMessages is in flight for an existing /chat/<id> URL.
    const showChat =
        chatId !== null ||
        displayMessages.length > 0 ||
        status === "submitting" ||
        status === "streaming";
    const resolvedTitle =
        chatTitle ??
        messages.find((message) => message.role === "user")?.content ??
        "新的對話";

    return (
        <div className={styles.container}>
            {sidebarOpen ? (
                <>
                    <div
                        className={styles.sidebarBackdrop}
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                    <ChatSidebar
                        isOpen={sidebarOpen}
                        currentChatId={chatId}
                        disabled={isBusy}
                        deletingChatId={deletingChatId}
                        onSelectChat={handleSelectChat}
                        onDeleteChat={handleDeleteChat}
                        onNewChat={handleNewChat}
                    />
                </>
            ) : null}
            <div className={styles.content}>
                <ChatNavBar
                    title={resolvedTitle}
                    onMenuClick={() => setSidebarOpen((open) => !open)}
                />
                {showChat ? (
                    <>
                        <ChatMessageList
                            messages={displayMessages}
                            actionsDisabled={isBusy}
                            editingMessageId={editingMessageId}
                            editingDraft={editingDraft}
                            getBranchState={getBranchState}
                            onSwitchBranch={onSwitchBranch}
                            onEditMessage={onEditMessage}
                            onEditingDraftChange={onEditingDraftChange}
                            onCancelEditMessage={onCancelEditMessage}
                            onSubmitEditMessage={onSubmitEditMessage}
                            onResendMessage={onResendMessage}
                            onRetryFailedAssistant={onRetryFailedAssistant}
                        />
                        <div className={styles.inputWrapper}>
                            <ChatInput
                                value={draftInput}
                                onChange={onDraftChange}
                                onSend={onSend}
                                disabled={isBusy}
                            />
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <WelcomeScreen onSend={onSend} disabled={isBusy} />
                    </div>
                )}
            </div>
        </div>
    );
}
