import { Skeleton, RadioGroup, TextArea } from "@radix-ui/themes";
import { useState } from "react";
import type { QuestionResponse } from "../types/types";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import { MAX_TEXT_ANSWER_LENGTH } from "./useAnswerSubmission";
import styles from "./QuizCard.module.css";
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
};

export default function QuizCard({
    question,
    isLoading,
    error,
    answer,
    disabled = false,
    validationError,
    onAnswerChange,
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
        <div className={`${styles.quizCard} expandableCourseContent`}>
            <ExpandButton
                label={`展開題目 ${question.title}`}
                onClick={() => setExpanded(true)}
            />
            <div className={styles.titleRow}>
                <h3>{question.title}</h3>
            </div>
            {isLoading ? (
                <Skeleton width="100%" height="1rem" />
            ) : (
                <>
                    <p>{question.data?.content}</p>
                    {answerField()}
                    {validationError && (
                        <span className={styles.errorText} role="alert">
                            {validationError}
                        </span>
                    )}
                </>
            )}
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
        </div>
    );
}
