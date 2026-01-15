import { useState } from "react";
import { IconButton } from "@radix-ui/themes";
import { Send } from "lucide-react";
import "./ChatInput.css";

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

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput("");
    };

    return (
        <div className="chat-input-wrapper">
            <div className="chat-input-inner">
                {/* Invisible mirror for auto-resize */}
                <div className="chat-input-mirror">{input + "\n"}</div>
                <textarea
                    className="chat-input-field"
                    placeholder={
                        disabled ? "正在回覆中，請稍候..." : placeholder
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    disabled={disabled}
                    rows={1}
                />
            </div>
            <IconButton
                className="chat-input-button-wrapper"
                onClick={handleSend}
                disabled={disabled || !input.trim()}
            >
                <Send className="chat-input-button-icon" />
            </IconButton>
        </div>
    );
}
