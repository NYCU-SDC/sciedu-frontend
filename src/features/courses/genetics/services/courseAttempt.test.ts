// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import type { CourseAttempt } from "./courseAttempt";
import { loadCourseAttempt, saveCourseAttempt } from "./courseAttempt";

const attempt: CourseAttempt = {
    courseId: "course-1",
    courseTitle: "遺傳教材",
    startedAt: "2026-10-05T01:00:00.000Z",
    completedAt: "2026-10-05T01:10:00.000Z",
    answersByPage: { 0: { "question-1": "option-1" } },
    submissions: [
        {
            id: "answer-1",
            questionId: "question-1",
            experimentId: "experiment-1",
            userId: "student-1",
            selectedOptionId: "option-1",
            createdAt: "2026-10-05T01:09:00.000Z",
        },
    ],
};

describe("course attempt storage", () => {
    beforeEach(() => sessionStorage.clear());

    it("round-trips a completed attempt by course ID", () => {
        saveCourseAttempt(attempt);

        expect(loadCourseAttempt(attempt.courseId)).toEqual(attempt);
        expect(loadCourseAttempt("another-course")).toBeNull();
    });

    it("ignores malformed stored data", () => {
        sessionStorage.setItem(
            "sciedu-course-attempt:course-1",
            JSON.stringify({ ...attempt, submissions: [{ id: "incomplete" }] })
        );

        expect(loadCourseAttempt(attempt.courseId)).toBeNull();
    });
});
