import type { ReactNode } from "react";
import type { Message } from "../../types/chat";

export type ChatStatus = "idle" | "submitting" | "streaming" | "error";
export type BranchDirection = "prev" | "next";

export type MessageBranchState = {
    currentIndex: number;
    total: number;
    canGoPrev: boolean;
    canGoNext: boolean;
};

export type ChatAreaRootProps = {
    children: ReactNode;
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

export type ChatAreaInputBoxProps = {
    placeholder?: string;
};
