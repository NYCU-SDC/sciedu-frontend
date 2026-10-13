import type { CourseAnswers, SubmittedAnswerResponse } from "../types/types";

import {
    COURSE_ATTEMPT_PREFIX,
    getAttemptSessionId,
} from "../../../../shared/auth/courseAttemptStorage";

export type CourseAttempt = {
    courseId: string;
    courseTitle: string;
    userEmail: string;
    experimentId: string;
    sessionId: string;
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

function storageKey(courseId: string, userEmail: string, experimentId: string) {
    return `${COURSE_ATTEMPT_PREFIX}${encodeURIComponent(userEmail)}:${encodeURIComponent(experimentId)}:${courseId}`;
}

function isCourseAttempt(
    value: unknown,
    courseId: string,
    userEmail: string,
    experimentId: string
): value is CourseAttempt {
    return (
        isRecord(value) &&
        value.courseId === courseId &&
        value.userEmail === userEmail &&
        value.experimentId === experimentId &&
        value.sessionId === getAttemptSessionId() &&
        typeof value.courseTitle === "string" &&
        typeof value.startedAt === "string" &&
        typeof value.completedAt === "string" &&
        Number.isFinite(Date.parse(value.startedAt)) &&
        Number.isFinite(Date.parse(value.completedAt)) &&
        isAnswersByPage(value.answersByPage) &&
        Array.isArray(value.submissions) &&
        value.submissions.every(
            (submission) =>
                isSubmittedAnswer(submission) &&
                submission.experimentId === experimentId
        )
    );
}

export function saveCourseAttempt(attempt: CourseAttempt) {
    if (
        !attempt.userEmail ||
        !attempt.experimentId ||
        attempt.sessionId !== getAttemptSessionId()
    )
        return;
    try {
        sessionStorage.setItem(
            storageKey(
                attempt.courseId,
                attempt.userEmail,
                attempt.experimentId
            ),
            JSON.stringify(attempt)
        );
    } catch {
        // Navigation state still carries the attempt when storage is unavailable.
    }
}

export function loadCourseAttempt(
    courseId: string,
    userEmail: string,
    experimentId: string,
    navigationAttempt?: unknown
): CourseAttempt | null {
    if (!userEmail || !experimentId) return null;
    if (isCourseAttempt(navigationAttempt, courseId, userEmail, experimentId))
        return navigationAttempt;
    try {
        const raw = sessionStorage.getItem(
            storageKey(courseId, userEmail, experimentId)
        );
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isCourseAttempt(parsed, courseId, userEmail, experimentId)
            ? parsed
            : null;
    } catch {
        return null;
    }
}
