import ChatAreaMessage from "./ChatAreaMessage.tsx";
import WelcomeScreen from "./ChatAreaWelcome.tsx";
import { useChatAreaContext } from "./ChatArea.context";
import styles from "./ChatAreaContent.module.css";

export default function ChatAreaContent() {
    const { messages, streamingMessage, errorMessage, status, onSend } =
        useChatAreaContext();

    const hasMessages = messages.length > 0;

    if (!hasMessages) {
        return (
            <section className={styles.chatContent}>
                <div className={styles.scrollArea}>
                    <div className={`${styles.inner} ${styles.emptyState}`}>
                        <WelcomeScreen />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <main className={styles.chatContent}>
            <div className={styles.scrollArea}>
                <div className={styles.inner}>
                    {messages.map((message) => (
                        <ChatAreaMessage key={message.id} message={message} />
                    ))}

                    {streamingMessage !== null && (
                        <ChatAreaMessage
                            message={{
                                id: "stream-temp-conversationId",
                                conversationId: "streaming-temp-id",
                                role: "assistant",
                                content: streamingMessage,
                            }}
                        />
                    )}

                    {status === "error" && errorMessage && (
                        <p className={styles.errorMessage}>{errorMessage}</p>
                    )}
                </div>
            </div>
        </main>
    );
}
