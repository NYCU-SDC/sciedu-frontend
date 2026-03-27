import { Skeleton, Button, CheckboxGroup, TextArea } from "@radix-ui/themes";
import type { MaterialType } from "../types/types";
import { useQueries } from "@tanstack/react-query";
import styles from "./Material.module.css";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import FooterStyles from "../components/Footer.module.css";
import type { QuestionResponse } from "../types/types";
import { api } from "../../../../shared/utils/api";

type Props = {
    data: MaterialType;
    onNext: () => void;
};

// const mockQuestions: Record<string, QuestionResponse> = {
//     "q-material-1": { id: "q-material-1", type: "CHOICE", content: "控制豌豆種皮形狀的基因為何？", options: ["R", "r"]},
//     "q-material-2": { id: "q-material-2", type: "CHOICE", content: "豌豆RR種皮形狀表徵為何？", options: ["平滑", "皺皮"]},
//     "q-material-3": { id: "q-material-3", type: "TEXT", content: "R和r基因如何影響豌豆種皮形狀？", options: [] },
// };

export default function Material({ data, onNext }: Props) {
    const allQuestionIds = data.content.questions;

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
            <main className={styles.overviewContent}>
                {/* left section */}
                <section className={styles.courseSection}>
                    <div className={styles.imageContainer}>
                        <img src={data.content.image} alt="教材" />
                    </div>

                    <div className={styles.courseDescription}>
                        <p>{data.content.description}</p>
                    </div>
                </section>

                {/* right sidebar */}
                <aside className={styles.questionSidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>請根據左圖回答下列問題</h2>
                    </div>
                    {data.content.questions.map((id, i) => {
                        const result = results[allQuestionIds.indexOf(id)];
                        const question = questionMap[id];
                        return (
                            <div key={i} className={styles.quizCard}>
                                <h3>{data.content.title[i]}</h3>
                                {result.isLoading ? (
                                    <Skeleton width="100%" height="1rem" />
                                ) : (
                                    <>
                                        <p>{question?.content}</p>
                                        {question?.type === "CHOICE" && (
                                            <CheckboxGroup.Root
                                                className={styles.radioGroup}
                                            >
                                                {question.options.map(
                                                    (opt, j) => (
                                                        <CheckboxGroup.Item
                                                            value={`${j}`}
                                                            key={j}
                                                        >
                                                            {opt}
                                                        </CheckboxGroup.Item>
                                                    )
                                                )}
                                            </CheckboxGroup.Root>
                                        )}
                                        {question?.type === "TEXT" && (
                                            <TextArea
                                                className={
                                                    TextAreaStyle.textInput
                                                }
                                                placeholder="在此輸入答案..."
                                                variant="soft"
                                                color="gray"
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}

                    <footer className={styles.sidebarFooter}>
                        <Button
                            className={FooterStyles.shadowButton}
                            variant="solid"
                            highContrast
                            onClick={onNext}
                            radius="full"
                        >
                            送出並前往下一頁
                        </Button>
                    </footer>
                </aside>
            </main>
        </div>
    );
}
