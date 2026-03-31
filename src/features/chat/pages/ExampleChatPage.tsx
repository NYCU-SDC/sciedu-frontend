import { ChatArea } from "../components/ChatArea/ChatArea";
import useChat from "../services/useChat";
import type { RichChatMessage } from "../types/chat";
import styles from "./ExampleChatPage.module.css";

export default function ExampleChatPage() {
    const {
        messages,
        streamingMessage,
        errorMessage,
        status,
        onSend,
        onAbort,
        onRefresh,
    } = useChat();

    // displayMessages are for UI rendering (instant streaming)
    const displayMessages: RichChatMessage[] = streamingMessage
        ? [
              ...messages,
              {
                  id: "streaming-temp-id",
                  conversationId: "temp",
                  role: "assistant",
                  content: streamingMessage,
              },
          ]
        : messages;

    return (
        <div className={styles.container}>
            <ChatArea.Root
                title="基因性狀討論"
                status={status}
                messages={messages}
                streamingMessage={streamingMessage}
                displayMessages={displayMessages}
                onSend={onSend}
                onAbort={onAbort}
                onRefresh={onRefresh}
            >
                <ChatArea.NavBar />
                <ChatArea.Content />
                <ChatArea.InputBox />
            </ChatArea.Root>
        </div>
    );
}
