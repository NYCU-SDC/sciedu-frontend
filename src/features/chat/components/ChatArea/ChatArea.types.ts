import type { ReactNode } from "react";
import type { RichChatMessage } from "../../types/chat";

export type ChatStatus = "idle" | "submitting" | "streaming" | "error";

export type ChatAreaRootProps = {
    children: ReactNode;
    title: string;
    status: ChatStatus;
    messages: RichChatMessage[];
    streamingMessage: string | null;
    displayMessages: RichChatMessage[];
    onSend: (text: string) => void;
    onAbort?: () => void;
    onRefresh?: () => void;
    errorMessage?: string;
};

export type ChatAreaInputBoxProps = {
    placeholder?: string;
};
