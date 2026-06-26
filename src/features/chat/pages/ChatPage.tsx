import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ChatSummary, Message } from "../types/chat";
import ChatInput from "../components/ChatInput";
import ChatNavBar from "../components/ChatNavBar";
import ChatMessageList from "../components/ChatMessageList";
import ChatSidebar from "../components/ChatSidebar";
import WelcomeScreen from "../components/WelcomeScreen";
import { useDocumentTitle } from "../../../shared/hooks";
import { createChat } from "../services/createChat";
import { createMessage } from "../services/createMessage";
import { deleteChat } from "../services/deleteChat";
import { CHAT_HISTORY_QUERY_KEY } from "../services/listChats";
import { listMessages } from "../services/listMessages";
import { streamMessage } from "../services/streamMessage";
import styles from "./ChatPage.module.css";

type BranchDirection = "prev" | "next";

type MessageBranchState = {
    currentIndex: number;
    total: number;
    canGoPrev: boolean;
    canGoNext: boolean;
};

const ROOT_BRANCH_KEY = "__root__";

function toBranchKey(previousID?: string) {
    return previousID ?? ROOT_BRANCH_KEY;
}

function buildChildrenMap(messages: Message[]) {
    const map = new Map<string, Message[]>();

    for (const message of messages) {
        const key = toBranchKey(message.previousID);
        const siblings = map.get(key);

        if (siblings) {
            siblings.push(message);
        } else {
            map.set(key, [message]);
        }
    }

    return map;
}

function buildVisibleMessages(
    messages: Message[],
    branchSelectionByParent: Record<string, string>
) {
    const childrenMap = buildChildrenMap(messages);
    const visible: Message[] = [];
    let currentKey = ROOT_BRANCH_KEY;

    while (true) {
        const children = childrenMap.get(currentKey);
        if (!children || children.length === 0) break;

        const selectedID = branchSelectionByParent[currentKey];
        const selectedMessage =
            children.find((message) => message.id === selectedID) ??
            children[children.length - 1];

        visible.push(selectedMessage);
        currentKey = selectedMessage.id;
    }

    return visible;
}

function appendIfMissing(messages: Message[], message: Message) {
    return messages.some((item) => item.id === message.id)
        ? messages
        : [...messages, message];
}

export default function ChatPage() {
    const queryClient = useQueryClient();
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [chatID, setChatID] = useState<string | null>(null);
    const [selectedChatTitle, setSelectedChatTitle] = useState<string | null>(
        null
    );
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string | null>(
        null
    );
    const [isSending, setIsSending] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
    const [draftInput, setDraftInput] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
    );
    const [editingDraft, setEditingDraft] = useState("");
    const [pendingReplyParentId, setPendingReplyParentId] = useState<
        string | undefined
    >(undefined);
    const [branchSelectionByParent, setBranchSelectionByParent] = useState<
        Record<string, string>
    >({});

    const abortRef = useRef<AbortController | null>(null);
    const messageRef = useRef<Message[]>([]);
    const chatIdRef = useRef<string | null>(null);
    const replyMessageIdRef = useRef<string | null>(null);

    useEffect(() => {
        messageRef.current = allMessages;
    }, [allMessages]);

    useEffect(() => {
        chatIdRef.current = chatID;
    }, [chatID]);

    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    const visibleMessages = buildVisibleMessages(
        allMessages,
        branchSelectionByParent
    );

    const isBusy =
        isSending || isStreaming || isLoadingChat || deletingChatId !== null;

    const displayMessages: Message[] =
        streamingMessage !== null
            ? [
                  ...visibleMessages,
                  {
                      id: "streaming-temp-id",
                      role: "assistant",
                      content: streamingMessage,
                      previousID: pendingReplyParentId,
                      status: "streaming",
                      createdAt: new Date().toISOString(),
                  },
              ]
            : visibleMessages;

    const selectMessage = (message: Message) => {
        setBranchSelectionByParent((prev) => ({
            ...prev,
            [toBranchKey(message.previousID)]: message.id,
        }));
    };

    const clearPendingReplyState = () => {
        setStreamingMessage(null);
        setIsStreaming(false);
        setIsSending(false);
        abortRef.current = null;
        replyMessageIdRef.current = null;
        setPendingReplyParentId(undefined);
    };

    const resetConversationState = () => {
        abortRef.current?.abort();
        clearPendingReplyState();
        setAllMessages([]);
        setEditingDraft("");
        setEditingMessageId(null);
        setDraftInput("");
        setBranchSelectionByParent({});
    };

    const closeSidebarOnCompactScreen = () => {
        if (window.matchMedia("(max-width: 40rem)").matches) {
            setSidebarOpen(false);
        }
    };

    const refreshChatHistory = () => {
        void queryClient.invalidateQueries({
            queryKey: CHAT_HISTORY_QUERY_KEY,
        });
    };

    const ensureChatID = async () => {
        if (chatIdRef.current) {
            return chatIdRef.current;
        }

        const createdChat = await createChat();
        chatIdRef.current = createdChat.chatID;
        setChatID(createdChat.chatID);
        return createdChat.chatID;
    };

    const finishAssistantMessage = async (
        currentChatID: string,
        replyMessageID: string,
        parentUserID: string,
        fallbackContent: string
    ) => {
        const fallbackAssistantMessage: Message = {
            id: replyMessageID,
            role: "assistant",
            content: fallbackContent,
            previousID: parentUserID,
            status: "done",
            createdAt: new Date().toISOString(),
        };

        try {
            const latestMessages = await listMessages(currentChatID);
            const assistantMessage =
                latestMessages.messages.find(
                    (message) => message.id === replyMessageID
                ) ??
                latestMessages.messages.find(
                    (message) =>
                        message.role === "assistant" &&
                        message.previousID === parentUserID
                ) ??
                fallbackAssistantMessage;

            setAllMessages(
                appendIfMissing(latestMessages.messages, assistantMessage)
            );
            selectMessage(assistantMessage);
        } catch (error) {
            console.error("List messages failed", error);
            setAllMessages((prev) =>
                appendIfMissing(prev, fallbackAssistantMessage)
            );
            selectMessage(fallbackAssistantMessage);
        }

        clearPendingReplyState();
    };

    const sendMessageBranch = async (
        content: string,
        branchPreviousID?: string,
        options?: { clearDraft?: boolean; clearEditing?: boolean }
    ) => {
        const trimmed = content.trim();
        if (!trimmed || isBusy) return;

        setIsSending(true);
        setStreamingMessage(null);

        try {
            const currentChatID = await ensureChatID();
            const { message, replyMessageID } = await createMessage(
                currentChatID,
                trimmed,
                branchPreviousID
            );

            let fullResponse = "";

            setAllMessages((prev) => [...prev, message]);
            selectMessage(message);
            refreshChatHistory();
            replyMessageIdRef.current = replyMessageID;
            setPendingReplyParentId(message.id);
            setStreamingMessage("");
            setIsSending(false);
            setIsStreaming(true);

            if (options?.clearDraft ?? true) {
                setDraftInput("");
            }

            if (options?.clearEditing ?? true) {
                setEditingDraft("");
                setEditingMessageId(null);
            }

            abortRef.current = streamMessage(
                replyMessageID,
                (chunk) => {
                    fullResponse += chunk.content;
                    setStreamingMessage((prev) => (prev || "") + chunk.content);
                },
                () => {
                    void finishAssistantMessage(
                        currentChatID,
                        replyMessageID,
                        message.id,
                        fullResponse
                    );
                },
                (error) => {
                    console.error("Chat error", error);
                    toast.error(`傳送失敗: ${error.message}`);
                    clearPendingReplyState();
                }
            );
        } catch (error) {
            console.error("Send message failed", error);
            toast.error(
                `傳送失敗: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            clearPendingReplyState();
        }
    };

    const handleSend = async (content: string) => {
        await sendMessageBranch(content, visibleMessages.at(-1)?.id, {
            clearDraft: true,
            clearEditing: true,
        });
    };

    const handleSelectChat = async (chat: ChatSummary) => {
        if (isBusy) return;

        setIsLoadingChat(true);
        resetConversationState();
        setChatID(chat.id);
        chatIdRef.current = chat.id;
        setSelectedChatTitle(chat.title);

        try {
            const latestMessages = await listMessages(chat.id);
            setAllMessages(latestMessages.messages);
            closeSidebarOnCompactScreen();
        } catch (error) {
            console.error("Load chat failed", error);
            toast.error(
                `載入對話失敗: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        } finally {
            setIsLoadingChat(false);
        }
    };

    const handleNewChat = () => {
        if (isBusy) return;

        resetConversationState();
        setChatID(null);
        chatIdRef.current = null;
        setSelectedChatTitle(null);
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

            if (chat.id === chatIdRef.current) {
                resetConversationState();
                setChatID(null);
                chatIdRef.current = null;
                setSelectedChatTitle(null);
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

    const handleEditMessage = (messageId: string) => {
        if (isBusy) return;

        const target = messageRef.current.find(
            (message) => message.id === messageId && message.role === "user"
        );
        if (!target) return;

        setEditingDraft(target.content);
        setEditingMessageId(messageId);
    };

    const handleCancelEditMessage = () => {
        setEditingDraft("");
        setEditingMessageId(null);
    };

    const handleSubmitEditMessage = async () => {
        if (!editingMessageId || isBusy) return;

        const target = messageRef.current.find(
            (message) =>
                message.id === editingMessageId && message.role === "user"
        );
        if (!target) return;

        await sendMessageBranch(editingDraft, target.previousID, {
            clearDraft: false,
            clearEditing: true,
        });
    };

    const handleResendMessage = async (messageId: string) => {
        if (isBusy) return;

        const target = messageRef.current.find(
            (message) => message.id === messageId && message.role === "user"
        );
        if (!target) return;

        await sendMessageBranch(target.content, target.previousID, {
            clearDraft: false,
            clearEditing: true,
        });
    };

    const handleSwitchBranch = (
        messageId: string,
        direction: BranchDirection
    ) => {
        if (isBusy) return;

        const target = messageRef.current.find(
            (message) => message.id === messageId && message.role === "user"
        );
        if (!target) return;

        const siblings = messageRef.current.filter(
            (message) =>
                message.role === "user" &&
                message.previousID === target.previousID
        );

        if (siblings.length <= 1) return;

        const currentIndex = siblings.findIndex(
            (message) => message.id === messageId
        );
        if (currentIndex < 0) return;

        const nextIndex =
            direction === "prev" ? currentIndex - 1 : currentIndex + 1;
        const nextMessage = siblings[nextIndex];
        if (!nextMessage) return;

        setBranchSelectionByParent((prev) => ({
            ...prev,
            [toBranchKey(target.previousID)]: nextMessage.id,
        }));

        if (editingMessageId) {
            setEditingDraft("");
        }
        setEditingMessageId(null);
    };

    const getBranchState = (messageId: string): MessageBranchState => {
        const target = allMessages.find(
            (message) => message.id === messageId && message.role === "user"
        );

        if (!target) {
            return {
                currentIndex: 1,
                total: 1,
                canGoPrev: false,
                canGoNext: false,
            };
        }

        const siblings = allMessages.filter(
            (message) =>
                message.role === "user" &&
                message.previousID === target.previousID
        );
        const currentIndex = siblings.findIndex(
            (message) => message.id === messageId
        );
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;

        return {
            currentIndex: safeIndex + 1,
            total: siblings.length || 1,
            canGoPrev: safeIndex > 0,
            canGoNext: safeIndex < siblings.length - 1,
        };
    };

    const hasMessages = allMessages.length > 0;
    const chatTitle =
        selectedChatTitle ??
        allMessages.find((message) => message.role === "user")?.content ??
        "新的對話";

    useDocumentTitle(hasMessages || selectedChatTitle ? chatTitle : "新的對話");

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
                        currentChatId={chatID}
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
                    title={chatTitle}
                    onMenuClick={() => setSidebarOpen((open) => !open)}
                />
                {hasMessages ? (
                    <>
                        <ChatMessageList
                            messages={displayMessages}
                            actionsDisabled={isBusy}
                            editingMessageId={editingMessageId}
                            editingDraft={editingDraft}
                            getBranchState={getBranchState}
                            onSwitchBranch={handleSwitchBranch}
                            onEditMessage={handleEditMessage}
                            onEditingDraftChange={setEditingDraft}
                            onCancelEditMessage={handleCancelEditMessage}
                            onSubmitEditMessage={handleSubmitEditMessage}
                            onResendMessage={handleResendMessage}
                        />
                        <div className={styles.inputWrapper}>
                            <ChatInput
                                value={draftInput}
                                onChange={setDraftInput}
                                onSend={handleSend}
                                disabled={isBusy}
                            />
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <WelcomeScreen onSend={handleSend} />
                    </div>
                )}
            </div>
        </div>
    );
}
