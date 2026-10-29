import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./CourseHeader.module.css";

type Props = {
    title: string;
    subtitle: string;
    returnTo?: "/" | "/courses";
    actions?: ReactNode;
};

export default function CourseHeader({
    title,
    subtitle,
    returnTo = "/",
    actions,
}: Props) {
    return (
        <header className={styles.header}>
            <div className={styles.identity}>
                <span className={styles.brand}>SciEdu</span>
                <span className={styles.divider} aria-hidden="true" />
                <div className={styles.titles}>
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </div>
            </div>
            <div className={styles.actions}>
                <div className={styles.modeGroup}>
                    <Link
                        to={returnTo}
                        className={`${styles.pill} ${styles.returnLink}`}
                    >
                        <ArrowLeft size={18} aria-hidden="true" />
                        {returnTo === "/courses" ? "返回教材首頁" : "返回首頁"}
                    </Link>
                    <span className={styles.pill}>學生模式</span>
                </div>
                {actions}
            </div>
        </header>
    );
}
