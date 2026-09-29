import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import { Button } from "@radix-ui/themes";
import type {
    CourseAnswer,
    CourseAnswers,
    CoursePageRequest,
    CourseReviews,
    QuestionPage,
    QuestionResponse,
} from "../types/types";
import type { CourseChatController } from "../components/useCourseChatController";
import { api } from "../../../../shared/utils/api";
import CourseChat from "../components/CourseChat";
import QuizCard from "../components/QuizCard";
import styles from "./Questions.module.css";
import FooterStyles from "../components/Footer.module.css";
import { useAnswerSubmission } from "../components/useAnswerSubmission";
import { formatQuestionTitle } from "../services/formatQuestionTitle";

type Props = {
    data: CoursePageRequest;
    chat: CourseChatController;
    answers: CourseAnswers;
    isCompleted: boolean;
    onNext: () => void;
    onAnswerChange: (questionId: string, answer: CourseAnswer) => void;
    reviewMode?: boolean;
    reviews?: CourseReviews;
    isLastPage?: boolean;
};

export default function Questions({
    data,
    chat,
    answers,
    isCompleted,
    onNext,
    onAnswerChange,
    reviewMode = false,
    reviews = {},
    isLastPage = false,
}: Props) {
    const req = data.request as QuestionPage;
    const posthog = usePostHog();
    const questions = useMemo(
        () => req.columns.flatMap((column) => column.questions),
        [req.columns]
    );
    const labelIds = useMemo(
        () => [...new Set(req.columns.map((column) => column.labelId))],
        [req.columns]
    );
    const titleIds = useMemo(
        () => [...new Set(questions.map((question) => question.titleId))],
        [questions]
    );
    const questionIds = useMemo(
        () => [...new Set(questions.map((question) => question.questionId))],
        [questions]
    );

    const labelQueries = useQueries({
        queries: labelIds.map((id) => ({
            queryKey: ["content", "text", id],
            queryFn: () => api<{ content: string }>(`/api/content/text/${id}`),
        })),
    });
    const titleQueries = useQueries({
        queries: titleIds.map((id) => ({
            queryKey: ["content", "text", id],
            queryFn: () => api<{ content: string }>(`/api/content/text/${id}`),
        })),
    });
    const questionQueries = useQueries({
        queries: questionIds.map((id) => ({
            queryKey: ["question", id],
            queryFn: () => api<QuestionResponse>(`/api/questions/${id}`),
        })),
    });

    const labelById = new Map(
        labelIds.map((id, index) => [id, labelQueries[index]])
    );
    const titleById = new Map(
        titleIds.map((id, index) => [id, titleQueries[index]])
    );
    const questionById = new Map(
        questionIds.map((id, index) => [id, questionQueries[index]])
    );

    const submittableQuestions = useMemo(
        () =>
            questionIds.map((questionId) => {
                const query = questionById.get(questionId);
                return {
                    questionId,
                    question: query?.data,
                    isUnavailable:
                        !query ||
                        query.isLoading ||
                        query.isError ||
                        !query.data,
                };
            }),
        // The query result objects change when their state changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [questionIds, questionQueries]
    );

    const {
        clearAnswerError,
        isSubmitting,
        submissionError,
        submit,
        submittedQuestionIds,
        validationErrors,
    } = useAnswerSubmission({
        questions: submittableQuestions,
        answers,
        isCompleted,
        onSubmitted: () =>
            posthog.capture("course_questions_submitted", {
                page_index: data.pageIndex,
                question_count: questionIds.length,
            }),
        onContinue: onNext,
    });

    const handleAnswerChange = (questionId: string, answer: string) => {
        clearAnswerError(questionId);
        onAnswerChange(questionId, answer);
    };

    let questionNumber = 0;
    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageBody}>
                <main className={styles.contentWrapper}>
                    {req.columns.map((column, columnIndex) => {
                        const labelQuery = labelById.get(column.labelId);
                        return (
                            <section
                                key={`${column.labelId}-${columnIndex}`}
                                className={styles.column}
                            >
                                <div className={styles.columnHeader}>
                                    <h2>
                                        {labelQuery?.isError
                                            ? "載入失敗"
                                            : `${labelQuery?.data?.content ?? ""}：`}
                                    </h2>
                                </div>
                                {column.questions.map((question) => {
                                    const index = questionNumber++;
                                    const result = questionById.get(
                                        question.questionId
                                    );
                                    const titleQuery = titleById.get(
                                        question.titleId
                                    );
                                    return (
                                        <QuizCard
                                            key={question.questionId}
                                            question={{
                                                id: question.questionId,
                                                title: formatQuestionTitle(
                                                    titleQuery?.data?.content ??
                                                        "",
                                                    index
                                                ),
                                                data: result?.data,
                                            }}
                                            isLoading={
                                                result?.isLoading ?? true
                                            }
                                            error={
                                                result?.isError ||
                                                titleQuery?.isError
                                                    ? "載入失敗"
                                                    : null
                                            }
                                            answer={
                                                answers[question.questionId] ??
                                                ""
                                            }
                                            disabled={
                                                reviewMode ||
                                                isCompleted ||
                                                isSubmitting ||
                                                submittedQuestionIds.has(
                                                    question.questionId
                                                )
                                            }
                                            validationError={
                                                validationErrors[
                                                    question.questionId
                                                ]
                                            }
                                            onAnswerChange={(answer) =>
                                                handleAnswerChange(
                                                    question.questionId,
                                                    answer
                                                )
                                            }
                                            reviewMode={reviewMode}
                                            review={
                                                reviews[question.questionId]
                                            }
                                        />
                                    );
                                })}
                            </section>
                        );
                    })}
                </main>
                <aside className={styles.chatSidebar}>
                    <CourseChat controller={chat} />
                    {submissionError && !reviewMode && (
                        <p
                            className={FooterStyles.submissionMessage}
                            role="alert"
                        >
                            {submissionError}
                        </p>
                    )}
                    <Button
                        className={FooterStyles.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={reviewMode ? onNext : submit}
                        disabled={!reviewMode && isSubmitting}
                        radius="full"
                    >
                        {reviewMode
                            ? isLastPage
                                ? "返回教材首頁"
                                : "前往下一頁"
                            : isSubmitting
                              ? "答案送出中…"
                              : submissionError
                                ? "重試送出"
                                : isCompleted
                                  ? "前往下一頁"
                                  : "送出並前往下一頁"}
                    </Button>
                </aside>
            </div>
        </div>
    );
}
