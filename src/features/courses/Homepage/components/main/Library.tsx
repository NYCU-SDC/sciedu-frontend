import CurrentTaskCard from "../CurrentTaskCard";
import MaterialProgressCard, {
    type MaterialListItem,
} from "../MaterialProgressCard";

const todayMaterials: MaterialListItem[] = [
    {
        id: "cell-division",
        title: "細胞分裂",
        totalPages: 3,
        completedPage: 3,
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

// 左邊「進行中任務」卡片較寬、右邊「今日教材清單」較窄，
// 不是等寬雙欄；用 flex-wrap 讓手機時自動疊成單欄
export default function Library() {
    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                gap: "1.5rem",
                padding: "16px 10px",
            }}
        >
            <div style={{ flex: "2 1 480px" }}>
                <CurrentTaskCard
                    eyebrow="開始實驗任務"
                    title="碗豆－種皮形狀"
                    totalPages={3}
                    completedPage={1}
                />
            </div>
            <div style={{ flex: "1 1 320px", maxWidth: "527px" }}>
                <MaterialProgressCard items={todayMaterials} />
            </div>
        </div>
    );
}
