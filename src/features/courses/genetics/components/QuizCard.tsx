import { Skeleton, RadioGroup, TextArea } from "@radix-ui/themes";
import { useState } from "react";
import type { QuestionResponse } from "../types/types";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import { MAX_TEXT_ANSWER_LENGTH } from "./useAnswerSubmission";
import styles from "./QuizCard.module.css";
import CourseContentModal from "./CourseContentModal";
import ExpandButton from "./ExpandButton";
import AnswerReviewModal from "./AnswerReviewModal";
import { BookOpenText, CheckCircle2, XCircle } from "lucide-react";
import type { DemoQuestionReview } from "../../demo/demoCourseCatalog";

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
    review?: DemoQuestionReview;
    onAskReview?: (question: string) => void;
};

export default function QuizCard({
    question,
    isLoading,
    error,
    answer,
    disabled = false,
    validationError,
    onAnswerChange,
    review,
    onAskReview,
}: Props) {
    const [expanded, setExpanded] = useState(false);

    const answerField = (inModal = false) => {
        if (question.data?.type === "CHOICE") {
            return (
                <RadioGroup.Root
                    className={styles.radioGroup}
                    value={answer}
                    onValueChange={onAnswerChange}
                    disabled={disabled}
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
                    disabled={disabled}
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
            className={`${styles.quizCard} expandableCourseContent ${review ? styles.reviewCard : ""}`}
        >
            {!review && (
                <ExpandButton
                    label={`展開題目 ${question.title}`}
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
                    {review ? (
                        <div className={styles.reviewAnswers}>
                            <div>
                                <strong>你的答案</strong>
                                <p
                                    className={
                                        review.isCorrect
                                            ? styles.correctAnswer
                                            : styles.wrongAnswer
                                    }
                                >
                                    {review.studentAnswer}
                                </p>
                            </div>
                            <div>
                                <strong>正確答案</strong>
                                <p className={styles.correctAnswer}>
                                    {review.correctAnswer}
                                </p>
                            </div>
                            <button
                                type="button"
                                className={styles.reviewButton}
                                onClick={() => setExpanded(true)}
                            >
                                <BookOpenText size={17} aria-hidden="true" />
                                展開詳解
                            </button>
                        </div>
                    ) : (
                        answerField()
                    )}
                    {validationError && (
                        <span className={styles.errorText} role="alert">
                            {validationError}
                        </span>
                    )}
                </>
            )}
            {review ? (
                <AnswerReviewModal
                    opened={expanded}
                    title={`題目 ${question.title}`}
                    question={question.data?.content ?? ""}
                    review={review}
                    onClose={() => setExpanded(false)}
                    onAsk={(text) => onAskReview?.(text)}
                />
            ) : (
                <CourseContentModal
                    opened={expanded}
                    title={`題目 ${question.title}`}
                    onClose={() => setExpanded(false)}
                >
                    <div className={styles.modalQuestion}>
                        <p>{question.data?.content}</p>
                        {answerField(true)}
                    </div>
                </CourseContentModal>
            )}
        </div>
    );
}
