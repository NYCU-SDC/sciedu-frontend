// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { submitAnswer } from "./submitAnswer";

const submittedAnswer = {
    id: "answer-1",
    questionId: "question-1",
    createdAt: "2026-07-19T00:00:00Z",
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("submitAnswer", () => {
    it("submits the selected option ID for a choice question", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: vi.fn().mockResolvedValue({
                ...submittedAnswer,
                selectedOptionId: "option-2",
            }),
        });
        vi.stubGlobal("fetch", fetchMock);

        await submitAnswer("question-1", "CHOICE", "option-2");

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/api/questions/question-1/answers"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ selectedOptionId: "option-2" }),
            })
        );
    });

    it("trims and submits a non-empty text answer", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: vi.fn().mockResolvedValue({
                ...submittedAnswer,
                textAnswer: "孟德爾遺傳",
            }),
        });
        vi.stubGlobal("fetch", fetchMock);

        await submitAnswer("question-1", "TEXT", "  孟德爾遺傳  ");

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/api/questions/question-1/answers"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ textAnswer: "孟德爾遺傳" }),
            })
        );
    });
});
