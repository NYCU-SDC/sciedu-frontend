import { PanelLeft } from "lucide-react";
import styles from "./TopBar.module.css";

type Props = {
    title: string;
    showExpand: boolean;
    onExpandSidebar: () => void;
};

export default function TopBar({ title, showExpand, onExpandSidebar }: Props) {
    return (
        <header className={styles.topbar}>
            {showExpand ? (
                <button
                    type="button"
                    className={styles.iconbtn}
                    title="展開側欄"
                    aria-label="展開側欄"
                    onClick={onExpandSidebar}
                >
                    <PanelLeft size={19} strokeWidth={1.6} />
                </button>
            ) : null}
            <span className={styles.title}>{title}</span>
            <span className={styles.spacer} />
        </header>
    );
}
