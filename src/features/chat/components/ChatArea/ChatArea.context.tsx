import { createContext, useContext } from "react";
import type { ChatStatus } from "./ChatArea.types";
import type { Message } from "../../types/chat";

type ChatAreaContextValue = {
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

const ChatAreaContext = createContext<ChatAreaContextValue | null>(null);

export function ChatAreaProvider({
    value,
    children,
}: {
    value: ChatAreaContextValue;
    children: React.ReactNode;
}) {
    return (
        <ChatAreaContext.Provider value={value}>
            {children}
        </ChatAreaContext.Provider>
    );
}

export function useChatAreaContext() {
    const context = useContext(ChatAreaContext);

    if (!context) {
        throw new Error(
            "ChatArea components must be used inside ChatArea.Root."
        );
    }

    return context;
}
