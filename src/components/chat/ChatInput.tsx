import { useState } from "react";
import { Box, TextField, IconButton } from "@radix-ui/themes";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
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
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (input.trim()) {
            onSend(input.trim());
            setInput("");
        }
    };

    return (
        <Box className="chat-input-wrapper">
            <TextField.Root
                className="chat-input-field"
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
        </Box>
    );
}
