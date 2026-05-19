import { Button, Skeleton } from "@radix-ui/themes";
import type { MaterialType } from "../types/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import styles from "./Material.module.css";
import FooterStyles from "../components/Footer.module.css";
import type { QuestionResponse } from "../types/types";
import { api } from "../../../../shared/utils/api";
import { getText, getMediaUrl } from "../services/mockContent";
import QuizCard from "../components/QuizCard";
import CourseChat from "../components/CourseChat";

type Props = {
    data: MaterialType;
    onNext: () => void;
};

export default function Material({ data, onNext }: Props) {
    const content = data.content;

    const { data: description, isLoading: descriptionLoading } = useQuery({
        queryKey: ["content", "text", content.descriptionId],
        queryFn: () => getText(content.descriptionId),
    });

    const imageUrl = getMediaUrl(content.imageId);

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
                        <img src={imageUrl} alt="教材" />
                    </div>

                    <div className={styles.courseDescriptionWrapper}>
                        <div className={styles.courseDescription}>
                            {descriptionLoading ? (
                                <Skeleton minHeight="4rem" />
                            ) : (
                                <p>{description}</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.questionHeader}>
                        <h2>請根據左圖回答下列問題</h2>
                    </div>
                    <div className={styles.questionList}>
                        {questions.map((question, i) => {
                            return <QuizCard question={question} key={i} />;
                        })}
                    </div>
                </section>
                {/* right sidebar */}
                <aside className={styles.chatSidebar}>
                    <CourseChat />
                    <Button
                        className={FooterStyles.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        送出並前往下一頁
                    </Button>
                </aside>
            </main>
        </div>
    );
}
