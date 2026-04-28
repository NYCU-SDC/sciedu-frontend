import { Skeleton, CheckboxGroup, TextArea } from "@radix-ui/themes";
import type { QuestionResponse } from "../types/types";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import styles from "./QuizCard.module.css";

type Props = {
    question: {
        id: string;
        title: string;
        data: QuestionResponse | undefined;
        isLoading: boolean;
        isError: boolean;
        failureReason?: Error | null;
    };
};

export default function QuizCard({ question }: Props) {
    return (
        <div className={styles.quizCard}>
            <h3>{question.title}</h3>
            {question.isLoading ? (
                <Skeleton width="100%" height="1rem" />
            ) : question.isError ? (
                <p>載入失敗：{question.failureReason?.message}</p>
            ) : (
                <>
                    <p>{question.data?.content}</p>
                    {question.data?.type === "CHOICE" && (
                        <CheckboxGroup.Root className={styles.radioGroup}>
                            {question.data?.options.map((opt, j) => (
                                <CheckboxGroup.Item value={`${j}`} key={j}>
                                    {opt}
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
