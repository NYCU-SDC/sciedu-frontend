import { ChatArea } from "../components/ChatArea/ChatArea";
import useChat from "../services/useChat";
import styles from "./ExampleChatPage.module.css";

export default function ExampleChatPage() {
    const {
        messages,
        displayMessages,
        draftInput,
        editingMessageId,
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
                streamingMessage={null}
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
            >
                <ChatArea.NavBar />
                <ChatArea.Content />
                <ChatArea.InputBox />
            </ChatArea.Root>
        </div>
    );
}
