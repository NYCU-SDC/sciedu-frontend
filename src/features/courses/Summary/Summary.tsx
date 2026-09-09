import { Box } from "@mantine/core";
import { useNavigate, useSearchParams } from "react-router";
import Header from "./components/Header";
import StatusBar from "./components/main/StatusBar";
import ResultCard from "./components/main/ResultCard";
import { demoCourses, getDemoCourse } from "../demo/demoCourseCatalog";

export default function Summary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get("courseId") ?? demoCourses[0].id;
    const course = getDemoCourse(courseId) ?? demoCourses[0];

    return (
        <Box
            mih="100vh"
            bg="#f0f6f4"
            p="48px 40px"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <Header />
            <Box
                component="main"
                pt="16px"
                pb="16px"
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
                <StatusBar title={course.title} />
                <Box px="10px">
                    <ResultCard
                        title="教材已完成！"
                        materialTitle={course.title}
                        description="點擊下方返回查看教材、作答情況，以及詳解"
                        correctCount={course.summary.correctCount}
                        wrongCount={course.summary.wrongCount}
                        duration={course.summary.duration}
                        onDetailClick={() =>
                            navigate(`/course/${course.id}?mode=review`)
                        }
                    />
                </Box>
            </Box>
        </Box>
    );
}
