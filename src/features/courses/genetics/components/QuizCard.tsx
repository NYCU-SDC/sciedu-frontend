import { Skeleton, RadioGroup, TextArea } from "@radix-ui/themes";
import type { QuestionResponse } from "../types/types";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import { MAX_TEXT_ANSWER_LENGTH } from "./useAnswerSubmission";
import styles from "./QuizCard.module.css";

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
        <div className={styles.quizCard}>
            <div className={styles.titleRow}>
                <h3>{question.title}</h3>
            </div>
            {isLoading ? (
                <Skeleton width="100%" height="1rem" />
            ) : (
                <>
                    <p>{question.data?.content}</p>
                    {question.data?.type === "CHOICE" && (
                        <RadioGroup.Root
                            className={styles.radioGroup}
                            value={answer}
                            onValueChange={onAnswerChange}
                            disabled={disabled}
                            aria-invalid={Boolean(validationError)}
                        >
                            {question.data?.options.map((opt) => (
                                <RadioGroup.Item value={opt.id} key={opt.id}>
                                    {opt.label}. {opt.content}
                                </RadioGroup.Item>
                            ))}
                        </RadioGroup.Root>
                    )}
                    {question.data?.type === "TEXT" && (
                        <TextArea
                            className={TextAreaStyle.textInput}
                            placeholder="在此輸入答案..."
                            variant="soft"
                            color="gray"
                            value={answer}
                            maxLength={MAX_TEXT_ANSWER_LENGTH}
                            disabled={disabled}
                            aria-invalid={Boolean(validationError)}
                            onChange={(event) =>
                                onAnswerChange(event.target.value)
                            }
                        />
                    )}
                    {validationError && (
                        <span className={styles.errorText} role="alert">
                            {validationError}
                        </span>
                    )}
                </>
            )}
        </div>
    );
}
