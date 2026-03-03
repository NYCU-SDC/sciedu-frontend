import ChatMessage from "./ChatMessage";
import type { RichChatMessage } from "../types/chat";
import styles from "./ChatMessageList.module.css";

type Props = {
    messages: RichChatMessage[];
    streamingMessage?: string | null;
};

export default function ChatMessageList({ messages, streamingMessage }: Props) {
    return (
        <div className={styles.scroll}>
            <div className={styles.container}>
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}

                {streamingMessage !== null &&
                    streamingMessage !== undefined && (
                        <ChatMessage
                            message={{
                                id: "stream-temp-conversationId",
                                conversationId: "streaming-temp-id",
                                role: "assistant",
                                content: streamingMessage,
                            }}
                        />
                    )}
            </div>
        </div>
    );
}
