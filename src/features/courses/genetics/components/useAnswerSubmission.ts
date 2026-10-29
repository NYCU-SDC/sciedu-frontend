import { LearningSessionContext } from "../../../experience/LearningSessionContext";
import { useContext, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "../../../../shared/utils/api";
import { submitAnswer } from "../services/submitAnswer";
import type {
    CourseAnswers,
    QuestionResponse,
    SubmittedAnswerResponse,
} from "../types/types";

export type SubmittableQuestion = {
    questionId: string;
    question?: QuestionResponse;
    isUnavailable: boolean;
    required?: boolean;
};

type Options = {
    questions: SubmittableQuestion[];
    answers: CourseAnswers;
    isCompleted: boolean;
    onSubmitted?: (answers: SubmittedAnswerResponse[]) => void;
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
    const learning = useContext(LearningSessionContext);
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedQuestionIds, setSubmittedQuestionIds] = useState<
        ReadonlySet<string>
    >(new Set(learning?.submissions.map((a) => a.questionId) ?? []));
    const isSubmittingRef = useRef(false);
    const submittedQuestionIdsRef = useRef(
        new Set<string>(learning?.submissions.map((a) => a.questionId) ?? [])
    );

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
            if (item.required === false && !answers[item.questionId]?.trim())
                continue;
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
            ({ questionId }) =>
                !submittedQuestionIdsRef.current.has(questionId) &&
                !learning?.submissions.some((a) => a.questionId === questionId)
        );

        if (learning?.practice) {
            onContinue();
            return;
        }
        if (pendingQuestions.some((q) => learning?.operations[q.questionId])) {
            setSubmissionError(
                "前次提交結果尚未確認，為避免重複送出已暫停此頁。已保存的其他答案不受影響，請聯絡管理者。"
            );
            return;
        }
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setSubmissionError(null);

        try {
            const results = await Promise.allSettled(
                pendingQuestions.map(
                    async ({ questionId, question, answer }) => {
                        learning?.beforeSubmit(questionId);
                        let response: SubmittedAnswerResponse;
                        try {
                            response = await submitAnswer(
                                questionId,
                                question.type,
                                answer
                            );
                        } catch (error) {
                            learning?.rejected(
                                questionId,
                                error instanceof ApiError &&
                                    [400, 401, 403, 404, 422].includes(
                                        error.status
                                    )
                            );
                            throw error;
                        }
                        // Save before waiting for the rest of the page, or allowing navigation.
                        onSubmitted?.([response]);
                        return response;
                    }
                )
            );

            const failedResults: PromiseRejectedResult[] = [];
            const acceptedQuestionIds: string[] = [];
            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
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
                if (
                    failedResults.some(
                        ({ reason }) =>
                            reason instanceof ApiError && reason.status === 409
                    )
                ) {
                    setSubmissionError(
                        "無法確認既有作答的提交結果，尚未完成本頁。已確認成功的答案會保留；請聯絡管理者協助。"
                    );
                    return;
                }
                if (
                    learning &&
                    failedResults.some(
                        ({ reason }) =>
                            !(reason instanceof ApiError) ||
                            ![400, 401, 403, 404, 422].includes(reason.status)
                    )
                ) {
                    setSubmissionError(
                        `提交或保存結果尚未確認，已暫停自動重送。已確認成功的答案與其他草稿會保留；請先確認儲存提示，若仍無法繼續請聯絡管理者。${failedResults[0].reason instanceof Error ? "（" + failedResults[0].reason.message + "）" : ""}`
                    );
                    return;
                }
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

            toast.success("答案已成功送出", { position: "top-right" });
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
