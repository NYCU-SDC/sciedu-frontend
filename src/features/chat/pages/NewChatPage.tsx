import { useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";
import Home from "../components/Home";
import { ApiError } from "../../../shared/utils/api";
import { rememberLoginReturnTo } from "../../../shared/auth/loginReturnTo";
import { useAuth } from "../../../shared/auth";
import { startChat } from "../services/startChat";
import { CHAT_HISTORY_QUERY_KEY } from "../../../shared/network/chat";

export default function NewChatPage({ basePath = "" }: { basePath?: string }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [createError, setCreateError] = useState<Error | null>(null);
    const { session } = useAuth();
    const [createdChatId, setCreatedChatId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const posthog = usePostHog();
    const [draft, setDraft] = useState("");
    const [creating, setCreating] = useState(false);
    const startingRef = useRef(false);

    const handleSend = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || creating || startingRef.current) return;
        if (createdChatId) {
            navigate(`${basePath}/chat/${createdChatId}`);
            return;
        }

        setCreateError(null);
        startingRef.current = true;
        setCreating(true);
        try {
            const { chatID } = await startChat(queryClient, trimmed, {
                account: session?.email,
                onCreated: setCreatedChatId,
            });
            posthog.capture("chat_started", { chat_id: chatID });
            void queryClient.invalidateQueries({
                queryKey: CHAT_HISTORY_QUERY_KEY,
            });
            navigate(`${basePath}/chat/${chatID}`);
        } catch (error) {
            setCreateError(
                error instanceof Error ? error : new Error("無法建立對話")
            );
            startingRef.current = false;
            setCreating(false);
            toast.error(
                `建立對話失敗: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    };

    return (
        <>
            {createError instanceof ApiError && createError.status === 401 && (
                <p role="status">
                    登入已過期。
                    <Link
                        to="/login"
                        onClick={() => {
                            rememberLoginReturnTo(
                                location.pathname + location.search
                            );
                            void queryClient.resetQueries({
                                queryKey: ["auth", "session"],
                                exact: true,
                            });
                        }}
                    >
                        重新登入
                    </Link>
                </p>
            )}
            {createdChatId && !creating && (
                <p role="status">
                    對話已建立，請先查看已收到的訊息。
                    <button
                        type="button"
                        onClick={() =>
                            navigate(`${basePath}/chat/${createdChatId}`)
                        }
                    >
                        查看已建立的對話
                    </button>
                </p>
            )}
            <Home
                draft={draft}
                onDraftChange={setDraft}
                onSend={handleSend}
                busy={
                    creating ||
                    (createError instanceof ApiError &&
                        createError.status === 401)
                }
            />
        </>
    );
}
