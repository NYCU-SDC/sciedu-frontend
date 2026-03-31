import type { RichChatMessage } from "../../types/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ChevronLeft, ChevronRight, Edit, RefreshCcw } from "lucide-react";
import styles from "./ChatAreaMessage.module.css";

type ChatAreaMessageProps = {
    message: RichChatMessage;
    onSwitchBranch?: (messageId: string) => void;
    onEdit?: (messageId: string) => void;
    onResend?: (messageId: string) => void;
};

export default function AreaChatMessage({ message }: ChatAreaMessageProps) {
    const isUser = message.role === "user";

    return (
        <div className={isUser ? styles.userRow : styles.assistantRow}>
            <div className={styles.messageShell}>
                <div
                    className={
                        isUser ? styles.userBubble : styles.assistantBubble
                    }
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
                {isUser && (
                    <div className={styles.actions}>
                        <div className={styles.switchWrapper}>
                            <ChevronLeft className={styles.icon} />
                            2
                            <ChevronRight className={styles.icon} />
                        </div>
                        <Edit className={styles.icon} />
                        <RefreshCcw className={styles.icon} />
                    </div>
                )}
            </div>
        </div>

        // <div
        //     className={
        //         isUser
        //             ? `${styles.userPatch} ${styles.message} ${styles.user}`
        //             : `${styles.assistantPatch} ${styles.message} ${styles.asststant}`
        //     }
        // >
        //     {/* For assistant messages, render markdown */}
        //     {isUser ? (
        //         <span>{message.content}</span>
        //     ) : (
        //         <ReactMarkdown
        //             remarkPlugins={[remarkGfm, remarkMath]}
        //             rehypePlugins={[rehypeKatex]}
        //             components={{
        //                 table: ({ node, ...props }) => (
        //                     <div className={styles.tableWrapper}>
        //                         <table {...props} />
        //                     </div>
        //                 ),
        //             }}
        //         >
        //             {message.content}
        //         </ReactMarkdown>
        //     )}
        // </div>
    );
}
