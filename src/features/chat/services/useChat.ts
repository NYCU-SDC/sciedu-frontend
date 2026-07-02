import { useCallback, useMemo, useState } from "react";
import type {
    BranchDirection,
    Chat,
    Message,
    MessageBranchState,
} from "../types/chat";
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
    messages: Message[];
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
    streamingContent: string | null;
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
    const allMessages = useMemo(() => query.data?.messages ?? [], [query.data]);

    const { visible, switchBranch, getBranchState, selectBranch } =
        useBranchSelection(allMessages);

    // streamingMessageId has two origins, unified into one field:
    //   - the just-sent reply id (set by sendMessage), and
    //   - the resume case: a message already streaming on load.
    const [sentReplyId, setSentReplyId] = useState<string | null>(null);
    const resumeId =
        allMessages.find((m) => m.status === "streaming")?.id ?? null;
    const streamingMessageId = sentReplyId ?? resumeId;

    // Once the stream settles, drop the local handle so the field falls back to
    // pure server-derived state.
    const { state: stream, abort: abortStream } = useMessageStream(
        streamingMessageId,
        chatID,
        () => setSentReplyId(null)
    );

    const sendMessage = useCallback(
        async (input: SendMessageInput) => {
            const trimmed = input.content.trim();
            if (!trimmed) return;

            // A present `previousID` — even `undefined` — is an explicit branch
            // anchor and must be honored as-is: editing the first message anchors
            // to the root (`undefined`), which is not the same as "not specified".
            // Only when the key is absent do we default to appending at the tail.
            const parentID =
                "previousID" in input ? input.previousID : visible.at(-1)?.id;
            const { message, replyMessageID } = await createMessage(
                chatID,
                trimmed,
                parentID
            );

            // Pin the freshly created sibling so it is the visible branch.
            selectBranch(message.previousID, message.id);
            setSentReplyId(replyMessageID);
            await query.refetch();
        },
        [chatID, visible, selectBranch, query]
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
        setSentReplyId(null);
    }, [abortStream]);

    const status: ChatStatus = query.isLoading
        ? "loading"
        : streamingMessageId !== null || stream.phase === "streaming"
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
        messages: visible,
        status,
        error: query.error,
        sendMessage,
        resend,
        editAndSend,
        switchBranch,
        getBranchState,
        streamingMessageId,
        streamingContent: stream.phase === "streaming" ? stream.buffer : null,
        abort,
    };
}

export default useChat;
