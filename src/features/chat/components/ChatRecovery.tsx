import type { UseChatResult } from "../services/useChat";
import { CHAT_MOCK_ENABLED } from "../../../shared/network/chat";
import styles from "./ChatRecovery.module.css";
export default function ChatRecovery({ chat }: { chat: UseChatResult }) {
    const message = chat.recoveryMessage ?? chat.error?.message;
    return (
        <div className={styles.container}>
            {CHAT_MOCK_ENABLED && (
                <span className={styles.mock}>模擬對話 · 不會傳送至後端</span>
            )}
            {message && (
                <div className={styles.notice} role="status">
                    <span>{message}</span>
                    <button type="button" onClick={chat.reloadResult}>
                        重新載入結果
                    </button>
                </div>
            )}
        </div>
    );
}
