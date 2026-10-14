import { useNavigate } from "react-router";

import type { Course, CurrentExperiment } from "../../../types";
import CurrentTaskCard from "../CurrentTaskCard";
import MaterialProgressCard, {
    type MaterialListItem,
} from "../MaterialProgressCard";

type Props = {
    experiment: CurrentExperiment;
    courses: Course[];
};

// 左邊「進行中任務」卡片較寬、右邊「今日教材清單」較窄，
// 不是等寬雙欄；用 flex-wrap 讓手機時自動疊成單欄
export default function Library({ experiment, courses }: Props) {
    const navigate = useNavigate();
    const materials: MaterialListItem[] = courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
    }));

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
                    eyebrow="目前進行中的實驗"
                    title={experiment.name}
                    description={experiment.description}
                    buttonLabel="瀏覽實驗教材"
                    onContinue={() => navigate("/courses/library")}
                />
            </div>
            <div style={{ flex: "1 1 320px", maxWidth: "527px" }}>
                <MaterialProgressCard
                    items={materials}
                    onOpen={(courseId) => navigate(`/course/${courseId}`)}
                />
            </div>
        </div>
    );
}
