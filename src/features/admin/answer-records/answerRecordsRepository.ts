import { demoAnswerAttempts } from "./demoAnswerRecords";
import type {
    AnswerAttempt,
    AnswerAttemptFilters,
    PointerSample,
} from "./types";

const DEMO_DELAY_MS = 120;

const resolveDemo = <T>(value: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(value), DEMO_DELAY_MS));

export function listAnswerAttempts(
    filters: AnswerAttemptFilters = {}
): Promise<AnswerAttempt[]> {
    const student = filters.student?.trim().toLocaleLowerCase("zh-Hant") ?? "";
    return resolveDemo(
        [...demoAnswerAttempts]
            .filter((attempt) => {
                const matchesEvaluation =
                    !filters.evaluation ||
                    attempt.questions.some(
                        (question) => question.evaluation === filters.evaluation
                    );
                return (
                    (!student ||
                        attempt.studentName
                            .toLocaleLowerCase("zh-Hant")
                            .includes(student) ||
                        attempt.studentEmail.toLowerCase().includes(student)) &&
                    (!filters.experimentId ||
                        attempt.experimentId === filters.experimentId) &&
                    (!filters.courseId ||
                        attempt.courseId === filters.courseId) &&
                    (!filters.progress ||
                        attempt.progress === filters.progress) &&
                    matchesEvaluation
                );
            })
            .sort(
                (left, right) =>
                    new Date(right.submittedAt ?? right.startedAt).getTime() -
                    new Date(left.submittedAt ?? left.startedAt).getTime()
            )
    );
}

export function fetchAnswerAttempt(
    attemptId: string
): Promise<AnswerAttempt | undefined> {
    return resolveDemo(
        demoAnswerAttempts.find((attempt) => attempt.id === attemptId)
    );
}

export function listCoursePointerSamples(
    courseId: string,
    pageIndex: number
): Promise<PointerSample[]> {
    return resolveDemo(
        demoAnswerAttempts
            .filter((attempt) => attempt.courseId === courseId)
            .flatMap((attempt) => attempt.pointerSessions)
            .filter((session) => session.pageIndex === pageIndex)
            .flatMap((session) => session.samples)
    );
}
