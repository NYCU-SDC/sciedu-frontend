import { CheckboxGroup, TextArea } from "@radix-ui/themes";
import type { QuestionResponse } from "../types/types";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import styles from "./QuizCard.module.css";
import { SkeletonQuizCard } from "./CourseSkeleton";

type Props = {
    question: {
        id: string;
        title: string;
        data: QuestionResponse | undefined;
    };
    isLoading: boolean;
    error: string | null;
};

export default function QuizCard({ question, isLoading, error }: Props) {
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
                <SkeletonQuizCard />
            ) : (
                <>
                    <p>{question.data?.content}</p>
                    {question.data?.type === "CHOICE" && (
                        <CheckboxGroup.Root className={styles.radioGroup}>
                            {question.data?.options.map((opt) => (
                                <CheckboxGroup.Item value={opt.id} key={opt.id}>
                                    {opt.label}. {opt.content}
                                </CheckboxGroup.Item>
                            ))}
                        </CheckboxGroup.Root>
                    )}
                    {question.data?.type === "TEXT" && (
                        <TextArea
                            className={TextAreaStyle.textInput}
                            placeholder="在此輸入答案..."
                            variant="soft"
                            color="gray"
                        />
                    )}
                </>
            )}
        </div>
    );
}
