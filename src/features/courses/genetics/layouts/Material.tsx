import { Button, Skeleton } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import type {
    CourseAnswer,
    CourseAnswers,
    CoursePageRequest,
    MaterialPage,
    QuestionResponse,
} from "../types/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import styles from "./Material.module.css";
import FooterStyles from "../components/Footer.module.css";
import { api } from "../../../../shared/utils/api";
import QuizCard from "../components/QuizCard";
import CourseChat from "../components/CourseChat";
import type { CourseChatController } from "../components/useCourseChatController";
import { useAnswerSubmission } from "../components/useAnswerSubmission";
import CourseContentModal from "../components/CourseContentModal";
import ExpandButton from "../components/ExpandButton";
import { DEMO_MODE, getDemoMediaUrl } from "../../demo/demoCourseCatalog";
import type { DemoQuestionReview } from "../../demo/demoCourseCatalog";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL as string;

type Props = {
    data: CoursePageRequest;
    chat: CourseChatController;
    answers: CourseAnswers;
    isCompleted: boolean;
    onNext: () => void;
    onAnswerChange: (questionId: string, answer: CourseAnswer) => void;
    reviewMode?: boolean;
    reviews?: Record<string, DemoQuestionReview>;
    isLastPage?: boolean;
};

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

    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [expandedImage, setExpandedImage] = useState<{
        src: string;
        alt: string;
    } | null>(null);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const quesTitleQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["content", "text", section.titleId],
            queryFn: () =>
                api<{ content: string }>(
                    `/api/content/text/${section.titleId}`
                ),
        })),
    });

    const quesContentQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["question", section.questionId],
            queryFn: () =>
                api<QuestionResponse>(`/api/questions/${section.questionId}`),
        })),
    });

    const submittableQuestions = useMemo(
        () =>
            req.questionSections.map((section, index) => {
                const query = quesContentQueries[index];
                return {
                    questionId: section.questionId,
                    question: query.data,
                    isUnavailable:
                        query.isLoading || query.isError || !query.data,
                };
            }),
        [quesContentQueries, req.questionSections]
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
                {/* left section */}
                <section className={styles.courseSection}>
                    <div
                        className={styles.imageContainer}
                        data-image-count={req.content.imageIds.length}
                    >
                        {req.content.imageIds.map((imageId, index) => {
                            const imageUrl =
                                (DEMO_MODE && getDemoMediaUrl(imageId)) ||
                                `${BASE_URL}/api/content/media/${imageId}`;
                            return imageErrors[imageId] ? (
                                <span
                                    className={styles.errorText}
                                    key={imageId}
                                >
                                    圖片 {index + 1} 載入失敗
                                </span>
                            ) : (
                                <div
                                    className={`${styles.imageCell} expandableCourseContent`}
                                    key={imageId}
                                >
                                    <img
                                        src={imageUrl}
                                        alt={`教材圖片 ${index + 1}`}
                                        onError={() =>
                                            setImageErrors((previous) => ({
                                                ...previous,
                                                [imageId]: true,
                                            }))
                                        }
                                    />
                                    <ExpandButton
                                        label={`放大教材圖片 ${index + 1}`}
                                        onClick={() =>
                                            setExpandedImage({
                                                src: imageUrl,
                                                alt: `教材圖片 ${index + 1}`,
                                            })
                                        }
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div
                        className={`${styles.courseDescriptionWrapper} expandableCourseContent`}
                    >
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
                        {req.questionSections.map((section, i) => {
                            const titleQuery = quesTitleQueries[i];
                            const contentQuery = quesContentQueries[i];
                            return (
                                <QuizCard
                                    key={section.questionId}
                                    question={{
                                        id: section.questionId,
                                        title: (() => {
                                            const originalTitle =
                                                titleQuery.data?.content ?? "";
                                            const numericTitle = originalTitle
                                                .trim()
                                                .match(/^(\d+)[.．、]?$/);
                                            return numericTitle
                                                ? `題目 ${numericTitle[1]}`
                                                : originalTitle;
                                        })(),
                                        data: contentQuery.data,
                                    }}
                                    isLoading={contentQuery.isLoading}
                                    error={
                                        contentQuery.isError
                                            ? (contentQuery.error?.message ??
                                              "載入失敗")
                                            : null
                                    }
                                    answer={answers[section.questionId] ?? ""}
                                    disabled={
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
                                    review={
                                        reviewMode
                                            ? reviews[section.questionId]
                                            : undefined
                                    }
                                    onAskReview={(question) =>
                                        chat.handleMockQuestion(
                                            question,
                                            reviews[section.questionId]
                                                ?.mockReply
                                        )
                                    }
                                />
                            );
                        })}
                    </div>
                </section>
                {/* right sidebar */}
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
        </div>
    );
}
