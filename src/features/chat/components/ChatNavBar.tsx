import { PanelLeft } from "lucide-react";
import styles from "./ChatNavBar.module.css";

type ChatNavBarProps = {
    title: string;
    onMenuClick?: () => void;
};

export default function ChatNavBar({ title, onMenuClick }: ChatNavBarProps) {
    return (
        <header className={styles.navbar}>
            <button
                type="button"
                className={styles.menuButton}
                onClick={onMenuClick}
                aria-label="Open side menu"
            >
                <PanelLeft className={styles.icon} />
            </button>
            <div className={styles.title}>{title}</div>
        </header>
    );
}
