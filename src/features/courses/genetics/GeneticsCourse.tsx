import { useQueries, useQuery } from "@tanstack/react-query";
import {
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router";
import { SectionTitles } from "../../../assets/NavbarContent";
import { useAuth } from "../../../shared/auth";
import { getAttemptSessionId } from "../../../shared/auth/courseAttemptStorage";
import CoursePlayer, {
    CourseStatus,
    type CourseCompletion,
} from "../player/CoursePlayer";
import { coursePageRequests } from "./assets/courseResource";
import {
    fetchCourseDefinition,
    isCourseUuid,
} from "./services/fetchCourseDefinition";
import {
    loadCourseAttempt,
    saveCourseAttempt,
    type CourseAttempt,
} from "./services/courseAttempt";
import { answerResultQueryOptions } from "./services/answerResultQueryOptions";
import { useAttemptExperiment } from "./services/useAttemptExperiment";
import type { CourseDefinition, CourseReviews } from "./types/types";

const navigation = {
    variant: "stepper",
    mainTitle: "生物科學推理學習",
} as const;
const legacy: CourseDefinition = {
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
    const { courseId = "" } = useParams<{ courseId: string }>();
    const { session, login } = useAuth();
    const [params] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const reviewMode = params.get("mode") === "review";
    const current = useAttemptExperiment();
    const experimentId = current.data?.experiment.id ?? "";
    const eligible =
        current.data?.experiment.status === "ACTIVE" &&
        (!isCourseUuid(courseId) ||
            current.data.courses.some(
                (course) =>
                    course.id === courseId && course.status === "PUBLISHED"
            ));
    const remote = useQuery({
        queryKey: ["course-definition", session?.email, experimentId, courseId],
        queryFn: () => fetchCourseDefinition(courseId, navigation),
        enabled: Boolean(isCourseUuid(courseId) && eligible),
    });
    const attempt = reviewMode
        ? loadCourseAttempt(
              courseId,
              session?.email ?? "",
              experimentId,
              (location.state as { attempt?: unknown } | null)?.attempt
          )
        : null;
    const resultQueries = useQueries({
        queries: (eligible ? (attempt?.submissions ?? []) : []).map(
            (submission) =>
                answerResultQueryOptions(
                    session?.email ?? "",
                    submission.questionId,
                    submission.id,
                    experimentId
                )
        ),
    });
    const reviews: CourseReviews = {};
    if (attempt) {
        Object.values(attempt.answersByPage).forEach((answers) =>
            Object.keys(answers).forEach((id) => {
                reviews[id] = {
                    isLoading: false,
                    isError: false,
                    isUnavailable: true,
                };
            })
        );
        attempt.submissions.forEach((answer, index) => {
            const query = resultQueries[index];
            reviews[answer.questionId] = {
                result: query?.data,
                isLoading: query?.isLoading ?? false,
                isError: query?.isError ?? false,
            };
        });
    }
    if (current.isPending) return <CourseStatus message="正在確認目前實驗…" />;
    if (current.isError)
        return (
            <main>
                <CourseStatus
                    message="無法確認實驗，請重新登入或重試"
                    isError
                />
                <button onClick={() => login("google")}>重新登入</button>
                <button onClick={() => void current.refetch()}>重試</button>
            </main>
        );
    if (!eligible)
        return (
            <CourseStatus message="這份教材不在目前進行中的實驗中" isError />
        );
    if (reviewMode && !attempt)
        return (
            <CourseStatus
                message="找不到目前帳號與實驗的作答紀錄，請從完成後的摘要頁進入"
                isError
            />
        );
    if (isCourseUuid(courseId) && remote.isPending)
        return <CourseStatus message="教材載入中…" />;
    if (isCourseUuid(courseId) && remote.isError)
        return (
            <main>
                <CourseStatus message="目前無法載入這份教材" isError />
                <button onClick={() => login("google")}>重新登入</button>
                <button onClick={() => void remote.refetch()}>重試</button>
            </main>
        );
    const definition = isCourseUuid(courseId)
        ? remote.data
        : ["genetics", "1"].includes(courseId)
          ? { ...legacy, id: courseId }
          : undefined;
    if (!definition) return <CourseStatus message="找不到教材內容" isError />;
    const complete = (completion: CourseCompletion) => {
        const record: CourseAttempt = {
            ...completion,
            courseId: definition.id,
            courseTitle: definition.title,
            userEmail: session?.email ?? "",
            experimentId,
            sessionId: getAttemptSessionId(),
        };
        saveCourseAttempt(record);
        navigate(
            `/courses/summary?courseId=${encodeURIComponent(definition.id)}`,
            { state: { attempt: record } }
        );
    };
    return (
        <>
            {reviewMode && resultQueries.some((query) => query.isError) && (
                <button
                    onClick={() =>
                        resultQueries.forEach((query) => {
                            void query.refetch();
                        })
                    }
                >
                    重新取得評分結果
                </button>
            )}
            <CoursePlayer
                key={`${session?.email}-${experimentId}-${courseId}-${reviewMode}`}
                definition={definition}
                onComplete={complete}
                reviewMode={reviewMode}
                initialAnswers={attempt?.answersByPage}
                reviews={reviews}
            />
        </>
    );
}
