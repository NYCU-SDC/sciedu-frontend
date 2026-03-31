import { useChatAreaContext } from "./ChatArea.context";
import type { ChatAreaInputBoxProps } from "./ChatArea.types";
import styles from "./ChatAreaInputBox.module.css";
import { IconButton } from "@radix-ui/themes";
import { Send, CircleStop } from "lucide-react";

export default function ChatAreaInputBox({
    placeholder = "想問什麼問題？",
}: ChatAreaInputBoxProps) {
    const {
        status,
        draftInput,
        editingMessageId,
        onSend,
        onDraftChange,
        onAbort,
    } = useChatAreaContext();

    const inputDisabled = status === "submitting" || status === "streaming";
    const isBusy = inputDisabled;

    const handleSend = () => {
        if (!draftInput.trim()) return;
        onSend(draftInput);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.inner}>
                {/* Invisible mirror for auto-resize */}
                <div className={styles.mirror}>{draftInput + "\n"}</div>
                <textarea
                    className={styles.field}
                    placeholder={
                        inputDisabled
                            ? "正在回覆中，請稍候..."
                            : editingMessageId
                              ? "編輯訊息後重新送出"
                              : placeholder
                    }
                    value={draftInput}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    disabled={inputDisabled}
                    rows={1}
                />
            </div>
            <IconButton
                className={styles.buttonWrapper}
                onClick={isBusy ? onAbort : handleSend}
                disabled={isBusy ? !onAbort : !draftInput.trim()}
            >
                {status == "idle" ? (
                    <Send className={styles.buttonIcon} />
                ) : (
                    <CircleStop className={styles.buttonIcon} />
                )}
            </IconButton>
        </div>
    );
}
