import { createContext } from "react";
import type {
    BranchDirection,
    ChatStatus,
    MessageBranchState,
} from "./ChatArea.types";
import type { Message } from "../../types/chat";

export type ChatAreaContextValue = {
    title: string;
    status: ChatStatus;
    messages: Message[];
    streamingMessage: string | null;
    displayMessages: Message[];
    draftInput: string;
    editingMessageId: string | null;
    onSend: (text: string) => void;
    onDraftChange: (text: string) => void;
    onAbort?: () => void;
    onRefresh?: () => void;
    onEditMessage?: (messageId: string) => void;
    onResendMessage?: (messageId: string) => void;
    onSwitchBranch?: (messageId: string, direction: BranchDirection) => void;
    getBranchState?: (messageId: string) => MessageBranchState;
    errorMessage?: string;
};

export const ChatAreaContext = createContext<ChatAreaContextValue | null>(null);
