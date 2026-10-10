import { Button, Skeleton } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type {
    CourseAnswer,
    CourseAnswers,
    CoursePageRequest,
    CourseReviews,
    MaterialPage,
    QuestionResponse,
} from "../types/types";
import styles from "./Material.module.css";
import FooterStyles from "../components/Footer.module.css";
import { api } from "../../../../shared/utils/api";
import QuizCard from "../components/QuizCard";
import CourseChat from "../components/CourseChat";
import type { CourseChatController } from "../components/useCourseChatController";
import { useAnswerSubmission } from "../components/useAnswerSubmission";
import CourseContentModal from "../components/CourseContentModal";
import ExpandButton from "../components/ExpandButton";
import { formatQuestionTitle } from "../services/formatQuestionTitle";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL as string;

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

export function MaterialImageGallery({ imageIds }: { imageIds: string[] }) {
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [expandedImage, setExpandedImage] = useState<{
        src: string;
        alt: string;
    } | null>(null);

    return (
        <>
            <div
                className={styles.imageContainer}
                data-image-count={imageIds.length}
            >
                {imageIds.map((imageId, index) => {
                    const imageUrl = `${BASE_URL}/api/content/media/${imageId}`;
                    const alt = `教材圖片 ${index + 1}`;
                    return imageErrors[imageId] ? (
                        <span className={styles.errorText} key={imageId}>
                            圖片 {index + 1} 載入失敗
                        </span>
                    ) : (
                        <div className={styles.imageCell} key={imageId}>
                            <img
                                src={imageUrl}
                                alt={alt}
                                onError={() =>
                                    setImageErrors((previous) => ({
                                        ...previous,
                                        [imageId]: true,
                                    }))
                                }
                            />
                            <ExpandButton
                                label={`放大${alt}`}
                                onClick={() =>
                                    setExpandedImage({ src: imageUrl, alt })
                                }
                            />
                        </div>
                    );
                })}
            </div>
            <CourseContentModal
                opened={expandedImage !== null}
                title={expandedImage?.alt ?? "教材圖片"}
                onClose={() => setExpandedImage(null)}
            >
                {expandedImage && (
                    <img
                        className={styles.modalImage}
                        src={expandedImage.src}
                        alt={expandedImage.alt}
                    />
                )}
            </CourseContentModal>
        </>
    );
}

export default function Material({
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
    const req = data.request as MaterialPage;
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    const {
        data: description,
        isLoading: descriptionLoading,
        isError: descriptionError,
    } = useQuery({
        queryKey: ["content", "text", req.content.descriptionId],
        queryFn: () =>
            api<{ content: string }>(
                `/api/content/text/${req.content.descriptionId}`
            ),
    });

    const titleQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["content", "text", section.titleId],
            queryFn: () =>
                api<{ content: string }>(
                    `/api/content/text/${section.titleId}`
                ),
        })),
    });
    const questionQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["question", section.questionId],
            queryFn: () =>
                api<QuestionResponse>(`/api/questions/${section.questionId}`),
        })),
    });

    const submittableQuestions = useMemo(
        () =>
            req.questionSections.map((section, index) => {
                const query = questionQueries[index];
                return {
                    questionId: section.questionId,
                    required: section.required,
                    question: query.data,
                    isUnavailable:
                        query.isLoading || query.isError || !query.data,
                };
            }),
        [questionQueries, req.questionSections]
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
        onContinue: onNext,
    });

    const handleAnswerChange = (questionId: string, answer: string) => {
        clearAnswerError(questionId);
        onAnswerChange(questionId, answer);
    };

    return (
        <div className={styles.pageContainer}>
            <main className={styles.overviewContent}>
                <section className={styles.courseSection}>
                    <MaterialImageGallery imageIds={req.content.imageIds} />
                    <div className={styles.courseDescriptionWrapper}>
                        <ExpandButton
                            label="展開教材文字"
                            onClick={() => setDescriptionExpanded(true)}
                        />
                        <div className={styles.courseDescription}>
                            {descriptionLoading ? (
                                <Skeleton minHeight="4rem" />
                            ) : descriptionError ? (
                                <p className={styles.errorText}>內容載入失敗</p>
                            ) : (
                                <p>{description?.content}</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.questionList}>
                        {req.questionSections.map((section, index) => {
                            const titleQuery = titleQueries[index];
                            const questionQuery = questionQueries[index];
                            return (
                                <QuizCard
                                    key={section.questionId}
                                    question={{
                                        id: section.questionId,
                                        title: formatQuestionTitle(
                                            titleQuery.data?.content ?? "",
                                            index
                                        ),
                                        data: questionQuery.data,
                                    }}
                                    isLoading={questionQuery.isLoading}
                                    error={
                                        questionQuery.isError
                                            ? (questionQuery.error?.message ??
                                              "載入失敗")
                                            : null
                                    }
                                    answer={answers[section.questionId] ?? ""}
                                    disabled={
                                        reviewMode ||
                                        isCompleted ||
                                        isSubmitting ||
                                        submittedQuestionIds.has(
                                            section.questionId
                                        )
                                    }
                                    validationError={
                                        validationErrors[section.questionId]
                                    }
                                    onAnswerChange={(answer) =>
                                        handleAnswerChange(
                                            section.questionId,
                                            answer
                                        )
                                    }
                                    reviewMode={reviewMode}
                                    review={reviews[section.questionId]}
                                />
                            );
                        })}
                    </div>
                </section>
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
            </main>
            <CourseContentModal
                opened={descriptionExpanded}
                title="教材文字"
                onClose={() => setDescriptionExpanded(false)}
            >
                <p>{description?.content}</p>
            </CourseContentModal>
        </div>
    );
}
