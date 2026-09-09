import { describe, expect, it } from "vitest";

import {
    fetchAnswerAttempt,
    listAnswerAttempts,
    listCoursePointerSamples,
} from "./answerRecordsRepository";

describe("answer records demo repository", () => {
    it("includes attempts for all three demo courses", async () => {
        const attempts = await listAnswerAttempts();

        expect(new Set(attempts.map((attempt) => attempt.courseId)).size).toBe(
            3
        );
        expect(attempts.some((attempt) => attempt.pendingReviewCount > 0)).toBe(
            true
        );
        expect(
            attempts.some((attempt) => attempt.progress === "IN_PROGRESS")
        ).toBe(true);
    });

    it("filters by student, course, progress and evaluation", async () => {
        const [reference] = await listAnswerAttempts();
        const attempts = await listAnswerAttempts({
            student: reference.studentName.slice(0, 1),
            courseId: reference.courseId,
            progress: reference.progress,
            evaluation: "INCORRECT",
        });

        expect(attempts.length).toBeGreaterThan(0);
        expect(
            attempts.every(
                (attempt) =>
                    attempt.courseId === reference.courseId &&
                    attempt.progress === reference.progress &&
                    attempt.questions.some(
                        (question) => question.evaluation === "INCORRECT"
                    )
            )
        ).toBe(true);
    });

    it("keeps pointer samples normalized and scoped by course page", async () => {
        const attempt = await fetchAnswerAttempt("answer-attempt-01");
        expect(attempt).toBeDefined();

        const samples = await listCoursePointerSamples(attempt!.courseId, 1);

        expect(samples.length).toBeGreaterThan(0);
        expect(samples.every((sample) => sample.pageIndex === 1)).toBe(true);
        expect(
            samples.every(
                (sample) =>
                    sample.xRatio >= 0 &&
                    sample.xRatio <= 1 &&
                    sample.yRatio >= 0 &&
                    sample.yRatio <= 1
            )
        ).toBe(true);
    });
});
