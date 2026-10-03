import { useCallback, useMemo, useRef, useState } from "react";
import type {
    BranchDirection,
    Chat,
    MessageView,
    MessageBranchState,
} from "../types/chat";
import { useQueryClient } from "@tanstack/react-query";
import { chatQueryKey } from "./useChatMessages";
import type { GetChatResponse } from "../types/chat";
import { createMessage } from "../../../shared/network/chat";
import { useBranchSelection } from "./useBranchSelection";
import { useChatMessages } from "./useChatMessages";
import { useMessageStream } from "./useMessageStream";

export type ChatStatus = "loading" | "idle" | "streaming" | "error";

export type SendMessageInput = {
    content: string;
    /** Parent to branch from. Defaults to the last visible message. */
    previousID?: string;
};

export type UseChatResult = {
    // Server state (React Query cache).
    chat: Chat | undefined;
    messages: MessageView[];
    status: ChatStatus;
    error: Error | null;

    // The single write primitive
    sendMessage: (input: SendMessageInput) => Promise<void>;
    // Thin wrappers around sendMessage
    resend: (messageId: string) => Promise<void>;
    editAndSend: (messageId: string, content: string) => Promise<void>;

    // Branch navigation (pure derivation + tiny selection state).
    switchBranch: (messageId: string, dir: BranchDirection) => void;
    getBranchState: (messageId: string) => MessageBranchState;

    // Stream lifecycle.
    streamingMessageId: string | null;
    recoveryMessage: string | null;
    reloadResult: () => void;
    abort: () => void;
};

/**
 * The chat facade. Composes three focused hooks into one API for a chat view:
 *   - `useChatMessages`  — server state for the chat (React Query cache).
 *   - `useBranchSelection` — which child branch is selected at each parent.
 *   - `useMessageStream` — the live SSE lifecycle for the streaming reply.
 *
 * On top of these it layers the write path: `sendMessage` (the single write
 * primitive) plus the `resend` / `editAndSend` wrappers, and unifies the
 * streaming message id from its two origins (a just-sent reply and a message
 * already streaming on load) into one field.
 */
export function useChat(chatID: string): UseChatResult {
    const query = useChatMessages(chatID);
    const client = useQueryClient();
    const sendingRef = useRef(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<Error | null>(null);
    const [attempt, setAttempt] = useState(0);
    const allMessages = useMemo(() => query.data?.messages ?? [], [query.data]);

    const { visible, switchBranch, getBranchState, selectBranch } =
        useBranchSelection(allMessages);

    // streamingMessageId has two origins, unified into one field:
    //   - the just-sent reply id (set by sendMessage), and
    //   - the resume case: a message already streaming on load.
    const [sentReply, setSentReply] = useState<{
        chatID: string;
        id: string;
    } | null>(null);
    const resumeId = visible.find((m) => m.status === "streaming")?.id ?? null;
    const sentId =
        sentReply?.chatID === chatID &&
        visible.some((m) => m.id === sentReply.id)
            ? sentReply.id
            : null;
    const streamingMessageId = sentId ?? resumeId;
    const { state: stream, abort: abortStream } = useMessageStream(
        streamingMessageId,
        chatID,
        attempt
    );
    const currentStream =
        stream?.chatID === chatID &&
        visible.some((m) => m.id === stream.messageID)
            ? stream
            : null;
    const messages = useMemo(
        () =>
            visible.map((message) => {
                if (!currentStream || message.id !== currentStream.messageID)
                    return message;
                const snapshot = currentStream.snapshot;
                // Keep the last readable snapshot until the new subscription starts receiving parts.
                if (
                    snapshot.phase === "streaming" &&
                    snapshot.content.length < message.content.length
                )
                    return {
                        ...message,
                        status: currentStream.paused
                            ? ("failed" as const)
                            : ("streaming" as const),
                    };
                return {
                    ...message,
                    content: snapshot.content,
                    activeAgents: snapshot.activeAgents,
                    ...(snapshot.parts ? { parts: snapshot.parts } : {}),
                    ...(snapshot.characters
                        ? { characters: snapshot.characters }
                        : {}),
                    status:
                        snapshot.phase === "done"
                            ? ("completed" as const)
                            : currentStream.paused ||
                                snapshot.phase === "failed"
                              ? ("failed" as const)
                              : ("streaming" as const),
                };
            }),
        [visible, currentStream]
    );
    const failedHistoryID =
        visible.at(-1)?.status === "failed" ? visible.at(-1)!.id : null;
    const recoveryMessage = currentStream?.paused
        ? "已停止接收，後端可能仍在產生回覆。"
        : (currentStream?.snapshot.error ??
          (failedHistoryID
              ? "上次回覆未完成，請重新載入結果或重新生成。"
              : null));
    const reloadResult = useCallback(() => {
        const target = currentStream?.messageID ?? failedHistoryID;
        if (target) setSentReply({ chatID, id: target });
        setSendError(null);
        setAttempt((value) => value + 1);
        void query.refetch();
    }, [query, currentStream, chatID, failedHistoryID]);

    const sendMessage = useCallback(
        async (input: SendMessageInput) => {
            const trimmed = input.content.trim();
            if (!trimmed || sendingRef.current) return;
            sendingRef.current = true;
            setSending(true);
            setSendError(null);
            try {
                // A present `previousID` — even `undefined` — is an explicit branch
                // anchor and must be honored as-is: editing the first message anchors
                // to the root (`undefined`), which is not the same as "not specified".
                // Only when the key is absent do we default to appending at the tail.
                const parentID =
                    "previousID" in input
                        ? input.previousID
                        : visible.at(-1)?.id;
                const { message, replyMessageID } = await createMessage(
                    chatID,
                    trimmed,
                    parentID
                );

                // Pin the freshly created sibling so it is the visible branch.
                selectBranch(message.previousID, message.id);
                client.setQueryData<GetChatResponse>(
                    chatQueryKey(chatID),
                    (previous) =>
                        previous
                            ? {
                                  ...previous,
                                  messages: [
                                      ...previous.messages,
                                      message,
                                      {
                                          id: replyMessageID,
                                          content: "",
                                          role: "assistant",
                                          previousID: message.id,
                                          status: "streaming",
                                          createdAt: new Date().toISOString(),
                                      },
                                  ],
                              }
                            : previous
                );
                setSentReply({ chatID, id: replyMessageID });
                await query.refetch();
            } catch (error) {
                setSendError(
                    error instanceof Error ? error : new Error("傳送失敗")
                );
                throw error;
            } finally {
                sendingRef.current = false;
                setSending(false);
            }
        },
        [chatID, visible, selectBranch, query, client]
    );

    const resend = useCallback(
        async (messageId: string) => {
            const target = allMessages.find((m) => m.id === messageId);
            if (!target) return;
            await sendMessage({
                content: target.content,
                previousID: target.previousID,
            });
        },
        [allMessages, sendMessage]
    );

    const editAndSend = useCallback(
        async (messageId: string, content: string) => {
            const target = allMessages.find((m) => m.id === messageId);
            if (!target) return;
            await sendMessage({ content, previousID: target.previousID });
        },
        [allMessages, sendMessage]
    );

    const abort = useCallback(() => {
        abortStream();
    }, [abortStream]);

    const status: ChatStatus = query.isLoading
        ? "loading"
        : sending ||
            (streamingMessageId !== null &&
                (!currentStream ||
                    (!currentStream.paused &&
                        currentStream.snapshot.phase === "streaming")))
          ? "streaming"
          : query.isError
            ? "error"
            : "idle";

    const chat: Chat | undefined = query.data
        ? {
              id: query.data.id,
              title: query.data.title,
              createdAt: query.data.createdAt,
              updatedAt: query.data.updatedAt,
          }
        : undefined;

    return {
        chat,
        messages,
        status,
        error: sendError ?? query.error,
        sendMessage,
        resend,
        editAndSend,
        switchBranch,
        getBranchState,
        streamingMessageId,
        recoveryMessage,
        reloadResult,
        abort,
    };
}

export default useChat;
