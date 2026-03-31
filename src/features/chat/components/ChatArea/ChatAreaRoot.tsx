import { ChatAreaProvider } from "./ChatArea.context";
import type { ChatAreaRootProps } from "./ChatArea.types";
import styles from "./ChatAreaRoot.module.css";

export default function ChatAreaRoot({
    children,
    title,
    status,
    messages,
    streamingMessage,
    displayMessages,
    draftInput,
    editingMessageId,
    onSend,
    onDraftChange,
    onAbort,
    onRefresh,
    onEditMessage,
    onResendMessage,
    onSwitchBranch,
    getBranchState,
    errorMessage,
}: ChatAreaRootProps) {
    return (
        <ChatAreaProvider
            value={{
                title,
                status,
                messages,
                streamingMessage,
                displayMessages,
                draftInput,
                editingMessageId,
                onSend,
                onDraftChange,
                onAbort,
                onRefresh,
                onEditMessage,
                onResendMessage,
                onSwitchBranch,
                getBranchState,
                errorMessage,
            }}
        >
            <div className={styles.root}>{children}</div>
        </ChatAreaProvider>
    );
}
