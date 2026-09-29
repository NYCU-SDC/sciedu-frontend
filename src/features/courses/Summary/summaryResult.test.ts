import { describe, expect, it } from "vitest";
import { formatDuration, summarizeAnswerResults } from "./summaryResult";
import type { AnswerResultResponse } from "../genetics/types/types";

const result = (
    values: Partial<AnswerResultResponse>
): AnswerResultResponse => ({
    answerId: "answer-1",
    questionId: "question-1",
    status: "GRADED",
    resultVisible: true,
    ...values,
});

describe("summarizeAnswerResults", () => {
    it("keeps hidden and unfinished grades out of correct/wrong totals", () => {
        expect(
            summarizeAnswerResults([
                result({ isCorrect: true }),
                result({ answerId: "answer-2", isCorrect: false }),
                result({ answerId: "answer-3", resultVisible: false }),
                result({ answerId: "answer-4", status: "PENDING" }),
                result({ answerId: "answer-5", status: "FAILED" }),
            ])
        ).toEqual({
            correctCount: 1,
            wrongCount: 1,
            hiddenCount: 1,
            pendingCount: 1,
            failedCount: 1,
        });
    });

    it("formats elapsed time without rolling minutes over at one hour", () => {
        expect(
            formatDuration(
                "2026-09-23T00:00:00.000Z",
                "2026-09-23T01:02:03.000Z"
            )
        ).toBe("62:03");
    });
});
