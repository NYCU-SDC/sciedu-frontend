import { useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "@radix-ui/themes";
import { Send } from "lucide-react";
import "./ChatInput.css";

const MAX_HEIGHT_REM = 10; // rem

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({
    onSend,
    disabled,
    placeholder = "想問什麼問題？",
}: ChatInputProps) {
    const [input, setInput] = useState<string>("");
    const ref = useRef<HTMLTextAreaElement>(null);

    const resize = () => {
        const el = ref.current;
        if (!el) return;

        const baseFontSize = parseFloat(
            getComputedStyle(document.documentElement).fontSize
        );

        el.style.removeProperty("--textarea-height");
        const next = Math.min(el.scrollHeight, MAX_HEIGHT_REM * baseFontSize);
        el.style.setProperty("--textarea-height", `${next / baseFontSize}rem`);
        el.style.setProperty(
            "--textarea-overflow",
            el.scrollHeight > MAX_HEIGHT_REM * baseFontSize ? "auto" : "hidden"
        );
    };

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput("");
    };

    useLayoutEffect(() => {
        resize();
    }, [input]);

    return (
        <div className="chat-input-wrapper">
            <textarea
                ref={ref}
                className="chat-input-field"
                placeholder={disabled ? "正在回覆中，請稍候..." : placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                }
                disabled={disabled}
            />
            <IconButton
                className="chat-input-button"
                onClick={handleSend}
                disabled={disabled || !input.trim()}
            >
                <Send />
            </IconButton>
        </div>
    );
}
