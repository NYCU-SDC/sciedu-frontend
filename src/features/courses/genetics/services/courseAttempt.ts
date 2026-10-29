import { currentPracticeRound } from "../../../experience/practiceRound";
import {
    readPersistent,
    writePersistent,
} from "../../../experience/persistentStorage";
import { backendEnvironment } from "../../../../shared/network/materialChat";
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
    practice?: boolean;
    roundId?: string;
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

function storageKey(
    courseId: string,
    userEmail: string,
    experimentId: string,
    roundId?: string
) {
    return `${COURSE_ATTEMPT_PREFIX}${encodeURIComponent(backendEnvironment())}:${encodeURIComponent(userEmail)}:${encodeURIComponent(experimentId)}:${courseId}${roundId ? `:practice:${roundId}` : ""}`;
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
        (!value.practice ||
            (typeof value.roundId === "string" &&
                value.roundId ===
                    currentPracticeRound(userEmail, experimentId, courseId))) &&
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
        writePersistent(
            storageKey(
                attempt.courseId,
                attempt.userEmail,
                attempt.experimentId,
                attempt.practice ? attempt.roundId : undefined
            ),
            JSON.stringify(attempt)
        );
    } catch {
        throw new Error("無法保存完成紀錄，請勿關閉頁面，稍後重試。");
    }
}

export function loadCourseAttempt(
    courseId: string,
    userEmail: string,
    experimentId: string,
    navigationAttempt?: unknown,
    mode: "standard" | "practice" = "standard"
): CourseAttempt | null {
    if (!userEmail || !experimentId) return null;
    if (
        isCourseAttempt(navigationAttempt, courseId, userEmail, experimentId) &&
        Boolean(navigationAttempt.practice) === (mode === "practice")
    )
        return navigationAttempt;
    try {
        const raw = readPersistent(
            storageKey(
                courseId,
                userEmail,
                experimentId,
                mode === "practice"
                    ? (currentPracticeRound(
                          userEmail,
                          experimentId,
                          courseId
                      ) ?? "missing")
                    : undefined
            )
        );
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isCourseAttempt(parsed, courseId, userEmail, experimentId) &&
            Boolean(parsed.practice) === (mode === "practice")
            ? parsed
            : null;
    } catch {
        return null;
    }
}
