import { Button} from "@radix-ui/themes";
import type { MaterialType } from "../types/types";
import { useQueries } from "@tanstack/react-query";
import styles from "./Material.module.css";
import FooterStyles from "../components/Footer.module.css";
import type { QuestionResponse } from "../types/types";
import { api } from "../../../../shared/utils/api";
import QuizCard from "../components/QuizCard";

type Props = {
    data: MaterialType;
    onNext: () => void;
};

export default function Material({ data, onNext }: Props) {
    const content = data.content;
    const allQuestionIds = content.questionSections.flatMap(
        (section) => section.questionContent.id
    );
    const results = useQueries({
        queries: allQuestionIds.map((id) => ({
            queryKey: ["question", id],
            queryFn: () => api<QuestionResponse>(`/questions/${id}`),
        })),
    });
    const questions = allQuestionIds.map((id, i) => ({
        id,
        title:
            content.questionSections.find(
                (section) => section.questionContent.id === id
            )?.title || "",
        data: results[i].data,
        isLoading: results[i].isLoading,
        isError: results[i].isError,
        failureReason: results[i].failureReason,
    }));

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
                    {questions.map((question, i) => {
                        return (
                            <QuizCard question ={question} i={i}/>
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
