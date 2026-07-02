import ChatAreaMessage from "./ChatAreaMessage.tsx";
import WelcomeScreen from "./ChatAreaWelcome.tsx";
import { useChatAreaContext } from "./useChatAreaContext";
import styles from "./ChatAreaContent.module.css";

export default function ChatAreaContent() {
    const {
        messages,
        displayMessages,
        errorMessage,
        status,
        onEditMessage,
        onResendMessage,
        onSwitchBranch,
        getBranchState,
    } = useChatAreaContext();

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
                    {displayMessages.map((message) => (
                        <ChatAreaMessage
                            key={message.id}
                            message={message}
                            branchState={getBranchState?.(message.id)}
                            onSwitchBranch={onSwitchBranch}
                            onEdit={onEditMessage}
                            onResend={onResendMessage}
                        />
                    ))}

                    {status === "error" && errorMessage && (
                        <p className={styles.errorMessage}>{errorMessage}</p>
                    )}
                </div>
            </div>
        </main>
    );
}
