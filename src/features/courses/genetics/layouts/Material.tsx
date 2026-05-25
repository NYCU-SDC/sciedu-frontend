import { Button, Skeleton } from "@radix-ui/themes";
import { useState } from "react";
import type {
    CoursePageRequest,
    MaterialPage,
    QuestionResponse,
} from "../types/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import styles from "./Material.module.css";
import FooterStyles from "../components/Footer.module.css";
import { api } from "../../../../shared/utils/api";
import QuizCard from "../components/QuizCard";
import CourseChat from "../components/CourseChat";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL as string;

type Props = {
    data: CoursePageRequest;
    onNext: () => void;
};

export default function Material({ data, onNext }: Props) {
    const req = data.request as MaterialPage;

    const {
        data: description,
        isLoading: descriptionLoading,
        isError: descriptionError,
    } = useQuery({
        queryKey: ["content", "text", req.content.descriptionId],
        queryFn: () =>
            api<{ content: string }>(
                `/api/content/text/${req.content.descriptionId}`
            ),
    });

    const imageUrl = `${BASE_URL}/api/content/media/${req.content.imageId}`;
    const [imageError, setImageError] = useState(false);

    const quesTitleQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["content", "text", section.titleId],
            queryFn: () =>
                api<{ content: string }>(
                    `/api/content/text/${section.titleId}`
                ),
        })),
    });

    const quesContentQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["question", section.questionId],
            queryFn: () =>
                api<QuestionResponse>(`/api/questions/${section.questionId}`),
        })),
    });

    return (
        <div className={styles.pageContainer}>
            <main className={styles.overviewContent}>
                {/* left section */}
                <section className={styles.courseSection}>
                    <div className={styles.imageContainer}>
                        {imageError ? (
                            <span className={styles.errorText}>
                                圖片載入失敗
                            </span>
                        ) : (
                            <img
                                src={imageUrl}
                                alt="教材"
                                onError={() => setImageError(true)}
                            />
                        )}
                    </div>

                    <div className={styles.courseDescriptionWrapper}>
                        <div className={styles.courseDescription}>
                            {descriptionLoading ? (
                                <Skeleton minHeight="4rem" />
                            ) : descriptionError ? (
                                <p className={styles.errorText}>內容載入失敗</p>
                            ) : (
                                <p>{description?.content}</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.questionHeader}>
                        <h2>請根據左圖回答下列問題</h2>
                    </div>
                    <div className={styles.questionList}>
                        {req.questionSections.map((section, i) => {
                            const titleQuery = quesTitleQueries[i];
                            const contentQuery = quesContentQueries[i];
                            return (
                                <QuizCard
                                    key={section.questionId}
                                    question={{
                                        id: section.questionId,
                                        title: titleQuery.data?.content ?? "",
                                        data: contentQuery.data,
                                    }}
                                    isLoading={contentQuery.isLoading}
                                    error={
                                        contentQuery.isError
                                            ? (contentQuery.error?.message ??
                                              "載入失敗")
                                            : null
                                    }
                                />
                            );
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
