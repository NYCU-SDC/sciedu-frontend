import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Home from "../components/Home";
import { startChat } from "../services/startChat";
import { CHAT_HISTORY_QUERY_KEY } from "../../../shared/network/chat";

export default function NewChatPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState("");
    const [creating, setCreating] = useState(false);

    const handleSend = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || creating) return;

        setCreating(true);
        try {
            const { chatID } = await startChat(queryClient, trimmed);
            void queryClient.invalidateQueries({
                queryKey: CHAT_HISTORY_QUERY_KEY,
            });
            navigate(`/chat/${chatID}`);
        } catch (error) {
            setCreating(false);
            toast.error(
                `建立對話失敗: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    };

    return (
        <Home
            draft={draft}
            onDraftChange={setDraft}
            onSend={handleSend}
            busy={creating}
        />
    );
}
