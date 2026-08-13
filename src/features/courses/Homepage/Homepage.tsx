import { ArrowRight } from "lucide-react";
import Header from "./components/Header";
import CurrentTaskCard from "./components/CurrentTaskCard";
import MaterialProgressCard, {
    type MaterialListItem,
} from "./components/MaterialProgressCard";
import styles from "./Homepage.module.css";

const todayMaterials: MaterialListItem[] = [
    {
        id: "cell-division",
        title: "細胞分裂",
        totalPages: 3,
        completedPage: 1,
        status: "done",
    },
    {
        id: "pea-seed-coat-current",
        title: "碗豆－種皮形狀",
        totalPages: 3,
        completedPage: 1,
        status: "in_progress",
    },
    {
        id: "pea-seed-coat-next",
        title: "碗豆－種皮形狀",
        totalPages: 3,
        completedPage: 1,
        status: "not_started",
    },
];

export default function Homepage() {
    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>今日任務</h2>
                        <p className={styles.sectionSubtitle}>
                            請優先完成教師今日安排的教材
                        </p>
                    </div>
                    <button type="button" className={styles.libraryButton}>
                        查看教材書櫃
                        <ArrowRight size={16} />
                    </button>
                </div>
                <div className={styles.contentGrid}>
                    <CurrentTaskCard
                        eyebrow="開始實驗任務"
                        title="碗豆－種皮形狀"
                        totalPages={3}
                        completedPage={1}
                    />
                    <MaterialProgressCard items={todayMaterials} />
                </div>
            </main>
        </div>
    );
}
