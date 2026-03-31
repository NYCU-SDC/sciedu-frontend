import { useState } from "react";
import { useChatAreaContext } from "./ChatArea.context";
import type { ChatAreaInputBoxProps } from "./ChatArea.types";
import styles from "./ChatAreaInputBox.module.css";
import { IconButton } from "@radix-ui/themes";
import { Send, CircleStop } from "lucide-react";

export default function ChatAreaInputBox({
    placeholder = "想問什麼問題？",
}: ChatAreaInputBoxProps) {
    const { status, onSend, onAbort } = useChatAreaContext();

    const [input, setInput] = useState<string>("");

    const inputDisabled = status === "submitting" || status === "streaming";
    const isBusy = inputDisabled;

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput("");
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.inner}>
                {/* Invisible mirror for auto-resize */}
                <div className={styles.mirror}>{input + "\n"}</div>
                <textarea
                    className={styles.field}
                    placeholder={
                        inputDisabled ? "正在回覆中，請稍候..." : placeholder
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
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
                disabled={isBusy ? !onAbort : !input.trim()}
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
