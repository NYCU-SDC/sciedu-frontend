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

// const mockQuestions: Record<string, QuestionResponse> = {
//     "q-question-1": { id: "q-question-1", type: "TEXT", content: "什麼是顯性基因？", options: [] },
//     "q-question-2": { id: "q-question-2", type: "TEXT", content: "隱性基因如何表現？", options: [] },
//     "q-question-3": { id: "q-question-3", type: "TEXT", content: "基因如何轉錄？", options: [] },
//     "q-question-4": { id: "q-question-4", type: "TEXT", content: "轉譯的過程為何？", options: [] },
// };

export default function Questions({ data, onNext }: Props) {
    const allQuestionIds = data.content.columns.flatMap((col) => col.questions);

    const results = useQueries({
        queries: allQuestionIds.map((id) => ({
            queryKey: ["question", id],
            queryFn: () => api<QuestionResponse>(`/questions/${id}`),
            // placeholderData: mockQuestions[id],
        })),
    });
    const questionMap = Object.fromEntries(
        allQuestionIds.map((id, i) => [id, results[i].data])
    );

    return (
        <div className={styles.pageContainer}>
            <main className={styles.contentWrapper}>
                {data.content.columns.map((column, colIndex) => (
                    <section key={colIndex} className={styles.column}>
                        <div className={styles.columnHeader}>
                            <h2>{column.label}：</h2>
                        </div>

                        {column.questions.map((id, i) => {
                            const result = results[allQuestionIds.indexOf(id)];
                            return (
                                <div key={i} className={styles.questionCard}>
                                    <h3 className={styles.questionTitle}>
                                        問題 {colIndex + 1}-{i + 1}
                                    </h3>
                                    {result.isLoading ? (
                                        <Skeleton
                                            className={styles.skeleton}
                                            minHeight="0.875rem"
                                        />
                                    ) : (
                                        <p className={styles.questionText}>
                                            {questionMap[id]?.content}
                                        </p>
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
