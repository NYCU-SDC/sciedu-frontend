import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router";

import { SectionTitles } from "../../../assets/NavbarContent";
import CoursePlayer, { CourseStatus } from "../player/CoursePlayer";
import { coursePageRequests } from "./assets/courseResource";
import {
    fetchCourseDefinition,
    isCourseUuid,
} from "./services/fetchCourseDefinition";
import type { CourseDefinition } from "./types/types";

const REMOTE_COURSE_NAVIGATION = {
    variant: "stepper",
    mainTitle: "生物科學推理學習",
} as const;

const LEGACY_GENETICS_COURSE: CourseDefinition = {
    id: "genetics",
    code: "genetics",
    title: "豌豆－種皮形狀",
    pages: coursePageRequests,
    navigation: {
        variant: "classic",
        mainTitle: SectionTitles.MainTitle,
        sectionTitles: SectionTitles.SubTitle,
    },
};

export default function GeneticsCourse() {
    const { courseId = "genetics" } = useParams<{ courseId: string }>();
    const [searchParams] = useSearchParams();
    const reviewMode = searchParams.get("mode") === "review";
    const remoteCourse = useQuery({
        queryKey: ["course-definition", courseId],
        queryFn: () =>
            fetchCourseDefinition(courseId, REMOTE_COURSE_NAVIGATION),
        enabled: isCourseUuid(courseId),
    });

    if (isCourseUuid(courseId) && remoteCourse.isLoading) {
        return <CourseStatus message="教材載入中…" />;
    }
    if (isCourseUuid(courseId) && remoteCourse.isError) {
        return <CourseStatus message="目前無法載入這份教材" isError />;
    }

    const definition = isCourseUuid(courseId)
        ? remoteCourse.data
        : LEGACY_GENETICS_COURSE;
    if (!definition) {
        return <CourseStatus message="找不到教材內容" isError />;
    }

    return (
        <CoursePlayer
            key={`${courseId}-${reviewMode ? "review" : "answer"}`}
            definition={definition}
            reviewMode={reviewMode}
        />
    );
}
