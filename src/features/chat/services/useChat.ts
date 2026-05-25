import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../../shared/utils/api";
import type { Message } from "../types/chat";
import { createChat } from "./createChat";
import { createMessage } from "./createMessage";
import { listMessages } from "./listMessages";
import { CHAT_HISTORY_QUERY_KEY } from "./listChats";
import { streamMessage } from "./streamMessage";
import type {
    BranchDirection,
    MessageBranchState,
} from "../components/ChatArea/ChatArea.types";

const ROOT_BRANCH_KEY = "__root__";

export const chatMessagesQueryKey = (chatId: string | null) =>
    ["chat-messages", chatId] as const;

type StreamingState = {
    messageId: string;
    parentId?: string;
    partial: string;
};

type MessagesPayload = { messages: Message[] };

type UseChatOptions = {
    chatId: string | null;
    onChatCreated?: (chatId: string) => void;
};

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

export default function useChat({ chatId, onChatCreated }: UseChatOptions) {
    const queryClient = useQueryClient();

    const messagesQuery = useQuery<MessagesPayload>({
        queryKey: chatMessagesQueryKey(chatId),
        queryFn: ({ signal }) => listMessages(chatId as string, signal),
        enabled: !!chatId,
    });

    const allMessages = messagesQuery.data?.messages ?? [];

    const [streamingState, setStreamingState] = useState<StreamingState | null>(
        null
    );
    const [status, setStatus] = useState<
        "idle" | "submitting" | "streaming" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [draftInput, setDraftInput] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
    );
    const [editingDraft, setEditingDraft] = useState("");
    const [branchSelectionByParent, setBranchSelectionByParent] = useState<
        Record<string, string>
    >({});

    const abortRef = useRef<AbortController | null>(null);
    // Set by sendMessageBranch right before it calls onChatCreated, so the
    // reset block below can recognise the chatId flip that *we* just caused
    // (new-chat flow) and preserve the in-flight stream + optimistic state.
    const justCreatedChatIdRef = useRef<string | null>(null);
    // Message IDs whose SSE stream returned 404 — used to stop the
    // auto-reattach effect from looping while the backend's DB write that
    // flips the row from "streaming" to "failed"/"completed" is still in
    // flight (the streamHub entry is deleted before that write commits).
    const deadStreamIdsRef = useRef<Set<string>>(new Set());

    function detachStream() {
        abortRef.current?.abort();
        abortRef.current = null;
    }

    // Reset chat-local state in render when the chatId prop changes — this is
    // the React-recommended pattern (https://react.dev/learn/you-might-not-need-an-effect)
    // and avoids the cascading-render hazard that would come from a useEffect.
    const [prevChatId, setPrevChatId] = useState(chatId);
    if (prevChatId !== chatId) {
        setPrevChatId(chatId);
        if (justCreatedChatIdRef.current === chatId) {
            justCreatedChatIdRef.current = null;
        } else {
            detachStream();
            setStreamingState(null);
            setStatus("idle");
            setErrorMessage(null);
            setEditingMessageId(null);
            setEditingDraft("");
            setBranchSelectionByParent({});
            deadStreamIdsRef.current = new Set();
        }
    }

    function attachStream(
        targetChatId: string,
        messageId: string,
        parentId: string | undefined,
        initialPartial: string
    ) {
        detachStream();

        setStreamingState({ messageId, parentId, partial: initialPartial });
        setStatus("streaming");

        abortRef.current = streamMessage(
            messageId,
            (chunk) => {
                const piece = chunk.content ?? chunk.delta ?? "";
                setStreamingState((prev) =>
                    prev && prev.messageId === messageId
                        ? { ...prev, partial: prev.partial + piece }
                        : prev
                );
            },
            () => {
                setStreamingState(null);
                setStatus("idle");
                abortRef.current = null;
                void queryClient.invalidateQueries({
                    queryKey: chatMessagesQueryKey(targetChatId),
                });
            },
            (error) => {
                setStreamingState(null);
                abortRef.current = null;
                // A 404 means the stream entry on the backend is already
                // gone — either because it completed/failed before we
                // subscribed, or because we lost a reconnect race. The
                // persisted message row is the source of truth, so fall
                // back to refetching messages and let the rendering layer
                // surface "failed" status if applicable.
                if (error instanceof ApiError && error.status === 404) {
                    deadStreamIdsRef.current.add(messageId);
                    setStatus("idle");
                    setErrorMessage(null);
                } else {
                    console.error("Chat stream error", error);
                    setStatus("error");
                    setErrorMessage(error.message);
                }
                void queryClient.invalidateQueries({
                    queryKey: chatMessagesQueryKey(targetChatId),
                });
            }
        );
    }

    useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    // Re-attach to an in-flight assistant stream when hydrating a conversation
    // whose newest reply is still streaming server-side. This subscribes to an
    // external system (SSE), which is exactly what useEffect is for.
    const hydratedMessages = messagesQuery.data?.messages;
    useEffect(() => {
        if (!chatId || !hydratedMessages) return;
        if (streamingState) return;

        const inflight = hydratedMessages.find(
            (message) =>
                message.role === "assistant" && message.status === "streaming"
        );
        if (!inflight) return;
        if (deadStreamIdsRef.current.has(inflight.id)) return;

        attachStream(
            chatId,
            inflight.id,
            inflight.previousID,
            inflight.content ?? ""
        );
        // attachStream is stable for the purposes of this effect — it reads
        // refs and the queryClient which are stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId, hydratedMessages, streamingState]);

    const messages = buildVisibleMessages(allMessages, branchSelectionByParent);
    const displayMessages = streamingState
        ? [
              ...messages,
              {
                  id: streamingState.messageId,
                  role: "assistant",
                  content: streamingState.partial,
                  previousID: streamingState.parentId,
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
            detachStream();
        }

        setErrorMessage(null);
        setStatus("submitting");

        try {
            const isNewChat = !chatId;
            let activeChatId = chatId;
            if (!activeChatId) {
                const { chatID: newChatId } = await createChat();
                activeChatId = newChatId;
            }

            const { message, replyMessageID } = await createMessage(
                activeChatId,
                trimmed,
                branchPreviousID
            );

            // Seed the message cache for activeChatId *before* navigating.
            // The auto-fetch React Query kicks off when chatId flips from
            // null to the new id then sees populated data instead of racing
            // a `[]` response into the cache and bouncing the user back to
            // the empty WelcomeScreen.
            queryClient.setQueryData<MessagesPayload>(
                chatMessagesQueryKey(activeChatId),
                (prev) => ({
                    messages: prev?.messages
                        ? [...prev.messages, message]
                        : [message],
                })
            );

            if (isNewChat) {
                justCreatedChatIdRef.current = activeChatId;
                onChatCreated?.(activeChatId);
                void queryClient.invalidateQueries({
                    queryKey: CHAT_HISTORY_QUERY_KEY,
                });
            }

            setBranchSelectionByParent((prev) => ({
                ...prev,
                [toBranchKey(message.previousID)]: message.id,
            }));

            if (options?.clearDraft ?? true) {
                setDraftInput("");
            }
            if (options?.clearEditing ?? true) {
                setEditingMessageId(null);
                setEditingDraft("");
            }

            attachStream(activeChatId, replyMessageID, message.id, "");
        } catch (error) {
            const errMsg =
                error instanceof Error ? error.message : String(error);
            setStatus("error");
            setErrorMessage(errMsg);
        }
    };

    const onSend = async (content: string) => {
        const editingTarget = editingMessageId
            ? allMessages.find((message) => message.id === editingMessageId)
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
        detachStream();
        setStreamingState(null);
        setStatus("idle");
        setErrorMessage(null);
        if (chatId) {
            void queryClient.invalidateQueries({
                queryKey: chatMessagesQueryKey(chatId),
            });
        }
    };

    const onRefresh = () => {
        detachStream();
        setStreamingState(null);
        setStatus("idle");
        setErrorMessage(null);
        setDraftInput("");
        setEditingMessageId(null);
        setBranchSelectionByParent({});
        if (chatId) {
            void queryClient.invalidateQueries({
                queryKey: chatMessagesQueryKey(chatId),
            });
        }
    };

    const onDraftChange = (text: string) => {
        setDraftInput(text);
    };

    const onEditMessage = (messageId: string) => {
        const target = allMessages.find(
            (message) => message.id === messageId && message.role === "user"
        );
        if (!target) return;

        setDraftInput(target.content);
        setEditingDraft(target.content);
        setEditingMessageId(messageId);
    };

    const onEditingDraftChange = (text: string) => {
        setEditingDraft(text);
    };

    const onCancelEditMessage = () => {
        setEditingMessageId(null);
        setEditingDraft("");
    };

    const onSubmitEditMessage = async () => {
        if (!editingMessageId) return;
        const target = allMessages.find(
            (message) =>
                message.id === editingMessageId && message.role === "user"
        );
        if (!target) return;

        const content = editingDraft;
        await sendMessageBranch(content, target.previousID, {
            clearDraft: false,
            clearEditing: true,
        });
    };

    const onResendMessage = async (messageId: string) => {
        const target = allMessages.find(
            (message) => message.id === messageId && message.role === "user"
        );
        if (!target) return;

        await sendMessageBranch(target.content, target.previousID, {
            clearDraft: false,
            clearEditing: true,
        });
    };

    const onRetryFailedAssistant = async (assistantMessageId: string) => {
        const assistant = allMessages.find(
            (message) =>
                message.id === assistantMessageId &&
                message.role === "assistant"
        );
        if (!assistant || !assistant.previousID) return;

        // Retry resends the user prompt that produced this failed reply,
        // creating a fresh assistant branch off the same previousID.
        await onResendMessage(assistant.previousID);
    };

    const onSwitchBranch = (messageId: string, direction: BranchDirection) => {
        const target = allMessages.find(
            (message) => message.id === messageId
        );
        if (!target) return;

        const siblings = allMessages.filter(
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
        const target = allMessages.find((message) => message.id === messageId);
        if (!target || target.role !== "user") {
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

    return {
        messages,
        displayMessages,
        streamingMessage: streamingState?.partial ?? null,
        draftInput,
        editingDraft,
        editingMessageId,
        errorMessage,
        status,
        isLoadingMessages: messagesQuery.isLoading,
        onSend,
        onDraftChange,
        onAbort,
        onRefresh,
        onEditMessage,
        onEditingDraftChange,
        onCancelEditMessage,
        onSubmitEditMessage,
        onResendMessage,
        onRetryFailedAssistant,
        onSwitchBranch,
        getBranchState,
    };
}

export type UseChatReturn = ReturnType<typeof useChat>;
