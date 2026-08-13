import styles from "./Header.module.css";

export default function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <span className={styles.brand}>SciEdu</span>
                <div className={styles.divider} aria-hidden="true" />
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>教材首頁</h1>
                    <p className={styles.subtitle}>今日任務．學習概況．教材瀏覽</p>
                </div>
            </div>
            <span className={styles.modeBadge}>學生模式</span>
        </header>
    );
}
