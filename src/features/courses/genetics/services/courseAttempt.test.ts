// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { loadCourseAttempt, saveCourseAttempt } from "./courseAttempt";

afterEach(() => {
    sessionStorage.clear();
});

describe("courseAttempt", () => {
    it("stores the answer IDs required by the result endpoint", () => {
        const attempt = {
            courseId: "genetics",
            courseTitle: "遺傳學",
            startedAt: "2026-09-23T00:00:00Z",
            completedAt: "2026-09-23T00:10:00Z",
            answersByPage: { 1: { "question-1": "option-1" } },
            submissions: [
                {
                    id: "answer-1",
                    questionId: "question-1",
                    experimentId: "experiment-1",
                    userId: "user-1",
                    selectedOptionId: "option-1",
                    createdAt: "2026-09-23T00:09:00Z",
                },
            ],
        };

        saveCourseAttempt(attempt);

        expect(loadCourseAttempt("genetics")).toEqual(attempt);
        expect(loadCourseAttempt("another-course")).toBeNull();
    });

    it("ignores malformed stored data", () => {
        sessionStorage.setItem("sciedu-course-attempt:genetics", "not-json");
        expect(loadCourseAttempt("genetics")).toBeNull();
    });

    it("ignores stored data with malformed answers or submissions", () => {
        sessionStorage.setItem(
            "sciedu-course-attempt:genetics",
            JSON.stringify({
                courseId: "genetics",
                courseTitle: "遺傳學",
                startedAt: "2026-09-23T00:00:00Z",
                completedAt: "2026-09-23T00:10:00Z",
                answersByPage: { 1: { "question-1": 123 } },
                submissions: [],
            })
        );
        expect(loadCourseAttempt("genetics")).toBeNull();

        sessionStorage.setItem(
            "sciedu-course-attempt:genetics",
            JSON.stringify({
                courseId: "genetics",
                courseTitle: "遺傳學",
                startedAt: "2026-09-23T00:00:00Z",
                completedAt: "2026-09-23T00:10:00Z",
                answersByPage: {},
                submissions: [{ id: "answer-1" }],
            })
        );
        expect(loadCourseAttempt("genetics")).toBeNull();
    });
});
