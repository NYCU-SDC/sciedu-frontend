import type { ReactNode } from "react";
import type { Message } from "../../types/chat";

export type ChatStatus = "idle" | "submitting" | "streaming" | "error";

export type ChatAreaRootProps = {
    children: ReactNode;
    title: string;
    status: ChatStatus;
    messages: Message[];
    streamingMessage: string | null;
    displayMessages: Message[];
    onSend: (text: string) => void;
    onAbort?: () => void;
    onRefresh?: () => void;
    errorMessage?: string;
};

export type ChatAreaInputBoxProps = {
    placeholder?: string;
};
