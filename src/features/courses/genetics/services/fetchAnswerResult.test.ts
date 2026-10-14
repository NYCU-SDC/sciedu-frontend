// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAnswerResult } from "./fetchAnswerResult";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("fetchAnswerResult", () => {
    it("loads the persisted result for a submitted answer", async () => {
        const response = {
            answerId: "answer-1",
            questionId: "question-1",
            status: "GRADED",
            method: "DETERMINISTIC",
            resultVisible: true,
            isCorrect: true,
            gradedAt: "2026-09-23T00:00:00Z",
        };
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(response),
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            fetchAnswerResult("question-1", "answer-1")
        ).resolves.toEqual(response);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining(
                "/api/questions/question-1/answers/answer-1/result"
            ),
            expect.objectContaining({ credentials: "include" })
        );
    });
});
