import type { CourseAnswers, SubmittedAnswerResponse } from "../types/types";

const STORAGE_PREFIX = "sciedu-course-attempt:";

export type CourseAttempt = {
    courseId: string;
    courseTitle: string;
    userEmail: string;
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

function storageKey(courseId: string, userEmail: string) {
    return `${STORAGE_PREFIX}${encodeURIComponent(userEmail)}:${courseId}`;
}

function isCourseAttempt(
    value: unknown,
    courseId: string,
    userEmail: string
): value is CourseAttempt {
    return (
        isRecord(value) &&
        value.courseId === courseId &&
        value.userEmail === userEmail &&
        typeof value.courseTitle === "string" &&
        typeof value.startedAt === "string" &&
        typeof value.completedAt === "string" &&
        Number.isFinite(Date.parse(value.startedAt)) &&
        Number.isFinite(Date.parse(value.completedAt)) &&
        isAnswersByPage(value.answersByPage) &&
        Array.isArray(value.submissions) &&
        value.submissions.every(isSubmittedAnswer)
    );
}

export function saveCourseAttempt(attempt: CourseAttempt) {
    if (!attempt.userEmail) return;
    try {
        sessionStorage.setItem(
            storageKey(attempt.courseId, attempt.userEmail),
            JSON.stringify(attempt)
        );
    } catch {
        // Navigation state still carries the attempt when storage is unavailable.
    }
}

export function loadCourseAttempt(
    courseId: string,
    userEmail: string,
    navigationAttempt?: unknown
): CourseAttempt | null {
    if (!userEmail) return null;
    if (isCourseAttempt(navigationAttempt, courseId, userEmail))
        return navigationAttempt;
    try {
        const raw = sessionStorage.getItem(storageKey(courseId, userEmail));
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isCourseAttempt(parsed, courseId, userEmail) ? parsed : null;
    } catch {
        return null;
    }
}
