// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitAnswer } from "../services/submitAnswer";
import type { QuestionResponse } from "../types/types";
import {
    useAnswerSubmission,
    validateAnswer,
    MAX_TEXT_ANSWER_LENGTH,
    type SubmittableQuestion,
} from "./useAnswerSubmission";

vi.mock("../services/submitAnswer", () => ({
    submitAnswer: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn() },
}));

const choiceQuestion: QuestionResponse = {
    id: "choice-question",
    type: "CHOICE",
    content: "請選擇答案",
    options: [
        { id: "option-a", label: "A", content: "顯性" },
        { id: "option-b", label: "B", content: "隱性" },
    ],
};

const textQuestion: QuestionResponse = {
    id: "text-question",
    type: "TEXT",
    content: "請說明原因",
    options: [],
};

const questions: SubmittableQuestion[] = [
    {
        questionId: choiceQuestion.id,
        question: choiceQuestion,
        isUnavailable: false,
    },
    {
        questionId: textQuestion.id,
        question: textQuestion,
        isUnavailable: false,
    },
];

const submittedAnswerResponse = {
    id: "answer-1",
    questionId: choiceQuestion.id,
    selectedOptionId: "option-a",
    createdAt: "2026-08-26T00:00:00Z",
};

beforeEach(() => {
    vi.mocked(submitAnswer).mockReset();
});

describe("validateAnswer", () => {
    it("requires a valid selected option for choice questions", () => {
        expect(validateAnswer(choiceQuestion, "")).toBe("此題為必填");
        expect(validateAnswer(choiceQuestion, "missing-option")).toBe(
            "請選擇有效的選項"
        );
        expect(validateAnswer(choiceQuestion, "option-a")).toBeNull();
    });

    it("rejects an empty text answer", () => {
        expect(validateAnswer(textQuestion, "   ")).toBe("此題為必填");
        expect(validateAnswer(textQuestion, " 因為基因分離 ")).toBeNull();
    });

    it("rejects a text answer longer than 2,000 characters", () => {
        expect(
            validateAnswer(
                textQuestion,
                ` ${"字".repeat(MAX_TEXT_ANSWER_LENGTH + 1)} `
            )
        ).toBe("答案不可超過 2,000 字");
        expect(
            validateAnswer(textQuestion, "字".repeat(MAX_TEXT_ANSWER_LENGTH))
        ).toBeNull();
    });
});

describe("useAnswerSubmission", () => {
    it("does not submit until all required answers are valid", async () => {
        const onContinue = vi.fn();
        const { result } = renderHook(() =>
            useAnswerSubmission({
                questions,
                answers: {
                    [choiceQuestion.id]: "",
                    [textQuestion.id]: " ",
                },
                isCompleted: false,
                onContinue,
            })
        );

        await act(() => result.current.submit());

        expect(submitAnswer).not.toHaveBeenCalled();
        expect(result.current.validationErrors).toEqual({
            [choiceQuestion.id]: "此題為必填",
            [textQuestion.id]: "此題為必填",
        });
        expect(result.current.submissionError).toBe(
            "請完成所有必填題目後再送出。"
        );
        expect(onContinue).not.toHaveBeenCalled();
    });

    it("retries only failed answers after a partial failure", async () => {
        vi.mocked(submitAnswer)
            .mockResolvedValueOnce(submittedAnswerResponse)
            .mockRejectedValueOnce(new Error("網路中斷"))
            .mockResolvedValueOnce({
                ...submittedAnswerResponse,
                questionId: textQuestion.id,
                selectedOptionId: undefined,
                textAnswer: "因為等位基因分離",
            });
        const onSubmitted = vi.fn();
        const onContinue = vi.fn();
        const { result } = renderHook(() =>
            useAnswerSubmission({
                questions,
                answers: {
                    [choiceQuestion.id]: "option-a",
                    [textQuestion.id]: "  因為等位基因分離  ",
                },
                isCompleted: false,
                onSubmitted,
                onContinue,
            })
        );

        await act(() => result.current.submit());

        expect(result.current.submissionError).toContain("網路中斷");
        expect(result.current.submittedQuestionIds).toEqual(
            new Set([choiceQuestion.id])
        );
        expect(onSubmitted).not.toHaveBeenCalled();
        expect(onContinue).not.toHaveBeenCalled();

        await act(() => result.current.submit());

        expect(submitAnswer).toHaveBeenCalledTimes(3);
        expect(vi.mocked(submitAnswer).mock.calls).toEqual([
            [choiceQuestion.id, "CHOICE", "option-a"],
            [textQuestion.id, "TEXT", "因為等位基因分離"],
            [textQuestion.id, "TEXT", "因為等位基因分離"],
        ]);
        expect(onSubmitted).toHaveBeenCalledTimes(1);
        expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it("prevents duplicate requests while a submission is in progress", async () => {
        let resolveSubmission: (() => void) | undefined;
        vi.mocked(submitAnswer).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveSubmission = () => resolve(submittedAnswerResponse);
                })
        );
        const onSubmitted = vi.fn();
        const onContinue = vi.fn();
        const { result } = renderHook(() =>
            useAnswerSubmission({
                questions: [questions[0]],
                answers: { [choiceQuestion.id]: "option-a" },
                isCompleted: false,
                onSubmitted,
                onContinue,
            })
        );

        let firstSubmission: Promise<void>;
        await act(async () => {
            firstSubmission = result.current.submit();
            await result.current.submit();
        });

        expect(submitAnswer).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveSubmission?.();
            await firstSubmission;
        });

        await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
        expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it("does not resubmit answers for an already completed page", async () => {
        const onSubmitted = vi.fn();
        const onContinue = vi.fn();
        const { result } = renderHook(() =>
            useAnswerSubmission({
                questions: [questions[0]],
                answers: { [choiceQuestion.id]: "option-a" },
                isCompleted: true,
                onSubmitted,
                onContinue,
            })
        );

        await act(() => result.current.submit());

        expect(submitAnswer).not.toHaveBeenCalled();
        expect(onSubmitted).not.toHaveBeenCalled();
        expect(onContinue).toHaveBeenCalledTimes(1);
    });
});
