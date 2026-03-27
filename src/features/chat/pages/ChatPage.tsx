import WelcomeScreen from "../components/WelcomeScreen";
import ChatMessageList from "../components/ChatMessageList";
import ChatInput from "../components/ChatInput";
import styles from "./ChatPage.module.css";
import useChat from "../services/useChat";

export default function ChatPage() {
    const { isStreaming, hasMessages, messagesToDisplay, handleSend } =
        useChat();
    return (
        <div className={styles.container}>
            {/* Content area */}
            <div className={styles.content}>
                {hasMessages ? (
                    <>
                        <ChatMessageList messages={messagesToDisplay} />
                        <div className={styles.inputWrapper}>
                            <ChatInput
                                onSend={handleSend}
                                disabled={isStreaming}
                            />
                        </div>
                    </>
                ) : (
                    <WelcomeScreen onSend={handleSend} />
                )}
            </div>
        </div>
    );
}
