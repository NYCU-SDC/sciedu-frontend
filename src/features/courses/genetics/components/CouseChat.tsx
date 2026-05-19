import { ChatArea } from "../../../chat/components/ChatArea/ChatArea";
import useChat from "../../../chat/services/useChat";
import styles from "./CouseChat.module.css";

export default function CourseChat() {
    const {
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
    } = useChat();

    return (
        <div className={styles.container}>
            <ChatArea.Root
                title="基因性狀討論"
                status={status}
                messages={messages}
                streamingMessage={streamingMessage}
                displayMessages={displayMessages}
                draftInput={draftInput}
                editingMessageId={editingMessageId}
                onSend={onSend}
                onDraftChange={onDraftChange}
                onAbort={onAbort}
                onRefresh={onRefresh}
                onEditMessage={onEditMessage}
                onResendMessage={onResendMessage}
                onSwitchBranch={onSwitchBranch}
                getBranchState={getBranchState}
                errorMessage={errorMessage ?? undefined}
            >
                <ChatArea.NavBar />
                <ChatArea.Content />
                <ChatArea.InputBox />
            </ChatArea.Root>
        </div>
    );
}