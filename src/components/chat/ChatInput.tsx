import { useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "@radix-ui/themes";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import "./ChatInput.css";

const MAX_HEIGHT = 160; // px

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

        el.style.height = "auto";
        const next = Math.min(el.scrollHeight, MAX_HEIGHT);
        el.style.height = `${next}px`;
        el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    };

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input.trim());
        setInput("");
    };

    useLayoutEffect(() => {
        resize();
    }, [input]);

    return (
        <div className="chat-input-wrapper">
            <textarea
                className="chat-input-field"
                ref={ref}
                placeholder={placeholder}
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
                <PaperPlaneIcon />
            </IconButton>
        </div>
    );
}
