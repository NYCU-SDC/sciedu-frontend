import type { QuestionsType } from "../types/types";
import { useQueries } from "@tanstack/react-query";
import { api } from "../../../../shared/utils/api";
import { Skeleton, Button, TextArea } from "@radix-ui/themes";
import styles from "./Questions.module.css";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import FooterStyles from "../components/Footer.module.css";
import type { QuestionResponse } from "../types/types";

type Props = {
    data: QuestionsType;
    onNext: () => void;
};

export default function Questions({ data, onNext }: Props) {
    const content = data.content;
    const allQuestionIds = content.columns.flatMap((col) =>
        col.questions.map((q) => q.id)
    );
    const results = useQueries({
        queries: allQuestionIds.map((id) => ({
            queryKey: ["question", id],
            queryFn: () => api<QuestionResponse>(`/questions/${id}`),
        })),
    });
    let idx = 0;
    const columnsWithData = content.columns.map((col) => ({
        label: col.label,
        questions: col.questions.map((q) => ({
            id: q.id,
            content: q.content,
            isLoading: results[idx].isLoading,
            isError: results[idx].isError,
            failerReason: results[idx].failureReason,
        })),
    }));

    return (
        <div className={styles.pageContainer}>
            <main className={styles.contentWrapper}>
                {columnsWithData.map((column, colIndex) => (
                    <section key={colIndex} className={styles.column}>
                        <div className={styles.columnHeader}>
                            <h2>{column.label}：</h2>
                        </div>
                        {column.questions.map((question, i) => {
                            return (
                                <div key={i} className={styles.questionCard}>
                                    <h3 className={styles.questionTitle}>
                                        問題 {colIndex + 1}-{i + 1}
                                    </h3>
                                    {question.isLoading ? (
                                        <Skeleton
                                            className={styles.skeleton}
                                            minHeight="0.875rem"
                                        />
                                    ) : (
                                        (() => {
                                            if (question.isError)
                                                throw new Error(
                                                    `Question ${question.id} not found`
                                                );
                                            return (
                                                <p
                                                    className={
                                                        styles.questionText
                                                    }
                                                >
                                                    {question.content}
                                                </p>
                                            );
                                        })()
                                    )}
                                    <TextArea
                                        className={TextAreaStyle.textInput}
                                        placeholder="在此輸入答案..."
                                        variant="soft"
                                        color="gray"
                                    />
                                </div>
                            );
                        })}
                    </section>
                ))}
            </main>

            <footer className={FooterStyles.footerContainer}>
                <div className={FooterStyles.footerActions}>
                    <Button
                        className={FooterStyles.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        送出並前往下一頁
                    </Button>
                </div>
            </footer>
        </div>
    );
}
