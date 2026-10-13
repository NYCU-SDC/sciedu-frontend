import { RadioGroup, Skeleton, TextArea } from "@radix-ui/themes";
import { useState } from "react";
import { BookOpenText, CheckCircle2, XCircle } from "lucide-react";
import type { CourseQuestionReview, QuestionResponse } from "../types/types";
import TextAreaStyle from "./UnstyledTextArea.module.css";
import { MAX_TEXT_ANSWER_LENGTH } from "./useAnswerSubmission";
import styles from "./QuizCard.module.css";
import AnswerReviewModal from "./AnswerReviewModal";
import CourseContentModal from "./CourseContentModal";
import ExpandButton from "./ExpandButton";

type Props = {
    question: {
        id: string;
        title: string;
        data: QuestionResponse | undefined;
    };
    isLoading: boolean;
    error: string | null;
    answer: string;
    disabled?: boolean;
    validationError?: string;
    onAnswerChange: (answer: string) => void;
    reviewMode?: boolean;
    review?: CourseQuestionReview;
};

export default function QuizCard({
    question,
    isLoading,
    error,
    answer,
    disabled = false,
    validationError,
    onAnswerChange,
    reviewMode = false,
    review,
}: Props) {
    const [expanded, setExpanded] = useState(false);

    const answerField = (inModal = false) => {
        if (question.data?.type === "CHOICE") {
            return (
                <RadioGroup.Root
                    className={styles.radioGroup}
                    value={answer}
                    onValueChange={onAnswerChange}
                    disabled={disabled || reviewMode}
                    aria-invalid={Boolean(validationError)}
                >
                    {question.data.options.map((option) => (
                        <RadioGroup.Item value={option.id} key={option.id}>
                            {option.label}. {option.content}
                        </RadioGroup.Item>
                    ))}
                </RadioGroup.Root>
            );
        }

        if (question.data?.type === "TEXT") {
            return (
                <TextArea
                    className={`${TextAreaStyle.textInput} ${inModal ? styles.modalAnswer : ""}`}
                    placeholder="在此輸入答案..."
                    variant="soft"
                    color="gray"
                    value={answer}
                    maxLength={MAX_TEXT_ANSWER_LENGTH}
                    disabled={disabled || reviewMode}
                    aria-invalid={Boolean(validationError)}
                    onChange={(event) => onAnswerChange(event.target.value)}
                />
            );
        }

        return null;
    };

    if (error) {
        return (
            <div className={styles.quizCard}>
                <div className={styles.titleRow}>
                    <h3>{question.title}</h3>
                    <span className={styles.errorText}>載入失敗</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`${styles.quizCard} ${reviewMode ? styles.reviewCard : ""}`}
        >
            {!reviewMode && (
                <ExpandButton
                    label={`展開${question.title}`}
                    onClick={() => setExpanded(true)}
                />
            )}
            <div className={styles.titleRow}>
                <h3>{question.title}</h3>
                {review && (
                    <span
                        className={
                            review.isCorrect ? styles.correct : styles.wrong
                        }
                    >
                        {review.isCorrect ? (
                            <CheckCircle2 size={16} aria-hidden="true" />
                        ) : (
                            <XCircle size={16} aria-hidden="true" />
                        )}
                        {review.isCorrect ? "答對" : "答錯"}
                    </span>
                )}
            </div>
            {isLoading ? (
                <Skeleton width="100%" height="1rem" />
            ) : (
                <>
                    <p>{question.data?.content}</p>
                    {reviewMode ? (
                        review ? (
                            <div className={styles.reviewAnswers}>
                                <div>
                                    <strong>你的答案</strong>
                                    <p>{review.studentAnswer}</p>
                                </div>
                                <div>
                                    <strong>正確答案</strong>
                                    <p>{review.correctAnswer}</p>
                                </div>
                                <button
                                    type="button"
                                    className={styles.reviewButton}
                                    onClick={() => setExpanded(true)}
                                >
                                    <BookOpenText
                                        size={17}
                                        aria-hidden="true"
                                    />
                                    展開詳解
                                </button>
                            </div>
                        ) : (
                            <p className={styles.emptyReview} role="status">
                                尚無作答紀錄
                            </p>
                        )
                    ) : (
                        answerField()
                    )}
                    {validationError && !reviewMode && (
                        <span className={styles.errorText} role="alert">
                            {validationError}
                        </span>
                    )}
                </>
            )}
            {review ? (
                <AnswerReviewModal
                    opened={expanded}
                    title={question.title}
                    question={question.data?.content ?? ""}
                    review={review}
                    onClose={() => setExpanded(false)}
                />
            ) : !reviewMode ? (
                <CourseContentModal
                    opened={expanded}
                    title={question.title}
                    onClose={() => setExpanded(false)}
                >
                    <div className={styles.modalQuestion}>
                        <p>{question.data?.content}</p>
                        {answerField(true)}
                    </div>
                </CourseContentModal>
            ) : null}
        </div>
    );
}
