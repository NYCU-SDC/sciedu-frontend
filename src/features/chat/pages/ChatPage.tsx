import WelcomeScreen from "../components/WelcomeScreen";
import ChatMessageList from "../components/ChatMessageList";
import ChatInput from "../components/ChatInput";
import type { Message } from "../types/chat";
import styles from "./ChatPage.module.css";
import useChat from "../services/useChat";

export default function ChatPage() {
    const { messages, streamingMessage, status, onSend } = useChat();

    const isStreaming = status === "submitting" || status === "streaming";

    const hasMessages = messages.length > 0;

    const messagesToDisplay: Message[] =
        streamingMessage !== null
            ? [
                  ...messages,
                  {
                      id: "streaming-temp-id",
                      role: "assistant",
                      content: streamingMessage,
                      status: "streaming",
                      createdAt: new Date().toISOString(),
                  },
              ]
            : messages;

    return (
        <div className={styles.container}>
            {/* Content area */}
            <div className={styles.content}>
                {hasMessages ? (
                    <>
                        <ChatMessageList messages={messagesToDisplay} />
                        <div className={styles.inputWrapper}>
                            <ChatInput onSend={onSend} disabled={isStreaming} />
                        </div>
                    </>
                ) : (
                    <WelcomeScreen onSend={onSend} />
                )}
            </div>
        </div>
    );
}
