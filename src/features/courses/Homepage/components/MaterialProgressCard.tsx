import { Check } from "lucide-react";
import styles from "./MaterialProgressCard.module.css";

export type MaterialStatus = "done" | "in_progress" | "not_started";

export type MaterialListItem = {
    id: string;
    title: string;
    totalPages: number;
    completedPage: number;
    status: MaterialStatus;
};

const statusLabel: Record<MaterialStatus, string> = {
    done: "已完成",
    in_progress: "進行中",
    not_started: "未完成",
};

const statusClassName: Record<MaterialStatus, string> = {
    done: styles.status_done,
    in_progress: styles.status_in_progress,
    not_started: styles.status_not_started,
};

type Props = {
    items: MaterialListItem[];
};

export default function MaterialProgressCard({ items }: Props) {
    const doneCount = items.filter((item) => item.status === "done").length;

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>今日教材</h3>
                <span className={styles.progressBadge}>
                    {doneCount}/{items.length} 完成
                </span>
            </div>
            <ul className={styles.list}>
                {items.map((item) => (
                    <li key={item.id} className={styles.item}>
                        <span
                            className={`${styles.checkbox} ${item.status === "done" ? styles.checkboxDone : ""}`}
                            aria-hidden="true"
                        >
                            {item.status === "done" && (
                                <Check size={12} strokeWidth={3} />
                            )}
                        </span>
                        <div className={styles.itemBody}>
                            <p className={styles.itemTitle}>{item.title}</p>
                            <p className={styles.itemMeta}>
                                共 {item.totalPages} 頁．已完成第{" "}
                                {item.completedPage} 頁
                            </p>
                        </div>
                        <span
                            className={`${styles.status} ${statusClassName[item.status]}`}
                        >
                            {statusLabel[item.status]}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
