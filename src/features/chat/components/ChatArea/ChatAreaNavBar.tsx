import { useChatAreaContext } from "./useChatAreaContext";
import styles from "./ChatAreaNavBar.module.css";
import { Sparkles, RefreshCcw } from "lucide-react";

export default function ChatAreaNavBar() {
    const { title, onRefresh } = useChatAreaContext();

    return (
        <header className={styles.header}>
            <div className={styles.chatTitle}>
                <Sparkles className={styles.icon} />
                <div className={styles.title}>{title}</div>
            </div>
            <RefreshCcw className={styles.icon} onClick={onRefresh} />
        </header>
    );
}
