import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import { Button, RadioGroup, Skeleton, TextArea } from "@radix-ui/themes";
import type {
    CourseAnswer,
    CourseAnswers,
    CoursePageRequest,
    QuestionPage,
    QuestionResponse,
} from "../types/types";
import type { CourseChatController } from "../components/useCourseChatController";
import { api } from "../../../../shared/utils/api";
import CourseChat from "../components/CourseChat";
import styles from "./Questions.module.css";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import FooterStyles from "../components/Footer.module.css";
import { useAnswerSubmission } from "../components/useAnswerSubmission";

type Props = {
    data: CoursePageRequest;
    chat: CourseChatController;
    answers: CourseAnswers;
    isCompleted: boolean;
    onNext: () => void;
    onAnswerChange: (questionId: string, answer: CourseAnswer) => void;
};

export default function Questions({
    data,
    chat,
    answers,
    isCompleted,
    onNext,
    onAnswerChange,
}: Props) {
    const req = data.request as QuestionPage;
    const posthog = usePostHog();

    const uniqueLabelIds = useMemo(
        () => [...new Set(req.columns.map((column) => column.labelId))],
        [req.columns]
    );

    const labelQueries = useQueries({
        queries: uniqueLabelIds.map((id) => ({
            queryKey: ["content", "text", id],
            queryFn: () => api<{ content: string }>(`/api/content/text/${id}`),
        })),
    });

    const labelById = useMemo(
        () =>
            new Map(
                uniqueLabelIds.map((id, index) => [id, labelQueries[index]])
            ),
        [labelQueries, uniqueLabelIds]
    );

    const uniqueTitleIds = useMemo(
        () => [
            ...new Set(
                req.columns.flatMap((column) =>
                    column.questions.map((question) => question.titleId)
                )
            ),
        ],
        [req.columns]
    );

    const titleQueries = useQueries({
        queries: uniqueTitleIds.map((id) => ({
            queryKey: ["content", "text", id],
            queryFn: () => api<{ content: string }>(`/api/content/text/${id}`),
        })),
    });

    const titleById = useMemo(
        () =>
            new Map(
                uniqueTitleIds.map((id, index) => [id, titleQueries[index]])
            ),
        [titleQueries, uniqueTitleIds]
    );

    const uniqueQuestionIds = useMemo(
        () => [
            ...new Set(
                req.columns.flatMap((column) =>
                    column.questions.map((question) => question.questionId)
                )
            ),
        ],
        [req.columns]
    );

    const questionQueries = useQueries({
        queries: uniqueQuestionIds.map((id) => ({
            queryKey: ["question", id],
            queryFn: () => api<QuestionResponse>(`/api/questions/${id}`),
        })),
    });

    const questionById = useMemo(
        () =>
            new Map(
                uniqueQuestionIds.map((id, index) => [
                    id,
                    questionQueries[index],
                ])
            ),
        [questionQueries, uniqueQuestionIds]
    );

    const submittableQuestions = useMemo(
        () =>
            uniqueQuestionIds.map((questionId) => {
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
        [questionById, uniqueQuestionIds]
    );

    const handleSubmissionSuccess = () => {
        posthog.capture("course_questions_submitted", {
            page_index: data.pageIndex,
            question_count: uniqueQuestionIds.length,
        });
        onNext();
    };

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
        onSuccess: handleSubmissionSuccess,
    });

    const handleAnswerChange = (questionId: string, answer: string) => {
        clearAnswerError(questionId);
        onAnswerChange(questionId, answer);
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageBody}>
                <main className={styles.contentWrapper}>
                    {req.columns.map((column, colIndex) => {
                        const labelQuery = labelById.get(column.labelId);

                        return (
                            <section
                                key={`${column.labelId}-${colIndex}`}
                                className={styles.column}
                            >
                                <div className={styles.columnHeader}>
                                    {labelQuery?.isError ? (
                                        <h2 className={styles.errorText}>
                                            載入失敗
                                        </h2>
                                    ) : (
                                        <h2>{`${labelQuery?.data?.content ?? ""}：`}</h2>
                                    )}
                                </div>
                                {column.questions.map((question) => {
                                    const result = questionById.get(
                                        question.questionId
                                    );
                                    const titleQuery = titleById.get(
                                        question.titleId
                                    );
                                    const isLoading = result?.isLoading ?? true;
                                    const isError = result?.isError ?? false;
                                    const titleError =
                                        titleQuery?.isError ?? false;

                                    return (
                                        <div
                                            key={question.questionId}
                                            className={styles.questionCard}
                                        >
                                            <div className={styles.titleRow}>
                                                <h3
                                                    className={
                                                        styles.questionTitle
                                                    }
                                                >
                                                    {titleQuery?.data
                                                        ?.content ?? ""}
                                                </h3>
                                                {(isError || titleError) && (
                                                    <span
                                                        className={
                                                            styles.errorText
                                                        }
                                                    >
                                                        載入失敗
                                                    </span>
                                                )}
                                            </div>
                                            {isLoading ? (
                                                <Skeleton minHeight="0.875rem" />
                                            ) : isError ? null : (
                                                <>
                                                    <p
                                                        className={
                                                            styles.questionText
                                                        }
                                                    >
                                                        {result?.data?.content}
                                                    </p>
                                                    {result?.data?.type ===
                                                    "CHOICE" ? (
                                                        <RadioGroup.Root
                                                            className={
                                                                styles.radioGroup
                                                            }
                                                            value={
                                                                answers[
                                                                    question
                                                                        .questionId
                                                                ] ?? ""
                                                            }
                                                            disabled={
                                                                isCompleted ||
                                                                isSubmitting ||
                                                                submittedQuestionIds.has(
                                                                    question.questionId
                                                                )
                                                            }
                                                            aria-invalid={Boolean(
                                                                validationErrors[
                                                                    question
                                                                        .questionId
                                                                ]
                                                            )}
                                                            onValueChange={(
                                                                answer
                                                            ) =>
                                                                handleAnswerChange(
                                                                    question.questionId,
                                                                    answer
                                                                )
                                                            }
                                                        >
                                                            {result.data.options.map(
                                                                (option) => (
                                                                    <RadioGroup.Item
                                                                        key={
                                                                            option.id
                                                                        }
                                                                        value={
                                                                            option.id
                                                                        }
                                                                    >
                                                                        {
                                                                            option.label
                                                                        }
                                                                        .{" "}
                                                                        {
                                                                            option.content
                                                                        }
                                                                    </RadioGroup.Item>
                                                                )
                                                            )}
                                                        </RadioGroup.Root>
                                                    ) : (
                                                        <TextArea
                                                            className={
                                                                TextAreaStyle.textInput
                                                            }
                                                            placeholder="在此輸入答案..."
                                                            variant="soft"
                                                            color="gray"
                                                            value={
                                                                answers[
                                                                    question
                                                                        .questionId
                                                                ] ?? ""
                                                            }
                                                            disabled={
                                                                isCompleted ||
                                                                isSubmitting ||
                                                                submittedQuestionIds.has(
                                                                    question.questionId
                                                                )
                                                            }
                                                            aria-invalid={Boolean(
                                                                validationErrors[
                                                                    question
                                                                        .questionId
                                                                ]
                                                            )}
                                                            onChange={(event) =>
                                                                handleAnswerChange(
                                                                    question.questionId,
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </>
                                            )}
                                            {validationErrors[
                                                question.questionId
                                            ] && (
                                                <span
                                                    className={styles.errorText}
                                                    role="alert"
                                                >
                                                    {
                                                        validationErrors[
                                                            question.questionId
                                                        ]
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </section>
                        );
                    })}
                </main>
                <aside className={styles.chatSidebar}>
                    <CourseChat controller={chat} />
                    {submissionError && (
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
                        onClick={submit}
                        disabled={isSubmitting}
                        radius="full"
                    >
                        {isSubmitting
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
