import { useState } from "react";
import { IconButton } from "@radix-ui/themes";
import { Send } from "lucide-react";
import styles from "./ChatInput.module.css";

type Props = {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
    value?: string;
    onChange?: (message: string) => void;
};

export default function ChatInput({
    onSend,
    disabled,
    placeholder = "想問什麼問題？",
    value,
    onChange,
}: Props) {
    const [uncontrolledInput, setUncontrolledInput] = useState<string>("");
    const isControlled = value !== undefined;
    const input = isControlled ? value : uncontrolledInput;

    const handleInputChange = (nextValue: string) => {
        if (!isControlled) {
            setUncontrolledInput(nextValue);
        }
        onChange?.(nextValue);
    };

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);

        if (!isControlled) {
            setUncontrolledInput("");
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.inner}>
                {/* Invisible mirror for auto-resize */}
                <div className={styles.mirror}>{input + " "}</div>
                <textarea
                    className={styles.field}
                    placeholder={
                        disabled ? "正在回覆中，請稍候..." : placeholder
                    }
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    disabled={disabled}
                    rows={1}
                />
            </div>
            <IconButton
                className={styles.buttonWrapper}
                onClick={handleSend}
                disabled={disabled || !input.trim()}
            >
                <Send className={styles.buttonIcon} />
            </IconButton>
        </div>
    );
}
