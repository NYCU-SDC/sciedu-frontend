import CurrentTaskCard from "../CurrentTaskCard";
import MaterialProgressCard, {
    type MaterialListItem,
} from "../MaterialProgressCard";
import { useNavigate } from "react-router";
import { demoCourses } from "../../../demo/demoCourseCatalog";

const todayMaterials: MaterialListItem[] = demoCourses.map((course) => ({
    id: course.id,
    title: course.title,
    totalPages: course.definition.pages.length,
    completedPage: course.completedPage,
    status: course.status,
}));

// 左邊「進行中任務」卡片較寬、右邊「今日教材清單」較窄，
// 不是等寬雙欄；用 flex-wrap 讓手機時自動疊成單欄
export default function Library() {
    const navigate = useNavigate();
    const currentCourse =
        demoCourses.find((course) => course.status === "in_progress") ??
        demoCourses[0];

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
                    title={currentCourse.title}
                    totalPages={currentCourse.definition.pages.length}
                    completedPage={currentCourse.completedPage}
                    onContinue={() => navigate(`/course/${currentCourse.id}`)}
                />
            </div>
            <div style={{ flex: "1 1 320px", maxWidth: "527px" }}>
                <MaterialProgressCard items={todayMaterials} />
            </div>
        </div>
    );
}
