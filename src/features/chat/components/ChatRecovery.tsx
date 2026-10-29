import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router";
import type { UseChatResult } from "../services/useChat";
import { CHAT_MOCK_ENABLED } from "../../../shared/network/chat";
import { ApiError } from "../../../shared/utils/api";
import { rememberLoginReturnTo } from "../../../shared/auth/loginReturnTo";
import styles from "./ChatRecovery.module.css";
export default function ChatRecovery({
    chat,
    onReload,
    extraError,
    onRestart,
}: {
    chat: UseChatResult;
    onReload?: () => void;
    extraError?: string | null;
    onRestart?: () => void;
}) {
    const location = useLocation();
    const client = useQueryClient();
    const unauthorized =
        chat.error instanceof ApiError && chat.error.status === 401;
    const missing =
        (chat.error instanceof ApiError && chat.error.status === 404) ||
        extraError === "原對話已不存在，請重新開始對話。";
    const message = unauthorized
        ? "登入已過期，請重新登入以繼續對話。"
        : missing
          ? "找不到這個對話，可能已刪除或無權存取。"
          : (chat.recoveryMessage ?? extraError ?? chat.error?.message);
    return (
        <div className={styles.container}>
            {CHAT_MOCK_ENABLED && (
                <span className={styles.mock}>模擬對話 · 不會傳送至後端</span>
            )}
            {message && (
                <div className={styles.notice} role="status">
                    <span>{message}</span>
                    {unauthorized ? (
                        <Link
                            to="/login"
                            onClick={() => {
                                rememberLoginReturnTo(
                                    location.pathname + location.search
                                );
                                void client.resetQueries({
                                    queryKey: ["auth", "session"],
                                    exact: true,
                                });
                            }}
                        >
                            重新登入
                        </Link>
                    ) : missing ? (
                        onRestart ? (
                            <button type="button" onClick={onRestart}>
                                重新開始
                            </button>
                        ) : (
                            <Link to="/chat">開始新對話</Link>
                        )
                    ) : (
                        <button
                            type="button"
                            onClick={onReload ?? chat.reloadResult}
                        >
                            重新載入結果
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
