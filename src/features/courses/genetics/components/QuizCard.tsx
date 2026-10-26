import { RadioGroup, Skeleton, TextArea } from "@radix-ui/themes";
import { useState } from "react";
import type { AnswerReviewState, QuestionResponse } from "../types/types";
import TextAreaStyle from "./UnstyledTextArea.module.css";
import { MAX_TEXT_ANSWER_LENGTH } from "./useAnswerSubmission";
import styles from "./QuizCard.module.css";
import AnswerResultBadge from "./AnswerResultBadge";
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
    textChoices?: string[];
    disabled?: boolean;
    validationError?: string;
    onAnswerChange: (answer: string) => void;
    reviewMode?: boolean;
    review?: AnswerReviewState;
};

export default function QuizCard({
    question,
    isLoading,
    error,
    answer,
    textChoices,
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

        if (question.data?.type === "TEXT" && textChoices) {
            return (
                <RadioGroup.Root
                    aria-label={question.data.content}
                    value={answer}
                    onValueChange={onAnswerChange}
                    disabled={disabled || reviewMode}
                    aria-invalid={Boolean(validationError)}
                >
                    {textChoices.map((option) => (
                        <RadioGroup.Item key={option} value={option}>
                            {option}
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
            {
                <ExpandButton
                    label={`展開${question.title}`}
                    onClick={() => setExpanded(true)}
                />
            }
            <div className={styles.titleRow}>
                <h3>{question.title}</h3>
                {reviewMode && (
                    <AnswerResultBadge
                        result={review?.result}
                        isLoading={review?.isLoading}
                        isError={review?.isError}
                        isUnavailable={review?.isUnavailable}
                    />
                )}
            </div>
            {isLoading ? (
                <Skeleton width="100%" height="1rem" />
            ) : (
                <>
                    <p>{question.data?.content}</p>
                    {answerField()}
                    {reviewMode && (
                        <p className={styles.emptyReview}>
                            目前 API 未提供評分說明與正確答案。
                        </p>
                    )}
                    {validationError && !reviewMode && (
                        <span className={styles.errorText} role="alert">
                            {validationError}
                        </span>
                    )}
                </>
            )}
            <CourseContentModal
                opened={expanded}
                title={question.title}
                onClose={() => setExpanded(false)}
            >
                <div className={styles.modalQuestion}>
                    <p>{question.data?.content}</p>
                    {answerField(true)}
                </div>
                {reviewMode && (
                    <AnswerResultBadge
                        result={review?.result}
                        isLoading={review?.isLoading}
                        isError={review?.isError}
                        isUnavailable={review?.isUnavailable}
                    />
                )}
            </CourseContentModal>
        </div>
    );
}
