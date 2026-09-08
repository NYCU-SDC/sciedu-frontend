import { useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "../../../../shared/utils/api";
import { submitAnswer } from "../services/submitAnswer";
import type { CourseAnswers, QuestionResponse } from "../types/types";

export type SubmittableQuestion = {
    questionId: string;
    question?: QuestionResponse;
    isUnavailable: boolean;
};

type Options = {
    questions: SubmittableQuestion[];
    answers: CourseAnswers;
    isCompleted: boolean;
    onSubmitted?: () => void;
    onContinue: () => void;
};

export const MAX_TEXT_ANSWER_LENGTH = 2000;

export function validateAnswer(
    question: QuestionResponse,
    answer: string | undefined
): string | null {
    const normalizedAnswer = answer?.trim() ?? "";

    if (!normalizedAnswer) {
        return "此題為必填";
    }

    if (
        question.type === "TEXT" &&
        normalizedAnswer.length > MAX_TEXT_ANSWER_LENGTH
    ) {
        return `答案不可超過 ${MAX_TEXT_ANSWER_LENGTH.toLocaleString()} 字`;
    }

    if (
        question.type === "CHOICE" &&
        !question.options.some((option) => option.id === normalizedAnswer)
    ) {
        return "請選擇有效的選項";
    }

    return null;
}

export function useAnswerSubmission({
    questions,
    answers,
    isCompleted,
    onSubmitted,
    onContinue,
}: Options) {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedQuestionIds, setSubmittedQuestionIds] = useState<
        ReadonlySet<string>
    >(new Set());
    const isSubmittingRef = useRef(false);
    const submittedQuestionIdsRef = useRef(new Set<string>());
    const hasCreatedAnswerRef = useRef(false);

    const clearAnswerError = (questionId: string) => {
        setValidationErrors((previousErrors) => {
            if (!previousErrors[questionId]) return previousErrors;

            const nextErrors = { ...previousErrors };
            delete nextErrors[questionId];
            return nextErrors;
        });
        setSubmissionError(null);
    };

    const submit = async () => {
        if (isSubmittingRef.current) return;

        if (isCompleted) {
            onContinue();
            return;
        }

        const nextValidationErrors: Record<string, string> = {};
        const readyQuestions: {
            questionId: string;
            question: QuestionResponse;
            answer: string;
        }[] = [];
        let hasUnavailableQuestion = false;

        for (const item of questions) {
            if (item.isUnavailable || !item.question) {
                hasUnavailableQuestion = true;
                continue;
            }

            const validationError = validateAnswer(
                item.question,
                answers[item.questionId]
            );
            if (validationError) {
                nextValidationErrors[item.questionId] = validationError;
                continue;
            }

            readyQuestions.push({
                questionId: item.questionId,
                question: item.question,
                answer: answers[item.questionId].trim(),
            });
        }

        setValidationErrors(nextValidationErrors);

        if (hasUnavailableQuestion) {
            setSubmissionError("題目尚未載入完成，請稍後再試。");
            return;
        }

        if (Object.keys(nextValidationErrors).length > 0) {
            setSubmissionError("請完成所有必填題目後再送出。");
            return;
        }

        const pendingQuestions = readyQuestions.filter(
            ({ questionId }) => !submittedQuestionIdsRef.current.has(questionId)
        );

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setSubmissionError(null);

        try {
            const results = await Promise.allSettled(
                pendingQuestions.map(({ questionId, question, answer }) =>
                    submitAnswer(questionId, question.type, answer)
                )
            );

            const failedResults: PromiseRejectedResult[] = [];
            const acceptedQuestionIds: string[] = [];
            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    const questionId = pendingQuestions[index].questionId;
                    submittedQuestionIdsRef.current.add(questionId);
                    acceptedQuestionIds.push(questionId);
                    hasCreatedAnswerRef.current = true;
                } else if (
                    result.reason instanceof ApiError &&
                    result.reason.status === 409
                ) {
                    const questionId = pendingQuestions[index].questionId;
                    submittedQuestionIdsRef.current.add(questionId);
                    acceptedQuestionIds.push(questionId);
                } else {
                    failedResults.push(result);
                }
            });
            if (acceptedQuestionIds.length > 0) {
                setSubmittedQuestionIds(
                    new Set(submittedQuestionIdsRef.current)
                );
            }

            if (failedResults.length > 0) {
                const firstReason = failedResults[0].reason;
                const reason =
                    firstReason instanceof Error && firstReason.message
                        ? `：${firstReason.message}`
                        : "";
                setSubmissionError(
                    `答案送出失敗${reason}。請重試；已成功送出的答案不會重複提交。`
                );
                return;
            }

            toast.success("答案已成功送出");
            if (hasCreatedAnswerRef.current) {
                onSubmitted?.();
            }
            onContinue();
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    return {
        clearAnswerError,
        isSubmitting,
        submissionError,
        submit,
        submittedQuestionIds,
        validationErrors,
    };
}
