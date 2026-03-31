import { useEffect, useRef, useState } from "react";
import type { Message } from "../types/chat";
import { createChat } from "./createChat";
import { createMessage } from "./createMessage";
import { streamMessage } from "./streamMessage";
import type {
    BranchDirection,
    MessageBranchState,
} from "../components/ChatArea/ChatArea.types";

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

export default function useChat() {
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [streamingMessage, setStreamingMessage] = useState<string | null>(
        null
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [status, setStatus] = useState<
        "idle" | "submitting" | "streaming" | "error"
    >("idle");
    const [draftInput, setDraftInput] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
    );
    const [branchSelectionByParent, setBranchSelectionByParent] = useState<
        Record<string, string>
    >({});

    const abortRef = useRef<AbortController | null>(null);
    const messageRef = useRef<Message[]>([]);
    const chatIdRef = useRef<string | null>(null);
    const replyMessageIdRef = useRef<string | null>(null);
    const pendingReplyParentIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        messageRef.current = allMessages;
    }, [allMessages]);

    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    const messages = buildVisibleMessages(allMessages, branchSelectionByParent);
    const displayMessages =
        streamingMessage !== null
            ? [
                  ...messages,
                  {
                      id: "streaming-temp-id",
                      role: "assistant",
                      content: streamingMessage,
                      previousID: pendingReplyParentIdRef.current,
                      status: "streaming",
                      createdAt: new Date().toISOString(),
                  } satisfies Message,
              ]
            : messages;

    const sendMessageBranch = async (
        content: string,
        branchPreviousID?: string,
        options?: { clearDraft?: boolean; clearEditing?: boolean }
    ) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        if (status === "submitting" || status === "streaming") {
            abortRef.current?.abort();
        }

        setErrorMessage(null);
        setStatus("submitting");
        setStreamingMessage("");
        let fullResponse = "";

        try {
            if (!chatIdRef.current) {
                const { chatID } = await createChat();
                chatIdRef.current = chatID;
            }

            const { message, replyMessageID } = await createMessage(
                chatIdRef.current,
                trimmed,
                branchPreviousID
            );

            setAllMessages((prev) => [...prev, message]);
            setBranchSelectionByParent((prev) => ({
                ...prev,
                [toBranchKey(message.previousID)]: message.id,
            }));
            replyMessageIdRef.current = replyMessageID;
            pendingReplyParentIdRef.current = message.id;
            setStatus("streaming");

            if (options?.clearDraft ?? true) {
                setDraftInput("");
            }
            if (options?.clearEditing ?? true) {
                setEditingMessageId(null);
            }

            abortRef.current = streamMessage(
                replyMessageID,
                (chunk) => {
                    fullResponse += chunk.content;
                    setStreamingMessage((prev) => (prev || "") + chunk.content);
                },
                () => {
                    const assistantMsg: Message = {
                        id: replyMessageID,
                        role: "assistant",
                        content: fullResponse,
                        previousID: message.id,
                        status: "done",
                        createdAt: new Date().toISOString(),
                    };

                    setAllMessages((prev) => [...prev, assistantMsg]);
                    setBranchSelectionByParent((prev) => ({
                        ...prev,
                        [toBranchKey(assistantMsg.previousID)]: assistantMsg.id,
                    }));
                    setStreamingMessage(null);
                    setStatus("idle");
                    abortRef.current = null;
                    replyMessageIdRef.current = null;
                    pendingReplyParentIdRef.current = undefined;
                },
                (error) => {
                    console.error("Chat error", error);
                    setStatus("error");
                    setErrorMessage(error.message);
                    setStreamingMessage(null);
                    abortRef.current = null;
                    replyMessageIdRef.current = null;
                    pendingReplyParentIdRef.current = undefined;
                }
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setStatus("error");
            setErrorMessage(message);
            setStreamingMessage(null);
            pendingReplyParentIdRef.current = undefined;
        }
    };

    const onSend = async (content: string) => {
        const editingTarget = editingMessageId
            ? messageRef.current.find((message) => message.id === editingMessageId)
            : undefined;

        const branchPreviousID = editingTarget
            ? editingTarget.previousID
            : messages.at(-1)?.id;

        await sendMessageBranch(content, branchPreviousID, {
            clearDraft: true,
            clearEditing: true,
        });
    };

    const onAbort = () => {
        abortRef.current?.abort();
        abortRef.current = null;

        if (streamingMessage && replyMessageIdRef.current) {
            const assistantMsg: Message = {
                id: replyMessageIdRef.current,
                role: "assistant",
                content: streamingMessage,
                previousID: pendingReplyParentIdRef.current,
                status: "done",
                createdAt: new Date().toISOString(),
            };

            setAllMessages((prev) => [...prev, assistantMsg]);
            setBranchSelectionByParent((prev) => ({
                ...prev,
                [toBranchKey(assistantMsg.previousID)]: assistantMsg.id,
            }));
        }

        setStreamingMessage(null);
        setStatus("idle");
        setErrorMessage(null);
        replyMessageIdRef.current = null;
        pendingReplyParentIdRef.current = undefined;
    };

    const onRefresh = () => {
        abortRef.current?.abort();
        abortRef.current = null;

        setAllMessages([]);
        setStreamingMessage(null);
        setErrorMessage(null);
        setStatus("idle");
        setDraftInput("");
        setEditingMessageId(null);
        setBranchSelectionByParent({});
        chatIdRef.current = null;
        replyMessageIdRef.current = null;
        pendingReplyParentIdRef.current = undefined;
    };

    const onDraftChange = (text: string) => {
        setDraftInput(text);
    };

    const onEditMessage = (messageId: string) => {
        const target = messageRef.current.find(
            (message) => message.id === messageId && message.role === "user"
        );
        if (!target) return;

        setDraftInput(target.content);
        setEditingMessageId(messageId);
    };

    const onResendMessage = async (messageId: string) => {
        const target = messageRef.current.find(
            (message) => message.id === messageId && message.role === "user"
        );
        if (!target) return;

        await sendMessageBranch(target.content, target.previousID, {
            clearDraft: false,
            clearEditing: true,
        });
    };

    const onSwitchBranch = (
        messageId: string,
        direction: BranchDirection
    ) => {
        const target = messageRef.current.find((message) => message.id === messageId);
        if (!target) return;

        const siblings = messageRef.current.filter(
            (message) =>
                message.role === target.role &&
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
        setEditingMessageId(null);
    };

    const getBranchState = (messageId: string): MessageBranchState => {
        const target = messageRef.current.find((message) => message.id === messageId);
        if (!target || target.role !== "user") {
            return {
                currentIndex: 1,
                total: 1,
                canGoPrev: false,
                canGoNext: false,
            };
        }

        const siblings = messageRef.current.filter(
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

    return {
        messages,
        displayMessages,
        streamingMessage,
        draftInput,
        editingMessageId,
        errorMessage,
        status,
        onSend,
        onDraftChange,
        onAbort,
        onRefresh,
        onEditMessage,
        onResendMessage,
        onSwitchBranch,
        getBranchState,
    };
}
