import type { RichChatMessage } from "../types/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import styles from "./ChatMessage.module.css";

interface ChatMessageProps {
    message: RichChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div
            className={`${styles.message} ${
                isUser ? styles.user : styles.assistant
            }`}
        >
            {/* For assistant messages, render markdown */}
            {isUser ? (
                <span>{message.content}</span>
            ) : (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        table: ({ node, ...props }) => (
                            <div className={styles.tableWrapper}>
                                <table {...props} />
                            </div>
                        ),
                    }}
                >
                    {message.content}
                </ReactMarkdown>
            )}
        </div>
    );
}
