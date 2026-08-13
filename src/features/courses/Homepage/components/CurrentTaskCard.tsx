import { ArrowRight } from "lucide-react";
import styles from "./CurrentTaskCard.module.css";

type Props = {
    eyebrow: string;
    title: string;
    totalPages: number;
    completedPage: number;
    onContinue?: () => void;
};

export default function CurrentTaskCard({
    eyebrow,
    title,
    totalPages,
    completedPage,
    onContinue,
}: Props) {
    return (
        <section className={styles.card}>
            <div>
                <p className={styles.eyebrow}>{eyebrow}</p>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.meta}>
                    共 {totalPages} 頁．已完成第 {completedPage} 頁
                </p>
            </div>
            <button
                type="button"
                className={styles.continueButton}
                onClick={onContinue}
            >
                繼續目前任務
                <ArrowRight size={16} />
            </button>
        </section>
    );
}
