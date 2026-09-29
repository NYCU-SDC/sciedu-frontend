import type { CourseAnswers, SubmittedAnswerResponse } from "../types/types";

const STORAGE_PREFIX = "sciedu-course-attempt:";

export type CourseAttempt = {
    courseId: string;
    courseTitle: string;
    startedAt: string;
    completedAt: string;
    answersByPage: Record<number, CourseAnswers>;
    submissions: SubmittedAnswerResponse[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isSubmittedAnswer(value: unknown): value is SubmittedAnswerResponse {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        typeof value.questionId === "string" &&
        typeof value.experimentId === "string" &&
        typeof value.userId === "string" &&
        typeof value.createdAt === "string" &&
        (value.selectedOptionId === undefined ||
            typeof value.selectedOptionId === "string") &&
        (value.textAnswer === undefined || typeof value.textAnswer === "string")
    );
}

function isAnswersByPage(
    value: unknown
): value is Record<number, CourseAnswers> {
    return (
        isRecord(value) &&
        Object.values(value).every(
            (answers) =>
                isRecord(answers) &&
                Object.values(answers).every(
                    (answer) => typeof answer === "string"
                )
        )
    );
}

function storageKey(courseId: string) {
    return `${STORAGE_PREFIX}${courseId}`;
}

export function saveCourseAttempt(attempt: CourseAttempt) {
    try {
        sessionStorage.setItem(
            storageKey(attempt.courseId),
            JSON.stringify(attempt)
        );
    } catch {
        // Navigation state still carries the attempt when storage is unavailable.
    }
}

export function loadCourseAttempt(courseId: string): CourseAttempt | null {
    try {
        const raw = sessionStorage.getItem(storageKey(courseId));
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (
            !isRecord(parsed) ||
            parsed.courseId !== courseId ||
            typeof parsed.courseTitle !== "string" ||
            typeof parsed.startedAt !== "string" ||
            typeof parsed.completedAt !== "string" ||
            !isAnswersByPage(parsed.answersByPage) ||
            !Array.isArray(parsed.submissions) ||
            !parsed.submissions.every(isSubmittedAnswer)
        ) {
            return null;
        }
        return parsed as CourseAttempt;
    } catch {
        return null;
    }
}
